use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;

/// 生成销售退货编号
fn generate_sr_number() -> String {
    let now = chrono::Local::now();
    let date_str = now.format("%Y%m%d").to_string();
    let random = uuid::Uuid::new_v4().to_string()[..4].to_uppercase();
    format!("SR-{}-{}", date_str, random)
}

/// 创建销售退货单
#[tauri::command]
pub fn create_sales_return(
    db: tauri::State<Mutex<Database>>,
    r#return: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = uuid::Uuid::new_v4().to_string();
    let sr_number = r#return
        .get("sr_number")
        .and_then(|v| v.as_str())
        .unwrap_or(&generate_sr_number())
        .to_string();
    let sales_order_id = r#return["sales_order_id"]
        .as_str()
        .ok_or("Sales order ID is required")?;
    let customer_id = r#return["customer_id"]
        .as_str()
        .ok_or("Customer ID is required")?;
    let return_date = r#return
        .get("return_date")
        .and_then(|v| v.as_str())
        .unwrap_or("2024-01-01")
        .to_string();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO sales_returns (id, sr_number, sales_order_id, customer_id, return_date, status, total_amount, refund_amount, reason, notes, created_by, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0, 0, ?6, ?7, ?8, 'pending')",
        params![
            id, sr_number, sales_order_id, customer_id, return_date,
            r#return.get("reason").and_then(|v| v.as_str()),
            r#return.get("notes").and_then(|v| v.as_str()),
            r#return.get("created_by").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    if let Some(items) = r#return.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id = uuid::Uuid::new_v4().to_string();
            let product_id = item["product_id"].as_str().ok_or("Product ID required")?;
            let quantity = item["quantity"].as_i64().ok_or("Quantity required")? as i32;
            // 后端校验：退货数量不超过原发货数量
            let shipped_qty: i32 = tx.query_row(
                "SELECT COALESCE(shipped_quantity, quantity) FROM sales_order_items WHERE sales_order_id = ?1 AND product_id = ?2",
                params![sales_order_id, product_id],
                |row| row.get(0),
            ).map_err(|e| format!("获取原订单发货数量失败: {}", e))?;
            if quantity > shipped_qty {
                return Err(format!(
                    "商品「{}」退货数量({})超过原发货数量({})",
                    product_id, quantity, shipped_qty
                ));
            }
            let unit_price = item["unit_price"].as_f64().ok_or("Unit price required")?;
            let total_price = quantity as f64 * unit_price;

            tx.execute(
                "INSERT INTO sales_return_items (id, sales_return_id, product_id, quantity, unit_price, total_price, reason)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![item_id, id, product_id, quantity, unit_price, total_price, item.get("reason").and_then(|v| v.as_str())],
            ).map_err(|e| e.to_string())?;
        }
    }

    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM sales_return_items WHERE sales_return_id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE sales_returns SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "sr_number": sr_number,
        "total_amount": total_amount,
        "message": "Sales return created successfully"
    }))
}

/// 获取销售退货单列表
#[tauri::command]
pub fn get_sales_returns(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT sr.id, sr.sr_number, sr.sales_order_id, so.so_number as so_number,
                sr.customer_id, c.name as customer_name,
                sr.return_date, sr.status,
                sr.total_amount, sr.refund_amount,
                sr.reason, sr.notes, sr.created_at, sr.updated_at
         FROM sales_returns sr
         LEFT JOIN sales_orders so ON sr.sales_order_id = so.id
         LEFT JOIN customers c ON sr.customer_id = c.id
         WHERE sr.deleted_at IS NULL",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            sql.push_str(" AND sr.status = ?");
            params_vec.push(Box::new(status.to_string()));
        }

        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (sr.sr_number LIKE ? OR so.so_number LIKE ? OR c.name LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }

        if let Some(so_id) = opts.get("sales_order_id").and_then(|v| v.as_str()) {
            sql.push_str(" AND sr.sales_order_id = ?");
            params_vec.push(Box::new(so_id.to_string()));
        }
    }

    sql.push_str(" ORDER BY sr.created_at DESC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let returns: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "sr_number": row.get::<_, String>(1)?,
                "sales_order_id": row.get::<_, String>(2)?,
                "so_number": row.get::<_, Option<String>>(3)?,
                "customer_id": row.get::<_, String>(4)?,
                "customer_name": row.get::<_, Option<String>>(5)?,
                "return_date": row.get::<_, String>(6)?,
                "status": row.get::<_, String>(7)?,
                "total_amount": row.get::<_, f64>(8)?,
                "refund_amount": row.get::<_, f64>(9)?,
                "reason": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "created_at": row.get::<_, String>(12)?,
                "updated_at": row.get::<_, String>(13)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(returns)
}

