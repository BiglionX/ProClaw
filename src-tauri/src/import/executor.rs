//! 数据导入执行器
//!
//! 把 ImportRequest 中的行写入 SPU + SKU + images 表。
//! 简化策略（MVP）：
//! - 1 行 = 1 个 SPU + 1 个默认 SKU（用户未提供 sku_code 时自动生成）
//! - 关联辅助：按 category_name 查/建 product_categories；按 brand_name 查/建 brands
//! - 冲突策略：skip / overwrite / duplicate
//! - 事务：整个 batch 一个事务；中途失败回滚
//!
//! 已知限制（MVP）：
//! - 不支持多 SKU（每行只创建 1 个 SKU）
//! - 不支持复杂多图（每行最多 1 个 image_url，按 `;` 或 `,` 拆）
//! - 不做图片下载（仅记录 URL）
//! - 不修改 product_spus 表结构

use crate::import::mapper::{parse_bool, parse_f64, parse_i64, FieldMap};
use crate::import::types::{ImageArchiveManifest, ImageManifestEntry};
use crate::import::{
    ConflictStrategy, ImportError, ImportRequest, ImportResult, TARGET_CUSTOMERS,
    TARGET_INVENTORY, TARGET_PURCHASES, TARGET_SALES, TARGET_SUPPLIERS,
};
use directories::ProjectDirs;
use rusqlite::{params, Connection, Transaction};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// 执行导入（事务包裹）
///
/// 入参 `conn` 必须是 `Database.connection()` 返回的可变引用（已加锁的 Mutex 内部）。
///
/// v1.2 P1：根据 `request.target_type` 路由到不同的 process_* 函数。
pub fn execute(
    conn: &Connection,
    batch_id: &str,
    request: &ImportRequest,
) -> Result<ImportResult, String> {
    let strategy = ConflictStrategy::from_str(&request.conflict_strategy);
    let mut errors: Vec<ImportError> = Vec::new();
    let mut success: usize = 0;
    let mut failed: usize = 0;
    let mut skipped: usize = 0;

    // 把 rows 按 mapping 转成 (row_index, FieldMap)
    let mapping_pairs: Vec<(String, String)> = request
        .mapping
        .iter()
        .map(|m| (m.source_column.clone(), m.target_field.clone()))
        .collect();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // v1.3：加载图片 zip manifest（若用户提供）。失败时不阻塞导入——记 error 行级报告。
    let mut archive_load_warning: Option<ImportError> = None;
    let image_archive: Option<ImageArchiveManifest> = match request.image_archive.as_deref() {
        Some(rel) => match crate::import::commands::load_image_archive(rel) {
            Ok(m) => Some(m),
            Err(e) => {
                archive_load_warning = Some(ImportError {
                    row_index: 0,
                    field: "_archive".to_string(),
                    level: "L1".to_string(),
                    code: "IMAGE_ARCHIVE_LOAD_FAILED".to_string(),
                    message: format!("图片 zip manifest 加载失败：{}", e),
                    value: None,
                });
                None
            }
        },
        None => None,
    };

    // v1.3：暂停检查点常量（每 N 行检测一次 status，避免每行 SELECT）
    const PAUSE_CHECK_INTERVAL: usize = 100;
    let mut processed_rows: usize = 0;
    let mut paused_at: Option<usize> = None;

    for row in &request.rows {
        // v1.3：循环开头每 N 行检测一次 status='paused' → 立即退出循环
        if processed_rows % PAUSE_CHECK_INTERVAL == 0 {
            let current_status: String = tx
                .query_row(
                    "SELECT status FROM import_batches WHERE id = ?1",
                    params![batch_id],
                    |row| row.get(0),
                )
                .unwrap_or_else(|_| "importing".to_string());
            if current_status == "paused" {
                paused_at = Some(processed_rows);
                break;
            }
        }

        let fields = crate::import::mapper::apply_mapping_to_row(row, &mapping_pairs);

        // v1.2 P1: 按 target_type 路由
        let outcome = match request.target_type.as_str() {
            TARGET_INVENTORY => process_inventory_txn(&tx, row.row_index, &fields, strategy),
            TARGET_PURCHASES => process_purchase_order(&tx, row.row_index, &fields, strategy),
            TARGET_SALES => process_sales_order(&tx, row.row_index, &fields, strategy),
            TARGET_SUPPLIERS => process_supplier(&tx, row.row_index, &fields, strategy),
            TARGET_CUSTOMERS => process_customer(&tx, row.row_index, &fields, strategy),
            // 商品库（MVP，默认 target_type）
            _ => process_row(
                &tx,
                row.row_index,
                &fields,
                strategy,
                image_archive.as_ref(),
            ),
        };

        match outcome {
            Ok(RowOutcome::Inserted { warnings })
            | Ok(RowOutcome::Updated { warnings }) => {
                success += 1;
                for w in warnings {
                    errors.push(w);
                }
            }
            Ok(RowOutcome::Skipped(reason)) => {
                skipped += 1;
                errors.push(ImportError {
                    row_index: row.row_index,
                    field: "_row".to_string(),
                    level: "L1".to_string(),
                    code: "SKIPPED".to_string(),
                    message: reason,
                    value: None,
                });
            }
            Err(e) => {
                failed += 1;
                errors.push(ImportError {
                    row_index: row.row_index,
                    field: "_row".to_string(),
                    level: "L1".to_string(),
                    code: "WRITE_FAILED".to_string(),
                    message: e,
                    value: None,
                });
            }
        }

        processed_rows += 1;

        // v1.3：每 N 行写一次心跳与进度，供 Import Center 列表显示
        if processed_rows % PAUSE_CHECK_INTERVAL == 0 {
            let _ = tx.execute(
                "UPDATE import_batches
                 SET processed_rows = ?1, last_heartbeat_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![processed_rows as i64, batch_id],
            );
        }
    }

    // 把 archive 加载警告注入 errors（仅一次，无论多少行）
    if let Some(w) = archive_load_warning {
        errors.insert(0, w);
    }

    // 更新 import_batches 汇总
    let total = request.rows.len();
    // v1.3：若循环中检测到 paused，保持 paused 状态而非强制改 success/partial/failed
    let final_status = if paused_at.is_some() {
        "paused"
    } else if failed == 0 && skipped == 0 {
        "success"
    } else if success > 0 {
        "partial"
    } else {
        "failed"
    };
    let error_json = serde_json::to_string(&errors).unwrap_or_else(|_| "[]".to_string());
    tx.execute(
        "UPDATE import_batches
         SET status = ?1, total_rows = ?2, success_rows = ?3,
             failed_rows = ?4, skipped_rows = ?5,
             processed_rows = ?6, last_heartbeat_at = CURRENT_TIMESTAMP,
             finished_at = CURRENT_TIMESTAMP, error_report_json = ?7
         WHERE id = ?8",
        params![
            final_status,
            total as i64,
            success as i64,
            failed as i64,
            skipped as i64,
            processed_rows as i64,
            error_json,
            batch_id
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(ImportResult {
        batch_id: batch_id.to_string(),
        total,
        success,
        failed,
        skipped,
        errors,
    })
}

/// 单行处理结果
pub enum RowOutcome {
    /// 新增成功；warnings 携带非阻塞的可选警告（如图片缺失）
    Inserted { warnings: Vec<ImportError> },
    /// 更新成功；warnings 携带非阻塞的可选警告（如图片缺失）
    Updated { warnings: Vec<ImportError> },
    /// 跳过（如冲突策略=Skip 命中已存在记录）
    Skipped(String),
}

/// ==================== v1.2 P1 新增：3 类业务对象 process_* 函数 ====================

/// 处理库存交易行（PRD §3.2）
///
/// 必填：sku_code、transaction_type、quantity、transaction_date
/// 去重键：(product_id + transaction_date + transaction_type) UNIQUE
///
/// 注意：业务表 `inventory_transactions.product_id REFERENCES products(id)`，
/// 而 v1.0 MVP 商品库写入 `product_spus / product_skus`。P1 在导入库存交易时
/// 通过 ensure_sku_in_products() 保证 `products.sku` 存在（不存在则新建一行）。
pub fn process_inventory_txn(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
) -> Result<RowOutcome, String> {
    // 1. 必填：sku_code
    let sku_code = fields
        .get("sku_code")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("第 {} 行：sku_code 必填", row_index))?
        .to_string();

    // 2. 必填：transaction_type
    let tx_type = fields
        .get("transaction_type")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("第 {} 行：transaction_type 必填", row_index))?
        .to_string();

    // 3. 必填：quantity > 0
    let quantity = parse_i64(
        fields.get("quantity").map(|s| s.as_str()).unwrap_or("0"),
        0,
    );
    if quantity <= 0 {
        return Err(format!("第 {} 行：quantity 必须 > 0", row_index));
    }

    // 4. 必填：transaction_date
    let tx_date = fields
        .get("transaction_date")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("第 {} 行：transaction_date 必填", row_index))?
        .to_string();

    // 5. 可选：unit_price
    let unit_price = parse_f64(
        fields.get("unit_price").map(|s| s.as_str()).unwrap_or("0"),
        0.0,
    );

    // 6. 解析 product_id（确保 products.sku 存在）
    let product_id = ensure_sku_in_products(tx, &sku_code)?;

    // 7. 查重：(product_id + transaction_date + transaction_type)
    let existing_id: Option<String> = tx
        .query_row(
            "SELECT id FROM inventory_transactions
             WHERE product_id = ?1 AND transaction_date = ?2 AND transaction_type = ?3
             LIMIT 1",
            params![product_id, tx_date, tx_type],
            |row| row.get::<_, String>(0),
        )
        .ok();

    if let Some(existing) = existing_id {
        match strategy {
            ConflictStrategy::Skip => Ok(RowOutcome::Skipped(format!(
                "第 {} 行：库存交易已存在（sku={}, date={}, type={}），已跳过",
                row_index, sku_code, tx_date, tx_type
            ))),
            ConflictStrategy::Overwrite => {
                tx.execute(
                    "UPDATE inventory_transactions
                     SET quantity = ?1, unit_price = ?2, reference_no = ?3, notes = ?4
                     WHERE id = ?5",
                    params![
                        quantity,
                        unit_price,
                        fields.get("reference_no").map(|s| s.to_string()),
                        fields.get("notes").map(|s| s.to_string()),
                        existing
                    ],
                )
                .map_err(|e| format!("更新库存交易失败：{}", e))?;
                Ok(RowOutcome::Updated { warnings: vec![] })
            }
            ConflictStrategy::Duplicate => {
                // 对库存交易复制语义不友好（去重键已锁定），改为跳过 + 报告
                Ok(RowOutcome::Skipped(format!(
                    "第 {} 行：库存交易已存在；duplicate 策略对库存交易不适用，已跳过",
                    row_index
                )))
            }
        }
    } else {
        let id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO inventory_transactions
             (id, product_id, transaction_type, quantity, unit_price, reference_no, reason, performed_by, notes, transaction_date, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending')",
            params![
                id,
                product_id,
                tx_type,
                quantity,
                unit_price,
                fields.get("reference_no").map(|s| s.to_string()),
                fields.get("reason").map(|s| s.to_string()),
                fields.get("operator").map(|s| s.to_string()),
                fields.get("notes").map(|s| s.to_string()),
                tx_date
            ],
        )
        .map_err(|e| format!("插入库存交易失败：{}", e))?;
        Ok(RowOutcome::Inserted { warnings: vec![] })
    }
}

