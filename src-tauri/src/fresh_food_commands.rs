// 食材配送行业插件 Tauri 命令
use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub fn ff_get_delivery_routes(
    db: tauri::State<Mutex<Database>>,
    date: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let target_date = date.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let mut stmt = conn
        .prepare(
            "SELECT id, route_date, driver_name, stops, status, created_at
         FROM ff_delivery_routes WHERE route_date = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let routes: Vec<Value> = stmt
        .query_map(params![target_date], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "route_date": row.get::<_, String>(1)?,
                "driver_name": row.get::<_, Option<String>>(2)?,
                "stops": row.get::<_, Option<String>>(3)?,
                "status": row.get::<_, String>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(json!({ "routes": routes, "date": target_date }))
}

#[tauri::command]
pub fn ff_create_delivery_route(
    db: tauri::State<Mutex<Database>>,
    route_date: String,
    driver_name: Option<String>,
    stops: Value,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO ff_delivery_routes (id, route_date, driver_name, stops) VALUES (?1, ?2, ?3, ?4)",
        params![id, route_date, driver_name, stops.to_string()],
    ).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "配送路线已创建" }))
}

#[tauri::command]
pub fn ff_get_recurring_templates(
    db: tauri::State<Mutex<Database>>,
    customer_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let templates: Vec<Value>;
    if let Some(ref cid) = customer_id {
        templates = {
            let mut stmt = conn.prepare(
                "SELECT r.id, r.customer_id, c.name as customer_name, r.items, r.schedule_type, r.week_days, r.is_active, r.next_generate_date, r.created_at
                 FROM ff_recurring_order_templates r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.customer_id = ?1 ORDER BY r.created_at DESC"
            ).map_err(|e| e.to_string())?;
            let x = stmt.query_map(params![cid], |row| {
                Ok(json!({
                    "id": row.get::<_,String>(0)?,"customer_id": row.get::<_,String>(1)?,"customer_name": row.get::<_,Option<String>>(2)?,
                    "items": row.get::<_,String>(3)?,"schedule_type": row.get::<_,String>(4)?,"week_days": row.get::<_,Option<String>>(5)?,
                    "is_active": row.get::<_,bool>(6)?,"next_generate_date": row.get::<_,Option<String>>(7)?,"created_at": row.get::<_,String>(8)?,
                }))
            }).map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
            x
        };
    } else {
        templates = {
            let mut stmt = conn.prepare(
                "SELECT r.id, r.customer_id, c.name as customer_name, r.items, r.schedule_type, r.week_days, r.is_active, r.next_generate_date, r.created_at
                 FROM ff_recurring_order_templates r LEFT JOIN customers c ON r.customer_id = c.id ORDER BY r.created_at DESC LIMIT 100"
            ).map_err(|e| e.to_string())?;
            let x = stmt.query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_,String>(0)?,"customer_id": row.get::<_,String>(1)?,"customer_name": row.get::<_,Option<String>>(2)?,
                    "items": row.get::<_,String>(3)?,"schedule_type": row.get::<_,String>(4)?,"week_days": row.get::<_,Option<String>>(5)?,
                    "is_active": row.get::<_,bool>(6)?,"next_generate_date": row.get::<_,Option<String>>(7)?,"created_at": row.get::<_,String>(8)?,
                }))
            }).map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
            x
        };
    }
    Ok(json!({ "templates": templates }))
}

#[tauri::command]
pub fn ff_get_freshness_alerts(
    db: tauri::State<Mutex<Database>>,
    days_ahead: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let days = days_ahead.unwrap_or(3);
    let target_date = Utc::now().format("%Y-%m-%d").to_string();
    let mut stmt = conn.prepare(
        "SELECT f.id, f.product_id, p.name as product_name, f.batch_no, f.received_date, f.expiry_date, f.quantity, f.alert_sent
         FROM ff_freshness_tracking f LEFT JOIN products p ON f.product_id = p.id
         WHERE f.expiry_date <= date(?1, '+' || ?2 || ' days') AND f.expiry_date >= ?1 AND f.quantity > 0 ORDER BY f.expiry_date ASC"
    ).map_err(|e| e.to_string())?;
    let alerts: Vec<Value> = stmt.query_map(params![target_date, days], |row| {
        Ok(json!({
            "id": row.get::<_,String>(0)?,"product_id": row.get::<_,String>(1)?,"product_name": row.get::<_,Option<String>>(2)?,
            "batch_no": row.get::<_,Option<String>>(3)?,"received_date": row.get::<_,String>(4)?,"expiry_date": row.get::<_,String>(5)?,
            "quantity": row.get::<_,f64>(6)?,"alert_sent": row.get::<_,bool>(7)?,
        }))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "alerts": alerts, "count": alerts.len(), "days_ahead": days }))
}
