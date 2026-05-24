// 订阅与计费 Tauri 命令 (Phase 7)

use tauri::State;
use std::sync::Mutex;
use crate::database::Database;
use crate::services::subscription_service;

/// 获取所有可用套餐
#[tauri::command]
pub fn get_plans_cmd(db: State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let plans = subscription_service::get_plans(&db)?;
    Ok(serde_json::json!({ "data": plans }))
}

/// 获取当前用户订阅
#[tauri::command]
pub fn get_my_subscription_cmd(db: State<Mutex<Database>>, user_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let sub = subscription_service::get_user_subscription(&db, &user_id)?;
    Ok(serde_json::json!({ "data": sub }))
}

/// 订阅套餐
#[tauri::command]
pub fn subscribe_plan_cmd(db: State<Mutex<Database>>, user_id: String, plan_id: String, billing_cycle: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let sub_id = subscription_service::subscribe_user(&db, &user_id, &plan_id, &billing_cycle)?;
    Ok(serde_json::json!({ "subscription_id": sub_id, "message": "Subscribed successfully" }))
}

/// 取消订阅
#[tauri::command]
pub fn cancel_subscription_cmd(db: State<Mutex<Database>>, user_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    subscription_service::cancel_subscription(&db, &user_id)?;
    Ok(serde_json::json!({ "message": "Subscription cancelled" }))
}

/// Token 用量摘要
#[tauri::command]
pub fn get_token_summary_cmd(db: State<Mutex<Database>>, user_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let summary = subscription_service::get_token_usage_summary(&db, &user_id)?;
    Ok(serde_json::json!({ "data": summary }))
}

/// Token 用量明细
#[tauri::command]
pub fn get_token_usage_cmd(db: State<Mutex<Database>>, user_id: String, limit: Option<i64>, offset: Option<i64>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let details = subscription_service::get_token_usage_details(&db, &user_id, limit.unwrap_or(50), offset.unwrap_or(0))?;
    Ok(serde_json::json!({ "data": details }))
}

/// 获取账单
#[tauri::command]
pub fn get_invoices_cmd(db: State<Mutex<Database>>, user_id: String) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let invoices = subscription_service::get_invoices(&db, &user_id)?;
    Ok(serde_json::json!({ "data": invoices }))
}

/// 记录 Token 消耗（供内部调用）
#[tauri::command]
pub fn record_token_cmd(db: State<Mutex<Database>>, user_id: String, action_type: String, resource_path: Option<String>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    subscription_service::record_token_usage(&db, &user_id, &action_type, resource_path.as_deref(), None)?;
    Ok(serde_json::json!({ "message": "Token recorded" }))
}