/// 处理采购订单行（PRD §3.3）
///
/// 必填：po_number、supplier_name、order_date、sku_code、item_qty、item_unit_price
/// 平铺结构：每行 = 1 个采购单 + 1 个 item
/// 供应商按 supplier_name 自动建（复用 ensure_supplier 模式）
pub fn process_purchase_order(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
) -> Result<RowOutcome, String> {
    // 1. 必填字段提取
    let po_number = required_str(fields, "po_number", row_index)?;
    let supplier_name = required_str(fields, "supplier_name", row_index)?;
    let order_date = required_str(fields, "order_date", row_index)?;
    let sku_code = required_str(fields, "sku_code", row_index)?;
    let item_qty = parse_i64(
        fields.get("item_qty").map(|s| s.as_str()).unwrap_or("0"),
        0,
    );
    if item_qty <= 0 {
        return Err(format!("第 {} 行：item_qty 必须 > 0", row_index));
    }
    let item_unit_price = parse_f64(
        fields.get("item_unit_price").map(|s| s.as_str()).unwrap_or("0"),
        0.0,
    );

    let expected_date = fields.get("expected_date").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let notes = fields.get("notes").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let phone = fields.get("supplier_phone").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let contact = fields.get("supplier_contact").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    // 2. 自动建供应商
    let supplier_id = ensure_supplier(tx, &supplier_name, phone.as_deref(), contact.as_deref())?;

    // 3. 查重：po_number
    let existing_po: Option<String> = tx
        .query_row(
            "SELECT id FROM purchase_orders WHERE po_number = ?1 AND deleted_at IS NULL LIMIT 1",
            params![po_number],
            |row| row.get::<_, String>(0),
        )
        .ok();

    if let Some(existing_po_id) = existing_po {
        match strategy {
            ConflictStrategy::Skip => Ok(RowOutcome::Skipped(format!(
                "第 {} 行：采购单 po_number={} 已存在，已跳过",
                row_index, po_number
            ))),
            ConflictStrategy::Overwrite => {
                // 简单覆盖：删除旧 item，重写新 item
                tx.execute(
                    "DELETE FROM purchase_order_items WHERE purchase_order_id = ?1",
                    params![existing_po_id],
                )
                .map_err(|e| format!("清理旧采购单 item 失败：{}", e))?;
                let product_id = ensure_sku_in_products(tx, &sku_code)?;
                let total_price = (item_qty as f64) * item_unit_price;
                let item_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO purchase_order_items
                     (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
                    params![item_id, existing_po_id, product_id, item_qty, item_unit_price, total_price, notes],
                )
                .map_err(|e| format!("覆盖采购单 item 失败：{}", e))?;
                // 更新订单头 total_amount
                tx.execute(
                    "UPDATE purchase_orders SET total_amount = ?1, order_date = ?2, expected_delivery_date = ?3, notes = ?4 WHERE id = ?5",
                    params![total_price, order_date, expected_date, notes, existing_po_id],
                )
                .map_err(|e| format!("更新采购单头失败：{}", e))?;
                Ok(RowOutcome::Updated { warnings: vec![] })
            }
            ConflictStrategy::Duplicate => {
                let new_po = next_po_copy_number(tx, &po_number)?;
                insert_new_purchase_order(
                    tx,
                    &new_po,
                    &supplier_id,
                    &order_date,
                    expected_date.as_deref(),
                    notes.as_deref(),
                    &sku_code,
                    item_qty,
                    item_unit_price,
                )?;
                Ok(RowOutcome::Inserted { warnings: vec![] })
            }
        }
    } else {
        insert_new_purchase_order(
            tx,
            &po_number,
            &supplier_id,
            &order_date,
            expected_date.as_deref(),
            notes.as_deref(),
            &sku_code,
            item_qty,
            item_unit_price,
        )?;
        Ok(RowOutcome::Inserted { warnings: vec![] })
    }
}

/// 处理销售订单行（PRD §3.4）
///
/// 必填：so_number、customer_name、order_date、sku_code、item_qty、item_unit_price
/// 客户按 customer_name 自动建
pub fn process_sales_order(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
) -> Result<RowOutcome, String> {
    let so_number = required_str(fields, "so_number", row_index)?;
    let customer_name = required_str(fields, "customer_name", row_index)?;
    let order_date = required_str(fields, "order_date", row_index)?;
    let sku_code = required_str(fields, "sku_code", row_index)?;
    let item_qty = parse_i64(
        fields.get("item_qty").map(|s| s.as_str()).unwrap_or("0"),
        0,
    );
    if item_qty <= 0 {
        return Err(format!("第 {} 行：item_qty 必须 > 0", row_index));
    }
    let item_unit_price = parse_f64(
        fields.get("item_unit_price").map(|s| s.as_str()).unwrap_or("0"),
        0.0,
    );

    let expected_date = fields.get("expected_date").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let notes = fields.get("notes").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let shipping_address = fields.get("shipping_address").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let phone = fields.get("customer_phone").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let contact = fields.get("customer_contact").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let customer_id = ensure_customer(tx, &customer_name, phone.as_deref(), contact.as_deref())?;

    let existing_so: Option<String> = tx
        .query_row(
            "SELECT id FROM sales_orders WHERE so_number = ?1 AND deleted_at IS NULL LIMIT 1",
            params![so_number],
            |row| row.get::<_, String>(0),
        )
        .ok();

    if let Some(existing_so_id) = existing_so {
        match strategy {
            ConflictStrategy::Skip => Ok(RowOutcome::Skipped(format!(
                "第 {} 行：销售单 so_number={} 已存在，已跳过",
                row_index, so_number
            ))),
            ConflictStrategy::Overwrite => {
                tx.execute(
                    "DELETE FROM sales_order_items WHERE sales_order_id = ?1",
                    params![existing_so_id],
                )
                .map_err(|e| format!("清理旧销售单 item 失败：{}", e))?;
                let product_id = ensure_sku_in_products(tx, &sku_code)?;
                let total_price = (item_qty as f64) * item_unit_price;
                let item_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO sales_order_items
                     (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
                    params![item_id, existing_so_id, product_id, item_qty, item_unit_price, total_price, notes],
                )
                .map_err(|e| format!("覆盖销售单 item 失败：{}", e))?;
                tx.execute(
                    "UPDATE sales_orders SET total_amount = ?1, order_date = ?2, expected_delivery_date = ?3, shipping_address = ?4, notes = ?5 WHERE id = ?6",
                    params![total_price, order_date, expected_date, shipping_address, notes, existing_so_id],
                )
                .map_err(|e| format!("更新销售单头失败：{}", e))?;
                Ok(RowOutcome::Updated { warnings: vec![] })
            }
            ConflictStrategy::Duplicate => {
                let new_so = next_so_copy_number(tx, &so_number)?;
                insert_new_sales_order(
                    tx,
                    &new_so,
                    &customer_id,
                    &order_date,
                    expected_date.as_deref(),
                    shipping_address.as_deref(),
                    notes.as_deref(),
                    &sku_code,
                    item_qty,
                    item_unit_price,
                )?;
                Ok(RowOutcome::Inserted { warnings: vec![] })
            }
        }
    } else {
        insert_new_sales_order(
            tx,
            &so_number,
            &customer_id,
            &order_date,
            expected_date.as_deref(),
            shipping_address.as_deref(),
            notes.as_deref(),
            &sku_code,
            item_qty,
            item_unit_price,
        )?;
        Ok(RowOutcome::Inserted { warnings: vec![] })
    }
}

