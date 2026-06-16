use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建供应商
#[tauri::command]
pub fn create_supplier(
    db: tauri::State<Mutex<Database>>,
    supplier: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = supplier["name"]
        .as_str()
        .ok_or("Supplier name is required")?;

    // 自动生成 code
    let code_str = format!("SUP-{}", &id[..8]);
    let code = supplier
        .get("code")
        .and_then(|v| v.as_str())
        .unwrap_or(&code_str);

    conn.execute(
        "INSERT INTO suppliers (id, name, code, contact_person, phone, email, address, website, payment_terms, tax_number, notes, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'pending')",
        params![
            id, name, code,
            supplier.get("contact_person").and_then(|v| v.as_str()),
            supplier.get("phone").and_then(|v| v.as_str()),
            supplier.get("email").and_then(|v| v.as_str()),
            supplier.get("address").and_then(|v| v.as_str()),
            supplier.get("website").and_then(|v| v.as_str()),
            supplier.get("payment_terms").and_then(|v| v.as_str()),
            supplier.get("tax_number").and_then(|v| v.as_str()),
            supplier.get("notes").and_then(|v| v.as_str()),
            supplier.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "code": code,
        "message": "Supplier created successfully"
    }))
}

/// 获取供应商列表
#[tauri::command]
pub fn get_suppliers(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, name, code, contact_person, phone, email, address, website,
                payment_terms, tax_number, notes, is_active, created_at, updated_at
         FROM suppliers WHERE deleted_at IS NULL",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (name LIKE ? OR code LIKE ? OR contact_person LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY name ASC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let suppliers: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "code": row.get::<_, String>(2)?,
                "contact_person": row.get::<_, Option<String>>(3)?,
                "phone": row.get::<_, Option<String>>(4)?,
                "email": row.get::<_, Option<String>>(5)?,
                "address": row.get::<_, Option<String>>(6)?,
                "website": row.get::<_, Option<String>>(7)?,
                "payment_terms": row.get::<_, Option<String>>(8)?,
                "tax_number": row.get::<_, Option<String>>(9)?,
                "notes": row.get::<_, Option<String>>(10)?,
                "is_active": row.get::<_, bool>(11)?,
                "created_at": row.get::<_, String>(12)?,
                "updated_at": row.get::<_, String>(13)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(suppliers)
}

/// 创建采购订单
#[tauri::command]
pub fn create_purchase_order(
    db: tauri::State<Mutex<Database>>,
    order: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();

    // 自动生成 PO 编号
    let po_number = order
        .get("po_number")
        .and_then(|v| v.as_str())
        .unwrap_or(&format!("PO-{}", &id[..8]))
        .to_string();

    let supplier_id = order["supplier_id"]
        .as_str()
        .ok_or("Supplier ID is required")?
        .to_string();

    let order_date = order
        .get("order_date")
        .and_then(|v| v.as_str())
        .unwrap_or("2024-01-01")
        .to_string();

    // 开启事务
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 插入采购订单主表
    tx.execute(
        "INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, expected_delivery_date, status, total_amount, paid_amount, payment_status, notes, created_by, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending')",
        params![
            id,
            po_number,
            supplier_id,
            order_date,
            order.get("expected_delivery_date").and_then(|v| v.as_str()),
            "draft",
            0.0,
            0.0,
            "unpaid",
            order.get("notes").and_then(|v| v.as_str()),
            order.get("created_by").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    // 插入采购订单明细
    if let Some(items) = order.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id = Uuid::new_v4().to_string();
            let product_id = item["product_id"]
                .as_str()
                .ok_or("Product ID required in items")?;
            let quantity = item["quantity"]
                .as_i64()
                .ok_or("Quantity required in items")? as i32;
            let unit_price = item["unit_price"]
                .as_f64()
                .ok_or("Unit price required in items")?;
            let total_price = quantity as f64 * unit_price;

            tx.execute(
                "INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    item_id,
                    id,
                    product_id,
                    quantity,
                    unit_price,
                    total_price,
                    0,
                    item.get("notes").and_then(|v| v.as_str()),
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 计算总金额并更新
    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM purchase_order_items WHERE purchase_order_id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE purchase_orders SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "po_number": po_number,
        "total_amount": total_amount,
        "message": "Purchase order created successfully"
    }))
}

