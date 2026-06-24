// 装修材料行业插件 Tauri 命令
use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

fn seed_dm_demo_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM dm_projects", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let now = Utc::now().to_rfc3339();
    let projects = [
        (
            "dm1",
            "阳光花园 3-1202",
            "dm_c1",
            "阳光花园3栋1202",
            "active",
            85000.0,
            "2026-04-01",
        ),
        (
            "dm2",
            "写字楼前台改造",
            "dm_c2",
            "科技路88号",
            "active",
            42000.0,
            "2026-05-10",
        ),
    ];
    for (id, name, cust, addr, status, budget, start) in projects {
        conn.execute(
            "INSERT OR IGNORE INTO dm_projects (id, name, customer_id, address, status, budget, start_date, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, name, cust, addr, status, budget, start, now],
        )
        .map_err(|e| e.to_string())?;
    }
    conn.execute(
        "INSERT OR IGNORE INTO dm_material_bom_templates (id, name, room_type, items, created_at)
         VALUES ('bom1', '标准卫生间材料清单', 'bathroom', '[]', ?1)",
        params![now],
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub fn dm_get_projects(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_dm_demo_if_empty(&conn)?;
    let projects: Vec<Value>;
    if let Some(ref s) = status {
        projects = {
            let mut stmt = conn.prepare(
                "SELECT p.id, p.name, p.customer_id, c.name as customer_name, p.address, p.status, p.budget, p.start_date, p.end_date, p.created_at
                 FROM dm_projects p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.status = ?1 ORDER BY p.created_at DESC"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![s], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"customer_id":row.get::<_,Option<String>>(2)?,"customer_name":row.get::<_,Option<String>>(3)?,"address":row.get::<_,Option<String>>(4)?,"status":row.get::<_,String>(5)?,"budget":row.get::<_,Option<f64>>(6)?,"start_date":row.get::<_,Option<String>>(7)?,"end_date":row.get::<_,Option<String>>(8)?,"created_at":row.get::<_,String>(9)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        projects = {
            let mut stmt = conn.prepare(
                "SELECT p.id, p.name, p.customer_id, c.name as customer_name, p.address, p.status, p.budget, p.start_date, p.end_date, p.created_at
                 FROM dm_projects p LEFT JOIN customers c ON p.customer_id = c.id ORDER BY p.created_at DESC LIMIT 100"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"customer_id":row.get::<_,Option<String>>(2)?,"customer_name":row.get::<_,Option<String>>(3)?,"address":row.get::<_,Option<String>>(4)?,"status":row.get::<_,String>(5)?,"budget":row.get::<_,Option<f64>>(6)?,"start_date":row.get::<_,Option<String>>(7)?,"end_date":row.get::<_,Option<String>>(8)?,"created_at":row.get::<_,String>(9)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "projects": projects }))
}

#[tauri::command]
pub fn dm_create_project(
    db: tauri::State<Mutex<Database>>,
    name: String,
    customer_id: Option<String>,
    address: Option<String>,
    budget: Option<f64>,
    start_date: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO dm_projects (id, name, customer_id, address, budget, start_date) VALUES (?1,?2,?3,?4,?5,?6)",
        params![id, name, customer_id, address, budget, start_date]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "项目已创建" }))
}

#[tauri::command]
pub fn dm_get_bom_templates(
    db: tauri::State<Mutex<Database>>,
    room_type: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_dm_demo_if_empty(&conn)?;
    let templates: Vec<Value>;
    if let Some(ref rt) = room_type {
        templates = {
            let mut stmt = conn.prepare("SELECT id, name, room_type, items, created_at FROM dm_material_bom_templates WHERE room_type = ?1 ORDER BY created_at DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![rt], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"room_type":row.get::<_,Option<String>>(2)?,"items":row.get::<_,String>(3)?,"created_at":row.get::<_,String>(4)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        templates = {
            let mut stmt = conn.prepare("SELECT id, name, room_type, items, created_at FROM dm_material_bom_templates ORDER BY created_at DESC LIMIT 100").map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"room_type":row.get::<_,Option<String>>(2)?,"items":row.get::<_,String>(3)?,"created_at":row.get::<_,String>(4)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "templates": templates }))
}

#[tauri::command]
pub fn dm_create_bom_template(
    db: tauri::State<Mutex<Database>>,
    name: String,
    room_type: Option<String>,
    items: Value,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO dm_material_bom_templates (id, name, room_type, items) VALUES (?1,?2,?3,?4)",
        params![id, name, room_type, items.to_string()],
    )
    .map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "BOM模板已创建" }))
}

#[tauri::command]
pub fn dm_get_project_materials(
    db: tauri::State<Mutex<Database>>,
    project_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT m.id, m.project_id, m.product_id, p.name as product_name, m.quantity, m.batch_no, m.color_no, m.signed_by, m.signed_at, m.created_at
         FROM dm_project_material_outs m LEFT JOIN products p ON m.product_id = p.id WHERE m.project_id = ?1 ORDER BY m.created_at DESC LIMIT 200"
    ).map_err(|e| e.to_string())?;
    let materials: Vec<Value> = stmt.query_map(params![project_id], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"project_id":row.get::<_,String>(1)?,"product_id":row.get::<_,String>(2)?,"product_name":row.get::<_,Option<String>>(3)?,"quantity":row.get::<_,f64>(4)?,"batch_no":row.get::<_,Option<String>>(5)?,"color_no":row.get::<_,Option<String>>(6)?,"signed_by":row.get::<_,Option<String>>(7)?,"signed_at":row.get::<_,Option<String>>(8)?,"created_at":row.get::<_,String>(9)?}))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "materials": materials, "project_id": project_id }))
}
