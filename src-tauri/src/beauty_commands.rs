// 美业行业插件 Tauri 命令
// 需求文档：行业插件功能实现

use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 创建美业预约
#[tauri::command]
pub fn beauty_create_appointment(
    db: tauri::State<Mutex<Database>>,
    customer_id: String,
    service_ids: Value,
    employee_id: String,
    start_at: String,
    duration: i64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let services_str = service_ids.to_string();

    conn.execute(
        "INSERT INTO beauty_appointments (id, customer_id, service_ids, employee_id, start_at, duration, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?7)",
        params![id, customer_id, services_str, employee_id, start_at, duration, now],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "status": "pending", "start_at": start_at }))
}

/// 查询预约
#[tauri::command]
pub fn beauty_get_appointments(
    db: tauri::State<Mutex<Database>>,
    _date_range: Option<String>,
    employee_id: Option<String>,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = "SELECT id, customer_id, service_ids, employee_id, start_at, duration, status, notes, created_at FROM beauty_appointments WHERE 1=1".to_string();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref eid) = employee_id {
        sql.push_str(" AND employee_id = ?");
        param_values.push(Box::new(eid.clone()));
    }
    if let Some(ref s) = status {
        sql.push_str(" AND status = ?");
        param_values.push(Box::new(s.clone()));
    }
    sql.push_str(" ORDER BY start_at ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_ref: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(params_ref.as_slice(), |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "customer_id": row.get::<_, String>(1)?,
                "service_ids": row.get::<_, String>(2)?,
                "employee_id": row.get::<_, String>(3)?,
                "start_at": row.get::<_, String>(4)?,
                "duration": row.get::<_, i64>(5)?,
                "status": row.get::<_, String>(6)?,
                "notes": row.get::<_, Option<String>>(7)?,
                "created_at": row.get::<_, String>(8)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let appointments: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "data": appointments }))
}

/// 更新预约状态
#[tauri::command]
pub fn beauty_update_appointment_status(
    db: tauri::State<Mutex<Database>>,
    id: String,
    status: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE beauty_appointments SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![status, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(json!({ "message": "预约状态已更新", "status": status }))
}

/// 获取美业员工列表
#[tauri::command]
pub fn beauty_get_employees(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare(
        "SELECT id, name, phone, hire_date, service_ids, commission_rate, is_active, created_at FROM beauty_employees ORDER BY name"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "phone": row.get::<_, Option<String>>(2)?,
                "hire_date": row.get::<_, Option<String>>(3)?,
                "service_ids": row.get::<_, String>(4)?,
                "commission_rate": row.get::<_, f64>(5)?,
                "is_active": row.get::<_, bool>(6)?,
                "created_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let employees: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "data": employees }))
}

/// 创建美业员工
#[tauri::command]
pub fn beauty_create_employee(
    db: tauri::State<Mutex<Database>>,
    name: String,
    phone: Option<String>,
    service_ids: Option<Value>,
    commission_rate: Option<f64>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let services_str = service_ids.map(|v| v.to_string()).unwrap_or_default();
    let rate = commission_rate.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO beauty_employees (id, name, phone, hire_date, service_ids, commission_rate, is_active, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
        params![id, name, phone, now, services_str, rate, now],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "name": name, "message": "员工创建成功" }))
}