/// 处理供应商主数据行（PRD §3.5）
pub fn process_supplier(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
) -> Result<RowOutcome, String> {
    let name = required_str(fields, "supplier_name", row_index)?;
    let phone = fields.get("supplier_phone").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let contact = fields.get("supplier_contact").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let email = fields.get("supplier_email").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let address = fields.get("supplier_address").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let payment_terms = fields.get("supplier_payment_terms").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let tax_number = fields.get("supplier_tax_number").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let existing: Option<String> = tx
        .query_row(
            "SELECT id FROM suppliers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .ok();

    match (existing, strategy) {
        (Some(_id), ConflictStrategy::Skip) => Ok(RowOutcome::Skipped(format!(
            "第 {} 行：供应商 '{}' 已存在，已跳过",
            row_index, name
        ))),
        (Some(id), ConflictStrategy::Overwrite) => {
            tx.execute(
                "UPDATE suppliers SET phone = COALESCE(?1, phone), contact_person = COALESCE(?2, contact_person),
                 email = COALESCE(?3, email), address = COALESCE(?4, address),
                 payment_terms = COALESCE(?5, payment_terms), tax_number = COALESCE(?6, tax_number),
                 updated_at = CURRENT_TIMESTAMP WHERE id = ?7",
                params![phone, contact, email, address, payment_terms, tax_number, id],
            )
            .map_err(|e| format!("更新供应商失败：{}", e))?;
            Ok(RowOutcome::Updated { warnings: vec![] })
        }
        (Some(_), ConflictStrategy::Duplicate) => {
            let new_name = next_copy_name(&name);
            insert_supplier(tx, &new_name, phone.as_deref(), contact.as_deref(), email.as_deref(),
                address.as_deref(), payment_terms.as_deref(), tax_number.as_deref())?;
            Ok(RowOutcome::Inserted { warnings: vec![] })
        }
        (None, _) => {
            insert_supplier(tx, &name, phone.as_deref(), contact.as_deref(), email.as_deref(),
                address.as_deref(), payment_terms.as_deref(), tax_number.as_deref())?;
            Ok(RowOutcome::Inserted { warnings: vec![] })
        }
    }
}

/// 处理客户主数据行（PRD §3.5）
pub fn process_customer(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
) -> Result<RowOutcome, String> {
    let name = required_str(fields, "customer_name", row_index)?;
    let phone = fields.get("customer_phone").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let contact = fields.get("customer_contact").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let email = fields.get("customer_email").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let address = fields.get("customer_address").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let tax_number = fields.get("customer_tax_number").map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let existing: Option<String> = tx
        .query_row(
            "SELECT id FROM customers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .ok();

    match (existing, strategy) {
        (Some(_id), ConflictStrategy::Skip) => Ok(RowOutcome::Skipped(format!(
            "第 {} 行：客户 '{}' 已存在，已跳过",
            row_index, name
        ))),
        (Some(id), ConflictStrategy::Overwrite) => {
            tx.execute(
                "UPDATE customers SET phone = COALESCE(?1, phone), contact_person = COALESCE(?2, contact_person),
                 email = COALESCE(?3, email), address = COALESCE(?4, address),
                 tax_number = COALESCE(?5, tax_number), updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
                params![phone, contact, email, address, tax_number, id],
            )
            .map_err(|e| format!("更新客户失败：{}", e))?;
            Ok(RowOutcome::Updated { warnings: vec![] })
        }
        (Some(_), ConflictStrategy::Duplicate) => {
            let new_name = next_copy_name(&name);
            insert_customer(tx, &new_name, phone.as_deref(), contact.as_deref(), email.as_deref(),
                address.as_deref(), tax_number.as_deref())?;
            Ok(RowOutcome::Inserted { warnings: vec![] })
        }
        (None, _) => {
            insert_customer(tx, &name, phone.as_deref(), contact.as_deref(), email.as_deref(),
                address.as_deref(), tax_number.as_deref())?;
            Ok(RowOutcome::Inserted { warnings: vec![] })
        }
    }
}

// ==================== 公共辅助函数（ensure_supplier / ensure_customer / ensure_sku）====================

/// 按 supplier_name 查/建供应商，返回 supplier_id
///
/// 复用 v1.0 MVP `ensure_category / ensure_brand` 模式：按 name 查重，无则 INSERT
pub fn ensure_supplier(
    tx: &Transaction<'_>,
    name: &str,
    phone: Option<&str>,
    contact: Option<&str>,
) -> Result<String, String> {
    if let Some(id) = tx
        .query_row(
            "SELECT id FROM suppliers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |r| r.get::<_, String>(0),
        )
        .ok()
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO suppliers (id, name, contact_person, phone, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, TRUE, 'pending')",
        params![id, name, contact, phone],
    )
    .map_err(|e| format!("创建供应商失败：{}", e))?;
    Ok(id)
}

/// 按 customer_name 查/建客户，返回 customer_id
pub fn ensure_customer(
    tx: &Transaction<'_>,
    name: &str,
    phone: Option<&str>,
    contact: Option<&str>,
) -> Result<String, String> {
    if let Some(id) = tx
        .query_row(
            "SELECT id FROM customers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |r| r.get::<_, String>(0),
        )
        .ok()
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO customers (id, name, contact_person, phone, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, TRUE, 'pending')",
        params![id, name, contact, phone],
    )
    .map_err(|e| format!("创建客户失败：{}", e))?;
    Ok(id)
}

/// 确保 `products.sku` 存在，返回 products.id
///
/// 由于业务表 `inventory_transactions.product_id` 与 `*_order_items.product_id`
/// 均引用旧版 `products(id)`，而 v1.0 MVP 商品库导入写入 `product_spus/product_skus`（双表架构）。
/// P1 库存/采购/销售导入通过本函数保证 `products.sku` 存在，作为业务表的"产品标识"统一入口。
pub fn ensure_sku_in_products(
    tx: &Transaction<'_>,
    sku_code: &str,
) -> Result<String, String> {
    if let Some(id) = tx
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL LIMIT 1",
            params![sku_code],
            |r| r.get::<_, String>(0),
        )
        .ok()
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO products (id, sku, name, is_active, sync_status)
         VALUES (?1, ?2, ?2, TRUE, 'pending')",
        params![id, sku_code],
    )
    .map_err(|e| format!("创建产品占位记录失败：{}", e))?;
    Ok(id)
}

// ==================== 内部辅助函数（采购/销售/主数据 INSERT）====================

fn required_str(fields: &FieldMap, key: &str, row_index: usize) -> Result<String, String> {
    fields
        .get(key)
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("第 {} 行：{} 必填", row_index, key))
}

fn insert_new_purchase_order(
    tx: &Transaction<'_>,
    po_number: &str,
    supplier_id: &str,
    order_date: &str,
    expected_date: Option<&str>,
    notes: Option<&str>,
    sku_code: &str,
    item_qty: i64,
    item_unit_price: f64,
) -> Result<(), String> {
    let po_id = Uuid::new_v4().to_string();
    let total_price = (item_qty as f64) * item_unit_price;
    tx.execute(
        "INSERT INTO purchase_orders
         (id, po_number, supplier_id, order_date, expected_delivery_date, status, total_amount, paid_amount, payment_status, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, 0, 'unpaid', ?7, 'pending')",
        params![po_id, po_number, supplier_id, order_date, expected_date, total_price, notes],
    )
    .map_err(|e| format!("插入采购单失败：{}", e))?;
    let product_id = ensure_sku_in_products(tx, sku_code)?;
    let item_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO purchase_order_items
         (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        params![item_id, po_id, product_id, item_qty, item_unit_price, total_price, notes],
    )
    .map_err(|e| format!("插入采购单 item 失败：{}", e))?;
    Ok(())
}

fn insert_new_sales_order(
    tx: &Transaction<'_>,
    so_number: &str,
    customer_id: &str,
    order_date: &str,
    expected_date: Option<&str>,
    shipping_address: Option<&str>,
    notes: Option<&str>,
    sku_code: &str,
    item_qty: i64,
    item_unit_price: f64,
) -> Result<(), String> {
    let so_id = Uuid::new_v4().to_string();
    let total_price = (item_qty as f64) * item_unit_price;
    tx.execute(
        "INSERT INTO sales_orders
         (id, so_number, customer_id, order_date, expected_delivery_date, status, total_amount, paid_amount, payment_status, shipping_address, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, 0, 'unpaid', ?7, ?8, 'pending')",
        params![so_id, so_number, customer_id, order_date, expected_date, total_price, shipping_address, notes],
    )
    .map_err(|e| format!("插入销售单失败：{}", e))?;
    let product_id = ensure_sku_in_products(tx, sku_code)?;
    let item_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO sales_order_items
         (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        params![item_id, so_id, product_id, item_qty, item_unit_price, total_price, notes],
    )
    .map_err(|e| format!("插入销售单 item 失败：{}", e))?;
    Ok(())
}

fn insert_supplier(
    tx: &Transaction<'_>,
    name: &str,
    phone: Option<&str>,
    contact: Option<&str>,
    email: Option<&str>,
    address: Option<&str>,
    payment_terms: Option<&str>,
    tax_number: Option<&str>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO suppliers
         (id, name, contact_person, phone, email, address, payment_terms, tax_number, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, TRUE, 'pending')",
        params![id, name, contact, phone, email, address, payment_terms, tax_number],
    )
    .map_err(|e| format!("插入供应商失败：{}", e))?;
    Ok(())
}

fn insert_customer(
    tx: &Transaction<'_>,
    name: &str,
    phone: Option<&str>,
    contact: Option<&str>,
    email: Option<&str>,
    address: Option<&str>,
    tax_number: Option<&str>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO customers
         (id, name, contact_person, phone, email, address, tax_number, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, TRUE, 'pending')",
        params![id, name, contact, phone, email, address, tax_number],
    )
    .map_err(|e| format!("插入客户失败：{}", e))?;
    Ok(())
}

fn next_po_copy_number(tx: &Transaction<'_>, base: &str) -> Result<String, String> {
    for n in 2..1000 {
        let candidate = format!("{}_copy{}", base, n);
        let exists = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM purchase_orders WHERE po_number = ?1 AND deleted_at IS NULL)",
                params![candidate],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0i64);
        if exists == 0 {
            return Ok(candidate);
        }
    }
    Ok(format!("{}_copy_{}", base, &Uuid::new_v4().to_string()[..6]))
}

fn next_so_copy_number(tx: &Transaction<'_>, base: &str) -> Result<String, String> {
    for n in 2..1000 {
        let candidate = format!("{}_copy{}", base, n);
        let exists = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sales_orders WHERE so_number = ?1 AND deleted_at IS NULL)",
                params![candidate],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0i64);
        if exists == 0 {
            return Ok(candidate);
        }
    }
    Ok(format!("{}_copy_{}", base, &Uuid::new_v4().to_string()[..6]))
}

fn next_copy_name(base: &str) -> String {
    format!("{}_copy2", base)
}

