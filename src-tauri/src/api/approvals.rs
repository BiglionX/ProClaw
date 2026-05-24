// 审批工作流 API (Phase 6)
// 采购/销售订单审批、审批列表

use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use super::AppState;
use rusqlite::params;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateApprovalRequest {
    pub target_type: String, // purchase_order / sales_order
    pub target_id: String,
    pub comments: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalAction {
    pub comments: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalQuery {
    pub status: Option<String>,
    pub target_type: Option<String>,
}

/// 创建审批请求（提交订单审批）
pub async fn create_approval(
    State(state): State<AppState>,
    Json(payload): Json<CreateApprovalRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 验证 target_type
    if !["purchase_order", "sales_order"].contains(&payload.target_type.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid target_type"})));
    }

    // 验证订单存在且状态为 draft
    let table = if payload.target_type == "purchase_order" { "purchase_orders" } else { "sales_orders" };

    let status: String = match conn.query_row(
        &format!("SELECT status FROM {} WHERE id = ?1 AND deleted_at IS NULL", table),
        params![payload.target_id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Order not found"}))),
    };

    if status != "draft" {
        return (StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": format!("Order status '{}' cannot be submitted for approval", status)})));
    }

    // 检查是否已有待审批请求
    let existing: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM approvals WHERE target_type = ?1 AND target_id = ?2 AND status = 'pending')",
        params![payload.target_type, payload.target_id],
        |row| row.get(0),
    ).unwrap_or(false);

    if existing {
        return (StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "A pending approval already exists for this order"})));
    }

    // 创建审批
    let id = Uuid::new_v4().to_string();

    if let Err(e) = conn.execute(
        "INSERT INTO approvals (id, target_type, target_id, requested_by, status, comments) \
         VALUES (?1, ?2, ?3, '', ?4, ?5)",
        params![id, payload.target_type, payload.target_id, "pending", payload.comments],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    // 更新订单状态为 submitted
    let _ = conn.execute(
        &format!("UPDATE {} SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1", table),
        params![payload.target_id],
    );

    (StatusCode::CREATED, Json(serde_json::json!({
        "id": id,
        "message": "Approval request created",
        "order_status": "submitted"
    })))
}

/// 审批列表
pub async fn list_approvals(
    State(state): State<AppState>,
    Query(query): Query<ApprovalQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT a.id, a.target_type, a.target_id, a.requested_by, a.status, \
         a.comments, a.created_at, a.resolved_at, a.approved_by, \
         u.name as requested_by_name \
         FROM approvals a \
         LEFT JOIN users u ON a.requested_by = u.id \
         WHERE 1=1"
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref status) = query.status {
        let idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND a.status = ?{}", idx));
        params_vec.push(Box::new(status.clone()));
    }
    if let Some(ref t) = query.target_type {
        let idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND a.target_type = ?{}", idx));
        params_vec.push(Box::new(t.clone()));
    }

    sql.push_str(" ORDER BY a.created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "target_type": row.get::<_, String>(1)?,
            "target_id": row.get::<_, String>(2)?,
            "requested_by": row.get::<_, String>(3)?,
            "status": row.get::<_, String>(4)?,
            "comments": row.get::<_, Option<String>>(5)?,
            "created_at": row.get::<_, String>(6)?,
            "resolved_at": row.get::<_, Option<String>>(7)?,
            "approved_by": row.get::<_, Option<String>>(8)?,
            "requested_by_name": row.get::<_, Option<String>>(9)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let approvals: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();

    // 为每个审批附上关联订单摘要
    let enriched: Vec<serde_json::Value> = approvals.into_iter().map(|mut a| {
        let target_type = a.get("target_type").and_then(|v| v.as_str()).unwrap_or("");
        let target_id = a.get("target_id").and_then(|v| v.as_str()).unwrap_or("");

        let order_info = match target_type {
            "purchase_order" => conn.query_row(
                "SELECT po_number, total_amount, status FROM purchase_orders WHERE id = ?1",
                params![target_id],
                |row| Ok(serde_json::json!({
                    "number": row.get::<_, String>(0)?,
                    "total_amount": row.get::<_, f64>(1)?,
                    "status": row.get::<_, String>(2)?,
                })),
            ).ok(),
            "sales_order" => conn.query_row(
                "SELECT so_number, total_amount, status FROM sales_orders WHERE id = ?1",
                params![target_id],
                |row| Ok(serde_json::json!({
                    "number": row.get::<_, String>(0)?,
                    "total_amount": row.get::<_, f64>(1)?,
                    "status": row.get::<_, String>(2)?,
                })),
            ).ok(),
            _ => None,
        };

        if let Some(order) = order_info {
            a["order"] = order;
        }
        a
    }).collect();

    (StatusCode::OK, Json(serde_json::json!({ "data": enriched, "total": enriched.len() })))
}

/// 批准审批
pub async fn approve_request(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(action): Json<ApprovalAction>,
) -> impl IntoResponse {
    process_approval(state, id, true, action.comments).await
}

/// 拒绝审批
pub async fn reject_request(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(action): Json<ApprovalAction>,
) -> impl IntoResponse {
    process_approval(state, id, false, action.comments).await
}

/// 处理审批（批准/拒绝）
async fn process_approval(
    state: AppState,
    approval_id: String,
    approved: bool,
    comments: Option<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 获取审批详情
    let (target_type, target_id, current_status): (String, String, String) = match conn.query_row(
        "SELECT target_type, target_id, status FROM approvals WHERE id = ?1",
        params![approval_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ) {
        Ok(d) => d,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Approval not found"}))),
    };

    if current_status != "pending" {
        return (StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": format!("Approval already {}", current_status)})));
    }

    let new_status = if approved { "approved" } else { "rejected" };
    let order_new_status = if approved { "confirmed" } else { "draft" }; // 拒绝回退到 draft

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    // 更新审批状态
    let _ = tx.execute(
        "UPDATE approvals SET status = ?1, approved_by = '', resolved_at = CURRENT_TIMESTAMP, \
         comments = CASE WHEN ?2 IS NOT NULL THEN ?2 ELSE comments END WHERE id = ?3",
        params![new_status, comments, approval_id],
    );

    // 更新关联订单状态
    let table = if target_type == "purchase_order" { "purchase_orders" } else { "sales_orders" };
    let _ = tx.execute(
        &format!("UPDATE {} SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", table),
        params![order_new_status, target_id],
    );

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    let action_word = if approved { "approved" } else { "rejected" };
    (StatusCode::OK, Json(serde_json::json!({
        "id": approval_id,
        "status": new_status,
        "order_status": order_new_status,
        "message": format!("Approval {}", action_word),
    })))
}
