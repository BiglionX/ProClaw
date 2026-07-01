//! ProClaw 批量导入中心 - 校验 + 执行入库（v1.2 P1）
//!
//! ## 责任
//! 1. `validate_batch`：遍历已解析的行 → 检查必填/类型/外键 → 把错误写到 `import_batch_errors`
//! 2. `execute_batch`：按目标类型调用 `process_*` 写库 → 成功/失败计数
//!
//! ## 6 类目标的 process 函数
//! - `process_product`     → `products` 表（简单商品库）+ `product_spus` / `product_skus` 一并创建
//! - `process_inventory`   → `inventory_transactions` 表（按 sku_code + date + type 去重）
//! - `process_purchase`    → `purchase_orders` + `purchase_order_items`（按 po_number upsert）
//! - `process_sales`       → `sales_orders` + `sales_order_items`（按 so_number upsert）
//! - `process_supplier`    → `suppliers` 表（按 name 或 code upsert）
//! - `process_customer`    → `customers` 表（按 name 或 code upsert）

use crate::database::Database;
use crate::import::parser::{parse_bytes, ParseResult};
use crate::import::types::{required_fields_for, FieldMap, ImportTarget};
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

// ============================================
// 1. 数据级校验
// ============================================

#[derive(Debug, Clone)]
pub struct RowValidation {
    pub row_index: usize,
    pub is_valid: bool,
    pub errors: Vec<RowError>,
    pub mapped: FieldMap, // 清洗 / 类型转换后的字段值
}

#[derive(Debug, Clone)]
pub struct RowError {
    pub field: Option<String>,
    pub code: String,    // e.g. "required_missing" / "invalid_number" / "duplicate_key"
    pub message: String,
    pub raw_value: Option<String>,
}

/// 校验一个目标类型下的所有行
pub fn validate_batch(
    parsed: &ParseResult,
    target: ImportTarget,
    column_mapping: &std::collections::HashMap<String, String>,
    default_values: &std::collections::HashMap<String, String>,
) -> Vec<RowValidation> {
    let required = required_fields_for(target.as_str());
    let mut results = Vec::with_capacity(parsed.rows.len());

    for row in &parsed.rows {
        let mut errors = Vec::new();
        let mut mapped = FieldMap::new();

        // 1) 应用列映射（列名 → 字段 key）
        for (col_name, value) in &row.fields {
            if let Some(field_key) = column_mapping.get(col_name) {
                if !field_key.is_empty() {
                    mapped.insert(field_key.clone(), value.clone());
                }
            }
        }

        // 2) 应用默认值
        for (k, v) in default_values {
            mapped.entry(k.clone()).or_insert_with(|| v.clone());
        }

        // 3) 必填校验 + 类型校验
        for req_key in required {
            let v = mapped.get(*req_key).map(|s| s.as_str()).unwrap_or("");
            if v.trim().is_empty() {
                errors.push(RowError {
                    field: Some((*req_key).to_string()),
                    code: "required_missing".to_string(),
                    message: format!("必填字段缺失: {}", req_key),
                    raw_value: None,
                });
                continue;
            }

            // 类型校验
            match *req_key {
                "quantity" | "unit_price" | "cost_price" | "sell_price" | "current_stock"
                | "min_stock" | "max_stock" => {
                    if v.trim().parse::<f64>().is_err() {
                        errors.push(RowError {
                            field: Some((*req_key).to_string()),
                            code: "invalid_number".to_string(),
                            message: format!("{} 不是有效数字: {}", req_key, v),
                            raw_value: Some(v.to_string()),
                        });
                    }
                }
                _ => {}
            }
        }

        // 4) 可选数值字段 - 出现了就要能解析
        for optional_numeric in &["quantity", "unit_price", "cost_price", "sell_price", "current_stock", "min_stock", "max_stock"] {
            if let Some(v) = mapped.get(*optional_numeric) {
                if !v.trim().is_empty() && v.trim().parse::<f64>().is_err() {
                    errors.push(RowError {
                        field: Some((*optional_numeric).to_string()),
                        code: "invalid_number".to_string(),
                        message: format!("{} 不是有效数字: {}", optional_numeric, v),
                        raw_value: Some(v.clone()),
                    });
                }
            }
        }

        // 5) 日期字段（如果有值）格式校验
        for date_key in &["order_date", "transaction_date", "expected_delivery_date"] {
            if let Some(v) = mapped.get(*date_key) {
                if !v.trim().is_empty() && !is_valid_date(v.trim()) {
                    errors.push(RowError {
                        field: Some((*date_key).to_string()),
                        code: "invalid_date".to_string(),
                        message: format!("{} 日期格式无效（应为 YYYY-MM-DD）: {}", date_key, v),
                        raw_value: Some(v.clone()),
                    });
                }
            }
        }

        // 6) 库存交易类型白名单
        if target == ImportTarget::Inventory {
            if let Some(t) = mapped.get("transaction_type") {
                if !matches!(t.to_lowercase().as_str(), "inbound" | "outbound" | "adjustment" | "transfer" | "入库" | "出库" | "调整" | "调拨") {
                    errors.push(RowError {
                        field: Some("transaction_type".to_string()),
                        code: "invalid_enum".to_string(),
                        message: format!("交易类型应为 inbound/outbound/adjustment/transfer: {}", t),
                        raw_value: Some(t.clone()),
                    });
                }
            }
        }

        results.push(RowValidation {
            row_index: row.row_index,
            is_valid: errors.is_empty(),
            errors,
            mapped,
        });
    }

    results
}

