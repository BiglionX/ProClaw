// 审批工作流 Tauri 命令 (Phase 6)
// 采购/销售订单审批、付款记录

use crate::database::Database;
use crate::finance_ledger::apply_approval_side_effects;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建审批请求
#[tauri::command]
pub fn create_approval_cmd(
    db: tauri::State<Mutex<Database>>,
    target_type: String,
    target_id: String,
    comments: Option<String>,
    requested_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if !["purchase_order", "sales_order"].contains(&target_type.as_str()) {
        return Err("Invalid target_type".to_string());
    }

    let requester = requested_by
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "requested_by is required".to_string())?
        .to_string();

    let user_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)",
            params![requester],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if !user_exists {
        return Err("requested_by user not found".to_string());
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
        .map_err(|_| "Order not found".to_string())?;

    if status != "draft" {
        return Err(format!(
            "Order status '{}' cannot be submitted for approval",
            status
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
        return Err("A pending approval already exists".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO approvals (id, target_type, target_id, requested_by, status, comments) \
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5)",
        params![id, target_type, target_id, requester, comments],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        &format!(
            "UPDATE {} SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            table
        ),
        params![target_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "message": "Approval request created",
        "order_status": "submitted"
    }))
}

/// 获取审批列表
#[tauri::command]
pub fn get_approvals_cmd(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
    target_type: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT a.id, a.target_type, a.target_id, a.requested_by, a.status, \
         a.comments, a.created_at, a.resolved_at, a.approved_by, \
         u.name as requested_by_name \
         FROM approvals a \
         LEFT JOIN users u ON a.requested_by = u.id \
         WHERE 1=1",
    );
    let mut pv: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref s) = status {
        sql.push_str(&format!(" AND a.status = ?{}", pv.len() + 1));
        pv.push(Box::new(s.clone()));
    }
    if let Some(ref t) = target_type {
        sql.push_str(&format!(" AND a.target_type = ?{}", pv.len() + 1));
        pv.push(Box::new(t.clone()));
    }

    let total = {
        let refs: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|b| b.as_ref()).collect();
        crate::database::count_unpaged(conn, &sql, refs.as_slice()).map_err(|e| e.to_string())?
    };

    sql.push_str(" ORDER BY a.created_at DESC LIMIT 200");

    let refs: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(refs.as_slice(), |row| {
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
        })
        .map_err(|e| e.to_string())?;

    let approvals: Vec<serde_json::Value> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let enriched: Vec<serde_json::Value> = approvals
        .into_iter()
        .map(|a| {
            let tt = a.get("target_type").and_then(|v| v.as_str()).unwrap_or("");
            let tid = a.get("target_id").and_then(|v| v.as_str()).unwrap_or("");

            let order_info = match tt {
                "purchase_order" => conn
                    .query_row(
                        "SELECT po_number, total_amount, status FROM purchase_orders WHERE id = ?1",
                        params![tid],
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
                        params![tid],
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

            let mut res = a.clone();
            if let Some(order) = order_info {
                res["order"] = order;
            }
            res
        })
        .collect();

    Ok(serde_json::json!({ "data": enriched, "total": total }))
}

/// 批准审批
#[tauri::command]
pub fn approve_request_cmd(
    db: tauri::State<Mutex<Database>>,
    approval_id: String,
    comments: Option<String>,
    approved_by: Option<String>,
) -> Result<serde_json::Value, String> {
    process_approval_tx(db, approval_id, true, comments, approved_by)
}

/// 拒绝审批
#[tauri::command]
pub fn reject_request_cmd(
    db: tauri::State<Mutex<Database>>,
    approval_id: String,
    comments: Option<String>,
    approved_by: Option<String>,
) -> Result<serde_json::Value, String> {
    process_approval_tx(db, approval_id, false, comments, approved_by)
}

fn process_approval_tx(
    db_mutex: tauri::State<Mutex<Database>>,
    approval_id: String,
    approved: bool,
    comments: Option<String>,
    approved_by: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db_mutex.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let actor = approved_by
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "approved_by is required".to_string())?
        .to_string();

    let (target_type, target_id, current_status): (String, String, String) = conn
        .query_row(
            "SELECT target_type, target_id, status FROM approvals WHERE id = ?1",
            params![approval_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| "Approval not found".to_string())?;

    if current_status != "pending" {
        return Err(format!("Approval already {}", current_status));
    }

    let new_status = if approved { "approved" } else { "rejected" };
    let order_new_status = if approved { "confirmed" } else { "draft" };

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    if let Err(e) = tx.execute(
        "UPDATE approvals SET status = ?1, approved_by = ?2, resolved_at = CURRENT_TIMESTAMP, \
         comments = CASE WHEN ?3 IS NOT NULL THEN ?3 ELSE comments END WHERE id = ?4",
        params![new_status, actor, comments, approval_id],
    ) {
        let _ = tx.rollback();
        return Err(format!("Failed to update approval: {}", e));
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
        return Err(format!("Failed to update order status: {}", e));
    }

    if approved {
        if let Err(e) = apply_approval_side_effects(&tx, &target_type, &target_id, Some(&actor)) {
            let _ = tx.rollback();
            return Err(e);
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    let action_word = if approved { "approved" } else { "rejected" };
    Ok(serde_json::json!({
        "id": approval_id,
        "status": new_status,
        "order_status": order_new_status,
        "message": format!("Approval {}", action_word),
    }))
}
