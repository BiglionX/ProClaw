// 订阅与计费 API (Phase 7)
// REST 端点: 套餐查询、订阅管理、Token 用量

use axum::{
    extract::{State, Json, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use crate::services::subscription_service;

use super::AppState;

#[derive(Deserialize)]
pub struct SubscribeRequest {
    pub user_id: String,
    pub plan_id: String,
    pub billing_cycle: String,
}

#[derive(Deserialize)]
pub struct UsageQuery {
    pub user_id: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct UserQuery {
    pub user_id: String,
}

// ========== 套餐 ==========

/// GET /api/subscriptions/plans - 获取所有可用套餐
pub async fn get_plans(State(state): State<AppState>) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::get_plans(&db) {
        Ok(plans) => (StatusCode::OK, Json(serde_json::json!({ "data": plans }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

// ========== 用户订阅 ==========

/// GET /api/subscriptions/me - 获取当前用户订阅信息
pub async fn get_my_subscription(
    State(state): State<AppState>,
    Query(q): Query<UserQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::get_user_subscription(&db, &q.user_id) {
        Ok(Some(sub)) => (StatusCode::OK, Json(serde_json::json!({ "data": sub }))),
        Ok(None) => (StatusCode::OK, Json(serde_json::json!({ "data": null, "message": "No active subscription" }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

/// POST /api/subscriptions/subscribe - 订阅套餐
pub async fn subscribe_plan(
    State(state): State<AppState>,
    Json(payload): Json<SubscribeRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::subscribe_user(&db, &payload.user_id, &payload.plan_id, &payload.billing_cycle) {
        Ok(sub_id) => (StatusCode::OK, Json(serde_json::json!({ "subscription_id": sub_id, "message": "Subscribed successfully" }))),
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e}))),
    }
}

/// POST /api/subscriptions/cancel - 取消订阅
pub async fn cancel_subscription(
    State(state): State<AppState>,
    Query(q): Query<UserQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::cancel_subscription(&db, &q.user_id) {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({ "message": "Subscription cancelled" }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

// ========== Token 用量 ==========

/// GET /api/subscriptions/token-summary - Token 用量摘要
pub async fn get_token_summary(
    State(state): State<AppState>,
    Query(q): Query<UserQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::get_token_usage_summary(&db, &q.user_id) {
        Ok(summary) => (StatusCode::OK, Json(serde_json::json!({ "data": summary }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

/// GET /api/subscriptions/token-usage - Token 用量明细
pub async fn get_token_usage(
    State(state): State<AppState>,
    Query(q): Query<UsageQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    let limit = q.limit.unwrap_or(50);
    let offset = q.offset.unwrap_or(0);

    match subscription_service::get_token_usage_details(&db, &q.user_id, limit, offset) {
        Ok(details) => (StatusCode::OK, Json(serde_json::json!({ "data": details }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}

/// GET /api/subscriptions/invoices - 账单列表
pub async fn get_invoices(
    State(state): State<AppState>,
    Query(q): Query<UserQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(d) => d,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };

    match subscription_service::get_invoices(&db, &q.user_id) {
        Ok(invoices) => (StatusCode::OK, Json(serde_json::json!({ "data": invoices }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    }
}
