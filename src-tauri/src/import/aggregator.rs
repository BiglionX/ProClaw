//! ProClaw v1.3 老系统数据迁移 — 持久化聚合器
//!
//! 职责：根据用户在 Step 4 编辑后的聚合规则，把客户 / 商品数据写入 DB：
//! - `persist_customer_with_contacts`：1 条 customer + N 条 customer_contact
//! - `persist_product_with_skus`：1 条 product + N 条 product_sku
//!
//! 与 v1.2 P1 的 process_customer / process_product 不同：
//! - v1.2 P1 单行处理；v1.3 按聚合组处理
//! - v1.3 强制走 categories 表（product_categories 仍保留兼容）

use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

use crate::import::category_resolver::{clean_category_name, ensure_category};
use crate::import::types::{CustomerAggregate, ProductAggregate};

/// 持久化单个客户聚合（1 customer + N contacts）
///
/// 参数：
/// - `batch_id`：批次 id（写入 customer_contacts.batch_id 用于精准撤销）
///
/// 返回 customer_id
pub fn persist_customer_with_contacts(
    conn: &rusqlite::Connection,
    agg: &CustomerAggregate,
    skip_category: bool,
    batch_id: &str,
) -> Result<String, String> {
    // 1) 处理类别（customer_type 字段 → categories 表）
    if !skip_category {
        if let Some(cat) = agg.base_fields.get("客户类别") {
            let trimmed = cat.trim();
            if !trimmed.is_empty() {
                ensure_category(conn, "customer", trimmed)?;
            }
        }
    }

    // 2) upsert customer（按 code → name 优先）
    let customer_id = upsert_customer(conn, &agg.code, &agg.name)?;

    // 3) 写 N 条 customer_contacts（直接 INSERT，旧数据由调用方在事务顶端预清理，避免 N+1 单条 DELETE）
    for contact in &agg.contacts {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO customer_contacts
                (id, customer_id, contact_name, phone, landline, qq_wechat, address, is_primary, source, batch_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'import_legacy', ?9, datetime('now'))",
            params![
                id,
                customer_id,
                contact.contact_name,
                contact.phone,
                contact.landline,
                contact.qq_wechat,
                contact.address,
                if contact.is_primary { 1 } else { 0 },
                batch_id,
            ],
        )
        .map_err(|e| format!("插入客户联系人失败: {}", e))?;
    }

    // 4) 同步 customers 表的 contact_person（取首要联系人）
    if let Some(primary) = agg.contacts.iter().find(|c| c.is_primary) {
        conn.execute(
            "UPDATE customers SET contact_person = COALESCE(?1, contact_person),
                phone = COALESCE(?2, phone), address = COALESCE(?3, address),
                updated_at = CURRENT_TIMESTAMP, sync_status = 'pending'
             WHERE id = ?4",
            params![
                Some(primary.contact_name.as_str()),
                primary.phone.as_deref(),
                primary.address.as_deref(),
                customer_id,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(customer_id)
}

fn upsert_customer(conn: &rusqlite::Connection, code: &str, name: &str) -> Result<String, String> {
    // 优先按 code 找
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
    // 再按 name 找
    if !name.is_empty() {
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
    }
    // 新建
    let id = Uuid::new_v4().to_string();
    let code_opt: Option<&str> = if code.is_empty() { None } else { Some(code) };
    conn.execute(
        "INSERT INTO customers (id, name, code, customer_type, is_active, created_at, updated_at, sync_status)
         VALUES (?1, ?2, ?3, 'individual', 1, datetime('now'), datetime('now'), 'pending')",
        params![id, name, code_opt],
    )
    .map_err(|e| format!("创建客户失败: {}", e))?;
    Ok(id)
}

/// 持久化单个商品聚合（1 product + N product_sku）
///
/// 参数：
/// - `batch_id`：批次 id（写入 product_sku.batch_id 用于精准撤销）
///
/// 返回 product_id
pub fn persist_product_with_skus(
    conn: &rusqlite::Connection,
    agg: &ProductAggregate,
    skip_category: bool,
    batch_id: &str,
) -> Result<String, String> {
    // 1) 类别写两处：categories 供导入撤销；product_categories + products.category_id 供数据中心按类别统计。
    let category_id = if skip_category {
        None
    } else if let Some(cat) = &agg.category {
        let trimmed = cat.trim();
        if trimmed.is_empty() {
            None
        } else {
            ensure_category(conn, "product", trimmed)?;
            ensure_product_category_id(conn, trimmed)?
        }
    } else {
        None
    };

    // 2) upsert product（按 sku）
    let product_id = upsert_product(
        conn,
        &agg.sku,
        &agg.name,
        agg.spec.as_deref(),
        category_id.as_deref(),
    )?;

    // 3) 写 N 条 product_sku（直接 INSERT，旧数据由调用方在事务顶端预清理）
    for variant in &agg.variants {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO product_sku
                (id, product_id, sku, variant_name, spec, source, batch_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'import_legacy', ?6, datetime('now'))",
            params![
                id,
                product_id,
                variant.sku,
                variant.variant_name,
                variant.spec,
                batch_id,
            ],
        )
        .map_err(|e| format!("插入商品 SKU 失败: {}", e))?;
    }

    Ok(product_id)
}

/// 把老系统的类别名挂到 product_categories，返回 id。数据中心按这张表分组。
fn ensure_product_category_id(
    conn: &rusqlite::Connection,
    raw_name: &str,
) -> Result<Option<String>, String> {
    let name = clean_category_name(raw_name);
    if name.is_empty() {
        return Ok(None);
    }
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM product_categories
             WHERE name = ?1 AND deleted_at IS NULL
             LIMIT 1",
            params![name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        return Ok(Some(id));
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO product_categories
            (id, name, sort_order, is_active, created_at, updated_at, sync_status)
         VALUES (?1, ?2, 0, 1, datetime('now'), datetime('now'), 'pending')",
        params![id, name],
    )
    .map_err(|e| format!("创建商品分类失败: {}", e))?;
    Ok(Some(id))
}

fn upsert_product(
    conn: &rusqlite::Connection,
    sku: &str,
    name: &str,
    spec: Option<&str>,
    category_id: Option<&str>,
) -> Result<String, String> {
    // 按 sku 找
    if let Some(id) = conn
        .query_row(
            "SELECT id FROM products WHERE sku = ?1 AND deleted_at IS NULL LIMIT 1",
            params![sku],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        // 更新名称（取首行非空）、spec
        conn.execute(
            "UPDATE products SET name = COALESCE(NULLIF(?1, ''), name),
                description = COALESCE(NULLIF(?2, ''), description),
                category_id = COALESCE(?3, category_id),
                sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?4",
            params![name, spec.unwrap_or(""), category_id, id],
        )
        .map_err(|e| e.to_string())?;
        return Ok(id);
    }
    // 新建
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO products
            (id, sku, name, description, category_id, unit, cost_price, sell_price,
             min_stock, max_stock, current_stock, barcode, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, '件', 0, 0, 0, 999999, 0, '', 1, 'pending')",
        params![id, sku, name, spec.unwrap_or(""), category_id],
    )
    .map_err(|e| format!("创建商品失败: {}", e))?;
    Ok(id)
}

// ============================================
// 单元测试（仅纯函数）
// ============================================
//
// 注：原 `filter_active_rules` 工具函数已被删除。
// 原因：根据 v1.3 决策 #2「SPU/SKU 聚合策略 = 强制手动确认」，
// 聚合规则完全由用户在 Step 4 编辑，后端不再做"按 action='skip' 自动过滤"的推断逻辑。
// 后续若有新的纯聚合工具函数再加测试。