/// 获取销售退货单详情(含明细)
#[tauri::command]
pub fn get_sales_return_detail(
    db: tauri::State<Mutex<Database>>,
    return_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let r#return = conn.query_row(
        "SELECT sr.id, sr.sr_number, sr.sales_order_id, so.so_number as so_number,
                sr.customer_id, c.name as customer_name,
                sr.return_date, sr.status,
                sr.total_amount, sr.refund_amount,
                sr.reason, sr.notes, sr.created_at, sr.updated_at
         FROM sales_returns sr
         LEFT JOIN sales_orders so ON sr.sales_order_id = so.id
         LEFT JOIN customers c ON sr.customer_id = c.id
         WHERE sr.id = ?1 AND sr.deleted_at IS NULL",
        params![return_id],
        |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?, "sr_number": row.get::<_, String>(1)?,
            "sales_order_id": row.get::<_, String>(2)?, "so_number": row.get::<_, Option<String>>(3)?,
            "customer_id": row.get::<_, String>(4)?, "customer_name": row.get::<_, Option<String>>(5)?,
            "return_date": row.get::<_, String>(6)?, "status": row.get::<_, String>(7)?,
            "total_amount": row.get::<_, f64>(8)?, "refund_amount": row.get::<_, f64>(9)?,
            "reason": row.get::<_, Option<String>>(10)?, "notes": row.get::<_, Option<String>>(11)?,
            "created_at": row.get::<_, String>(12)?, "updated_at": row.get::<_, String>(13)?,
        })),
    ).map_err(|_| "Sales return not found".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT sri.id, sri.product_id, p.name as product_name, p.sku,
                sri.quantity, sri.unit_price, sri.total_price, sri.reason
         FROM sales_return_items sri LEFT JOIN products p ON sri.product_id = p.id
         WHERE sri.sales_return_id = ?1 ORDER BY sri.id",
        )
        .map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = stmt
        .query_map(params![return_id], |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?, "product_id": row.get::<_, String>(1)?,
            "product_name": row.get::<_, Option<String>>(2)?, "sku": row.get::<_, Option<String>>(3)?,
            "quantity": row.get::<_, i32>(4)?, "unit_price": row.get::<_, f64>(5)?,
            "total_price": row.get::<_, f64>(6)?, "reason": row.get::<_, Option<String>>(7)?,
        })))
        .map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    Ok(serde_json::json!({"return": r#return, "items": items}))
}

/// 确认销售退货 → 增加库存(inbound) + 记录库存交易
#[tauri::command]
pub fn confirm_sales_return(
    db: tauri::State<Mutex<Database>>,
    return_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM sales_returns WHERE id = ?1 AND deleted_at IS NULL",
            params![return_id],
            |row| row.get(0),
        )
        .map_err(|_| "Sales return not found".to_string())?;

    if status != "draft" {
        return Err(format!("Cannot confirm return with status '{}'", status));
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let items: Vec<(String, i32)> =
        {
            let mut stmt = tx.prepare(
            "SELECT product_id, quantity FROM sales_return_items WHERE sales_return_id = ?1"
        ).map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![return_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
                })
                .map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };

    // 销售退货 = 恢复库存（入库）
    for (pid, qty) in &items {
        tx.execute(
            "UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![qty, pid],
        ).map_err(|e| e.to_string())?;

        let txn_id = uuid::Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, reference_no, reason) VALUES (?1, ?2, 'inbound', ?3, ?4, 'sales_return')",
            params![txn_id, pid, qty, return_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.execute(
        "UPDATE sales_returns SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![return_id],
    ).map_err(|e| e.to_string())?;

    // PRD v1.1: 退货确认时自动记录退款交易
    let (total_amount, customer_id): (f64, String) = tx
        .query_row(
            "SELECT total_amount, customer_id FROM sales_returns WHERE id = ?1",
            params![return_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let customer_name: Option<String> = tx
        .query_row(
            "SELECT name FROM customers WHERE id = ?1",
            params![customer_id],
            |row| row.get(0),
        )
        .ok();

    let refund_id = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO payment_transactions (id, order_type, order_id, transaction_type, amount,
         transaction_date, notes, counterparty_id, counterparty_name, counterparty_type)
         VALUES (?1, 'sales_return', ?2, 'refund', ?3, date('now'), '销售退货自动退款', ?4, ?5, 'customer')",
        params![refund_id, return_id, total_amount, customer_id, customer_name],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE sales_returns SET refund_amount = ?1 WHERE id = ?2",
        params![total_amount, return_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": return_id,
        "status": "confirmed",
        "message": "Sales return confirmed. Inventory restored."
    }))
}

/// 取消销售退货
#[tauri::command]
pub fn cancel_sales_return(
    db: tauri::State<Mutex<Database>>,
    return_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM sales_returns WHERE id = ?1 AND deleted_at IS NULL",
            params![return_id],
            |row| row.get(0),
        )
        .map_err(|_| "Sales return not found".to_string())?;

    if status != "draft" && status != "confirmed" {
        return Err(format!("Cannot cancel return with status '{}'", status));
    }

    conn.execute(
        "UPDATE sales_returns SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![return_id],
    ).map_err(|e| e.to_string())?;

    Ok(
        serde_json::json!({"id": return_id, "status": "cancelled", "message": "Sales return cancelled"}),
    )
}