/// 获取采购订单列表
#[tauri::command]
pub fn get_purchase_orders(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name,
                po.order_date, po.expected_delivery_date, po.status,
                po.total_amount, po.paid_amount, po.payment_status,
                po.notes, po.created_at, po.updated_at
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.deleted_at IS NULL",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            sql.push_str(" AND po.status = ?");
            params_vec.push(Box::new(status.to_string()));
        }

        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (po.po_number LIKE ? OR s.name LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY po.created_at DESC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let orders: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "po_number": row.get::<_, String>(1)?,
                "supplier_id": row.get::<_, String>(2)?,
                "supplier_name": row.get::<_, Option<String>>(3)?,
                "order_date": row.get::<_, String>(4)?,
                "expected_delivery_date": row.get::<_, Option<String>>(5)?,
                "status": row.get::<_, String>(6)?,
                "total_amount": row.get::<_, f64>(7)?,
                "paid_amount": row.get::<_, f64>(8)?,
                "payment_status": row.get::<_, String>(9)?,
                "notes": row.get::<_, Option<String>>(10)?,
                "created_at": row.get::<_, String>(11)?,
                "updated_at": row.get::<_, String>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(orders)
}

/// 获取采购订单详情(包含明细)
#[tauri::command]
pub fn get_purchase_order_detail(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 获取订单主表信息
    let order: serde_json::Value = conn
        .query_row(
            "SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name,
                po.order_date, po.expected_delivery_date, po.status,
                po.total_amount, po.paid_amount, po.payment_status,
                po.notes, po.created_at, po.updated_at
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE po.id = ?1 AND po.deleted_at IS NULL",
            params![order_id],
            |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "po_number": row.get::<_, String>(1)?,
                    "supplier_id": row.get::<_, String>(2)?,
                    "supplier_name": row.get::<_, Option<String>>(3)?,
                    "order_date": row.get::<_, String>(4)?,
                    "expected_delivery_date": row.get::<_, Option<String>>(5)?,
                    "status": row.get::<_, String>(6)?,
                    "total_amount": row.get::<_, f64>(7)?,
                    "paid_amount": row.get::<_, f64>(8)?,
                    "payment_status": row.get::<_, String>(9)?,
                    "notes": row.get::<_, Option<String>>(10)?,
                    "created_at": row.get::<_, String>(11)?,
                    "updated_at": row.get::<_, String>(12)?,
                }))
            },
        )
        .map_err(|e| e.to_string())?;

    // 获取订单明细
    let mut stmt = conn
        .prepare(
            "SELECT poi.id, poi.product_id, p.name as product_name, p.sku,
                poi.quantity, poi.unit_price, poi.total_price, poi.received_quantity, poi.notes
         FROM purchase_order_items poi
         LEFT JOIN products p ON poi.product_id = p.id
         WHERE poi.purchase_order_id = ?1
         ORDER BY poi.id",
        )
        .map_err(|e| e.to_string())?;

    let items: Vec<serde_json::Value> = stmt
        .query_map(params![order_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "product_id": row.get::<_, String>(1)?,
                "product_name": row.get::<_, Option<String>>(2)?,
                "sku": row.get::<_, Option<String>>(3)?,
                "quantity": row.get::<_, i32>(4)?,
                "unit_price": row.get::<_, f64>(5)?,
                "total_price": row.get::<_, f64>(6)?,
                "received_quantity": row.get::<_, i32>(7)?,
                "notes": row.get::<_, Option<String>>(8)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "order": order,
        "items": items
    }))
}

/// 更新采购订单 (Tauri command)
#[tauri::command]
pub fn update_purchase_order_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    order: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order not found".to_string())?;

    if status != "draft" {
        return Err("Only draft orders can be updated".to_string());
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE purchase_orders SET supplier_id = ?1, order_date = ?2, expected_delivery_date = ?3, notes = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
        params![
            order["supplier_id"].as_str().unwrap_or(""),
            order.get("order_date").and_then(|v| v.as_str()),
            order.get("expected_delivery_date").and_then(|v| v.as_str()),
            order.get("notes").and_then(|v| v.as_str()),
            order_id,
        ],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM purchase_order_items WHERE purchase_order_id = ?1",
        params![order_id],
    )
    .map_err(|e| e.to_string())?;

    if let Some(items) = order.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id = Uuid::new_v4().to_string();
            let quantity = item["quantity"].as_i64().unwrap_or(0) as i32;
            let unit_price = item["unit_price"].as_f64().unwrap_or(0.0);
            tx.execute(
                "INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
                params![item_id, order_id, item["product_id"].as_str().unwrap_or(""), quantity, unit_price, quantity as f64 * unit_price, item.get("notes").and_then(|v| v.as_str())],
            ).map_err(|e| e.to_string())?;
        }
    }

    let total: f64 = tx.query_row("SELECT COALESCE(SUM(total_price),0.0) FROM purchase_order_items WHERE purchase_order_id = ?1", params![order_id], |row| row.get(0)).unwrap_or(0.0);
    tx.execute(
        "UPDATE purchase_orders SET total_amount = ?1 WHERE id = ?2",
        params![total, order_id],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"id": order_id, "message": "Purchase order updated"}))
}

