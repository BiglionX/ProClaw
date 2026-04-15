use crate::database::Database;
use crate::types::InventoryTransaction;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建库存交易 (入库/出库/调整/调拨)
#[tauri::command]
pub fn create_inventory_transaction(
    db: tauri::State<Mutex<Database>>,
    transaction: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let product_id = transaction["product_id"]
        .as_str()
        .ok_or("Product ID is required")?
        .to_string();
    let transaction_type = transaction["transaction_type"]
        .as_str()
        .ok_or("Transaction type is required")?
        .to_string();
    let quantity = transaction["quantity"]
        .as_i64()
        .ok_or("Quantity is required")? as i32;

    // 验证交易类型
    if !["inbound", "outbound", "adjustment", "transfer"].contains(&transaction_type.as_str()) {
        return Err("Invalid transaction type".to_string());
    }

    // 检查产品是否存在
    let product_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
            params![product_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !product_exists {
        return Err("Product not found".to_string());
    }

    // 如果是出库，检查库存是否充足
    if transaction_type == "outbound" {
        let current_stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM products WHERE id = ?1",
                params![product_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if current_stock < quantity {
            return Err(format!(
                "Insufficient stock. Current: {}, Requested: {}",
                current_stock, quantity
            ));
        }
    }

    // 插入交易记录
    conn.execute(
        "INSERT INTO inventory_transactions
         (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')",
        params![
            id,
            product_id,
            transaction_type,
            quantity,
            transaction.get("reference_no").and_then(|v| v.as_str()),
            transaction.get("reason").and_then(|v| v.as_str()),
            transaction.get("performed_by").and_then(|v| v.as_str()),
            transaction.get("notes").and_then(|v| v.as_str()),
        ],
    )
    .map_err(|e| e.to_string())?;

    // 更新产品库存
    let stock_change = match transaction_type.as_str() {
        "inbound" => quantity,
        "outbound" => -quantity,
        "adjustment" => quantity, // 调整可以是正数或负数
        "transfer" => -quantity,  // 调出减少库存
        _ => 0,
    };

    conn.execute(
        "UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![stock_change, product_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "product_id": product_id,
        "transaction_type": transaction_type,
        "quantity": quantity,
        "message": "Transaction created successfully"
    }))
}

/// 获取库存交易列表
#[tauri::command]
pub fn get_inventory_transactions(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<InventoryTransaction>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, product_id, transaction_type, quantity, reference_no,
                reason, performed_by, notes, created_at, sync_status
         FROM inventory_transactions WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        // 按产品筛选
        if let Some(product_id) = opts.get("product_id").and_then(|v| v.as_str()) {
            if !product_id.is_empty() {
                sql.push_str(" AND product_id = ?");
                params_vec.push(Box::new(product_id.to_string()));
            }
        }

        // 按交易类型筛选
        if let Some(transaction_type) = opts.get("transaction_type").and_then(|v| v.as_str()) {
            if !transaction_type.is_empty() {
                sql.push_str(" AND transaction_type = ?");
                params_vec.push(Box::new(transaction_type.to_string()));
            }
        }

        // 日期范围筛选
        if let Some(start_date) = opts.get("start_date").and_then(|v| v.as_str()) {
            sql.push_str(" AND created_at >= ?");
            params_vec.push(Box::new(start_date.to_string()));
        }
        if let Some(end_date) = opts.get("end_date").and_then(|v| v.as_str()) {
            sql.push_str(" AND created_at <= ?");
            params_vec.push(Box::new(end_date.to_string()));
        }
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT 100");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let transactions = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(InventoryTransaction {
                id: row.get(0)?,
                product_id: row.get(1)?,
                transaction_type: row.get(2)?,
                quantity: row.get(3)?,
                reference_no: row.get(4)?,
                reason: row.get(5)?,
                performed_by: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
                sync_status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(transactions)
}

/// 获取库存统计信息
#[tauri::command]
pub fn get_inventory_stats(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 总产品数
    let total_products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 低库存产品数 (current_stock < min_stock)
    let low_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 零库存产品数
    let zero_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 今日交易数
    let today_transactions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM inventory_transactions WHERE DATE(created_at) = DATE('now')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 库存总价值 (按成本价计算)
    let total_value: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_stock * cost_price), 0) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 低库存产品列表
    let mut low_stock_stmt = conn.prepare(
        "SELECT id, name, sku, current_stock, min_stock
         FROM products
         WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0
         ORDER BY (current_stock * 1.0 / min_stock) ASC
         LIMIT 10"
    ).map_err(|e| e.to_string())?;

    let low_stock_products: Vec<serde_json::Value> = low_stock_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, String>(2)?,
                "current_stock": row.get::<_, i32>(3)?,
                "min_stock": row.get::<_, i32>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "zero_stock_count": zero_stock_count,
        "today_transactions": today_transactions,
        "total_value": total_value,
        "low_stock_products": low_stock_products
    }))
}
