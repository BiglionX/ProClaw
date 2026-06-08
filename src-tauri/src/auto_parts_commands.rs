// 汽车配件行业插件 Tauri 命令
use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub fn ap_search_by_oe(
    db: tauri::State<Mutex<Database>>,
    oe_number: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn
        .prepare(
            "SELECT o.id, o.product_id, p.name as product_name, o.oe_number, o.vehicle_model_id,
                v.brand, v.series, v.year_range, o.part_category
         FROM ap_oe_numbers o LEFT JOIN products p ON o.product_id = p.id
         LEFT JOIN ap_vehicle_models v ON o.vehicle_model_id = v.id
         WHERE o.oe_number LIKE '%' || ?1 || '%' LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let results: Vec<Value> = stmt.query_map(params![oe_number], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"product_id":row.get::<_,String>(1)?,"product_name":row.get::<_,Option<String>>(2)?,"oe_number":row.get::<_,String>(3)?,"vehicle_model_id":row.get::<_,Option<String>>(4)?,"brand":row.get::<_,Option<String>>(5)?,"series":row.get::<_,Option<String>>(6)?,"year_range":row.get::<_,Option<String>>(7)?,"part_category":row.get::<_,Option<String>>(8)?}))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "results": results, "oe_number": oe_number, "count": results.len() }))
}

#[tauri::command]
pub fn ap_get_vehicle_models(
    db: tauri::State<Mutex<Database>>,
    brand: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let models: Vec<Value>;
    if let Some(ref b) = brand {
        models = {
            let mut stmt = conn.prepare("SELECT id, brand, series, year_range, displacement, created_at FROM ap_vehicle_models WHERE brand = ?1 ORDER BY series").map_err(|e| e.to_string())?;
            let x = stmt.query_map(params![b], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"brand":row.get::<_,String>(1)?,"series":row.get::<_,Option<String>>(2)?,"year_range":row.get::<_,Option<String>>(3)?,"displacement":row.get::<_,Option<String>>(4)?,"created_at":row.get::<_,String>(5)?})) }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
            x
        };
    } else {
        models = {
            let mut stmt = conn.prepare("SELECT id, brand, series, year_range, displacement, created_at FROM ap_vehicle_models ORDER BY brand, series LIMIT 200").map_err(|e| e.to_string())?;
            let x = stmt.query_map([], |row| { Ok(json!({"id":row.get::<_,String>(0)?,"brand":row.get::<_,String>(1)?,"series":row.get::<_,Option<String>>(2)?,"year_range":row.get::<_,Option<String>>(3)?,"displacement":row.get::<_,Option<String>>(4)?,"created_at":row.get::<_,String>(5)?})) }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
            x
        };
    }
    Ok(json!({ "models": models }))
}

#[tauri::command]
pub fn ap_add_vehicle_model(
    db: tauri::State<Mutex<Database>>,
    brand: String,
    series: Option<String>,
    year_range: Option<String>,
    displacement: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO ap_vehicle_models (id, brand, series, year_range, displacement) VALUES (?1,?2,?3,?4,?5)",
        params![id, brand, series, year_range, displacement]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "车型已添加" }))
}

#[tauri::command]
pub fn ap_get_part_categories(_db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    Ok(json!({ "categories": [
        {"id":"OEM","name":"原厂件","grade":"OEM"},
        {"id":"brand","name":"品牌件","grade":"brand"},
        {"id":"aftermarket","name":"副厂件","grade":"aftermarket"},
        {"id":"used","name":"拆车件","grade":"used"}
    ]}))
}

#[tauri::command]
pub fn ap_add_oe_number(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    oe_number: String,
    vehicle_model_id: Option<String>,
    part_category: Option<String>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO ap_oe_numbers (id, product_id, oe_number, vehicle_model_id, part_category) VALUES (?1,?2,?3,?4,?5)",
        params![id, product_id, oe_number, vehicle_model_id, part_category]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "OE号已添加" }))
}