/// 简易日期校验（YYYY-MM-DD）
fn is_valid_date(s: &str) -> bool {
    // 期望 2026-07-01 这种长度 10 的 ISO 日期
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let ok = parts[0].len() == 4 && parts[0].chars().all(|c| c.is_ascii_digit())
        && parts[1].len() == 2 && parts[1].chars().all(|c| c.is_ascii_digit())
        && parts[2].len() == 2 && parts[2].chars().all(|c| c.is_ascii_digit());
    if !ok {
        return false;
    }
    let m: u32 = parts[1].parse().unwrap_or(0);
    let d: u32 = parts[2].parse().unwrap_or(0);
    (1..=12).contains(&m) && (1..=31).contains(&d)
}

/// 把中文交易类型归一为英文
fn normalize_txn_type(s: &str) -> String {
    match s.to_lowercase().as_str() {
        "入库" => "inbound",
        "出库" => "outbound",
        "调整" => "adjustment",
        "调拨" => "transfer",
        other => other,
    }
    .to_string()
}

// ============================================
// 2. 执行入库（6 类目标）
// ============================================

#[derive(Debug, Clone, Default)]
pub struct ExecuteStats {
    pub processed: i64,
    pub success: i64,
    pub failed: i64,
    pub skipped: i64,
}

/// 主入口：执行批次（必须在 validate 之后调用）
pub fn execute_batch(
    db: &Database,
    batch_id: &str,
    target: ImportTarget,
    parsed: &ParseResult,
    column_mapping: &std::collections::HashMap<String, String>,
    default_values: &std::collections::HashMap<String, String>,
    skip_errors: bool,
) -> Result<ExecuteStats, String> {
    let validated = validate_batch(parsed, target, column_mapping, default_values);
    let mut stats = ExecuteStats::default();
    stats.processed = validated.len() as i64;

    let conn = db.connection();
    // 一次性事务：失败可整体回滚（partial 模式则不 commit 失败行）
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for v in &validated {
        if !v.is_valid {
            stats.failed += 1;
            for err in &v.errors {
                if let Err(e) = tx.execute(
                    "INSERT INTO import_batch_errors
                       (id, batch_id, row_index, field_name, error_code, error_message, raw_value, phase)
                       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'importing')",
                    params![
                        Uuid::new_v4().to_string(),
                        batch_id,
                        v.row_index as i64,
                        err.field,
                        err.code,
                        err.message,
                        err.raw_value
                    ],
                ) {
                    if !skip_errors {
                        let _ = tx.rollback();
                        return Err(format!("写错误日志失败: {}", e));
                    }
                }
            }
            continue;
        }

        let result = match target {
            ImportTarget::Products => process_product(&tx, &v.mapped),
            ImportTarget::Inventory => process_inventory(&tx, &v.mapped),
            ImportTarget::Purchases => process_purchase(&tx, &v.mapped),
            ImportTarget::Sales => process_sales(&tx, &v.mapped),
            ImportTarget::Suppliers => process_supplier(&tx, &v.mapped),
            ImportTarget::Customers => process_customer(&tx, &v.mapped),
        };

        match result {
            Ok(()) => stats.success += 1,
            Err(e) => {
                stats.failed += 1;
                if let Err(write_err) = tx.execute(
                    "INSERT INTO import_batch_errors
                       (id, batch_id, row_index, field_name, error_code, error_message, raw_value, phase)
                       VALUES (?1, ?2, ?3, NULL, 'import_error', ?4, NULL, 'importing')",
                    params![
                        Uuid::new_v4().to_string(),
                        batch_id,
                        v.row_index as i64,
                        format!("入库失败: {}", e),
                    ],
                ) {
                    if !skip_errors {
                        let _ = tx.rollback();
                        return Err(format!("写错误日志失败: {}", write_err));
                    }
                }
            }
        }
    }

    tx.commit().map_err(|e| format!("commit 失败: {}", e))?;
    Ok(stats)
}

