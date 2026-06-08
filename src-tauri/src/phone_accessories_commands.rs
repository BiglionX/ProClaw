// 手机配件批发行业插件 Tauri 命令
use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub fn pa_get_device_models(
    db: tauri::State<Mutex<Database>>,
    brand: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let models: Vec<Value>;
    if let Some(ref b) = brand {
        models = {
            let mut stmt = conn.prepare("SELECT id, brand, model_name, release_year, is_active, created_at FROM pa_device_models WHERE brand = ?1 ORDER BY model_name").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![b], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"brand":row.get::<_,String>(1)?,"model_name":row.get::<_,String>(2)?,"release_year":row.get::<_,Option<i32>>(3)?,"is_active":row.get::<_,bool>(4)?,"created_at":row.get::<_,String>(5)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        models = {
            let mut stmt = conn.prepare("SELECT id, brand, model_name, release_year, is_active, created_at FROM pa_device_models ORDER BY brand, model_name LIMIT 200").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"brand":row.get::<_,String>(1)?,"model_name":row.get::<_,String>(2)?,"release_year":row.get::<_,Option<i32>>(3)?,"is_active":row.get::<_,bool>(4)?,"created_at":row.get::<_,String>(5)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "models": models }))
}

#[tauri::command]
pub fn pa_add_device_model(
    db: tauri::State<Mutex<Database>>,
    brand: String,
    model_name: String,
    release_year: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO pa_device_models (id, brand, model_name, release_year) VALUES (?1,?2,?3,?4)",
        params![id, brand, model_name, release_year],
    )
    .map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "机型已添加" }))
}

#[tauri::command]
pub fn pa_get_quotations(
    db: tauri::State<Mutex<Database>>,
    customer_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let quotations: Vec<Value>;
    if let Some(ref cid) = customer_id {
        quotations = {
            let mut stmt = conn.prepare("SELECT q.id, q.customer_id, c.name as customer_name, q.items, q.total_amount, q.status, q.valid_until, q.created_at FROM pa_quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.customer_id = ?1 ORDER BY q.created_at DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![cid], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"customer_id":row.get::<_,String>(1)?,"customer_name":row.get::<_,Option<String>>(2)?,"items":row.get::<_,String>(3)?,"total_amount":row.get::<_,Option<f64>>(4)?,"status":row.get::<_,String>(5)?,"valid_until":row.get::<_,Option<String>>(6)?,"created_at":row.get::<_,String>(7)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        quotations = {
            let mut stmt = conn.prepare("SELECT q.id, q.customer_id, c.name as customer_name, q.items, q.total_amount, q.status, q.valid_until, q.created_at FROM pa_quotations q LEFT JOIN customers c ON q.customer_id = c.id ORDER BY q.created_at DESC LIMIT 100").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"customer_id":row.get::<_,String>(1)?,"customer_name":row.get::<_,Option<String>>(2)?,"items":row.get::<_,String>(3)?,"total_amount":row.get::<_,Option<f64>>(4)?,"status":row.get::<_,String>(5)?,"valid_until":row.get::<_,Option<String>>(6)?,"created_at":row.get::<_,String>(7)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "quotations": quotations }))
}

#[tauri::command]
pub fn pa_create_quotation(
    db: tauri::State<Mutex<Database>>,
    customer_id: String,
    items: Value,
    valid_until: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let total: f64 = items
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|i| {
                    i["price"]
                        .as_f64()
                        .zip(i["quantity"].as_f64())
                        .map(|(p, q)| p * q)
                })
                .sum()
        })
        .unwrap_or(0.0);
    conn.execute("INSERT INTO pa_quotations (id, customer_id, items, total_amount, valid_until) VALUES (?1,?2,?3,?4,?5)",
        params![id, customer_id, items.to_string(), total, valid_until]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "total_amount": total, "message": "报价单已创建" }))
}

#[tauri::command]
pub fn pa_get_price_history(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn
        .prepare(
            "SELECT soi.created_at, soi.unit_price as price, so.created_at as order_date
         FROM sales_order_items soi JOIN sales_orders so ON soi.sales_order_id = so.id
         WHERE soi.product_id = ?1 ORDER BY so.created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let history: Vec<Value> = stmt
        .query_map(params![product_id], |row| {
            Ok(json!({"date": row.get::<_,String>(2)?, "price": row.get::<_,f64>(1)?}))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    let avg_price = if history.is_empty() {
        0.0
    } else {
        history
            .iter()
            .filter_map(|h| h["price"].as_f64())
            .sum::<f64>()
            / history.len() as f64
    };
    Ok(json!({ "history": history, "average_price": avg_price, "count": history.len() }))
}