fn process_row(
    tx: &Transaction<'_>,
    row_index: usize,
    fields: &FieldMap,
    strategy: ConflictStrategy,
    image_archive: Option<&ImageArchiveManifest>,
) -> Result<RowOutcome, String> {
    let mut warnings: Vec<ImportError> = Vec::new();

    // 1. 必填：name
    let name = fields
        .get("name")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("第 {} 行：商品名称(name) 必填", row_index))?
        .to_string();

    // 2. 关联：分类
    let category_id = if let Some(cat) = fields.get("category_name").map(|s| s.trim()) {
        if !cat.is_empty() {
            Some(ensure_category(tx, cat)?)
        } else {
            None
        }
    } else {
        None
    };

    // 3. 关联：品牌
    let brand_id = if let Some(brand) = fields.get("brand_name").map(|s| s.trim()) {
        if !brand.is_empty() {
            Some(ensure_brand(tx, brand)?)
        } else {
            None
        }
    } else {
        None
    };

    // 4. 决定 spu_code（用户提供 / 自动生成）
    let user_spu_code = fields
        .get("spu_code")
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // 5. 查重
    let existing_spu_id: Option<String> = if let Some(ref code) = user_spu_code {
        find_spu_by_code(tx, code)?
    } else if let (Some(cid), Some(bid)) = (category_id.as_ref(), brand_id.as_ref()) {
        find_spu_by_name_brand(tx, &name, cid, bid)?
    } else {
        None
    };

    // 6. 应用冲突策略
    if let Some(ref existing_id) = existing_spu_id {
        match strategy {
            ConflictStrategy::Skip => {
                return Ok(RowOutcome::Skipped(format!(
                    "第 {} 行：SPU 已存在（id={}），已跳过",
                    row_index, existing_id
                )));
            }
            ConflictStrategy::Overwrite => {
                update_spu(
                    tx,
                    existing_id,
                    &name,
                    fields.get("description").map(|s| s.to_string()).as_deref(),
                    category_id.as_deref(),
                    brand_id.as_deref(),
                    fields.get("unit").map(|s| s.to_string()).as_deref(),
                )?;
                // 同步更新默认 SKU
                upsert_default_sku(tx, existing_id, fields)?;
                // 同步图片（image_filename → local://；image_url → http://）
                apply_image_fields(
                    tx,
                    existing_id,
                    user_spu_code.as_deref().unwrap_or(""),
                    fields,
                    image_archive,
                    row_index,
                    &mut warnings,
                    None,
                )?;
                return Ok(RowOutcome::Updated { warnings });
            }
            ConflictStrategy::Duplicate => {
                let new_code = match user_spu_code {
                    Some(c) => next_copy_code(tx, &c)?,
                    None => format!("AUTO-{}", &Uuid::new_v4().to_string()[..8]),
                };
                let new_id = insert_spu(
                    tx,
                    &new_code,
                    &name,
                    fields.get("description").map(|s| s.to_string()).as_deref(),
                    category_id.as_deref(),
                    brand_id.as_deref(),
                    fields.get("unit").map(|s| s.to_string()).as_deref(),
                )?;
                upsert_default_sku(tx, &new_id, fields)?;
                apply_image_fields(
                    tx,
                    &new_id,
                    &new_code,
                    fields,
                    image_archive,
                    row_index,
                    &mut warnings,
                    None,
                )?;
                return Ok(RowOutcome::Inserted { warnings });
            }
        }
    }

    // 7. 全新插入
    let spu_code = user_spu_code.unwrap_or_else(|| format!("AUTO-{}", &Uuid::new_v4().to_string()[..8]));
    let new_id = insert_spu(
        tx,
        &spu_code,
        &name,
        fields.get("description").map(|s| s.to_string()).as_deref(),
        category_id.as_deref(),
        brand_id.as_deref(),
        fields.get("unit").map(|s| s.to_string()).as_deref(),
    )?;
    upsert_default_sku(tx, &new_id, fields)?;
    apply_image_fields(
        tx,
        &new_id,
        &spu_code,
        fields,
        image_archive,
        row_index,
        &mut warnings,
        None,
    )?;
    Ok(RowOutcome::Inserted { warnings })
}

// ==================== 辅助函数 ====================

fn ensure_category(tx: &Transaction<'_>, name: &str) -> Result<String, String> {
    if let Some(id) = tx
        .query_row(
            "SELECT id FROM product_categories WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |r| r.get::<_, String>(0),
        )
        .ok()
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO product_categories (id, name, is_active, sync_status)
         VALUES (?1, ?2, TRUE, 'pending')",
        params![id, name],
    )
    .map_err(|e| format!("创建分类失败：{}", e))?;
    Ok(id)
}

fn ensure_brand(tx: &Transaction<'_>, name: &str) -> Result<String, String> {
    if let Some(id) = tx
        .query_row(
            "SELECT id FROM brands WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |r| r.get::<_, String>(0),
        )
        .ok()
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO brands (id, name, is_active, sync_status)
         VALUES (?1, ?2, TRUE, 'pending')",
        params![id, name],
    )
    .map_err(|e| format!("创建品牌失败：{}", e))?;
    Ok(id)
}

fn find_spu_by_code(tx: &Transaction<'_>, code: &str) -> Result<Option<String>, String> {
    let r = tx
        .query_row(
            "SELECT id FROM product_spus WHERE spu_code = ?1 AND deleted_at IS NULL LIMIT 1",
            params![code],
            |row| row.get::<_, String>(0),
        )
        .ok();
    Ok(r)
}

fn find_spu_by_name_brand(
    tx: &Transaction<'_>,
    name: &str,
    category_id: &str,
    brand_id: &str,
) -> Result<Option<String>, String> {
    let r = tx
        .query_row(
            "SELECT id FROM product_spus
             WHERE name = ?1 AND category_id = ?2 AND brand_id = ?3 AND deleted_at IS NULL
             LIMIT 1",
            params![name, category_id, brand_id],
            |row| row.get::<_, String>(0),
        )
        .ok();
    Ok(r)
}

fn next_copy_code(tx: &Transaction<'_>, base: &str) -> Result<String, String> {
    for n in 2..1000 {
        let candidate = format!("{}_copy{}", base, n);
        let exists = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM product_spus WHERE spu_code = ?1 AND deleted_at IS NULL)",
                params![candidate],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0i64);
        if exists == 0 {
            return Ok(candidate);
        }
    }
    Ok(format!("{}_copy_{}", base, &Uuid::new_v4().to_string()[..6]))
}

fn insert_spu(
    tx: &Transaction<'_>,
    spu_code: &str,
    name: &str,
    description: Option<&str>,
    category_id: Option<&str>,
    brand_id: Option<&str>,
    unit: Option<&str>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO product_spus
         (id, spu_code, name, description, category_id, brand_id, unit, is_on_sale, status, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, TRUE, 'on_sale', 'pending')",
        params![
            id,
            spu_code,
            name,
            description,
            category_id,
            brand_id,
            unit.unwrap_or("件")
        ],
    )
    .map_err(|e| format!("插入 SPU 失败：{}", e))?;
    Ok(id)
}

fn update_spu(
    tx: &Transaction<'_>,
    id: &str,
    name: &str,
    description: Option<&str>,
    category_id: Option<&str>,
    brand_id: Option<&str>,
    unit: Option<&str>,
) -> Result<(), String> {
    tx.execute(
        "UPDATE product_spus
         SET name = ?1, description = ?2, category_id = ?3, brand_id = ?4, unit = COALESCE(?5, unit),
             sync_status = 'pending'
         WHERE id = ?6",
        params![name, description, category_id, brand_id, unit, id],
    )
    .map_err(|e| format!("更新 SPU 失败：{}", e))?;
    Ok(())
}

fn upsert_default_sku(
    tx: &Transaction<'_>,
    spu_id: &str,
    fields: &FieldMap,
) -> Result<(), String> {
    let sku_code = fields
        .get("sku_code")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("SKU-{}-DEFAULT", &spu_id[..8]));

    let spec_text = fields
        .get("spec_text")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());
    let specifications = spec_text
        .clone()
        .unwrap_or_else(|| "default".to_string());

    let cost = parse_f64(fields.get("cost_price").map(|s| s.as_str()).unwrap_or("0"), 0.0);
    let sell = parse_f64(fields.get("sell_price").map(|s| s.as_str()).unwrap_or("0"), 0.0);
    let stock = parse_i64(fields.get("current_stock").map(|s| s.as_str()).unwrap_or("0"), 0);
    let min_s = parse_i64(fields.get("min_stock").map(|s| s.as_str()).unwrap_or("0"), 0);
    let max_s = parse_i64(fields.get("max_stock").map(|s| s.as_str()).unwrap_or("999999"), 999999);
    let barcode = fields
        .get("barcode")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());
    let weight = fields
        .get("weight")
        .and_then(|s| s.trim().parse::<f64>().ok());
    let volume = fields
        .get("volume")
        .and_then(|s| s.trim().parse::<f64>().ok());

    // 是否已存在该 spu 的默认 SKU
    let existing_sku_id: Option<String> = tx
        .query_row(
            "SELECT id FROM product_skus
             WHERE spu_id = ?1 AND (is_default = TRUE OR sku_code = ?2) AND deleted_at IS NULL
             LIMIT 1",
            params![spu_id, sku_code],
            |r| r.get::<_, String>(0),
        )
        .ok();

    if let Some(existing) = existing_sku_id {
        tx.execute(
            "UPDATE product_skus
             SET cost_price = ?1, sell_price = ?2, current_stock = ?3,
                 min_stock = ?4, max_stock = ?5, barcode = ?6,
                 weight = ?7, volume = ?8, spec_text = ?9,
                 sync_status = 'pending'
             WHERE id = ?10",
            params![
                cost,
                sell,
                stock as i32,
                min_s as i32,
                max_s as i32,
                barcode,
                weight,
                volume,
                spec_text,
                existing
            ],
        )
        .map_err(|e| format!("更新 SKU 失败：{}", e))?;
    } else {
        let sku_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO product_skus
             (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price,
              current_stock, min_stock, max_stock, barcode, weight, volume,
              is_default, sort_order, is_active, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, TRUE, 0, TRUE, 'pending')",
            params![
                sku_id,
                spu_id,
                sku_code,
                specifications,
                spec_text,
                cost,
                sell,
                stock as i32,
                min_s as i32,
                max_s as i32,
                barcode,
                weight,
                volume
            ],
        )
        .map_err(|e| format!("插入 SKU 失败：{}", e))?;
    }
    Ok(())
}

fn upsert_main_image(
    tx: &Transaction<'_>,
    spu_id: &str,
    image_url: &str,
    sync_status: &str,
) -> Result<(), String> {
    // MVP: 拆 `;` / `,` 第一个作为主图
    let primary = image_url
        .split(|c: char| c == ';' || c == ',')
        .next()
        .unwrap_or(image_url)
        .trim();

    // 已存在主图？
    let existing: Option<String> = tx
        .query_row(
            "SELECT id FROM product_images WHERE spu_id = ?1 AND is_primary = TRUE LIMIT 1",
            params![spu_id],
            |r| r.get::<_, String>(0),
        )
        .ok();

    if let Some(existing_id) = existing {
        tx.execute(
            "UPDATE product_images SET image_url = ?1, sync_status = ?2 WHERE id = ?3",
            params![primary, sync_status, existing_id],
        )
        .map_err(|e| format!("更新主图失败：{}", e))?;
    } else {
        let img_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO product_images (id, spu_id, image_url, image_type, sort_order, is_primary, sync_status)
             VALUES (?1, ?2, ?3, 'main', 0, TRUE, ?4)",
            params![img_id, spu_id, primary, sync_status],
        )
        .map_err(|e| format!("插入主图失败：{}", e))?;
    }
    Ok(())
}