// ============================================
// 3. 6 类目标的 process 函数
// ============================================

/// 商品库（products 简单表 + 可选 product_spus / product_skus）
/// 幂等：以 sku 为 upsert key
fn process_product(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let sku = fields.get("sku").cloned().unwrap_or_default();
    let name = fields.get("name").cloned().unwrap_or_default();
    if sku.is_empty() || name.is_empty() {
        return Err("sku / name 不能为空".to_string());
    }

    // 1) 解析 category 名 → category_id
    let category_id = fields
        .get("category")
        .filter(|s| !s.is_empty())
        .map(|cat_name| ensure_category(conn, cat_name))
        .transpose()?;

    // 2) 解析 brand 名 → brand_id
    let brand_id = fields
        .get("brand")
        .filter(|s| !s.is_empty())
        .map(|brand_name| ensure_brand(conn, brand_name))
        .transpose()?;

    let cost_price: f64 = fields
        .get("cost_price")
        .map(|s| s.parse().unwrap_or(0.0))
        .unwrap_or(0.0);
    let sell_price: f64 = fields
        .get("sell_price")
        .map(|s| s.parse().unwrap_or(0.0))
        .unwrap_or(0.0);
    let current_stock: i64 = fields
        .get("current_stock")
        .map(|s| s.parse().unwrap_or(0))
        .unwrap_or(0);
    let min_stock: i64 = fields.get("min_stock").map(|s| s.parse().unwrap_or(0)).unwrap_or(0);
    let max_stock: i64 = fields.get("max_stock").map(|s| s.parse().unwrap_or(999999)).unwrap_or(999999);

    // 3) 简单模式 products 表 upsert by sku
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL",
            params![sku],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(id) = existing {
        conn.execute(
            "UPDATE products SET name = ?1, description = ?2, category_id = ?3, brand_id = ?4,
               unit = ?5, cost_price = ?6, sell_price = ?7, min_stock = ?8, max_stock = ?9,
               current_stock = ?10, barcode = ?11, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?12",
            params![
                name,
                fields.get("description").cloned().unwrap_or_default(),
                category_id,
                brand_id,
                fields.get("unit").cloned().unwrap_or_else(|| "件".to_string()),
                cost_price,
                sell_price,
                min_stock as i64,
                max_stock as i64,
                current_stock,
                fields.get("barcode").cloned().unwrap_or_default(),
                id,
            ],
        )
        .map_err(|e| format!("更新商品失败: {}", e))?;
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO products
               (id, sku, name, description, category_id, brand_id, unit,
                cost_price, sell_price, min_stock, max_stock, current_stock, barcode, is_active, sync_status)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, 'pending')",
            params![
                id, sku, name,
                fields.get("description").cloned().unwrap_or_default(),
                category_id, brand_id,
                fields.get("unit").cloned().unwrap_or_else(|| "件".to_string()),
                cost_price, sell_price,
                min_stock as i64, max_stock as i64, current_stock,
                fields.get("barcode").cloned().unwrap_or_default(),
            ],
        )
        .map_err(|e| format!("插入商品失败: {}", e))?;
    }
    Ok(())
}

