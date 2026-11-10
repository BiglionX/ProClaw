use crate::database::Database;
use crate::types::InventoryTransaction;
use rusqlite::{params, Connection};
use std::sync::Mutex;
use uuid::Uuid;

/// 创建库存交易 (入库/出库/调整/调拨)
/// 库存真相源：product_skus.current_stock（禁止读写遗留的 product_sku 单数表）
#[tauri::command]
pub fn create_inventory_transaction(
    db: tauri::State<Mutex<Database>>,
    transaction: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    create_inventory_transaction_inner(db.connection(), &transaction)
}

/// P0-03：流水与默认 SKU 的 current_stock 同事务更新；失败回滚，避免幽灵流水。
pub(crate) fn create_inventory_transaction_inner(
    conn: &Connection,
    transaction: &serde_json::Value,
) -> Result<serde_json::Value, String> {
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

    if !["inbound", "outbound", "adjustment", "transfer"].contains(&transaction_type.as_str()) {
        return Err("Invalid transaction type".to_string());
    }

    if transaction_type == "adjustment" {
        crate::api::quantity_price::validate_inventory_quantity_str(quantity)?;
    } else if quantity <= 0 {
        return Err(format!(
            "quantity must be a positive integer (> 0), got {}",
            quantity
        ));
    }

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

    let current_stock =
        crate::sku_stock::default_sku_stock(conn, &product_id).map_err(|e| match e {
            crate::sku_stock::SkuStockError::NoSku => {
                format!("没有启用的默认 SKU: {product_id}")
            }
            other => other.to_string(),
        })?;

    if (transaction_type == "outbound" || transaction_type == "transfer")
        && current_stock < quantity
    {
        return Err(format!(
            "Insufficient stock. Current: {}, Requested: {}",
            current_stock, quantity
        ));
    }

    let stock_change = match transaction_type.as_str() {
        "inbound" => quantity,
        "outbound" => -quantity,
        "adjustment" => quantity,
        "transfer" => -quantity,
        _ => 0,
    };

    let mut auto_offset_note: Option<String> = None;
    if transaction_type == "inbound" && current_stock < 0 {
        auto_offset_note = Some(format!(
            "自动冲销缺货 {} 件（进货前库存 {} + 进货数量 {} = {}）",
            -current_stock,
            current_stock,
            quantity,
            current_stock + quantity
        ));
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    if let Err(e) = tx.execute(
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
    ) {
        let _ = tx.rollback();
        return Err(format!("Failed to insert inventory transaction: {}", e));
    }

    let stock_result = if transaction_type == "outbound" || transaction_type == "transfer" {
        crate::sku_stock::deduct_default_sku(&tx, &product_id, quantity).map_err(|e| match e {
            crate::sku_stock::SkuStockError::Insufficient { current, required } => format!(
                "Insufficient stock. Current: {}, Requested: {}",
                current, required
            ),
            other => other.to_string(),
        })
    } else {
        crate::sku_stock::apply_default_sku_delta(&tx, &product_id, stock_change)
            .map_err(|e| e.to_string())
    };

    if let Err(e) = stock_result {
        let _ = tx.rollback();
        return Err(e);
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut response = serde_json::json!({
        "id": id,
        "product_id": product_id,
        "transaction_type": transaction_type,
        "quantity": quantity,
        "message": "Transaction created successfully"
    });
    if let Some(note) = auto_offset_note {
        response["auto_offset_note"] = serde_json::Value::String(note);
        response["auto_offset"] = serde_json::Value::Bool(true);
    }
    Ok(response)
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
         FROM inventory_transactions WHERE 1=1",
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

    sql.push_str(" ORDER BY created_at DESC");
    let page_size = crate::database::page_size_from_json(&options, 100);
    let offset = crate::database::page_offset_from_json(&options, page_size);
    crate::database::append_limit_offset(&mut sql, &mut params_vec, page_size, offset);

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
    let mut low_stock_stmt = conn
        .prepare(
            "SELECT id, name, sku, current_stock, min_stock
         FROM products
         WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0
         ORDER BY (current_stock * 1.0 / min_stock) ASC
         LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

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

#[cfg(test)]
mod tests {
    use super::create_inventory_transaction_inner;
    use rusqlite::{params, Connection};

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE products (
               id TEXT PRIMARY KEY,
               sku TEXT UNIQUE NOT NULL,
               name TEXT NOT NULL,
               current_stock INTEGER DEFAULT 0,
               cost_price REAL DEFAULT 0,
               min_stock INTEGER DEFAULT 0,
               updated_at TIMESTAMP,
               deleted_at TIMESTAMP
             );
             CREATE TABLE inventory_transactions (
               id TEXT PRIMARY KEY,
               product_id TEXT NOT NULL REFERENCES products(id),
               transaction_type TEXT NOT NULL,
               quantity INTEGER NOT NULL,
               reference_no TEXT,
               reason TEXT,
               performed_by TEXT,
               notes TEXT,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               sync_status TEXT DEFAULT 'pending'
             );
             INSERT INTO products (id, sku, name, current_stock) VALUES ('p1', 'SKU-1', 'Test', 10);
             CREATE TABLE product_skus (
               id TEXT PRIMARY KEY,
               spu_id TEXT NOT NULL,
               sku_code TEXT NOT NULL,
               current_stock INTEGER DEFAULT 0,
               is_default INTEGER DEFAULT 1,
               is_active INTEGER DEFAULT 1,
               deleted_at TIMESTAMP,
               updated_at TIMESTAMP,
               created_at TIMESTAMP
             );
             INSERT INTO product_skus (id, spu_id, sku_code, current_stock, is_default, is_active)
               VALUES ('sku-p1', 'p1', 'SKU-1', 10, 1, 1);",
        )
        .unwrap();
        conn
    }

    fn stock(conn: &Connection) -> i32 {
        conn.query_row(
            "SELECT current_stock FROM product_skus WHERE spu_id = 'p1'",
            [],
            |row| row.get(0),
        )
        .unwrap()
    }

    fn txn_count(conn: &Connection) -> i64 {
        conn.query_row("SELECT COUNT(*) FROM inventory_transactions", [], |row| {
            row.get(0)
        })
        .unwrap()
    }

    #[test]
    fn inbound_updates_products_stock_and_writes_txn() {
        let conn = setup_conn();
        let payload = serde_json::json!({
            "product_id": "p1",
            "transaction_type": "inbound",
            "quantity": 5
        });
        create_inventory_transaction_inner(&conn, &payload).unwrap();
        assert_eq!(stock(&conn), 15);
        assert_eq!(txn_count(&conn), 1);
        let ttype: String = conn
            .query_row(
                "SELECT transaction_type FROM inventory_transactions LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(ttype, "inbound");
    }

    #[test]
    fn outbound_updates_products_stock_and_writes_txn() {
        let conn = setup_conn();
        let payload = serde_json::json!({
            "product_id": "p1",
            "transaction_type": "outbound",
            "quantity": 3
        });
        create_inventory_transaction_inner(&conn, &payload).unwrap();
        assert_eq!(stock(&conn), 7);
        assert_eq!(txn_count(&conn), 1);
    }

    #[test]
    fn outbound_insufficient_stock_rolls_back_no_ghost_txn() {
        let conn = setup_conn();
        // 直接模拟：流水插入后库存条件更新失败会回滚
        conn.execute(
            "UPDATE product_skus SET current_stock = 1 WHERE spu_id = 'p1'",
            [],
        )
        .unwrap();
        let payload = serde_json::json!({
            "product_id": "p1",
            "transaction_type": "outbound",
            "quantity": 5
        });
        let err = create_inventory_transaction_inner(&conn, &payload).unwrap_err();
        assert!(err.contains("Insufficient stock"), "err={}", err);
        assert_eq!(stock(&conn), 1);
        assert_eq!(
            txn_count(&conn),
            0,
            "must not leave ghost inventory_transactions"
        );
    }

    #[test]
    fn does_not_touch_product_sku_singular_table() {
        let conn = setup_conn();
        // 遗留单数表：无 current_stock，若误写会失败
        conn.execute_batch(
            "CREATE TABLE product_sku (
               id TEXT PRIMARY KEY,
               product_id TEXT,
               sku TEXT
             );
             INSERT INTO product_sku (id, product_id, sku) VALUES ('p1', 'p1', 'SKU-1');",
        )
        .unwrap();
        let payload = serde_json::json!({
            "product_id": "p1",
            "transaction_type": "inbound",
            "quantity": 2
        });
        create_inventory_transaction_inner(&conn, &payload).unwrap();
        assert_eq!(stock(&conn), 12);
        let singular_rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_sku", [], |row| row.get(0))
            .unwrap();
        assert_eq!(singular_rows, 1);
        let products_stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM products WHERE id = ?1",
                params!["p1"],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(products_stock, 12, "入库后商品库存必须与默认 SKU 一致");
    }
}
