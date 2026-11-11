// 审批工作流 API (Phase 6)
// 采购/销售订单审批、审批列表

use super::auth::Claims;
use super::AppState;
use crate::finance_ledger::apply_approval_side_effects;
use axum::{
    extract::{Extension, Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rusqlite::{params, Connection};
use serde::Deserialize;
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

/// P0-04：创建审批。`requested_by` 必须为真实 users.id（来自 JWT Claims.sub），禁止空串。
pub(crate) fn create_approval_inner(
    conn: &Connection,
    target_type: &str,
    target_id: &str,
    requested_by: &str,
    comments: Option<&str>,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let requested_by = requested_by.trim();
    if requested_by.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing user identity in token".into(),
        ));
    }

    if !["purchase_order", "sales_order"].contains(&target_type) {
        return Err((StatusCode::BAD_REQUEST, "Invalid target_type".into()));
    }

    let table = if target_type == "purchase_order" {
        "purchase_orders"
    } else {
        "sales_orders"
    };

    let status: String = conn
        .query_row(
            &format!(
                "SELECT status FROM {} WHERE id = ?1 AND deleted_at IS NULL",
                table
            ),
            params![target_id],
            |row| row.get(0),
        )
        .map_err(|_| (StatusCode::NOT_FOUND, "Order not found".into()))?;

    if status != "draft" {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Order status '{}' cannot be submitted for approval", status),
        ));
    }

    let existing: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM approvals WHERE target_type = ?1 AND target_id = ?2 AND status = 'pending')",
            params![target_type, target_id],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if existing {
        return Err((
            StatusCode::CONFLICT,
            "A pending approval already exists for this order".into(),
        ));
    }

    let user_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)",
            params![requested_by],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if !user_exists {
        return Err((
            StatusCode::BAD_REQUEST,
            "requested_by user not found".into(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Err(e) = tx.execute(
        "INSERT INTO approvals (id, target_type, target_id, requested_by, status, comments) \
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5)",
        params![id, target_type, target_id, requested_by, comments],
    ) {
        let _ = tx.rollback();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
    }

    if let Err(e) = tx.execute(
        &format!(
            "UPDATE {} SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            table
        ),
        params![target_id],
    ) {
        let _ = tx.rollback();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()));
    }

    tx.commit()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(serde_json::json!({
        "id": id,
        "message": "Approval request created",
        "order_status": "submitted"
    }))
}

/// P0-04：审批通过时同事务更新状态，并对 sales_order 扣库存+写流水。
pub(crate) fn process_approval_inner(
    conn: &Connection,
    approval_id: &str,
    approved: bool,
    actor_id: &str,
    comments: Option<&str>,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let actor_id = actor_id.trim();
    if actor_id.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing user identity in token".into(),
        ));
    }

    let (target_type, target_id, current_status): (String, String, String) = conn
        .query_row(
            "SELECT target_type, target_id, status FROM approvals WHERE id = ?1",
            params![approval_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| (StatusCode::NOT_FOUND, "Approval not found".into()))?;

    if current_status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Approval already {}", current_status),
        ));
    }

    let new_status = if approved { "approved" } else { "rejected" };
    let order_new_status = if approved { "confirmed" } else { "draft" };

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Err(e) = tx.execute(
        "UPDATE approvals SET status = ?1, approved_by = ?2, resolved_at = CURRENT_TIMESTAMP, \
         comments = CASE WHEN ?3 IS NOT NULL THEN ?3 ELSE comments END WHERE id = ?4",
        params![new_status, actor_id, comments, approval_id],
    ) {
        let _ = tx.rollback();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update approval: {}", e),
        ));
    }

    let table = if target_type == "purchase_order" {
        "purchase_orders"
    } else {
        "sales_orders"
    };
    if let Err(e) = tx.execute(
        &format!(
            "UPDATE {} SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            table
        ),
        params![order_new_status, target_id],
    ) {
        let _ = tx.rollback();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update order status: {}", e),
        ));
    }

    if approved {
        if let Err(e) = apply_approval_side_effects(&tx, &target_type, &target_id, Some(actor_id)) {
            let _ = tx.rollback();
            return Err((StatusCode::BAD_REQUEST, e));
        }
    }

    tx.commit()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(serde_json::json!({
        "id": approval_id,
        "status": new_status,
        "order_status": order_new_status,
        "message": format!("Approval {}", if approved { "approved" } else { "rejected" }),
    }))
}

/// 创建审批请求（提交订单审批）
pub async fn create_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateApprovalRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    match create_approval_inner(
        conn,
        &payload.target_type,
        &payload.target_id,
        &claims.sub,
        payload.comments.as_deref(),
    ) {
        Ok(body) => (StatusCode::CREATED, Json(body)),
        Err((status, msg)) => (status, Json(serde_json::json!({"error": msg}))),
    }
}