/// 删除采购订单 (软删除)
#[tauri::command]
pub fn delete_purchase_order_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order not found".to_string())?;

    if status != "draft" && status != "cancelled" {
        return Err("Only draft or cancelled orders can be deleted".to_string());
    }

    conn.execute("UPDATE purchase_orders SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1", params![order_id])
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"id": order_id, "message": "Purchase order deleted"}))
}

/// 确认收货 (增加库存)
#[tauri::command]
pub fn receive_purchase_order_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order not found".to_string())?;

    if status != "confirmed" && status != "draft" && status != "approved" {
        return Err(format!("Cannot receive order with status '{}'", status));
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let items: Vec<(String, i32)> = {
        let mut stmt = tx.prepare("SELECT product_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?1").map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![order_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut auto_offset_details: Vec<serde_json::Value> = Vec::new();

    for (pid, qty) in &items {
        // PRD v12.0：进货前检查是否存在负库存，自动冲销
        let pre_stock: i32 = tx
            .query_row(
                "SELECT current_stock FROM products WHERE id = ?1 AND deleted_at IS NULL",
                params![pid],
                |row| row.get(0),
            )
            .unwrap_or(0);

        tx.execute("UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![qty, pid]).map_err(|e| e.to_string())?;
        let txn_id = Uuid::new_v4().to_string();
        tx.execute("INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, reference_no, reason) VALUES (?1, ?2, 'inbound', ?3, ?4, 'purchase_order')",
            params![txn_id, pid, qty, order_id]).map_err(|e| e.to_string())?;
        tx.execute("UPDATE purchase_order_items SET received_quantity = received_quantity + ?1 WHERE purchase_order_id = ?2 AND product_id = ?3", params![qty, order_id, pid]).map_err(|e| e.to_string())?;

        // PRD v12.0：进货冲销提示
        if pre_stock < 0 {
            let offset_qty = -pre_stock; // 需冲销数量
            let offset_note = if *qty >= offset_qty {
                format!("已自动冲销缺货 {} 件（进货前 {} + 进货 {} = {}）", offset_qty, pre_stock, qty, pre_stock + qty)
            } else {
                format!("部分冲销缺货 {} 件（进货前 {} + 进货 {} = {}，仍需补货 {}）", qty, pre_stock, qty, pre_stock + qty, offset_qty - qty)
            };
            auto_offset_details.push(serde_json::json!({
                "product_id": pid,
                "pre_stock": pre_stock,
                "inbound_qty": qty,
                "new_stock": pre_stock + qty,
                "note": offset_note,
            }));
        }

        // 进货后若库存 >= 0，清除 negative_since
        let post_stock = pre_stock + qty;
        if post_stock >= 0 {
            tx.execute("UPDATE products SET negative_since = NULL WHERE id = ?1", params![pid]).map_err(|e| e.to_string())?;
        }

        // 进货后提升置信度为 medium
        tx.execute("UPDATE products SET stock_confidence = 'medium' WHERE id = ?1", params![pid]).map_err(|e| e.to_string())?;
    }

    tx.execute("UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = ?1", params![order_id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    let mut response = serde_json::json!({
        "id": order_id,
        "status": "received",
        "message": "Purchase order received. Inventory updated.",
    });
    if !auto_offset_details.is_empty() {
        response["auto_offsets"] = serde_json::Value::Array(auto_offset_details);
    }
    Ok(response)
}

/// 确认采购订单 (draft → confirmed)
#[tauri::command]
pub fn confirm_purchase_order_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order not found".to_string())?;

    if status != "draft" {
        return Err(format!("Cannot confirm order with status '{}'", status));
    }

    conn.execute("UPDATE purchase_orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?1", params![order_id])
        .map_err(|e| e.to_string())?;

    Ok(
        serde_json::json!({"id": order_id, "status": "confirmed", "message": "Purchase order confirmed"}),
    )
}

/// 取消采购订单 (任意状态 → cancelled)
#[tauri::command]
pub fn cancel_purchase_order_cmd(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let status: String = conn
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order not found".to_string())?;

    if status == "received" || status == "cancelled" {
        return Err(format!("Cannot cancel order with status '{}'", status));
    }

    conn.execute("UPDATE purchase_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?1", params![order_id])
        .map_err(|e| e.to_string())?;

    Ok(
        serde_json::json!({"id": order_id, "status": "cancelled", "message": "Purchase order cancelled"}),
    )
}
