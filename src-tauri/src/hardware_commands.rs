// 五金行业插件 Tauri 命令
use crate::database::Database;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

#[tauri::command]
pub fn hw_get_spec_templates(
    db: tauri::State<Mutex<Database>>, product_spu_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?; let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT id, product_spu_id, spec_type, spec_values, sort_order FROM hw_spec_templates WHERE product_spu_id = ?1 ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;
    let templates: Vec<Value> = stmt.query_map(params![product_spu_id], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"product_spu_id":row.get::<_,String>(1)?,"spec_type":row.get::<_,String>(2)?,"spec_values":row.get::<_,String>(3)?,"sort_order":row.get::<_,i32>(4)?}))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "templates": templates }))
}

#[tauri::command]
pub fn hw_set_spec_template(
    db: tauri::State<Mutex<Database>>, product_spu_id: String, spec_type: String, spec_values: Value,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?; let conn = db.connection(); let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO hw_spec_templates (id, product_spu_id, spec_type, spec_values) VALUES (?1,?2,?3,?4)",
        params![id, product_spu_id, spec_type, spec_values.to_string()]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "规格模板已设置" }))
}

#[tauri::command]
pub fn hw_calculate_cutting(
    _db: tauri::State<Mutex<Database>>,
    sheet_width: f64, sheet_height: f64, pieces: Value,
) -> Result<Value, String> {
    // Simple greedy cutting algorithm
    let piece_list: Vec<(f64, f64, String)> = pieces.as_array().unwrap_or(&vec![]).iter().map(|p| {
        (p["width"].as_f64().unwrap_or(0.0), p["height"].as_f64().unwrap_or(0.0), p["label"].as_str().unwrap_or("").to_string())
    }).collect();
    let total_area = sheet_width * sheet_height;
    let used_area: f64 = piece_list.iter().map(|(w, h, _)| w * h).sum();
    let utilization = if total_area > 0.0 { (used_area / total_area * 100.0).min(100.0) } else { 0.0 };
    let layout: Vec<Value> = piece_list.iter().enumerate().map(|(i, (w, h, label))| {
        json!({"index": i, "label": label, "x": 0, "y": (i as f64 * 100.0), "width": w, "height": h, "rotated": false})
    }).collect();
    Ok(json!({ "plan": {"layout": layout, "sheet": {"width": sheet_width, "height": sheet_height}, "pieces": piece_list.iter().map(|(w,h,l)| json!({"width":w,"height":h,"label":l})).collect::<Vec<_>>()}, "utilization_rate": (utilization * 10.0).round() / 10.0 }))
}

#[tauri::command]
pub fn hw_get_credit_accounts(
    db: tauri::State<Mutex<Database>>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?; let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT ca.id, ca.customer_id, c.name as customer_name, ca.credit_limit, ca.current_balance
         FROM lw_credit_accounts ca LEFT JOIN customers c ON ca.customer_id = c.id ORDER BY ca.current_balance DESC"
    ).map_err(|e| e.to_string())?;
    let accounts: Vec<Value> = stmt.query_map([], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"customer_id":row.get::<_,String>(1)?,"customer_name":row.get::<_,Option<String>>(2)?,"credit_limit":row.get::<_,f64>(3)?,"current_balance":row.get::<_,f64>(4)?}))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "accounts": accounts }))
}

#[tauri::command]
pub fn hw_get_unit_conversions(
    db: tauri::State<Mutex<Database>>, product_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?; let conn = db.connection();
    let mut stmt = conn.prepare(
        "SELECT id, product_id, base_unit, target_unit, conversion_factor, created_at FROM hw_unit_conversions WHERE product_id = ?1"
    ).map_err(|e| e.to_string())?;
    let conversions: Vec<Value> = stmt.query_map(params![product_id], |row| {
        Ok(json!({"id":row.get::<_,String>(0)?,"product_id":row.get::<_,String>(1)?,"base_unit":row.get::<_,String>(2)?,"target_unit":row.get::<_,String>(3)?,"conversion_factor":row.get::<_,f64>(4)?,"created_at":row.get::<_,String>(5)?}))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(json!({ "conversions": conversions }))
}

#[tauri::command]
pub fn hw_add_unit_conversion(
    db: tauri::State<Mutex<Database>>, product_id: String, base_unit: String, target_unit: String, conversion_factor: f64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?; let conn = db.connection(); let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO hw_unit_conversions (id, product_id, base_unit, target_unit, conversion_factor) VALUES (?1,?2,?3,?4,?5)",
        params![id, product_id, base_unit, target_unit, conversion_factor]).map_err(|e| e.to_string())?;
    Ok(json!({ "id": id, "message": "单位转换已添加" }))
}