/// 库存交易（按 sku_code + date + transaction_type + reference_no 去重）
fn process_inventory(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let sku = fields.get("sku").cloned().unwrap_or_default();
    if sku.is_empty() {
        return Err("sku 不能为空".to_string());
    }

    // sku → product_id（取主表的简单库 SKU）
    let product_id = conn
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL LIMIT 1",
            params![sku],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("找不到 SKU: {}", sku))?;

    let raw_type = fields.get("transaction_type").cloned().unwrap_or_default();
    let transaction_type = normalize_txn_type(&raw_type);
    let quantity: i64 = fields.get("quantity").map(|s| s.parse().unwrap_or(0)).unwrap_or(0);
    let transaction_date = fields
        .get("transaction_date")
        .cloned()
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());
    let reference_no = fields.get("reference_no").cloned().unwrap_or_default();
    let reason = fields.get("reason").cloned().unwrap_or_default();

    // 幂等检查：相同 (product_id, date, type, ref) 已存在则跳过
    let dup_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM inventory_transactions
             WHERE product_id = ?1 AND DATE(created_at) = ?2
               AND transaction_type = ?3 AND COALESCE(reference_no,'') = ?4",
            params![product_id, transaction_date, transaction_type, reference_no],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if dup_count > 0 {
        // 已存在即跳过（不报错）
        return Ok(());
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO inventory_transactions
           (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes, created_at, sync_status)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, 'pending')",
        params![
            id, product_id, transaction_type, quantity as i64,
            reference_no, reason,
            fields.get("notes").cloned().unwrap_or_default(),
            transaction_date,
        ],
    )
    .map_err(|e| format!("插入库存交易失败: {}", e))?;

    // 同步 current_stock
    let delta = match transaction_type.as_str() {
        "inbound" => quantity,
        "outbound" => -quantity,
        _ => 0,
    };
    if delta != 0 {
        conn.execute(
            "UPDATE products SET current_stock = COALESCE(current_stock, 0) + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![delta, product_id],
        )
        .map_err(|e| format!("更新 current_stock 失败: {}", e))?;
    }
    Ok(())
}

/// 采购订单（按 po_number upsert）
fn process_purchase(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let po_number = fields.get("po_number").cloned().unwrap_or_default();
    if po_number.is_empty() {
        return Err("po_number 不能为空".to_string());
    }
    let supplier_name = fields.get("supplier").cloned().unwrap_or_default();
    if supplier_name.is_empty() {
        return Err("supplier 不能为空".to_string());
    }

    // 1) 解析 supplier
    let supplier_id = ensure_supplier(conn, &supplier_name)?;

    // 2) 解析 sku → product_id
    let sku = fields.get("sku").cloned().unwrap_or_default();
    let product_id = conn
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL LIMIT 1",
            params![sku],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("找不到 SKU: {}", sku))?;

    let order_date = fields.get("order_date").cloned().unwrap_or_default();
    let quantity: i64 = fields.get("quantity").map(|s| s.parse().unwrap_or(0)).unwrap_or(0);
    let unit_price: f64 = fields.get("unit_price").map(|s| s.parse().unwrap_or(0.0)).unwrap_or(0.0);
    let total_price = unit_price * quantity as f64;
    let status = fields.get("status").cloned().unwrap_or_else(|| "draft".to_string());
    let notes = fields.get("notes").cloned().unwrap_or_default();

    // 3) 幂等：po_number 已存在则更新（重用订单号；item 全量替换）
    let existing_po: Option<String> = conn
        .query_row(
            "SELECT id FROM purchase_orders WHERE po_number = ?1 AND deleted_at IS NULL",
            params![po_number],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let po_id = if let Some(id) = existing_po {
        conn.execute(
            "UPDATE purchase_orders SET supplier_id = ?1, order_date = ?2, total_amount = ?3, status = ?4, notes = ?5, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending' WHERE id = ?6",
            params![supplier_id, order_date, total_price, status, notes, id],
        )
        .map_err(|e| format!("更新采购单失败: {}", e))?;
        // 删除旧 items（简化：全量替换）
        conn.execute(
            "DELETE FROM purchase_order_items WHERE purchase_order_id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        id
    } else {
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO purchase_orders
               (id, po_number, supplier_id, order_date, status, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at, sync_status)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'unpaid', ?7, NULL, datetime('now'), datetime('now'), 'pending')",
            params![new_id, po_number, supplier_id, order_date, status, total_price, notes],
        )
        .map_err(|e| format!("插入采购单失败: {}", e))?;
        new_id
    };

    // 4) 插入 item
    let item_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO purchase_order_items
           (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, datetime('now'), datetime('now'))",
        params![item_id, po_id, product_id, quantity as i64, unit_price, total_price, notes],
    )
    .map_err(|e| format!("插入采购明细失败: {}", e))?;

    Ok(())
}