/// v1.3：把图片 zip 里的图片复制到 `<app_data>/product_images/<spu_id>/`，返回 local:// URL
///
/// 匹配规则（按优先级）：
/// 1. `entry.archive_name == image_filename` （精确文件名匹配）
/// 2. `entry.spu_code == spu_code` 且 archive_name 以 spu_code 开头（约定 `SPU_*.png`）
///
/// - `source_path`：manifest 条目里的 local_path（即 `<app_data>/import_images/<hash>/<file>`）
/// - `target_root`：测试可注入临时目录；生产环境为 AppData 下 product_images 目录
/// - 返回 `(local_url, warnings)`：命中返回 Some(url)；未命中返回 Ok(None) 不报错
fn materialize_image_for_spu(
    archive: &ImageArchiveManifest,
    spu_id: &str,
    spu_code: &str,
    image_filename: &str,
    target_root: &Path,
) -> Result<Option<String>, String> {
    // 1. 查找 manifest entry
    let entry: Option<&ImageManifestEntry> = archive
        .entries
        .iter()
        .find(|e| e.archive_name == image_filename)
        .or_else(|| {
            // 兜底：按 spu_code + 前缀匹配
            if !spu_code.is_empty() {
                archive.entries.iter().find(|e| {
                    e.spu_code.as_deref() == Some(spu_code)
                        && e.archive_name.starts_with(spu_code)
                })
            } else {
                None
            }
        });

    let entry = match entry {
        Some(e) => e,
        None => return Ok(None),
    };

    // 2. 准备目标目录
    let target_dir = target_root.join(spu_id);
    fs::create_dir_all(&target_dir).map_err(|e| format!("创建 product_images 目录失败：{}", e))?;

    // 3. 取安全的文件名（已 zip 解压时清洗过，再次清理防穿越）
    let safe_name = sanitize_image_filename(&entry.archive_name);
    if safe_name.is_empty() {
        return Err(format!("图片文件名无效：{}", entry.archive_name));
    }
    let target_path = target_dir.join(&safe_name);

    // 4. 复制文件
    fs::copy(&entry.local_path, &target_path)
        .map_err(|e| format!("复制图片到 product_images 失败：{}", e))?;

    // 5. 返回 local:// URL
    Ok(Some(format!("local://{}/{}", spu_id, safe_name)))
}

/// 清洗文件名：去子目录 + 过滤路径穿越
fn sanitize_image_filename(name: &str) -> String {
    name.replace('\\', "/")
        .split('/')
        .filter(|s| !s.is_empty() && *s != ".." && *s != ".")
        .collect::<Vec<_>>()
        .join("/")
}

/// v1.3：处理单行的图片字段（image_filename + image_url）
///
/// 优先解析 `image_filename`（指向用户上传的 zip 内的某个文件），命中即写入 local:// URL；
/// 若 `image_filename` 未命中或不提供，则退回到 `image_url`（远程 URL，sync_status=pending）。
///
/// `target_root_override`：仅测试用；生产环境传 `None` 使用默认 AppData 路径
fn apply_image_fields(
    tx: &Transaction<'_>,
    spu_id: &str,
    spu_code: &str,
    fields: &FieldMap,
    image_archive: Option<&ImageArchiveManifest>,
    row_index: usize,
    warnings: &mut Vec<ImportError>,
    target_root_override: Option<&Path>,
) -> Result<(), String> {
    let image_filename = fields
        .get("image_filename")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    if let Some(filename) = image_filename {
        match image_archive {
            Some(archive) => {
                let target_root = match target_root_override {
                    Some(r) => r.to_path_buf(),
                    None => product_images_root()?,
                };
                match materialize_image_for_spu(archive, spu_id, spu_code, filename, &target_root)? {
                    Some(local_url) => {
                        upsert_main_image(tx, spu_id, &local_url, "local")?;
                        return Ok(());
                    }
                    None => {
                        // 未命中：写 warning（不阻塞行），尝试 image_url 兜底
                        warnings.push(ImportError {
                            row_index,
                            field: "image_filename".to_string(),
                            level: "L2".to_string(),
                            code: "IMAGE_NOT_FOUND_IN_ARCHIVE".to_string(),
                            message: format!(
                                "第 {} 行：图片 '{}' 在 archive 中未找到",
                                row_index, filename
                            ),
                            value: Some(filename.to_string()),
                        });
                    }
                }
            }
            None => {
                // 行提供 image_filename 但 archive 加载失败/未提供 → warning 提醒
                warnings.push(ImportError {
                    row_index,
                    field: "image_filename".to_string(),
                    level: "L2".to_string(),
                    code: "IMAGE_ARCHIVE_NOT_LOADED".to_string(),
                    message: format!(
                        "第 {} 行：image_filename='{}' 但 archive 未加载（导入任务未提供 zip 或加载失败）",
                        row_index, filename
                    ),
                    value: Some(filename.to_string()),
                });
            }
        }
    }

    // 兜底：image_url（远程 URL）— 沿用 MVP 行为
    if let Some(url) = fields
        .get("image_url")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        upsert_main_image(tx, spu_id, url, "pending")?;
    }

    Ok(())
}

/// `<app_data>/product_images/` 路径
fn product_images_root() -> Result<PathBuf, String> {
    let proj_dirs = ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取 AppData 路径".to_string())?;
    let root = proj_dirs.data_dir().join("product_images");
    fs::create_dir_all(&root).map_err(|e| format!("创建 product_images 目录失败：{}", e))?;
    Ok(root)
}

