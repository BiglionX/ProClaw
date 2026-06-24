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
    seed_beauty_demo_if_empty(&conn)?;

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
    seed_beauty_demo_if_empty(&conn)?;

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

fn seed_beauty_demo_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let emp_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM beauty_employees", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);
    if emp_count == 0 {
        let employees = [
            (
                "e1",
                "发型师小王",
                "1380002001",
                r#"["剪发","染发","烫发"]"#,
                0.3,
            ),
            (
                "e2",
                "美容师小刘",
                "1380002002",
                r#"["面部护理","SPA套餐"]"#,
                0.35,
            ),
            ("e3", "美甲师小李", "1380002003", r#"["美甲"]"#, 0.4),
        ];
        for (id, name, phone, services, rate) in employees {
            conn.execute(
                "INSERT OR IGNORE INTO beauty_employees (id, name, phone, hire_date, service_ids, commission_rate, is_active, created_at)
                 VALUES (?1, ?2, ?3, '2024-01-15', ?4, ?5, 1, datetime('now'))",
                params![id, name, phone, services, rate],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    let appt_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM beauty_appointments", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);
    if appt_count > 0 {
        return Ok(());
    }

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let now = Utc::now().to_rfc3339();
    let appointments = [
        (
            "a1",
            "张女士",
            r#"["剪发","染发"]"#,
            "e1",
            "09:00",
            120i64,
            "checked_in",
        ),
        (
            "a2",
            "李女士",
            r#"["面部护理"]"#,
            "e2",
            "10:30",
            60i64,
            "in_progress",
        ),
        (
            "a3",
            "王小姐",
            r#"["洗吹"]"#,
            "e1",
            "11:00",
            30i64,
            "pending",
        ),
        (
            "a4",
            "赵女士",
            r#"["SPA套餐"]"#,
            "e2",
            "14:00",
            90i64,
            "pending",
        ),
    ];
    for (id, customer, services, emp, time, duration, status) in appointments {
        let start_at = format!("{}T{}", today, time);
        conn.execute(
            "INSERT OR IGNORE INTO beauty_appointments (id, customer_id, service_ids, employee_id, start_at, duration, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![id, customer, services, emp, start_at, duration, status, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 获取服务分类
#[tauri::command]
pub fn beauty_get_service_categories(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_beauty_services_if_empty(&conn)?;

    let mut stmt = conn
        .prepare("SELECT id, name, icon, sort_order FROM beauty_service_categories ORDER BY sort_order, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "icon": row.get::<_, Option<String>>(2)?,
                "sort_order": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(json!({ "data": rows.filter_map(|r| r.ok()).collect::<Vec<_>>() }))
}

/// 获取服务项目
#[tauri::command]
pub fn beauty_get_services(
    db: tauri::State<Mutex<Database>>,
    category_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_beauty_services_if_empty(&conn)?;

    let rows: Vec<Value> = if let Some(ref cat) = category_id {
        let mut stmt = conn.prepare(
            "SELECT id, category_id, name, duration, price, member_price, new_customer_price, is_active, sort_order
             FROM beauty_services WHERE category_id = ?1 ORDER BY sort_order, name",
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map(params![cat], map_beauty_service_row)
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, category_id, name, duration, price, member_price, new_customer_price, is_active, sort_order
             FROM beauty_services ORDER BY sort_order, name",
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map([], map_beauty_service_row)
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    };
    Ok(json!({ "data": rows }))
}

/// 创建服务项目
#[tauri::command]
pub fn beauty_create_service(
    db: tauri::State<Mutex<Database>>,
    category_id: String,
    name: String,
    duration: i64,
    price: f64,
    member_price: Option<f64>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let member = member_price.unwrap_or(price * 0.8);
    conn.execute(
        "INSERT INTO beauty_services (id, category_id, name, duration, price, member_price, new_customer_price, is_active, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, 1, 0)",
        params![id, category_id, name, duration, price, member],
    )
    .map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "name": name }))
}

/// 更新服务项目
#[tauri::command]
pub fn beauty_update_service(
    db: tauri::State<Mutex<Database>>,
    id: String,
    category_id: String,
    name: String,
    duration: i64,
    price: f64,
    member_price: f64,
    is_active: bool,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let updated = conn
        .execute(
            "UPDATE beauty_services SET category_id = ?1, name = ?2, duration = ?3, price = ?4,
             member_price = ?5, is_active = ?6 WHERE id = ?7",
            params![
                category_id,
                name,
                duration,
                price,
                member_price,
                is_active,
                id
            ],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Service not found".to_string());
    }
    Ok(json!({ "id": id }))
}

/// 删除服务项目
#[tauri::command]
pub fn beauty_delete_service(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    conn.execute("DELETE FROM beauty_services WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(json!({ "id": id }))
}

fn map_beauty_service_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": row.get::<_, String>(0)?,
        "category_id": row.get::<_, String>(1)?,
        "name": row.get::<_, String>(2)?,
        "duration": row.get::<_, i64>(3)?,
        "price": row.get::<_, f64>(4)?,
        "member_price": row.get::<_, f64>(5)?,
        "is_active": row.get::<_, bool>(7)?,
        "sort_order": row.get::<_, i64>(8)?,
    }))
}

fn seed_beauty_services_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM beauty_service_categories",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let categories = [
        ("sc1", "剪发", "✂️", 1),
        ("sc2", "染发", "🎨", 2),
        ("sc3", "烫发", "🌀", 3),
        ("sc4", "美容", "💆", 4),
        ("sc5", "美甲", "💅", 5),
    ];
    for (id, name, icon, order) in categories {
        conn.execute(
            "INSERT OR IGNORE INTO beauty_service_categories (id, name, icon, sort_order) VALUES (?1, ?2, ?3, ?4)",
            params![id, name, icon, order],
        )
        .map_err(|e| e.to_string())?;
    }
    let services = [
        ("s1", "sc1", "精剪", 30, 68.0, 48.0, 1),
        ("s2", "sc1", "洗剪吹", 45, 88.0, 68.0, 2),
        ("s3", "sc2", "全染", 120, 298.0, 238.0, 1),
        ("s4", "sc2", "挑染", 90, 198.0, 158.0, 2),
        ("s5", "sc3", "热烫", 180, 398.0, 318.0, 1),
        ("s6", "sc4", "基础面部护理", 60, 168.0, 128.0, 1),
        ("s7", "sc5", "基础美甲", 60, 98.0, 78.0, 1),
    ];
    for (id, cat, name, dur, price, member, order) in services {
        conn.execute(
            "INSERT OR IGNORE INTO beauty_services (id, category_id, name, duration, price, member_price, new_customer_price, is_active, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, 1, ?7)",
            params![id, cat, name, dur, price, member, order],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
