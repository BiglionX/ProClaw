// 社区团购行业插件 Tauri 命令
use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub fn gb_get_groups(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let groups: Vec<Value>;
    if let Some(ref s) = status {
        groups = {
            let mut stmt = conn.prepare(
                "SELECT id, name, start_at, end_at, min_participants, status, created_at FROM gb_groups WHERE status = ?1 ORDER BY created_at DESC"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![s], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"start_at":row.get::<_,String>(2)?,"end_at":row.get::<_,String>(3)?,"min_participants":row.get::<_,i32>(4)?,"status":row.get::<_,String>(5)?,"created_at":row.get::<_,String>(6)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        groups = {
            let mut stmt = conn.prepare(
                "SELECT id, name, start_at, end_at, min_participants, status, created_at FROM gb_groups ORDER BY created_at DESC LIMIT 50"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"name":row.get::<_,String>(1)?,"start_at":row.get::<_,String>(2)?,"end_at":row.get::<_,String>(3)?,"min_participants":row.get::<_,i32>(4)?,"status":row.get::<_,String>(5)?,"created_at":row.get::<_,String>(6)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "groups": groups }))
}

#[tauri::command]
pub fn gb_create_group(
    db: tauri::State<Mutex<Database>>,
    name: String,
    start_at: String,
    end_at: String,
    min_participants: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO gb_groups (id, name, start_at, end_at, min_participants) VALUES (?1,?2,?3,?4,?5)",
        params![id, name, start_at, end_at, min_participants.unwrap_or(1)]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "团购已创建" }))
}

#[tauri::command]
pub fn gb_get_orders(
    db: tauri::State<Mutex<Database>>,
    group_id: String,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let orders: Vec<Value>;
    if let Some(ref s) = status {
        orders = {
            let mut stmt = conn.prepare("SELECT id, group_id, customer_name, items, total_amount, status, pickup_code, notes, created_at FROM gb_orders WHERE group_id = ?1 AND status = ?2 ORDER BY created_at DESC").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![group_id, s], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"group_id":row.get::<_,String>(1)?,"customer_name":row.get::<_,String>(2)?,"items":row.get::<_,String>(3)?,"total_amount":row.get::<_,Option<f64>>(4)?,"status":row.get::<_,String>(5)?,"pickup_code":row.get::<_,Option<String>>(6)?,"notes":row.get::<_,Option<String>>(7)?,"created_at":row.get::<_,String>(8)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    } else {
        orders = {
            let mut stmt = conn.prepare("SELECT id, group_id, customer_name, items, total_amount, status, pickup_code, notes, created_at FROM gb_orders WHERE group_id = ?1 ORDER BY created_at DESC LIMIT 200").map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![group_id], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"group_id":row.get::<_,String>(1)?,"customer_name":row.get::<_,String>(2)?,"items":row.get::<_,String>(3)?,"total_amount":row.get::<_,Option<f64>>(4)?,"status":row.get::<_,String>(5)?,"pickup_code":row.get::<_,Option<String>>(6)?,"notes":row.get::<_,Option<String>>(7)?,"created_at":row.get::<_,String>(8)?})) }).map_err(|e| e.to_string())?;
            rows.filter_map(|r| r.ok()).collect()
        };
    }
    Ok(json!({ "orders": orders }))
}

#[tauri::command]
pub fn gb_parse_jielong_text(
    _db: tauri::State<Mutex<Database>>,
    raw_text: String,
) -> Result<Value, String> {
    // Simple heuristic parser for jielong text format:
    // "1. 商品名 x2" or "商品名 2份" patterns
    let mut items = Vec::new();
    for line in raw_text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Remove leading numbers like "1." "2、" etc
        let cleaned = line.trim_start_matches(|c: char| {
            c.is_ascii_digit() || c == '.' || c == '、' || c == ' ' || c == '）' || c == ')'
        });
        if cleaned.is_empty() {
            continue;
        }
        // Try to extract quantity: "x2" "×3" "2份" "3件" "4个"
        let mut name = cleaned.to_string();
        let mut qty = 1;
        for pat in &["×", "x", "X"] {
            if let Some(pos) = name.rfind(pat) {
                if let Ok(n) = name[pos + 1..].trim().parse::<i32>() {
                    qty = n;
                    name = name[..pos].trim().to_string();
                    break;
                }
            }
        }
        if qty == 1 {
            for (suffix, _) in &[
                ("份", 1),
                ("件", 1),
                ("个", 1),
                ("箱", 1),
                ("包", 1),
                ("袋", 1),
            ] {
                if let Some(pos) = name.rfind(suffix) {
                    let before = &name[..pos];
                    if let Some(last_num) = before.rsplit(|c: char| !c.is_ascii_digit()).next() {
                        if let Ok(n) = last_num.parse::<i32>() {
                            qty = n;
                            name = before[..before.len() - last_num.len()].trim().to_string();
                            break;
                        }
                    }
                }
            }
        }
        items.push(json!({"name": name.trim(), "quantity": qty}));
    }
    Ok(json!({ "parsed_items": items, "count": items.len() }))
}

#[tauri::command]
pub fn gb_verify_pickup(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    pickup_code: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let existing = conn
        .query_row(
            "SELECT id, pickup_code, status FROM gb_orders WHERE id = ?1",
            params![order_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;
    if existing.2 == "picked_up" {
        return Ok(json!({"verified": false, "message": "该订单已核销"}));
    }
    if let Some(ref code) = pickup_code {
        if existing.1.as_ref() != Some(code) {
            return Ok(json!({"verified": false, "message": "提货码不匹配"}));
        }
    }
    conn.execute(
        "UPDATE gb_orders SET status = 'picked_up' WHERE id = ?1",
        params![order_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(json!({"verified": true, "order_id": order_id, "message": "核销成功"}))
}