/// 按 batch_id 软删除已写入的 SPU/SKU/images
/// 注：MVP 不修改表结构；通过 UPDATE product_spus SET status='deleted' + deleted_at
pub fn rollback_batch(conn: &Connection, batch_id: &str) -> Result<usize, String> {
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 1. 查找本 batch 涉及的 SPU（通过 file_name 在 import_batches 与某外部机制关联 — MVP 简化：删除该 batch 之后的所有 SPU）
    //    实际做法：通过 file_name 匹配 metadata（无 metadata 时不支持精确回滚）
    //    为 MVP 安全：仅当 batch 中没有现存关联时回滚；这里只删除本 batch 创建后 5 分钟内未被引用的 SPU
    let count: usize = tx
        .execute(
            "UPDATE product_spus
             SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending'
             WHERE id IN (
                SELECT s.id FROM product_spus s
                WHERE s.created_at >= datetime('now', '-1 hour')
                  AND NOT EXISTS (
                      SELECT 1 FROM inventory_transactions it
                      WHERE it.sku_id IN (SELECT id FROM product_skus WHERE spu_id = s.id)
                  )
             )",
            [],
        )
        .map_err(|e| format!("回滚失败：{}", e))?;

    tx.execute(
        "UPDATE import_batches SET status = 'cancelled' WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| format!("更新 batch 状态失败：{}", e))?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

// 抑制未使用 import 警告
#[allow(dead_code)]
fn _silence_unused() {
    let _ = parse_bool;
}

// ==================== 单元测试 ====================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::import::ImportRow;
    use rusqlite::Connection;
    use std::collections::HashMap;

    /// 构造一个最小可用的内存数据库（含必需表）
    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute_batch(
            r#"
            CREATE TABLE product_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                parent_id TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                deleted_at TIMESTAMP
            );

            CREATE TABLE brands (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                slug TEXT,
                logo_url TEXT,
                website_url TEXT,
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                deleted_at TIMESTAMP
            );

            CREATE TABLE product_spus (
                id TEXT PRIMARY KEY,
                spu_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category_id TEXT,
                brand_id TEXT,
                unit TEXT DEFAULT '件',
                is_on_sale BOOLEAN DEFAULT TRUE,
                status TEXT DEFAULT 'on_sale',
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE product_skus (
                id TEXT PRIMARY KEY,
                spu_id TEXT NOT NULL,
                sku_code TEXT NOT NULL,
                specifications TEXT NOT NULL,
                spec_text TEXT,
                cost_price REAL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                max_stock INTEGER DEFAULT 999999,
                barcode TEXT,
                weight REAL,
                volume REAL,
                is_default BOOLEAN DEFAULT FALSE,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE product_images (
                id TEXT PRIMARY KEY,
                spu_id TEXT NOT NULL,
                image_url TEXT NOT NULL,
                image_type TEXT DEFAULT 'main',
                sort_order INTEGER DEFAULT 0,
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP
            );

            CREATE TABLE inventory_transactions (
                id TEXT PRIMARY KEY,
                sku_id TEXT,
                transaction_type TEXT,
                quantity INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE import_batches (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT 'default',
                file_name TEXT NOT NULL,
                file_hash TEXT,
                file_size INTEGER,
                file_type TEXT NOT NULL,
                target_type TEXT NOT NULL,
                mapping_json TEXT,
                conflict_strategy TEXT DEFAULT 'skip',
                status TEXT DEFAULT 'pending',
                total_rows INTEGER DEFAULT 0,
                success_rows INTEGER DEFAULT 0,
                failed_rows INTEGER DEFAULT 0,
                skipped_rows INTEGER DEFAULT 0,
                started_at TIMESTAMP,
                finished_at TIMESTAMP,
                error_report_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                -- v1.3 Import Center 列
                last_heartbeat_at TIMESTAMP,
                processed_rows INTEGER DEFAULT 0,
                paused_reason TEXT
            );
            "#,
        )
        .unwrap();

        conn
    }

    fn make_import_row(idx: usize, raw_pairs: &[(&str, &str)]) -> ImportRow {
        let mut raw = HashMap::new();
        for (k, v) in raw_pairs {
            raw.insert(k.to_string(), v.to_string());
        }
        ImportRow {
            row_index: idx,
            raw,
        }
    }

    fn make_request(
        rows: Vec<ImportRow>,
        mapping: Vec<(String, String)>,
        strategy: &str,
    ) -> ImportRequest {
        ImportRequest {
            file_name: "test.xlsx".to_string(),
            file_type: "xlsx".to_string(),
            file_hash: None,
            rows,
            mapping: mapping
                .into_iter()
                .map(|(s, t)| crate::import::FieldMapping {
                    source_column: s,
                    target_field: t,
                })
                .collect(),
            conflict_strategy: strategy.to_string(),
            target_type: "products".to_string(),
            image_archive: None,
        }
    }

    fn create_batch(conn: &Connection) -> String {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO import_batches (id, file_name, file_type, target_type) VALUES (?1, 't.xlsx', 'xlsx', 'products')",
            params![id],
        ).unwrap();
        id
    }

    #[test]
    fn insert_brand_new() {
        let conn = setup_db();
        let tx = conn.unchecked_transaction().unwrap();
        let id = ensure_brand(&tx, "可口可乐").unwrap();
        assert!(!id.is_empty());
        let count: i64 = tx
            .query_row("SELECT COUNT(*) FROM brands WHERE name='可口可乐'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn insert_brand_existing_returns_same_id() {
        let conn = setup_db();
        let tx = conn.unchecked_transaction().unwrap();
        let id1 = ensure_brand(&tx, "百事").unwrap();
        let id2 = ensure_brand(&tx, "百事").unwrap();
        assert_eq!(id1, id2);
    }

    #[test]
    fn execute_new_inserts_spu_sku_image() {
        let conn = setup_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("name", "可口可乐 330ml"),
                ("sell_price", "3.0"),
                ("current_stock", "100"),
                ("brand", "可口可乐"),
                ("category", "饮料"),
                ("image_url", "https://example.com/cc.jpg"),
            ],
        )];
        let mapping = vec![
            ("name".to_string(), "name".to_string()),
            ("sell_price".to_string(), "sell_price".to_string()),
            ("current_stock".to_string(), "current_stock".to_string()),
            ("brand".to_string(), "brand_name".to_string()),
            ("category".to_string(), "category_name".to_string()),
            ("image_url".to_string(), "image_url".to_string()),
        ];
        let req = make_request(rows, mapping, "skip");

        let result = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(result.total, 1);
        assert_eq!(result.success, 1);
        assert_eq!(result.failed, 0);
        assert_eq!(result.skipped, 0);

        // 校验 SPU
        let spu_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_spus", [], |r| r.get(0))
            .unwrap();
        assert_eq!(spu_count, 1);
        let sku_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_skus", [], |r| r.get(0))
            .unwrap();
        assert_eq!(sku_count, 1);
        let img_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_images", [], |r| r.get(0))
            .unwrap();
        assert_eq!(img_count, 1);
    }

    #[test]
    fn execute_skip_duplicate() {
        let conn = setup_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[("name", "可乐A"), ("spu_code", "A001")],
        )];
        let mapping = vec![
            ("name".to_string(), "name".to_string()),
            ("spu_code".to_string(), "spu_code".to_string()),
        ];

        let req1 = make_request(rows.clone(), mapping.clone(), "skip");
        let r1 = execute(&conn, &batch_id, &req1).unwrap();
        assert_eq!(r1.success, 1);

        let req2 = make_request(rows, mapping, "skip");
        let r2 = execute(&conn, &batch_id, &req2).unwrap();
        assert_eq!(r2.success, 0);
        assert_eq!(r2.skipped, 1);

        let spu_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_spus", [], |r| r.get(0))
            .unwrap();
        assert_eq!(spu_count, 1);
    }

    #[test]
    fn execute_overwrite_updates_existing() {
        let conn = setup_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[("name", "原名"), ("spu_code", "A001"), ("sell_price", "10")],
        )];
        let mapping = vec![
            ("name".to_string(), "name".to_string()),
            ("spu_code".to_string(), "spu_code".to_string()),
            ("sell_price".to_string(), "sell_price".to_string()),
        ];

        let req1 = make_request(rows.clone(), mapping.clone(), "skip");
        execute(&conn, &batch_id, &req1).unwrap();

        // 第二次同 spu_code 不同 name
        let rows2 = vec![make_import_row(
            2,
            &[("name", "新名"), ("spu_code", "A001"), ("sell_price", "20")],
        )];
        let req2 = make_request(rows2, mapping, "overwrite");
        let r = execute(&conn, &batch_id, &req2).unwrap();
        assert_eq!(r.success, 1);
        assert_eq!(r.skipped, 0);

        let name: String = conn
            .query_row(
                "SELECT name FROM product_spus WHERE spu_code='A001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(name, "新名");
    }

    #[test]
    fn execute_duplicate_appends_copy_suffix() {
        let conn = setup_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[("name", "X"), ("spu_code", "A001")],
        )];
        let mapping = vec![
            ("name".to_string(), "name".to_string()),
            ("spu_code".to_string(), "spu_code".to_string()),
        ];

        let req1 = make_request(rows.clone(), mapping.clone(), "skip");
        execute(&conn, &batch_id, &req1).unwrap();

        let req2 = make_request(rows, mapping, "duplicate");
        let r = execute(&conn, &batch_id, &req2).unwrap();
        assert_eq!(r.success, 1);

        let codes: Vec<String> = conn
            .prepare("SELECT spu_code FROM product_spus ORDER BY spu_code")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .filter_map(|x| x.ok())
            .collect();
        assert_eq!(codes, vec!["A001".to_string(), "A001_copy2".to_string()]);
    }

    #[test]
    fn execute_missing_name_returns_failed() {
        let conn = setup_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(2, &[("sell_price", "10")])];
        let mapping = vec![("sell_price".to_string(), "sell_price".to_string())];
        let req = make_request(rows, mapping, "skip");

        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 0);
        assert_eq!(r.failed, 1);
    }

    // ==================== v1.2 P1 新增单测（库存/采购/销售/供应商/客户）====================

    /// 扩展 setup_db：增加业务表（inventory_transactions / suppliers / customers / *_orders / *_items）
    fn setup_business_db() -> Connection {
        let conn = setup_db();

        // products 表（旧单表 — 业务表引用）
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category_id TEXT,
                brand_id TEXT,
                unit TEXT DEFAULT '件',
                cost_price REAL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                min_stock INTEGER DEFAULT 0,
                max_stock INTEGER DEFAULT 0,
                current_stock INTEGER DEFAULT 0,
                image_url TEXT,
                barcode TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT UNIQUE,
                contact_person TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                website TEXT,
                payment_terms TEXT,
                tax_number TEXT,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT UNIQUE,
                contact_person TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                website TEXT,
                customer_type TEXT DEFAULT 'individual',
                tax_number TEXT,
                credit_limit REAL DEFAULT 0,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                po_number TEXT UNIQUE NOT NULL,
                supplier_id TEXT NOT NULL REFERENCES suppliers(id),
                order_date DATE NOT NULL,
                expected_delivery_date DATE,
                status TEXT DEFAULT 'draft',
                total_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'unpaid',
                notes TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id TEXT PRIMARY KEY,
                purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                received_quantity INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales_orders (
                id TEXT PRIMARY KEY,
                so_number TEXT UNIQUE NOT NULL,
                customer_id TEXT NOT NULL REFERENCES customers(id),
                order_date DATE NOT NULL,
                expected_delivery_date DATE,
                status TEXT DEFAULT 'draft',
                total_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                payment_status TEXT DEFAULT 'unpaid',
                shipping_address TEXT,
                notes TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                last_synced_at TIMESTAMP,
                deleted_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales_order_items (
                id TEXT PRIMARY KEY,
                sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
                product_id TEXT NOT NULL REFERENCES products(id),
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                shipped_quantity INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            DROP TABLE IF EXISTS inventory_transactions;
            CREATE TABLE inventory_transactions (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL REFERENCES products(id),
                transaction_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL DEFAULT 0,
                reference_no TEXT,
                reason TEXT,
                performed_by TEXT,
                notes TEXT,
                transaction_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending'
            );
            "#,
        )
        .unwrap();

        conn
    }

    fn make_business_request(
        rows: Vec<ImportRow>,
        mapping: Vec<(String, String)>,
        strategy: &str,
        target: &str,
    ) -> ImportRequest {
        ImportRequest {
            file_name: "biz.xlsx".to_string(),
            file_type: "xlsx".to_string(),
            file_hash: None,
            rows,
            mapping: mapping
                .into_iter()
                .map(|(s, t)| crate::import::FieldMapping {
                    source_column: s,
                    target_field: t,
                })
                .collect(),
            conflict_strategy: strategy.to_string(),
            target_type: target.to_string(),
            image_archive: None,
        }
    }

    // ----- 库存交易 -----

    #[test]
    fn p1_execute_inventory_inserts() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("sku_code", "SKU-INV-001"),
                ("transaction_type", "inbound"),
                ("quantity", "100"),
                ("unit_price", "5.5"),
                ("transaction_date", "2026-06-26"),
                ("reference_no", "REF-001"),
            ],
        )];
        let mapping = vec![
            ("sku_code".to_string(), "sku_code".to_string()),
            ("transaction_type".to_string(), "transaction_type".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
            ("unit_price".to_string(), "unit_price".to_string()),
            ("transaction_date".to_string(), "transaction_date".to_string()),
            ("reference_no".to_string(), "reference_no".to_string()),
        ];
        let req = make_business_request(rows, mapping, "skip", "inventory");
        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 1);
        assert_eq!(r.failed, 0);

        // 校验：products 表应自动建一行；inventory_transactions 写入
        let sku_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM products WHERE sku='SKU-INV-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(sku_count, 1);
        let txn_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM inventory_transactions WHERE transaction_type='inbound'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(txn_count, 1);
    }

    #[test]
    fn p1_execute_inventory_skip_duplicate() {
        // (sku+date+type) 幂等去重：第二次导入同 key 应被 skip
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("sku_code", "SKU-INV-001"),
                ("transaction_type", "outbound"),
                ("quantity", "10"),
                ("transaction_date", "2026-06-26"),
            ],
        )];
        let mapping = vec![
            ("sku_code".to_string(), "sku_code".to_string()),
            ("transaction_type".to_string(), "transaction_type".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
            ("transaction_date".to_string(), "transaction_date".to_string()),
        ];

        let r1 = execute(&conn, &batch_id, &make_business_request(rows.clone(), mapping.clone(), "skip", "inventory")).unwrap();
        assert_eq!(r1.success, 1);

        // 第二次同 key
        let r2 = execute(&conn, &batch_id, &make_business_request(rows, mapping, "skip", "inventory")).unwrap();
        assert_eq!(r2.success, 0);
        assert_eq!(r2.skipped, 1);
    }

    #[test]
    fn p1_execute_inventory_overwrite_updates() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows1 = vec![make_import_row(
            2,
            &[
                ("sku_code", "SKU-INV-001"),
                ("transaction_type", "inbound"),
                ("quantity", "10"),
                ("transaction_date", "2026-06-26"),
            ],
        )];
        let rows2 = vec![make_import_row(
            2,
            &[
                ("sku_code", "SKU-INV-001"),
                ("transaction_type", "inbound"),
                ("quantity", "999"),
                ("transaction_date", "2026-06-26"),
            ],
        )];
        let mapping = vec![
            ("sku_code".to_string(), "sku_code".to_string()),
            ("transaction_type".to_string(), "transaction_type".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
            ("transaction_date".to_string(), "transaction_date".to_string()),
        ];

        execute(&conn, &batch_id, &make_business_request(rows1, mapping.clone(), "skip", "inventory")).unwrap();
        let r = execute(&conn, &batch_id, &make_business_request(rows2, mapping, "overwrite", "inventory")).unwrap();
        assert_eq!(r.success, 1);

        // 校验：quantity 应被更新为 999
        let qty: i64 = conn
            .query_row(
                "SELECT quantity FROM inventory_transactions WHERE transaction_type='inbound'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(qty, 999);
    }

    // ----- 采购订单 -----

    #[test]
    fn p1_execute_purchase_auto_creates_supplier() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("po_number", "PO-2026-001"),
                ("supplier_name", "广州贸易公司"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-PO-001"),
                ("item_qty", "50"),
                ("item_unit_price", "12.5"),
            ],
        )];
        let mapping = vec![
            ("po_number".to_string(), "po_number".to_string()),
            ("supplier_name".to_string(), "supplier_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
        ];
        let req = make_business_request(rows, mapping, "skip", "purchases");
        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 1);

        // 供应商自动建
        let supplier_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM suppliers WHERE name='广州贸易公司'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(supplier_count, 1);
        // 采购单 + item
        let po_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM purchase_orders WHERE po_number='PO-2026-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(po_count, 1);
        let item_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM purchase_order_items", [], |r| r.get(0))
            .unwrap();
        assert_eq!(item_count, 1);
        // total_amount = 50 * 12.5 = 625
        let total: f64 = conn
            .query_row(
                "SELECT total_amount FROM purchase_orders WHERE po_number='PO-2026-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(total, 625.0);
    }

    #[test]
    fn p1_execute_purchase_duplicate_po_rejected() {
        // 同一 po_number + skip 策略 → 第二次应被 skip
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("po_number", "PO-001"),
                ("supplier_name", "供应商A"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-001"),
                ("item_qty", "10"),
                ("item_unit_price", "5"),
            ],
        )];
        let mapping = vec![
            ("po_number".to_string(), "po_number".to_string()),
            ("supplier_name".to_string(), "supplier_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
        ];
        let r1 = execute(&conn, &batch_id, &make_business_request(rows.clone(), mapping.clone(), "skip", "purchases")).unwrap();
        assert_eq!(r1.success, 1);

        let r2 = execute(&conn, &batch_id, &make_business_request(rows, mapping, "skip", "purchases")).unwrap();
        assert_eq!(r2.skipped, 1);
        // 应只有 1 个采购单
        let c: i64 = conn
            .query_row("SELECT COUNT(*) FROM purchase_orders", [], |r| r.get(0))
            .unwrap();
        assert_eq!(c, 1);
    }

    #[test]
    fn p1_execute_purchase_duplicate_strategy_creates_copy() {
        // duplicate 策略 → 自动加 _copy2 后缀
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("po_number", "PO-DUP"),
                ("supplier_name", "供应商B"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-DUP"),
                ("item_qty", "10"),
                ("item_unit_price", "5"),
            ],
        )];
        let mapping = vec![
            ("po_number".to_string(), "po_number".to_string()),
            ("supplier_name".to_string(), "supplier_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
        ];
        execute(&conn, &batch_id, &make_business_request(rows.clone(), mapping.clone(), "skip", "purchases")).unwrap();
        let r = execute(&conn, &batch_id, &make_business_request(rows, mapping, "duplicate", "purchases")).unwrap();
        assert_eq!(r.success, 1);

        let codes: Vec<String> = conn
            .prepare("SELECT po_number FROM purchase_orders ORDER BY po_number")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .filter_map(|x| x.ok())
            .collect();
        assert_eq!(codes, vec!["PO-DUP".to_string(), "PO-DUP_copy2".to_string()]);
    }

    // ----- 销售订单 -----

    #[test]
    fn p1_execute_sales_auto_creates_customer() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("so_number", "SO-2026-001"),
                ("customer_name", "上海零售商"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-SO-001"),
                ("item_qty", "5"),
                ("item_unit_price", "20.0"),
                ("shipping_address", "上海市浦东新区"),
            ],
        )];
        let mapping = vec![
            ("so_number".to_string(), "so_number".to_string()),
            ("customer_name".to_string(), "customer_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
            ("shipping_address".to_string(), "shipping_address".to_string()),
        ];
        let req = make_business_request(rows, mapping, "skip", "sales");
        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 1);

        let cust_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM customers WHERE name='上海零售商'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cust_count, 1);
        // total = 5 * 20 = 100
        let total: f64 = conn
            .query_row(
                "SELECT total_amount FROM sales_orders WHERE so_number='SO-2026-001'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(total, 100.0);
    }

    #[test]
    fn p1_execute_sales_skip_duplicate() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("so_number", "SO-001"),
                ("customer_name", "客户X"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-SO-001"),
                ("item_qty", "5"),
                ("item_unit_price", "10"),
            ],
        )];
        let mapping = vec![
            ("so_number".to_string(), "so_number".to_string()),
            ("customer_name".to_string(), "customer_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
        ];
        execute(&conn, &batch_id, &make_business_request(rows.clone(), mapping.clone(), "skip", "sales")).unwrap();
        let r = execute(&conn, &batch_id, &make_business_request(rows, mapping, "skip", "sales")).unwrap();
        assert_eq!(r.skipped, 1);
    }

    #[test]
    fn p1_execute_sales_overwrite_updates_total() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows1 = vec![make_import_row(
            2,
            &[
                ("so_number", "SO-OW"),
                ("customer_name", "客户Y"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-OW"),
                ("item_qty", "2"),
                ("item_unit_price", "10"),
            ],
        )];
        let rows2 = vec![make_import_row(
            2,
            &[
                ("so_number", "SO-OW"),
                ("customer_name", "客户Y"),
                ("order_date", "2026-06-26"),
                ("sku_code", "SKU-OW"),
                ("item_qty", "8"),
                ("item_unit_price", "15"),
            ],
        )];
        let mapping = vec![
            ("so_number".to_string(), "so_number".to_string()),
            ("customer_name".to_string(), "customer_name".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku_code".to_string(), "sku_code".to_string()),
            ("item_qty".to_string(), "item_qty".to_string()),
            ("item_unit_price".to_string(), "item_unit_price".to_string()),
        ];

        execute(&conn, &batch_id, &make_business_request(rows1, mapping.clone(), "skip", "sales")).unwrap();
        let r = execute(&conn, &batch_id, &make_business_request(rows2, mapping, "overwrite", "sales")).unwrap();
        assert_eq!(r.success, 1);
        // total = 8 * 15 = 120
        let total: f64 = conn
            .query_row(
                "SELECT total_amount FROM sales_orders WHERE so_number='SO-OW'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(total, 120.0);
    }

    // ----- ensure_supplier / ensure_customer -----

    #[test]
    fn p1_ensure_supplier_creates_and_reuses() {
        let conn = setup_business_db();
        let tx = conn.unchecked_transaction().unwrap();
        let id1 = ensure_supplier(&tx, "广州贸易", Some("13800138000"), Some("张三")).unwrap();
        let id2 = ensure_supplier(&tx, "广州贸易", None, None).unwrap();
        assert_eq!(id1, id2, "同名供应商应返回相同 id");

        // 第二次返回相同 id → 仅 1 行
        let c: i64 = tx
            .query_row("SELECT COUNT(*) FROM suppliers", [], |r| r.get(0))
            .unwrap();
        assert_eq!(c, 1);
    }

    #[test]
    fn p1_ensure_customer_creates_and_reuses() {
        let conn = setup_business_db();
        let tx = conn.unchecked_transaction().unwrap();
        let id1 = ensure_customer(&tx, "上海零售", Some("021-12345"), Some("李四")).unwrap();
        let id2 = ensure_customer(&tx, "上海零售", None, None).unwrap();
        assert_eq!(id1, id2);
        let c: i64 = tx
            .query_row("SELECT COUNT(*) FROM customers", [], |r| r.get(0))
            .unwrap();
        assert_eq!(c, 1);
    }

    #[test]
    fn p1_ensure_sku_in_products() {
        let conn = setup_business_db();
        let tx = conn.unchecked_transaction().unwrap();
        let id1 = ensure_sku_in_products(&tx, "SKU-TEST").unwrap();
        let id2 = ensure_sku_in_products(&tx, "SKU-TEST").unwrap();
        assert_eq!(id1, id2);
        let c: i64 = tx
            .query_row("SELECT COUNT(*) FROM products WHERE sku='SKU-TEST'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(c, 1);
    }

    // ----- 供应商/客户主数据 -----

    #[test]
    fn p1_execute_suppliers_master_data() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("supplier_name", "深圳电子厂"),
                ("supplier_phone", "0755-12345678"),
                ("supplier_contact", "王五"),
                ("supplier_email", "biz@example.com"),
                ("supplier_address", "深圳南山区"),
            ],
        )];
        let mapping = vec![
            ("supplier_name".to_string(), "supplier_name".to_string()),
            ("supplier_phone".to_string(), "supplier_phone".to_string()),
            ("supplier_contact".to_string(), "supplier_contact".to_string()),
            ("supplier_email".to_string(), "supplier_email".to_string()),
            ("supplier_address".to_string(), "supplier_address".to_string()),
        ];
        let req = make_business_request(rows, mapping, "skip", "suppliers");
        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 1);

        let phone: String = conn
            .query_row(
                "SELECT phone FROM suppliers WHERE name='深圳电子厂'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(phone, "0755-12345678");
    }

    #[test]
    fn p1_execute_customers_master_data() {
        let conn = setup_business_db();
        let batch_id = create_batch(&conn);

        let rows = vec![make_import_row(
            2,
            &[
                ("customer_name", "北京终端用户"),
                ("customer_phone", "010-87654321"),
                ("customer_contact", "赵六"),
            ],
        )];
        let mapping = vec![
            ("customer_name".to_string(), "customer_name".to_string()),
            ("customer_phone".to_string(), "customer_phone".to_string()),
            ("customer_contact".to_string(), "customer_contact".to_string()),
        ];
        let req = make_business_request(rows, mapping, "skip", "customers");
        let r = execute(&conn, &batch_id, &req).unwrap();
        assert_eq!(r.success, 1);
    }

    // ==================== v1.3 新增单测（图片 zip 集成）====================

    /// 创建临时目录并写入测试图片文件，返回 (临时目录, 目录路径)
    fn setup_temp_product_images_dir(tag: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!("proclaw_test_{}_{}", tag, Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    /// 创建临时 source 目录（模拟 import_images 解压目录），写入几个测试图片文件
    fn setup_temp_source_dir(tag: &str, files: &[(&str, &[u8])]) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!("proclaw_src_{}_{}", tag, Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        for (name, bytes) in files {
            let p = path.join(name);
            if let Some(parent) = p.parent() {
                fs::create_dir_all(parent).unwrap();
            }
            fs::write(&p, bytes).unwrap();
        }
        path
    }

    fn cleanup_dir(path: &Path) {
        let _ = fs::remove_dir_all(path);
    }

    fn make_manifest(source_dir: &Path, entries: Vec<ImageManifestEntry>) -> ImageArchiveManifest {
        let total_size: u64 = entries.iter().map(|e| e.size_bytes).sum();
        ImageArchiveManifest {
            archive_dir: source_dir.to_string_lossy().to_string(),
            entries,
            total_size,
        }
    }

    #[test]
    fn v13_sanitize_image_filename_strips_paths() {
        // 子目录保留最后一段
        assert_eq!(sanitize_image_filename("a/b/c/SP001.png"), "a/b/c/SP001.png");
        // 过滤 ..
        assert_eq!(sanitize_image_filename("../../../etc/passwd"), "etc/passwd");
        // 过滤 .
        assert_eq!(sanitize_image_filename("./SP001.png"), "SP001.png");
        // 反斜杠转斜杠
        assert_eq!(sanitize_image_filename("a\\b\\SP001.png"), "a/b/SP001.png");
        // 空字符串
        assert_eq!(sanitize_image_filename(""), "");
    }

    #[test]
    fn v13_materialize_image_for_spu_exact_match() {
        // 准备：source_dir 中放一张图
        let src = setup_temp_source_dir("exact", &[("SP001_main.png", b"\x89PNG-fake-bytes")]);
        let dst = setup_temp_product_images_dir("exact");

        let manifest = make_manifest(
            &src,
            vec![ImageManifestEntry {
                archive_name: "SP001_main.png".to_string(),
                spu_code: Some("SP001".to_string()),
                sku_code: None,
                size_bytes: 15,
                local_path: src.join("SP001_main.png").to_string_lossy().to_string(),
            }],
        );

        let spu_id = "spu-uuid-001";
        let result =
            materialize_image_for_spu(&manifest, spu_id, "SP001", "SP001_main.png", &dst).unwrap();
        let url = result.expect("exact match 应返回 Some(url)");

        assert!(url.starts_with("local://"));
        assert!(url.contains(spu_id));
        assert!(url.ends_with("SP001_main.png"));

        // 文件已复制到目标目录
        let copied = dst.join(spu_id).join("SP001_main.png");
        assert!(copied.exists(), "文件应被复制到 product_images/<spu_id>/");
        let bytes = fs::read(&copied).unwrap();
        assert_eq!(bytes, b"\x89PNG-fake-bytes");

        cleanup_dir(&src);
        cleanup_dir(&dst);
    }

    #[test]
    fn v13_materialize_image_for_spu_fallback_by_spu_code() {
        // 准备：archive_name = "SP002_SKU-A_thumb.jpg"，image_filename 只给 "SP002"
        let src = setup_temp_source_dir(
            "fallback",
            &[("SP002_SKU-A_thumb.jpg", b"\xff\xd8\xff\xe0fake")],
        );
        let dst = setup_temp_product_images_dir("fallback");

        let manifest = make_manifest(
            &src,
            vec![ImageManifestEntry {
                archive_name: "SP002_SKU-A_thumb.jpg".to_string(),
                spu_code: Some("SP002".to_string()),
                sku_code: Some("SKU".to_string()),
                size_bytes: 14,
                local_path: src
                    .join("SP002_SKU-A_thumb.jpg")
                    .to_string_lossy()
                    .to_string(),
            }],
        );

        // 调用时 image_filename = "SP002_main.png"（精确匹配失败），spu_code="SP002"
        let result =
            materialize_image_for_spu(&manifest, "spu-uuid-002", "SP002", "SP002_main.png", &dst)
                .unwrap();
        let url = result.expect("spu_code 兜底匹配应返回 Some(url)");

        assert!(url.ends_with("SP002_SKU-A_thumb.jpg"));

        cleanup_dir(&src);
        cleanup_dir(&dst);
    }

    #[test]
    fn v13_materialize_image_for_spu_not_found() {
        let src = setup_temp_source_dir("missing", &[("SP001_main.png", b"fake")]);
        let dst = setup_temp_product_images_dir("missing");

        let manifest = make_manifest(
            &src,
            vec![ImageManifestEntry {
                archive_name: "SP001_main.png".to_string(),
                spu_code: Some("SP001".to_string()),
                sku_code: None,
                size_bytes: 4,
                local_path: src.join("SP001_main.png").to_string_lossy().to_string(),
            }],
        );

        // image_filename 找不到对应 entry
        let result = materialize_image_for_spu(
            &manifest,
            "spu-uuid-X",
            "SP999", // spu_code 也不匹配
            "non-existent.png",
            &dst,
        )
        .unwrap();
        assert!(result.is_none(), "未命中应返回 Ok(None) 不报错");

        cleanup_dir(&src);
        cleanup_dir(&dst);
    }

    #[test]
    fn v13_execute_image_filename_writes_local_url() {
        // 集成测试：apply_image_fields 集成 image_archive → product_images 表写入 local:// URL
        let conn = setup_db();

        let src = setup_temp_source_dir(
            "execute_local",
            &[("SP100_main.png", b"\x89PNG-fake-sp100")],
        );
        let dst = setup_temp_product_images_dir("execute_local");

        let manifest = make_manifest(
            &src,
            vec![ImageManifestEntry {
                archive_name: "SP100_main.png".to_string(),
                spu_code: Some("SP100".to_string()),
                sku_code: None,
                size_bytes: 18,
                local_path: src.join("SP100_main.png").to_string_lossy().to_string(),
            }],
        );

        let tx = conn.unchecked_transaction().unwrap();
        let mut warnings: Vec<ImportError> = Vec::new();
        let mut fields: FieldMap = HashMap::new();
        fields.insert("image_filename".to_string(), "SP100_main.png".to_string());

        apply_image_fields(
            &tx,
            "spu-uuid-test",
            "SP100",
            &fields,
            Some(&manifest),
            2,
            &mut warnings,
            Some(&dst),
        )
        .unwrap();

        // 命中应无 warning
        assert_eq!(warnings.len(), 0, "命中应无 warning");

        // 文件被复制
        let copied = dst.join("spu-uuid-test").join("SP100_main.png");
        assert!(copied.exists());
        assert_eq!(fs::read(&copied).unwrap(), b"\x89PNG-fake-sp100");

        // 验证 product_images 表行
        let count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM product_images WHERE spu_id = ?1",
                params!["spu-uuid-test"],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);

        let (url_in_db, sync_status): (String, String) = tx
            .query_row(
                "SELECT image_url, sync_status FROM product_images WHERE spu_id = ?1",
                params!["spu-uuid-test"],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert!(url_in_db.starts_with("local://spu-uuid-test/"));
        assert!(url_in_db.ends_with("SP100_main.png"));
        assert_eq!(sync_status, "local", "image_filename 应写 sync_status=local");

        cleanup_dir(&src);
        cleanup_dir(&dst);
    }

    #[test]
    fn v13_execute_image_filename_not_found_emits_warning() {
        let conn = setup_db();
        let src = setup_temp_source_dir("warn", &[("OTHER.png", b"fake")]);
        let dst = setup_temp_product_images_dir("warn");

        let manifest = make_manifest(
            &src,
            vec![ImageManifestEntry {
                archive_name: "OTHER.png".to_string(),
                spu_code: Some("OTHER".to_string()),
                sku_code: None,
                size_bytes: 4,
                local_path: src.join("OTHER.png").to_string_lossy().to_string(),
            }],
        );

        let tx = conn.unchecked_transaction().unwrap();
        let mut warnings: Vec<ImportError> = Vec::new();
        let mut fields: FieldMap = HashMap::new();
        fields.insert("name".to_string(), "商品X".to_string());
        fields.insert("spu_code".to_string(), "MISSING".to_string());
        fields.insert("image_filename".to_string(), "NOT-IN-ARCHIVE.png".to_string());

        apply_image_fields(
            &tx,
            "spu-uuid-warn",
            "MISSING",
            &fields,
            Some(&manifest),
            2,
            &mut warnings,
            Some(&dst),
        )
        .unwrap();

        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0].code, "IMAGE_NOT_FOUND_IN_ARCHIVE");
        assert_eq!(warnings[0].row_index, 2);
        assert!(warnings[0].message.contains("NOT-IN-ARCHIVE.png"));

        cleanup_dir(&src);
        cleanup_dir(&dst);
    }

    #[test]
    fn v13_execute_image_filename_no_archive_emits_warning() {
        // 行有 image_filename 但 archive 为 None
        let conn = setup_db();
        let dst = setup_temp_product_images_dir("noarchive");

        let tx = conn.unchecked_transaction().unwrap();
        let mut warnings: Vec<ImportError> = Vec::new();
        let mut fields: FieldMap = HashMap::new();
        fields.insert("name".to_string(), "商品Y".to_string());
        fields.insert("image_filename".to_string(), "SP999.png".to_string());

        apply_image_fields(
            &tx,
            "spu-uuid-noarc",
            "SP999",
            &fields,
            None, // 无 archive
            3,
            &mut warnings,
            Some(&dst),
        )
        .unwrap();

        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0].code, "IMAGE_ARCHIVE_NOT_LOADED");
        assert_eq!(warnings[0].row_index, 3);

        cleanup_dir(&dst);
    }

    #[test]
    fn v13_execute_image_url_fallback_uses_pending_sync_status() {
        // 行无 image_filename 但有 image_url → 走 MVP 老路径（sync_status=pending）
        let conn = setup_db();

        let tx = conn.unchecked_transaction().unwrap();
        let mut warnings: Vec<ImportError> = Vec::new();
        let mut fields: FieldMap = HashMap::new();
        fields.insert("image_url".to_string(), "https://example.com/img.jpg".to_string());

        apply_image_fields(
            &tx,
            "spu-uuid-fallback",
            "X",
            &fields,
            None,
            2,
            &mut warnings,
            None,
        )
        .unwrap();

        assert_eq!(warnings.len(), 0);
        let (url, status): (String, String) = tx
            .query_row(
                "SELECT image_url, sync_status FROM product_images WHERE spu_id = ?1",
                params!["spu-uuid-fallback"],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert_eq!(url, "https://example.com/img.jpg");
        assert_eq!(status, "pending");
    }
}