/// 销售订单（按 so_number upsert）
fn process_sales(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let so_number = fields.get("so_number").cloned().unwrap_or_default();
    if so_number.is_empty() {
        return Err("so_number 不能为空".to_string());
    }
    let customer_name = fields.get("customer").cloned().unwrap_or_default();
    if customer_name.is_empty() {
        return Err("customer 不能为空".to_string());
    }

    let customer_id = ensure_customer(conn, &customer_name)?;

    let sku = fields.get("sku").cloned().unwrap_or_default();
    let product_id = conn
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL LIMIT 1",
            params![sku],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("找不到 SKU: {}", sku))?;

    let order_date = fields.get("order_date").cloned().unwrap_or_default();
    let quantity: i64 = fields.get("quantity").map(|s| s.parse().unwrap_or(0)).unwrap_or(0);
    let unit_price: f64 = fields.get("unit_price").map(|s| s.parse().unwrap_or(0.0)).unwrap_or(0.0);
    let total_price = unit_price * quantity as f64;
    let status = fields.get("status").cloned().unwrap_or_else(|| "draft".to_string());
    let notes = fields.get("notes").cloned().unwrap_or_default();

    let existing_so: Option<String> = conn
        .query_row(
            "SELECT id FROM sales_orders WHERE so_number = ?1 AND deleted_at IS NULL",
            params![so_number],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let so_id = if let Some(id) = existing_so {
        conn.execute(
            "UPDATE sales_orders SET customer_id = ?1, order_date = ?2, total_amount = ?3, status = ?4, notes = ?5, updated_at = CURRENT_TIMESTAMP, sync_status = 'pending' WHERE id = ?6",
            params![customer_id, order_date, total_price, status, notes, id],
        )
        .map_err(|e| format!("更新销售单失败: {}", e))?;
        conn.execute(
            "DELETE FROM sales_order_items WHERE sales_order_id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        id
    } else {
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO sales_orders
               (id, so_number, customer_id, order_date, status, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at, sync_status)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'unpaid', ?7, NULL, datetime('now'), datetime('now'), 'pending')",
            params![new_id, so_number, customer_id, order_date, status, total_price, notes],
        )
        .map_err(|e| format!("插入销售单失败: {}", e))?;
        new_id
    };

    let item_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO sales_order_items
           (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, datetime('now'), datetime('now'))",
        params![item_id, so_id, product_id, quantity as i64, unit_price, total_price, notes],
    )
    .map_err(|e| format!("插入销售明细失败: {}", e))?;

    Ok(())
}

