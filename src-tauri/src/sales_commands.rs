use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建客户
#[tauri::command]
pub fn create_customer(db: tauri::State<Mutex<Database>>, customer: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = customer["name"].as_str().ok_or("Customer name is required")?;
    let code_str = format!("CUST-{}", &id[..8]);
    let code = customer.get("code").and_then(|v| v.as_str()).unwrap_or(&code_str);

    conn.execute(
        "INSERT INTO customers (id, name, code, contact_person, phone, email, address, website, customer_type, tax_number, credit_limit, notes, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'pending')",
        params![
            id, name, code,
            customer.get("contact_person").and_then(|v| v.as_str()),
            customer.get("phone").and_then(|v| v.as_str()),
            customer.get("email").and_then(|v| v.as_str()),
            customer.get("address").and_then(|v| v.as_str()),
            customer.get("website").and_then(|v| v.as_str()),
            customer.get("customer_type").and_then(|v| v.as_str()).unwrap_or("individual"),
            customer.get("tax_number").and_then(|v| v.as_str()),
            customer.get("credit_limit").and_then(|v| v.as_f64()).unwrap_or(0.0),
            customer.get("notes").and_then(|v| v.as_str()),
            customer.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "code": code,
        "message": "Customer created successfully"
    }))
}

/// 获取客户列表
#[tauri::command]
pub fn get_customers(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, name, code, contact_person, phone, email, address, website,
                customer_type, tax_number, credit_limit, notes, is_active, created_at, updated_at
         FROM customers WHERE deleted_at IS NULL"
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

    let customers: Vec<serde_json::Value> = stmt
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
                "customer_type": row.get::<_, String>(8)?,
                "tax_number": row.get::<_, Option<String>>(9)?,
                "credit_limit": row.get::<_, f64>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "is_active": row.get::<_, bool>(12)?,
                "created_at": row.get::<_, String>(13)?,
                "updated_at": row.get::<_, String>(14)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(customers)
}

/// 创建销售订单
#[tauri::command]
pub fn create_sales_order(db: tauri::State<Mutex<Database>>, order: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let so_number = order.get("so_number")
        .and_then(|v| v.as_str())
        .unwrap_or(&format!("SO-{}", &id[..8]))
        .to_string();

    let customer_id = order["customer_id"]
        .as_str()
        .ok_or("Customer ID is required")?
        .to_string();

    let order_date = order.get("order_date")
        .and_then(|v| v.as_str())
        .unwrap_or("2024-01-01")
        .to_string();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, expected_delivery_date, status, total_amount, paid_amount, payment_status, shipping_address, notes, created_by, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'pending')",
        params![
            id, so_number, customer_id, order_date,
            order.get("expected_delivery_date").and_then(|v| v.as_str()),
            "draft", 0.0, 0.0, "unpaid",
            order.get("shipping_address").and_then(|v| v.as_str()),
            order.get("notes").and_then(|v| v.as_str()),
            order.get("created_by").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    if let Some(items) = order.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id = Uuid::new_v4().to_string();
            let product_id = item["product_id"].as_str().ok_or("Product ID required")?;
            let quantity = item["quantity"].as_i64().ok_or("Quantity required")? as i32;
            let unit_price = item["unit_price"].as_f64().ok_or("Unit price required")?;
            let total_price = quantity as f64 * unit_price;

            tx.execute(
                "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![item_id, id, product_id, quantity, unit_price, total_price, 0, item.get("notes").and_then(|v| v.as_str())],
            ).map_err(|e| e.to_string())?;
        }
    }

    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM sales_order_items WHERE sales_order_id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE sales_orders SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "so_number": so_number,
        "total_amount": total_amount,
        "message": "Sales order created successfully"
    }))
}

/// 获取销售订单列表
#[tauri::command]
pub fn get_sales_orders(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT so.id, so.so_number, so.customer_id, c.name as customer_name,
                so.order_date, so.expected_delivery_date, so.status,
                so.total_amount, so.paid_amount, so.payment_status,
                so.shipping_address, so.notes, so.created_at, so.updated_at
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.id
         WHERE so.deleted_at IS NULL"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            sql.push_str(" AND so.status = ?");
            params_vec.push(Box::new(status.to_string()));
        }

        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (so.so_number LIKE ? OR c.name LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY so.created_at DESC");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let orders: Vec<serde_json::Value> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "so_number": row.get::<_, String>(1)?,
                "customer_id": row.get::<_, String>(2)?,
                "customer_name": row.get::<_, Option<String>>(3)?,
                "order_date": row.get::<_, String>(4)?,
                "expected_delivery_date": row.get::<_, Option<String>>(5)?,
                "status": row.get::<_, String>(6)?,
                "total_amount": row.get::<_, f64>(7)?,
                "paid_amount": row.get::<_, f64>(8)?,
                "payment_status": row.get::<_, String>(9)?,
                "shipping_address": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "created_at": row.get::<_, String>(12)?,
                "updated_at": row.get::<_, String>(13)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(orders)
}
