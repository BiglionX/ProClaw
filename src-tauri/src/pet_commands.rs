// 宠物行业插件 Tauri 命令
// 需求文档：行业插件功能实现

use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 宠物档案可选参数
#[derive(serde::Deserialize)]
pub struct PetProfileOptions {
    pub species: Option<String>,
    pub breed: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<String>,
    pub weight: Option<f64>,
    pub chip_no: Option<String>,
}

/// 创建宠物档案
#[tauri::command]
pub fn pet_create_profile(
    db: tauri::State<Mutex<Database>>,
    owner_id: String,
    name: String,
    #[allow(dead_code)] options: Option<PetProfileOptions>,
) -> Result<Value, String> {
    let options = options.unwrap_or(PetProfileOptions {
        species: None,
        breed: None,
        gender: None,
        birth_date: None,
        weight: None,
        chip_no: None,
    });
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO pet_profiles (id, owner_id, name, species, breed, gender, birth_date, weight, chip_no, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![id, owner_id, name, options.species, options.breed, options.gender, options.birth_date, options.weight, options.chip_no, now],
    ).map_err(|e| e.to_string())?;

    Ok(json!({ "id": id, "name": name, "message": "宠物档案已创建" }))
}

const GROOMING_SERVICE_ITEMS: &[&str] = &[
    "基础洗护",
    "精洗",
    "剪毛造型",
    "SPA护理",
    "修甲",
    "耳道清洁",
];

/// 洗护服务项目列表
#[tauri::command]
pub fn pet_get_grooming_services() -> Result<Value, String> {
    let data: Vec<Value> = GROOMING_SERVICE_ITEMS
        .iter()
        .map(|name| json!({ "name": name }))
        .collect();
    Ok(json!({ "data": data }))
}