/// 审批列表
pub async fn list_approvals(
    State(state): State<AppState>,
    Query(query): Query<ApprovalQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT a.id, a.target_type, a.target_id, a.requested_by, a.status, \
         a.comments, a.created_at, a.resolved_at, a.approved_by, \
         u.name as requested_by_name \
         FROM approvals a \
         LEFT JOIN users u ON a.requested_by = u.id \
         WHERE 1=1",
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

    let total = {
        let count_refs: Vec<&dyn rusqlite::types::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();
        match crate::database::count_unpaged(conn, &sql, count_refs.as_slice()) {
            Ok(n) => n,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": e.to_string()})),
                )
            }
        }
    };

    sql.push_str(" ORDER BY a.created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
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
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let approvals: Vec<serde_json::Value> = match rows.collect::<Result<Vec<_>, _>>() {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let enriched: Vec<serde_json::Value> = approvals
        .into_iter()
        .map(|mut a| {
            let target_type = a.get("target_type").and_then(|v| v.as_str()).unwrap_or("");
            let target_id = a.get("target_id").and_then(|v| v.as_str()).unwrap_or("");

            let order_info = match target_type {
                "purchase_order" => conn
                    .query_row(
                        "SELECT po_number, total_amount, status FROM purchase_orders WHERE id = ?1",
                        params![target_id],
                        |row| {
                            Ok(serde_json::json!({
                                "number": row.get::<_, String>(0)?,
                                "total_amount": row.get::<_, f64>(1)?,
                                "status": row.get::<_, String>(2)?,
                            }))
                        },
                    )
                    .ok(),
                "sales_order" => conn
                    .query_row(
                        "SELECT so_number, total_amount, status FROM sales_orders WHERE id = ?1",
                        params![target_id],
                        |row| {
                            Ok(serde_json::json!({
                                "number": row.get::<_, String>(0)?,
                                "total_amount": row.get::<_, f64>(1)?,
                                "status": row.get::<_, String>(2)?,
                            }))
                        },
                    )
                    .ok(),
                _ => None,
            };

            if let Some(order) = order_info {
                a["order"] = order;
            }
            a
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({ "data": enriched, "total": total })),
    )
}

/// 批准审批
pub async fn approve_request(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(action): Json<ApprovalAction>,
) -> impl IntoResponse {
    process_approval(state, id, true, action.comments, claims.sub).await
}

/// 拒绝审批
pub async fn reject_request(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(action): Json<ApprovalAction>,
) -> impl IntoResponse {
    process_approval(state, id, false, action.comments, claims.sub).await
}

/// 处理审批（批准/拒绝）
async fn process_approval(
    state: AppState,
    approval_id: String,
    approved: bool,
    comments: Option<String>,
    actor_id: String,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    match process_approval_inner(conn, &approval_id, approved, &actor_id, comments.as_deref()) {
        Ok(body) => (StatusCode::OK, Json(body)),
        Err((status, msg)) => (status, Json(serde_json::json!({"error": msg}))),
    }
}

#[cfg(test)]
mod tests {
    use super::{create_approval_inner, process_approval_inner};
    use axum::http::StatusCode;
    use rusqlite::{params, Connection};

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE users (
               id TEXT PRIMARY KEY,
               name TEXT NOT NULL,
               is_active BOOLEAN DEFAULT 1
             );
             CREATE TABLE customers (
               id TEXT PRIMARY KEY,
               name TEXT NOT NULL
             );
             CREATE TABLE products (
               id TEXT PRIMARY KEY,
               sku TEXT UNIQUE NOT NULL,
               name TEXT NOT NULL,
               current_stock INTEGER DEFAULT 0,
               updated_at TIMESTAMP,
               deleted_at TIMESTAMP
             );
             CREATE TABLE inventory_transactions (
               id TEXT PRIMARY KEY,
               product_id TEXT NOT NULL REFERENCES products(id),
               transaction_type TEXT NOT NULL,
               quantity INTEGER NOT NULL,
               reference_no TEXT,
               reason TEXT,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE sales_orders (
               id TEXT PRIMARY KEY,
               so_number TEXT UNIQUE NOT NULL,
               customer_id TEXT NOT NULL REFERENCES customers(id),
               order_date DATE NOT NULL,
               status TEXT DEFAULT 'draft',
               total_amount REAL DEFAULT 0,
               deleted_at TIMESTAMP,
               updated_at TIMESTAMP
             );
             CREATE TABLE sales_order_items (
               id TEXT PRIMARY KEY,
               sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
               product_id TEXT NOT NULL REFERENCES products(id),
               quantity INTEGER NOT NULL,
               unit_price REAL NOT NULL,
               total_price REAL NOT NULL
             );
             CREATE TABLE approvals (
               id TEXT PRIMARY KEY,
               target_type TEXT NOT NULL,
               target_id TEXT NOT NULL,
               requested_by TEXT REFERENCES users(id),
               approved_by TEXT REFERENCES users(id),
               status TEXT DEFAULT 'pending',
               comments TEXT,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               resolved_at TIMESTAMP
             );
             INSERT INTO users (id, name) VALUES ('u1', 'Boss');
             INSERT INTO customers (id, name) VALUES ('c1', 'Cust');
             INSERT INTO products (id, sku, name, current_stock) VALUES ('p1', 'SKU1', 'Item', 20);
             CREATE TABLE product_skus (
               id TEXT PRIMARY KEY,
               spu_id TEXT NOT NULL,
               sku_code TEXT NOT NULL,
               cost_price REAL DEFAULT 0,
               current_stock INTEGER DEFAULT 0,
               is_default INTEGER DEFAULT 1,
               is_active INTEGER DEFAULT 1,
               deleted_at TIMESTAMP,
               updated_at TIMESTAMP,
               created_at TIMESTAMP
             );
             CREATE TABLE accounts (
               id TEXT PRIMARY KEY,
               code TEXT UNIQUE NOT NULL,
               name TEXT NOT NULL,
               type TEXT NOT NULL,
               balance REAL DEFAULT 0,
               is_active INTEGER DEFAULT 1
             );
             CREATE TABLE financial_transactions (
               id TEXT PRIMARY KEY,
               transaction_date TEXT NOT NULL,
               description TEXT NOT NULL,
               transaction_type TEXT NOT NULL,
               amount REAL NOT NULL,
               debit_amount REAL NOT NULL DEFAULT 0,
               credit_amount REAL NOT NULL DEFAULT 0,
               account_id TEXT NOT NULL,
               reference_type TEXT,
               reference_id TEXT,
               notes TEXT,
               created_by TEXT,
               deleted_at TEXT
             );
             INSERT INTO product_skus (id, spu_id, sku_code, current_stock, is_default, is_active)
               VALUES ('sku-p1', 'p1', 'SKU1', 20, 1, 1);
             INSERT INTO sales_orders (id, so_number, customer_id, order_date, status, total_amount)
               VALUES ('so1', 'SO-1', 'c1', '2026-11-05', 'draft', 0);
             INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
               VALUES ('soi1', 'so1', 'p1', 4, 10, 40);",
        )
        .unwrap();
        conn
    }

    #[test]
    fn empty_requested_by_rejected_without_fk_500() {
        let conn = setup_conn();
        let err = create_approval_inner(&conn, "sales_order", "so1", "", None).unwrap_err();
        assert_eq!(err.0, StatusCode::UNAUTHORIZED);

        // 直接写空串会触发 FK（回归报告中的根因）
        let direct = conn.execute(
            "INSERT INTO approvals (id, target_type, target_id, requested_by, status)
             VALUES ('a-bad', 'sales_order', 'so1', '', 'pending')",
            [],
        );
        assert!(direct.is_err(), "empty requested_by must fail FK");
    }

    #[test]
    fn create_approval_with_claims_sub_succeeds() {
        let conn = setup_conn();
        let body = create_approval_inner(&conn, "sales_order", "so1", "u1", Some("pls")).unwrap();
        assert!(body.get("id").and_then(|v| v.as_str()).is_some());
        let status: String = conn
            .query_row(
                "SELECT status FROM sales_orders WHERE id = 'so1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(status, "submitted");
        let requested_by: String = conn
            .query_row(
                "SELECT requested_by FROM approvals WHERE target_id = 'so1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(requested_by, "u1");
    }

    #[test]
    fn approve_sales_order_deducts_stock_and_writes_txn() {
        let conn = setup_conn();
        let created = create_approval_inner(&conn, "sales_order", "so1", "u1", None).unwrap();
        let aid = created["id"].as_str().unwrap();

        let body = process_approval_inner(&conn, aid, true, "u1", Some("ok")).unwrap();
        assert_eq!(body["status"], "approved");
        assert_eq!(body["order_status"], "confirmed");

        let stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM product_skus WHERE spu_id = 'p1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stock, 16);

        let txn_qty: i32 = conn
            .query_row(
                "SELECT quantity FROM inventory_transactions WHERE reference_no = 'so1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(txn_qty, 4);

        let approved_by: String = conn
            .query_row(
                "SELECT approved_by FROM approvals WHERE id = ?1",
                params![aid],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(approved_by, "u1");
    }

    #[test]
    fn approve_insufficient_stock_rolls_back_no_ghost_txn() {
        let conn = setup_conn();
        conn.execute(
            "UPDATE product_skus SET current_stock = 1 WHERE spu_id = 'p1'",
            [],
        )
        .unwrap();
        let created = create_approval_inner(&conn, "sales_order", "so1", "u1", None).unwrap();
        let aid = created["id"].as_str().unwrap();

        let err = process_approval_inner(&conn, aid, true, "u1", None).unwrap_err();
        assert_eq!(err.0, StatusCode::BAD_REQUEST);
        assert!(err.1.contains("Insufficient stock"));

        let stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM product_skus WHERE spu_id = 'p1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(stock, 1);

        let txn_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM inventory_transactions", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(txn_count, 0);

        let approval_status: String = conn
            .query_row(
                "SELECT status FROM approvals WHERE id = ?1",
                params![aid],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(approval_status, "pending");

        let order_status: String = conn
            .query_row(
                "SELECT status FROM sales_orders WHERE id = 'so1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(order_status, "submitted");
    }
}
