// 餐饮行业插件 Tauri 命令
// 需求文档：行业插件功能实现

use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

/// 创建 POS 点餐订单
#[tauri::command]
pub fn catering_create_pos_order(
    db: tauri::State<Mutex<Database>>,
    table_id: String,
    items: Value,
    payment_method: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let items_str = items.to_string();
    let total_amount: f64 = items.as_array()
        .map(|arr| arr.iter().filter_map(|i| i["price"].as_f64()).sum())
        .unwrap_or(0.0);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO pos_orders (id, table_id, items, total_amount, payment_method, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
        params![id, table_id, items_str, total_amount, payment_method, now],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "total_amount": total_amount, "status": "pending" }))
}

/// 查询 POS 订单
#[tauri::command]
pub fn catering_get_pos_orders(
    db: tauri::State<Mutex<Database>>,
    table_id: Option<String>,
    status: Option<String>,
    date: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = "SELECT id, table_id, items, total_amount, payment_method, status, created_at, settled_at FROM pos_orders WHERE 1=1".to_string();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref tid) = table_id {
        sql.push_str(" AND table_id = ?");
        param_values.push(Box::new(tid.clone()));
    }
    if let Some(ref s) = status {
        sql.push_str(" AND status = ?");
        param_values.push(Box::new(s.clone()));
    }
    if let Some(ref d) = date {
        sql.push_str(" AND date(created_at) = ?");
        param_values.push(Box::new(d.clone()));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT 50");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_ref.as_slice(), |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "table_id": row.get::<_, String>(1)?,
            "items": row.get::<_, String>(2)?,
            "total_amount": row.get::<_, f64>(3)?,
            "payment_method": row.get::<_, Option<String>>(4)?,
            "status": row.get::<_, String>(5)?,
            "created_at": row.get::<_, String>(6)?,
            "settled_at": row.get::<_, Option<String>>(7)?,
        }))
    }).map_err(|e| e.to_string())?;

    let orders: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "data": orders }))
}

/// 结算 POS 订单
#[tauri::command]
pub fn catering_settle_pos_order(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    payment_method: String,
    amount: f64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE pos_orders SET status = 'settled', payment_method = ?1, total_amount = ?2, settled_at = ?3 WHERE id = ?4",
        params![payment_method, amount, now, order_id],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "message": "订单已结算", "order_id": order_id, "settled_at": now }))
}

/// 获取 POS 当日营收汇总
#[tauri::command]
pub fn catering_get_daily_summary(
    db: tauri::State<Mutex<Database>>,
    date: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let date = date.unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let conn = db.connection();

    let total: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total_amount), 0) FROM pos_orders WHERE date(created_at) = ?1 AND status = 'settled'",
        params![date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pos_orders WHERE date(created_at) = ?1",
        params![date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "date": date, "total_revenue": total, "order_count": count }))
}

/// 获取 KDS 订单（后厨显示）
#[tauri::command]
pub fn catering_get_kds_orders(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let orders: Vec<Value> = if let Some(ref s) = status {
        let mut stmt = conn.prepare(
            "SELECT id, table_id, items, status, created_at FROM pos_orders WHERE status = ?1 ORDER BY created_at ASC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![s], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "table_id": row.get::<_, String>(1)?,
                "items": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "created_at": row.get::<_, String>(4)?,
            }))
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, table_id, items, status, created_at FROM pos_orders WHERE status IN ('pending','preparing') ORDER BY created_at ASC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "table_id": row.get::<_, String>(1)?,
                "items": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "created_at": row.get::<_, String>(4)?,
            }))
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    Ok(json!({ "data": orders }))
}

/// 标记 KDS 菜品完成
#[tauri::command]
pub fn catering_mark_kds_item_done(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    conn.execute(
        "UPDATE pos_orders SET status = 'completed' WHERE id = ?1",
        params![order_id],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "message": "菜品已标记完成", "order_id": order_id }))
}
