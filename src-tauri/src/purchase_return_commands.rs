use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;

/// 生成采购退货编号
fn generate_pr_number() -> String {
    let now = chrono::Local::now();
    let date_str = now.format("%Y%m%d").to_string();
    let random = uuid::Uuid::new_v4().to_string()[..4].to_uppercase();
    format!("PR-{}-{}", date_str, random)
}

/// 创建采购退货单
#[tauri::command]
pub fn create_purchase_return(db: tauri::State<Mutex<Database>>, r#return: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = uuid::Uuid::new_v4().to_string();
    let pr_number = r#return.get("pr_number")
        .and_then(|v| v.as_str())
        .unwrap_or(&generate_pr_number())
        .to_string();
    let purchase_order_id = r#return["purchase_order_id"].as_str().ok_or("Purchase order ID is required")?;
    let supplier_id = r#return["supplier_id"].as_str().ok_or("Supplier ID is required")?;
    let return_date = r#return.get("return_date")
        .and_then(|v| v.as_str())
        .unwrap_or("2024-01-01")
        .to_string();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO purchase_returns (id, pr_number, purchase_order_id, supplier_id, return_date, status, total_amount, refund_amount, reason, notes, created_by, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0, 0, ?6, ?7, ?8, 'pending')",
        params![
            id, pr_number, purchase_order_id, supplier_id, return_date,
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
            // 后端校验：退货数量不超过原采购订单数量
            let orig_qty: i32 = tx.query_row(
                "SELECT quantity FROM purchase_order_items WHERE purchase_order_id = ?1 AND product_id = ?2",
                params![purchase_order_id, product_id],
                |row| row.get(0),
            ).map_err(|e| format!("获取原订单商品数量失败: {}", e))?;
            if quantity > orig_qty {
                return Err(format!(
                    "商品「{}」退货数量({})超过原订单数量({})", product_id, quantity, orig_qty
                ));
            }
            let unit_price = item["unit_price"].as_f64().ok_or("Unit price required")?;
            let total_price = quantity as f64 * unit_price;

            tx.execute(
                "INSERT INTO purchase_return_items (id, purchase_return_id, product_id, quantity, unit_price, total_price, reason)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![item_id, id, product_id, quantity, unit_price, total_price, item.get("reason").and_then(|v| v.as_str())],
            ).map_err(|e| e.to_string())?;
        }
    }

    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM purchase_return_items WHERE purchase_return_id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE purchase_returns SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "pr_number": pr_number,
        "total_amount": total_amount,
        "message": "Purchase return created successfully"
    }))
}

/// 获取采购退货单列表
#[tauri::command]
pub fn get_purchase_returns(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT pr.id, pr.pr_number, pr.purchase_order_id, po.po_number as po_number,
                pr.supplier_id, s.name as supplier_name,
                pr.return_date, pr.status,
                pr.total_amount, pr.refund_amount,
                pr.reason, pr.notes, pr.created_at, pr.updated_at
         FROM purchase_returns pr
         LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
         LEFT JOIN suppliers s ON pr.supplier_id = s.id
         WHERE pr.deleted_at IS NULL"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            sql.push_str(" AND pr.status = ?");
            params_vec.push(Box::new(status.to_string()));
        }

        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (pr.pr_number LIKE ? OR po.po_number LIKE ? OR s.name LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }

        if let Some(po_id) = opts.get("purchase_order_id").and_then(|v| v.as_str()) {
            sql.push_str(" AND pr.purchase_order_id = ?");
            params_vec.push(Box::new(po_id.to_string()));
        }
    }

    sql.push_str(" ORDER BY pr.created_at DESC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let returns: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "pr_number": row.get::<_, String>(1)?,
                "purchase_order_id": row.get::<_, String>(2)?,
                "po_number": row.get::<_, Option<String>>(3)?,
                "supplier_id": row.get::<_, String>(4)?,
                "supplier_name": row.get::<_, Option<String>>(5)?,
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

/// 获取采购退货单详情(含明细)
#[tauri::command]
pub fn get_purchase_return_detail(db: tauri::State<Mutex<Database>>, return_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let r#return = conn.query_row(
        "SELECT pr.id, pr.pr_number, pr.purchase_order_id, po.po_number as po_number,
                pr.supplier_id, s.name as supplier_name,
                pr.return_date, pr.status,
                pr.total_amount, pr.refund_amount,
                pr.reason, pr.notes, pr.created_at, pr.updated_at
         FROM purchase_returns pr
         LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
         LEFT JOIN suppliers s ON pr.supplier_id = s.id
         WHERE pr.id = ?1 AND pr.deleted_at IS NULL",
        params![return_id],
        |row| Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?, "pr_number": row.get::<_, String>(1)?,
            "purchase_order_id": row.get::<_, String>(2)?, "po_number": row.get::<_, Option<String>>(3)?,
            "supplier_id": row.get::<_, String>(4)?, "supplier_name": row.get::<_, Option<String>>(5)?,
            "return_date": row.get::<_, String>(6)?, "status": row.get::<_, String>(7)?,
            "total_amount": row.get::<_, f64>(8)?, "refund_amount": row.get::<_, f64>(9)?,
            "reason": row.get::<_, Option<String>>(10)?, "notes": row.get::<_, Option<String>>(11)?,
            "created_at": row.get::<_, String>(12)?, "updated_at": row.get::<_, String>(13)?,
        })),
    ).map_err(|_| "Purchase return not found".to_string())?;

    let mut stmt = conn.prepare(
        "SELECT pri.id, pri.product_id, p.name as product_name, p.sku,
                pri.quantity, pri.unit_price, pri.total_price, pri.reason
         FROM purchase_return_items pri LEFT JOIN products p ON pri.product_id = p.id
         WHERE pri.purchase_return_id = ?1 ORDER BY pri.id"
    ).map_err(|e| e.to_string())?;

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