/// 供应商（按 name 或 code upsert）
fn process_supplier(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let name = fields.get("name").cloned().unwrap_or_default();
    if name.is_empty() {
        return Err("name 不能为空".to_string());
    }
    let code = fields.get("code").cloned().unwrap_or_default();
    let id = ensure_supplier_with_code(conn, &name, &code)?;

    // 更新可选字段
    conn.execute(
        "UPDATE suppliers SET contact_person = COALESCE(?1, contact_person),
            phone = COALESCE(?2, phone), email = COALESCE(?3, email),
            address = COALESCE(?4, address), tax_number = COALESCE(?5, tax_number),
            sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        params![
            fields.get("contact_person").cloned().filter(|s| !s.is_empty()),
            fields.get("phone").cloned().filter(|s| !s.is_empty()),
            fields.get("email").cloned().filter(|s| !s.is_empty()),
            fields.get("address").cloned().filter(|s| !s.is_empty()),
            fields.get("tax_number").cloned().filter(|s| !s.is_empty()),
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// 客户（按 name 或 code upsert）
fn process_customer(
    conn: &rusqlite::Connection,
    fields: &FieldMap,
) -> Result<(), String> {
    let name = fields.get("name").cloned().unwrap_or_default();
    if name.is_empty() {
        return Err("name 不能为空".to_string());
    }
    let code = fields.get("code").cloned().unwrap_or_default();
    let id = ensure_customer_with_code(conn, &name, &code)?;

    let customer_type = fields.get("customer_type").cloned().unwrap_or_else(|| "individual".to_string());
    conn.execute(
        "UPDATE customers SET contact_person = COALESCE(?1, contact_person),
            phone = COALESCE(?2, phone), email = COALESCE(?3, email),
            address = COALESCE(?4, address), customer_type = COALESCE(?5, customer_type),
            sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        params![
            fields.get("contact_person").cloned().filter(|s| !s.is_empty()),
            fields.get("phone").cloned().filter(|s| !s.is_empty()),
            fields.get("email").cloned().filter(|s| !s.is_empty()),
            fields.get("address").cloned().filter(|s| !s.is_empty()),
            customer_type,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================
// 4. 辅助函数：ensure_*（不存在则创建，返回 id）
// ============================================

fn ensure_category(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM product_categories WHERE name = ?1 LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO product_categories (id, name, sort_order, is_active, created_at, updated_at) VALUES (?1, ?2, 0, 1, datetime('now'), datetime('now'))",
        params![id, name],
    )
    .map_err(|e| format!("创建分类失败: {}", e))?;
    Ok(id)
}

fn ensure_brand(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM brands WHERE name = ?1 LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO brands (id, name, is_active, created_at, updated_at) VALUES (?1, ?2, 1, datetime('now'), datetime('now'))",
        params![id, name],
    )
    .map_err(|e| format!("创建品牌失败: {}", e))?;
    Ok(id)
}

pub fn ensure_supplier(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    ensure_supplier_with_code(conn, name, "")
}

fn ensure_supplier_with_code(conn: &rusqlite::Connection, name: &str, code: &str) -> Result<String, String> {
    // 优先按 code 找
    if !code.is_empty() {
        if let Some(id) = conn
            .query_row(
                "SELECT id FROM suppliers WHERE code = ?1 AND deleted_at IS NULL LIMIT 1",
                params![code],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        {
            return Ok(id);
        }
    }
    // 再按 name 找
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM suppliers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(id);
    }
    // 新建
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO suppliers (id, name, code, is_active, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, 1, datetime('now'), datetime('now'), 'pending')",
        params![id, name, if code.is_empty() { None } else { Some(code) }],
    )
    .map_err(|e| format!("创建供应商失败: {}", e))?;
    Ok(id)
}

pub fn ensure_customer(conn: &rusqlite::Connection, name: &str) -> Result<String, String> {
    ensure_customer_with_code(conn, name, "")
}

fn ensure_customer_with_code(conn: &rusqlite::Connection, name: &str, code: &str) -> Result<String, String> {
    if !code.is_empty() {
        if let Some(id) = conn
            .query_row(
                "SELECT id FROM customers WHERE code = ?1 AND deleted_at IS NULL LIMIT 1",
                params![code],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        {
            return Ok(id);
        }
    }
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM customers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(id);
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO customers (id, name, code, customer_type, is_active, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, 'individual', 1, datetime('now'), datetime('now'), 'pending')",
        params![id, name, if code.is_empty() { None } else { Some(code) }],
    )
    .map_err(|e| format!("创建客户失败: {}", e))?;
    Ok(id)
}

// ============================================
// 5. 重新解析已上传文件（在 validate/execute 时复用）
// ============================================

#[allow(dead_code)]
pub fn parse_from_path(path: &str, source_format: &str) -> Result<ParseResult, String> {
    let bytes = std::fs::read(path).map_err(|e| format!("读取文件失败: {}", e))?;
    parse_bytes(&bytes, source_format)
}

// ============================================
// 单元测试（需要数据库，此处仅覆盖无 DB 的纯函数）
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_date() {
        assert!(is_valid_date("2026-07-01"));
        assert!(is_valid_date("2024-02-29")); // 闰年
        assert!(!is_valid_date("2026-13-01"));
        assert!(!is_valid_date("2026-07-32"));
        assert!(!is_valid_date("26-07-01"));
        assert!(!is_valid_date(""));
    }

    #[test]
    fn test_normalize_txn_type() {
        assert_eq!(normalize_txn_type("入库"), "inbound");
        assert_eq!(normalize_txn_type("出库"), "outbound");
        assert_eq!(normalize_txn_type("调整"), "adjustment");
        assert_eq!(normalize_txn_type("调拨"), "transfer");
        assert_eq!(normalize_txn_type("inbound"), "inbound");
    }

    #[test]
    fn test_validate_required_missing() {
        let csv = "sku,name\n,Tom";
        let parsed = parse_bytes(csv.as_bytes(), "csv").unwrap();
        let mapping = std::collections::HashMap::from([
            ("sku".to_string(), "sku".to_string()),
            ("name".to_string(), "name".to_string()),
        ]);
        let defaults = std::collections::HashMap::new();
        let v = validate_batch(&parsed, ImportTarget::Products, &mapping, &defaults);
        assert_eq!(v.len(), 1);
        assert!(!v[0].is_valid);
        assert!(v[0].errors.iter().any(|e| e.code == "required_missing"));
    }

    #[test]
    fn test_validate_invalid_number() {
        let csv = "sku,name,quantity\nSKU-001,Tom,abc";
        let parsed = parse_bytes(csv.as_bytes(), "csv").unwrap();
        let mapping = std::collections::HashMap::from([
            ("sku".to_string(), "sku".to_string()),
            ("name".to_string(), "name".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
        ]);
        let defaults = std::collections::HashMap::new();
        let v = validate_batch(&parsed, ImportTarget::Inventory, &mapping, &defaults);
        assert!(!v[0].is_valid);
        assert!(v[0].errors.iter().any(|e| e.code == "invalid_number"));
    }

    #[test]
    fn test_validate_invalid_date() {
        let csv = "po_number,supplier,order_date,sku,quantity,unit_price\nPO-1,S,date-bad,SKU-1,1,1";
        let parsed = parse_bytes(csv.as_bytes(), "csv").unwrap();
        let mapping = std::collections::HashMap::from([
            ("po_number".to_string(), "po_number".to_string()),
            ("supplier".to_string(), "supplier".to_string()),
            ("order_date".to_string(), "order_date".to_string()),
            ("sku".to_string(), "sku".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
            ("unit_price".to_string(), "unit_price".to_string()),
        ]);
        let defaults = std::collections::HashMap::new();
        let v = validate_batch(&parsed, ImportTarget::Purchases, &mapping, &defaults);
        assert!(!v[0].is_valid);
        assert!(v[0].errors.iter().any(|e| e.code == "invalid_date"));
    }

    #[test]
    fn test_validate_invalid_txn_type() {
        let csv = "sku,transaction_type,quantity\nSKU-1,bogus,1";
        let parsed = parse_bytes(csv.as_bytes(), "csv").unwrap();
        let mapping = std::collections::HashMap::from([
            ("sku".to_string(), "sku".to_string()),
            ("transaction_type".to_string(), "transaction_type".to_string()),
            ("quantity".to_string(), "quantity".to_string()),
        ]);
        let defaults = std::collections::HashMap::new();
        let v = validate_batch(&parsed, ImportTarget::Inventory, &mapping, &defaults);
        assert!(!v[0].is_valid);
        assert!(v[0].errors.iter().any(|e| e.code == "invalid_enum"));
    }
}
