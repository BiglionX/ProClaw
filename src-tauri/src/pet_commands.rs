// 宠物行业插件 Tauri 命令
// 需求文档：行业插件功能实现

use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 创建宠物档案
#[tauri::command]
pub fn pet_create_profile(
    db: tauri::State<Mutex<Database>>,
    owner_id: String,
    name: String,
    species: Option<String>,
    breed: Option<String>,
    gender: Option<String>,
    birth_date: Option<String>,
    weight: Option<f64>,
    chip_no: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO pet_profiles (id, owner_id, name, species, breed, gender, birth_date, weight, chip_no, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![id, owner_id, name, species, breed, gender, birth_date, weight, chip_no, now],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "name": name, "message": "宠物档案已创建" }))
}

/// 查询宠物档案
#[tauri::command]
pub fn pet_get_profiles(
    db: tauri::State<Mutex<Database>>,
    owner_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let rows: Vec<Value> = if let Some(ref oid) = owner_id {
        let mut stmt = conn.prepare(
            "SELECT id, owner_id, name, species, breed, gender, birth_date, weight, color, chip_no, is_neutered, photo_url, notes, created_at
             FROM pet_profiles WHERE owner_id = ?1 ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map(params![oid], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "owner_id": row.get::<_, String>(1)?,
                    "name": row.get::<_, String>(2)?,
                    "species": row.get::<_, Option<String>>(3)?,
                    "breed": row.get::<_, Option<String>>(4)?,
                    "gender": row.get::<_, Option<String>>(5)?,
                    "birth_date": row.get::<_, Option<String>>(6)?,
                    "weight": row.get::<_, Option<f64>>(7)?,
                    "color": row.get::<_, Option<String>>(8)?,
                    "chip_no": row.get::<_, Option<String>>(9)?,
                    "is_neutered": row.get::<_, Option<bool>>(10)?,
                    "photo_url": row.get::<_, Option<String>>(11)?,
                    "notes": row.get::<_, Option<String>>(12)?,
                    "created_at": row.get::<_, String>(13)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, owner_id, name, species, breed, gender, birth_date, weight, color, chip_no, is_neutered, photo_url, notes, created_at
             FROM pet_profiles ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "owner_id": row.get::<_, String>(1)?,
                    "name": row.get::<_, String>(2)?,
                    "species": row.get::<_, Option<String>>(3)?,
                    "breed": row.get::<_, Option<String>>(4)?,
                    "gender": row.get::<_, Option<String>>(5)?,
                    "birth_date": row.get::<_, Option<String>>(6)?,
                    "weight": row.get::<_, Option<f64>>(7)?,
                    "color": row.get::<_, Option<String>>(8)?,
                    "chip_no": row.get::<_, Option<String>>(9)?,
                    "is_neutered": row.get::<_, Option<bool>>(10)?,
                    "photo_url": row.get::<_, Option<String>>(11)?,
                    "notes": row.get::<_, Option<String>>(12)?,
                    "created_at": row.get::<_, String>(13)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    };

    Ok(json!({ "data": rows }))
}

/// 创建寄养记录
#[tauri::command]
pub fn pet_create_boarding(
    db: tauri::State<Mutex<Database>>,
    pet_id: String,
    room_id: String,
    check_in: String,
    check_out: String,
    daily_rate: f64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO pet_boarding_records (id, pet_id, room_id, check_in_at, check_out_at, daily_rate, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7)",
        params![id, pet_id, room_id, check_in, check_out, daily_rate, now],
    ).map_err(|e| e.to_string())?;

    // 更新房间状态
    conn.execute(
        "UPDATE pet_boarding_rooms SET status = 'occupied' WHERE id = ?1",
        params![room_id],
    )
    .ok();

    Ok(json!({ "id": id, "status": "active", "message": "寄养记录已创建" }))
}

/// 查询寄养记录
#[tauri::command]
pub fn pet_get_boarding_records(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let rows: Vec<Value> = if let Some(ref s) = status {
        let mut stmt = conn.prepare(
            "SELECT id, pet_id, room_id, check_in_at, check_out_at, daily_rate, total_amount, status, notes, created_at
             FROM pet_boarding_records WHERE status = ?1 ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map(params![s], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "pet_id": row.get::<_, String>(1)?,
                    "room_id": row.get::<_, String>(2)?,
                    "check_in_at": row.get::<_, String>(3)?,
                    "check_out_at": row.get::<_, String>(4)?,
                    "daily_rate": row.get::<_, f64>(5)?,
                    "total_amount": row.get::<_, Option<f64>>(6)?,
                    "status": row.get::<_, String>(7)?,
                    "notes": row.get::<_, Option<String>>(8)?,
                    "created_at": row.get::<_, String>(9)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, pet_id, room_id, check_in_at, check_out_at, daily_rate, total_amount, status, notes, created_at
             FROM pet_boarding_records ORDER BY created_at DESC LIMIT 50"
        ).map_err(|e| e.to_string())?;
        let r = stmt
            .query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "pet_id": row.get::<_, String>(1)?,
                    "room_id": row.get::<_, String>(2)?,
                    "check_in_at": row.get::<_, String>(3)?,
                    "check_out_at": row.get::<_, String>(4)?,
                    "daily_rate": row.get::<_, f64>(5)?,
                    "total_amount": row.get::<_, Option<f64>>(6)?,
                    "status": row.get::<_, String>(7)?,
                    "notes": row.get::<_, Option<String>>(8)?,
                    "created_at": row.get::<_, String>(9)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        r.filter_map(|r| r.ok()).collect()
    };

    Ok(json!({ "data": rows }))
}

/// 寄养离店结算
#[tauri::command]
pub fn pet_check_out_boarding(
    db: tauri::State<Mutex<Database>>,
    boarding_id: String,
    final_amount: f64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();

    // 查询房间 ID 并释放
    let room_id: Option<String> = conn
        .query_row(
            "SELECT room_id FROM pet_boarding_records WHERE id = ?1",
            params![boarding_id],
            |row| row.get(0),
        )
        .ok();

    conn.execute(
        "UPDATE pet_boarding_records SET status = 'checked_out', total_amount = ?1, check_out_at = ?2 WHERE id = ?3",
        params![final_amount, now, boarding_id],
    ).map_err(|e| e.to_string())?;

    if let Some(rid) = room_id {
        conn.execute(
            "UPDATE pet_boarding_rooms SET status = 'vacant' WHERE id = ?1",
            params![rid],
        )
        .ok();
    }

    Ok(json!({ "message": "离店结算完成", "total_amount": final_amount }))
}