/// 确认采购退货 → 扣减库存(outbound) + 记录库存交易
#[tauri::command]
pub fn confirm_purchase_return(db: tauri::State<Mutex<Database>>, return_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn.query_row(
        "SELECT status FROM purchase_returns WHERE id = ?1 AND deleted_at IS NULL",
        params![return_id],
        |row| row.get(0),
    ).map_err(|_| "Purchase return not found".to_string())?;

    if status != "draft" {
        return Err(format!("Cannot confirm return with status '{}'", status));
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 获取退货单明细
    let items: Vec<(String, i32)> = {
        let mut stmt = tx.prepare(
            "SELECT product_id, quantity FROM purchase_return_items WHERE purchase_return_id = ?1"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![return_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    // 库存扣减（退货 = 退回给供应商，库存减少）
    for (pid, qty) in &items {
        let current: i32 = tx.query_row(
            "SELECT current_stock FROM products WHERE id = ?1 AND deleted_at IS NULL",
            params![pid],
            |row| row.get(0),
        ).map_err(|_| format!("Product {} not found", pid))?;

        if current < *qty {
            if let Err(rb) = tx.rollback() { eprintln!("[purchase_return] rollback failed: {}", rb); }
            return Err(format!("Insufficient stock for product {}. Current: {}, To return: {}", pid, current, qty));
        }

        tx.execute(
            "UPDATE products SET current_stock = current_stock - ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![qty, pid],
        ).map_err(|e| e.to_string())?;

        let txn_id = uuid::Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, reference_no, reason) VALUES (?1, ?2, 'outbound', ?3, ?4, 'purchase_return')",
            params![txn_id, pid, qty, return_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.execute(
        "UPDATE purchase_returns SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![return_id],
    ).map_err(|e| e.to_string())?;

    // PRD v1.1: 退货确认时自动记录退款交易
    let (total_amount, supplier_id): (f64, String) = tx.query_row(
        "SELECT total_amount, supplier_id FROM purchase_returns WHERE id = ?1",
        params![return_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let supplier_name: Option<String> = tx.query_row(
        "SELECT name FROM suppliers WHERE id = ?1",
        params![supplier_id],
        |row| row.get(0),
    ).ok();

    let refund_id = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO payment_transactions (id, order_type, order_id, transaction_type, amount,
         transaction_date, notes, counterparty_id, counterparty_name, counterparty_type)
         VALUES (?1, 'purchase_return', ?2, 'refund', ?3, date('now'), '采购退货自动退款', ?4, ?5, 'supplier')",
        params![refund_id, return_id, total_amount, supplier_id, supplier_name],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE purchase_returns SET refund_amount = ?1 WHERE id = ?2",
        params![total_amount, return_id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": return_id,
        "status": "confirmed",
        "message": "Purchase return confirmed. Inventory deducted."
    }))
}

/// 取消采购退货
#[tauri::command]
pub fn cancel_purchase_return(db: tauri::State<Mutex<Database>>, return_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn.query_row(
        "SELECT status FROM purchase_returns WHERE id = ?1 AND deleted_at IS NULL",
        params![return_id],
        |row| row.get(0),
    ).map_err(|_| "Purchase return not found".to_string())?;

    if status != "draft" && status != "confirmed" {
        return Err(format!("Cannot cancel return with status '{}'", status));
    }

    conn.execute(
        "UPDATE purchase_returns SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![return_id],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"id": return_id, "status": "cancelled", "message": "Purchase return cancelled"}))
}

/// 修改采购退货单（仅草稿状态）
#[tauri::command]
pub fn update_purchase_return(db: tauri::State<Mutex<Database>>, return_id: String, r#return: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn.query_row(
        "SELECT status FROM purchase_returns WHERE id = ?1 AND deleted_at IS NULL",
        params![return_id],
        |row| row.get(0),
    ).map_err(|_| "Purchase return not found".to_string())?;

    if status != "draft" {
        return Err("Only draft returns can be updated".to_string());
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE purchase_returns SET return_date = ?1, reason = ?2, notes = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![
            r#return.get("return_date").and_then(|v| v.as_str()),
            r#return.get("reason").and_then(|v| v.as_str()),
            r#return.get("notes").and_then(|v| v.as_str()),
            return_id,
        ],
    ).map_err(|e| e.to_string())?;

    // 重建明细
    tx.execute("DELETE FROM purchase_return_items WHERE purchase_return_id = ?1", params![return_id]).map_err(|e| e.to_string())?;

    if let Some(items) = r#return.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id = uuid::Uuid::new_v4().to_string();
            let q = item["quantity"].as_i64().unwrap_or(0) as i32;
            let up = item["unit_price"].as_f64().unwrap_or(0.0);
            tx.execute(
                "INSERT INTO purchase_return_items (id, purchase_return_id, product_id, quantity, unit_price, total_price, reason) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![item_id, return_id, item["product_id"].as_str().unwrap_or(""), q, up, q as f64 * up, item.get("reason").and_then(|v| v.as_str())],
            ).map_err(|e| e.to_string())?;
        }
    }

    let total: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM purchase_return_items WHERE purchase_return_id = ?1",
        params![return_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    tx.execute("UPDATE purchase_returns SET total_amount = ?1 WHERE id = ?2", params![total, return_id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"id": return_id, "message": "Purchase return updated"}))
}