/// 查询宠物档案
#[tauri::command]
pub fn pet_get_profiles(
    db: tauri::State<Mutex<Database>>,
    owner_id: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_pet_profiles_if_empty(&conn)?;

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

fn seed_pet_profiles_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pet_profiles", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let now = Utc::now().to_rfc3339();
    let pets = [
        ("p1", "owner_zhang", "小黄", "dog", "金毛", "male", "2023-06-15", 28.5, "金色", "CN985632147", 1),
        ("p2", "owner_li", "咪咪", "cat", "布偶", "female", "2024-01-20", 4.2, "白色", "", 0),
        ("p3", "owner_wang", "小黑", "dog", "泰迪", "male", "2022-11-08", 6.0, "黑色", "CN123456789", 1),
        ("p5", "owner_zhao", "豆豆", "dog", "柯基", "female", "2023-09-12", 12.0, "黄白", "", 1),
    ];
    for (id, owner, name, species, breed, gender, birth, weight, color, chip, neutered) in pets {
        conn.execute(
            "INSERT OR IGNORE INTO pet_profiles (id, owner_id, name, species, breed, gender, birth_date, weight, color, chip_no, is_neutered, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)",
            params![id, owner, name, species, breed, gender, birth, weight, color, chip, neutered, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
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

/// 查询寄养房间
#[tauri::command]
pub fn pet_get_boarding_rooms(
    db: tauri::State<Mutex<Database>>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_pet_boarding_rooms_if_empty(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, room_type, capacity, daily_rate, status FROM pet_boarding_rooms ORDER BY room_type, name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "room_type": row.get::<_, String>(2)?,
                "capacity": row.get::<_, i64>(3)?,
                "daily_rate": row.get::<_, f64>(4)?,
                "status": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(json!({ "data": rows.filter_map(|r| r.ok()).collect::<Vec<_>>() }))
}

/// 查询洗护记录
#[tauri::command]
pub fn pet_get_grooming_records(
    db: tauri::State<Mutex<Database>>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    seed_pet_grooming_if_empty(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, pet_id, service_items, employee_id, scheduled_at, completed_at, amount, status, notes
             FROM pet_grooming_records ORDER BY scheduled_at DESC LIMIT 100",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "pet_id": row.get::<_, String>(1)?,
                "service_items": row.get::<_, String>(2)?,
                "employee_id": row.get::<_, Option<String>>(3)?,
                "scheduled_at": row.get::<_, String>(4)?,
                "completed_at": row.get::<_, Option<String>>(5)?,
                "amount": row.get::<_, f64>(6)?,
                "status": row.get::<_, String>(7)?,
                "notes": row.get::<_, Option<String>>(8)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(json!({ "data": rows.filter_map(|r| r.ok()).collect::<Vec<_>>() }))
}

/// 创建洗护预约
#[tauri::command]
pub fn pet_create_grooming_record(
    db: tauri::State<Mutex<Database>>,
    pet_id: String,
    service_items: String,
    employee_id: Option<String>,
    scheduled_at: String,
    notes: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO pet_grooming_records (id, pet_id, service_items, employee_id, scheduled_at, amount, status, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 'scheduled', ?6, ?7)",
        params![id, pet_id, service_items, employee_id, scheduled_at, notes, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "status": "scheduled" }))
}

/// 更新洗护状态
#[tauri::command]
pub fn pet_update_grooming_status(
    db: tauri::State<Mutex<Database>>,
    id: String,
    status: String,
    amount: Option<f64>,
) -> Result<Value, String> {
    if !["scheduled", "in_progress", "completed", "cancelled"].contains(&status.as_str()) {
        return Err("Invalid grooming status".to_string());
    }
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();
    let completed_at = if status == "completed" {
        Some(now.clone())
    } else {
        None
    };
    if let Some(amt) = amount {
        conn.execute(
            "UPDATE pet_grooming_records SET status = ?1, completed_at = ?2, amount = ?3 WHERE id = ?4",
            params![status, completed_at, amt, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE pet_grooming_records SET status = ?1, completed_at = ?2 WHERE id = ?3",
            params![status, completed_at, id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(json!({ "id": id, "status": status }))
}

fn seed_pet_boarding_rooms_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pet_boarding_rooms", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let rooms = [
        ("r1", "标准间 A1", "standard", 1, 80.0, "occupied"),
        ("r2", "标准间 A2", "standard", 1, 80.0, "vacant"),
        ("r3", "豪华间 B1", "luxury", 2, 150.0, "vacant"),
        ("r4", "豪华间 B2", "luxury", 2, 150.0, "occupied"),
        ("r5", "豪华间 B3", "luxury", 2, 150.0, "occupied"),
        ("r6", "VIP 房间 C1", "vip", 3, 280.0, "vacant"),
        ("r7", "VIP 房间 C2", "vip", 3, 280.0, "cleaning"),
        ("r8", "标准间 A3", "standard", 1, 80.0, "vacant"),
        ("r9", "猫房专区 M1", "cat", 1, 60.0, "vacant"),
        ("r10", "猫房专区 M2", "cat", 1, 60.0, "occupied"),
    ];
    for (id, name, room_type, cap, rate, status) in rooms {
        conn.execute(
            "INSERT OR IGNORE INTO pet_boarding_rooms (id, name, room_type, capacity, daily_rate, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, room_type, cap, rate, status],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn seed_pet_grooming_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pet_grooming_records", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let now = Utc::now().to_rfc3339();
    let records = [
        ("g1", "p1", "基础洗护+剪毛造型", "美容师小李", "2026-05-30 10:00", 128.0, "scheduled", ""),
        ("g2", "p2", "精洗+SPA护理", "美容师小李", "2026-05-30 14:00", 188.0, "scheduled", "猫咪胆小需注意"),
        ("g3", "p3", "基础洗护", "美容师小张", "2026-05-29 09:00", 68.0, "completed", ""),
        ("g4", "p5", "精洗+修甲", "美容师小李", "2026-05-29 15:00", 98.0, "completed", ""),
    ];
    for (id, pet_id, items, emp, scheduled, amount, status, notes) in records {
        let completed = if status == "completed" {
            Some(scheduled.to_string())
        } else {
            None
        };
        conn.execute(
            "INSERT OR IGNORE INTO pet_grooming_records (id, pet_id, service_items, employee_id, scheduled_at, completed_at, amount, status, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![id, pet_id, items, emp, scheduled, completed, amount, status, notes, now],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
