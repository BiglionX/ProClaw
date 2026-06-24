// 餐饮行业插件 Tauri 命令
// 需求文档：行业插件功能实现

use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

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
    let total_amount: f64 = items
        .as_array()
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
    let params_ref: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(params_ref.as_slice(), |row| {
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
        })
        .map_err(|e| e.to_string())?;

    let orders: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "data": orders }))
}

/// 结算 POS 订单
/// 审计修复 R6: 添加金额负数防御
#[tauri::command]
pub fn catering_settle_pos_order(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    payment_method: String,
    amount: f64,
) -> Result<Value, String> {
    if amount < 0.0 {
        return Err("Amount cannot be negative".to_string());
    }
    if !amount.is_finite() {
        return Err("Amount must be a finite number".to_string());
    }
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

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pos_orders WHERE date(created_at) = ?1",
            params![date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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
        let rows = stmt
            .query_map(params![s], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "table_id": row.get::<_, String>(1)?,
                    "items": row.get::<_, String>(2)?,
                    "status": row.get::<_, String>(3)?,
                    "created_at": row.get::<_, String>(4)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, table_id, items, status, created_at FROM pos_orders WHERE status IN ('pending','preparing') ORDER BY created_at ASC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "table_id": row.get::<_, String>(1)?,
                    "items": row.get::<_, String>(2)?,
                    "status": row.get::<_, String>(3)?,
                    "created_at": row.get::<_, String>(4)?,
                }))
            })
            .map_err(|e| e.to_string())?;
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
    )
    .map_err(|e| e.to_string())?;

    Ok(json!({ "message": "菜品已标记完成", "order_id": order_id }))
}

/// 获取 POS 菜品列表
#[tauri::command]
pub fn catering_get_menu_items(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_catering_menu_if_empty(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, category_id, name, price, is_available FROM pos_menu_items ORDER BY sort_order, name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "category_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "price": row.get::<_, f64>(3)?,
                "is_available": row.get::<_, bool>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(json!({ "data": rows.filter_map(|r| r.ok()).collect::<Vec<_>>() }))
}

/// 获取 POS 桌台列表
#[tauri::command]
pub fn catering_get_tables(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_catering_tables_if_empty(&conn)?;

    let mut stmt = conn
        .prepare("SELECT id, area, name, capacity, status FROM pos_tables ORDER BY area, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "area": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "capacity": row.get::<_, i64>(3)?,
                "status": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(json!({ "data": rows.filter_map(|r| r.ok()).collect::<Vec<_>>() }))
}

/// 更新桌台状态
#[tauri::command]
pub fn catering_update_table_status(
    db: tauri::State<Mutex<Database>>,
    table_id: String,
    status: String,
) -> Result<Value, String> {
    if !["vacant", "occupied", "reserved", "cleaning"].contains(&status.as_str()) {
        return Err("Invalid table status".to_string());
    }
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let updated = conn
        .execute(
            "UPDATE pos_tables SET status = ?1 WHERE id = ?2",
            params![status, table_id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Table not found".to_string());
    }
    Ok(json!({ "id": table_id, "status": status }))
}

fn seed_catering_menu_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pos_menu_items", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let items = [
        ("m1", "cat_hotpot", "麻辣锅底", 68.0),
        ("m2", "cat_hotpot", "番茄锅底", 58.0),
        ("m3", "cat_hotpot", "菌汤锅底", 48.0),
        ("m4", "cat_appetizer", "拍黄瓜", 18.0),
        ("m5", "cat_appetizer", "口水鸡", 28.0),
        ("m6", "cat_appetizer", "皮蛋豆腐", 16.0),
        ("m7", "cat_main", "回锅肉", 38.0),
        ("m8", "cat_main", "鱼香肉丝", 32.0),
        ("m9", "cat_main", "宫保鸡丁", 35.0),
        ("m10", "cat_main", "麻婆豆腐", 22.0),
        ("m11", "cat_main", "水煮鱼", 58.0),
        ("m12", "cat_drink", "可乐", 5.0),
        ("m13", "cat_drink", "雪碧", 5.0),
        ("m14", "cat_drink", "酸梅汤", 8.0),
        ("m15", "cat_dessert", "冰粉", 12.0),
        ("m16", "cat_dessert", "红糖糍粑", 18.0),
        ("m17", "cat_rice", "米饭", 2.0),
        ("m18", "cat_rice", "炒面", 15.0),
        ("m19", "cat_rice", "炒饭", 15.0),
    ];
    for (id, cat, name, price) in items {
        conn.execute(
            "INSERT OR IGNORE INTO pos_menu_items (id, category_id, name, price, is_available, sort_order) VALUES (?1, ?2, ?3, ?4, 1, 0)",
            params![id, cat, name, price],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn seed_catering_tables_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pos_tables", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let tables = [
        ("t1", "大厅", "A1", 4, "vacant"),
        ("t2", "大厅", "A2", 4, "occupied"),
        ("t3", "大厅", "A3", 6, "occupied"),
        ("t4", "大厅", "A5", 8, "reserved"),
        ("t5", "包间", "V1", 10, "vacant"),
        ("t6", "包间", "V2", 12, "vacant"),
        ("t7", "包间", "V3", 8, "cleaning"),
        ("t8", "包间", "V5", 16, "occupied"),
        ("t9", "大厅", "A6", 4, "vacant"),
        ("t10", "大厅", "A7", 4, "vacant"),
        ("t11", "大厅", "A8", 6, "vacant"),
        ("t12", "包间", "V6", 20, "vacant"),
    ];
    for (id, area, name, cap, status) in tables {
        conn.execute(
            "INSERT OR IGNORE INTO pos_tables (id, area, name, capacity, status) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, area, name, cap, status],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
