// 库存管理 API 处理器
// 提供库存查询、交易记录、库存统计等 RESTful API

use axum::{
    extract::{State, Json, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize};
use super::AppState;
use rusqlite::params;
use uuid::Uuid;

/// 库存交易创建请求
#[derive(Debug, Deserialize)]
pub struct CreateInventoryTransactionRequest {
    pub product_id: String,
    pub transaction_type: String,
    pub quantity: i32,
    pub reference_no: Option<String>,
    pub reason: Option<String>,
    pub notes: Option<String>,
}

/// 库存交易列表查询参数
#[derive(Debug, Deserialize)]
pub struct InventoryTransactionQuery {
    pub product_id: Option<String>,
    pub transaction_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// 库存查询参数
#[derive(Debug, Deserialize)]
pub struct InventoryQuery {
    pub search: Option<String>,
    pub low_stock_only: Option<bool>,
}

/// 获取库存列表
pub async fn get_inventory(
    State(state): State<AppState>,
    Query(query): Query<InventoryQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, sku, name, unit, cost_price, sell_price, current_stock, \
         min_stock, max_stock, image_url, barcode, is_active, created_at, updated_at \
         FROM products WHERE deleted_at IS NULL"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref search) = query.search {
        if !search.is_empty() {
            sql.push_str(" AND (name LIKE ?1 OR sku LIKE ?2 OR barcode LIKE ?3)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    if query.low_stock_only.unwrap_or(false) {
        sql.push_str(" AND current_stock < min_stock AND min_stock > 0");
    }

    sql.push_str(" ORDER BY name ASC LIMIT 500");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        // SQL: id(0), sku(1), name(2), unit(3), cost_price(4), sell_price(5), current_stock(6), min_stock(7), max_stock(8), image_url(9), barcode(10), is_active(11), created_at(12), updated_at(13)
        let cost_price: f64 = row.get(4)?;
        let current_stock: i32 = row.get(6)?;
        let min_stock: i32 = row.get(7)?;
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "sku": row.get::<_, String>(1)?,
            "name": row.get::<_, String>(2)?,
            "unit": row.get::<_, String>(3)?,
            "cost_price": cost_price,
            "sell_price": row.get::<_, f64>(5)?,
            "current_stock": current_stock,
            "min_stock": min_stock,
            "max_stock": row.get::<_, i32>(8)?,
            "image_url": row.get::<_, Option<String>>(9)?,
            "barcode": row.get::<_, Option<String>>(10)?,
            "is_active": row.get::<_, bool>(11)?,
            "created_at": row.get::<_, String>(12)?,
            "updated_at": row.get::<_, String>(13)?,
            "stock_status": if current_stock <= 0 { "out_of_stock" }
                else if min_stock > 0 && current_stock < min_stock { "low_stock" }
                else { "normal" },
            "stock_value": current_stock as f64 * cost_price,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let result: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (StatusCode::OK, Json(serde_json::json!({ "data": result, "total": result.len() })))
}

/// 获取库存交易记录
pub async fn get_inventory_transactions(
    State(state): State<AppState>,
    Query(query): Query<InventoryTransactionQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, product_id, transaction_type, quantity, reference_no, \
         reason, performed_by, notes, created_at, sync_status \
         FROM inventory_transactions WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref product_id) = query.product_id {
        if !product_id.is_empty() {
            sql.push_str(" AND product_id = ?1");
            params_vec.push(Box::new(product_id.clone()));
        }
    }
    if let Some(ref txn_type) = query.transaction_type {
        if !txn_type.is_empty() {
            let idx = params_vec.len() + 1;
            sql.push_str(&format!(" AND transaction_type = ?{}", idx));
            params_vec.push(Box::new(txn_type.clone()));
        }
    }
    if let Some(ref start_date) = query.start_date {
        if !start_date.is_empty() {
            let idx = params_vec.len() + 1;
            sql.push_str(&format!(" AND created_at >= ?{}", idx));
            params_vec.push(Box::new(start_date.clone()));
        }
    }
    if let Some(ref end_date) = query.end_date {
        if !end_date.is_empty() {
            let idx = params_vec.len() + 1;
            sql.push_str(&format!(" AND created_at <= ?{}", idx));
            params_vec.push(Box::new(end_date.clone()));
        }
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "product_id": row.get::<_, String>(1)?,
            "transaction_type": row.get::<_, String>(2)?,
            "quantity": row.get::<_, i32>(3)?,
            "reference_no": row.get::<_, Option<String>>(4)?,
            "reason": row.get::<_, Option<String>>(5)?,
            "performed_by": row.get::<_, Option<String>>(6)?,
            "notes": row.get::<_, Option<String>>(7)?,
            "created_at": row.get::<_, String>(8)?,
            "sync_status": row.get::<_, String>(9)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let result: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (StatusCode::OK, Json(serde_json::json!({ "data": result, "total": result.len() })))
}

/// 创建库存交易
pub async fn create_inventory_transaction(
    State(state): State<AppState>,
    Json(payload): Json<CreateInventoryTransactionRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    if !["inbound", "outbound", "adjustment", "transfer"].contains(&payload.transaction_type.as_str()) {
        return (StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid transaction type"})));
    }

    let product_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
        params![payload.product_id],
        |row| row.get(0),
    ).unwrap_or(false);

    if !product_exists {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Product not found"})));
    }

    if payload.transaction_type == "outbound" {
        let current_stock: i32 = conn.query_row(
            "SELECT current_stock FROM products WHERE id = ?1",
            params![payload.product_id],
            |row| row.get(0),
        ).unwrap_or(0);

        if current_stock < payload.quantity {
            return (StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("Insufficient stock. Current: {}, Requested: {}", current_stock, payload.quantity)
                })));
        }
    }

    let id = Uuid::new_v4().to_string();

    let stock_change = match payload.transaction_type.as_str() {
        "inbound" => payload.quantity,
        "outbound" => -(payload.quantity),
        "adjustment" => payload.quantity,
        "transfer" => -(payload.quantity),
        _ => 0,
    };

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Transaction error: {}", e)}))),
    };

    if let Err(e) = tx.execute(
        "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, \
         reference_no, reason, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id, payload.product_id, payload.transaction_type, payload.quantity,
            payload.reference_no, payload.reason, payload.notes,
        ],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to insert transaction: {}", e)})));
    }

    if let Err(e) = tx.execute(
        "UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![stock_change, payload.product_id],
    ) {
        if let Err(rb) = tx.rollback() { eprintln!("[inventory] rollback failed: {}", rb); }
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update stock: {}", e)})));
    }

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})));
    }

    (StatusCode::CREATED, Json(serde_json::json!({
        "id": id,
        "product_id": payload.product_id,
        "transaction_type": payload.transaction_type,
        "quantity": payload.quantity,
        "stock_change": stock_change,
        "message": "Transaction created successfully"
    })))
}

/// 获取库存统计
#[allow(dead_code)]
pub async fn get_inventory_stats(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let total_products: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL", [], |row| row.get(0),
    ).unwrap_or(0);

    let low_stock_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let zero_stock_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock = 0",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let today_transactions: i64 = conn.query_row(
        "SELECT COUNT(*) FROM inventory_transactions WHERE DATE(created_at) = DATE('now')",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let total_value: f64 = conn.query_row(
        "SELECT COALESCE(SUM(current_stock * cost_price), 0.0) FROM products WHERE deleted_at IS NULL",
        [], |row| row.get(0),
    ).unwrap_or(0.0);

    let mut low_stmt = match conn.prepare(
        "SELECT id, name, sku, current_stock, min_stock \
         FROM products WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0 \
         ORDER BY CAST(current_stock AS REAL) / min_stock ASC LIMIT 10"
    ) {
        Ok(s) => s,
        Err(_) => {
            return (StatusCode::OK, Json(serde_json::json!({
                "total_products": total_products,
                "low_stock_count": low_stock_count,
                "zero_stock_count": zero_stock_count,
                "today_transactions": today_transactions,
                "total_value": format!("{:.2}", total_value),
                "low_stock_products": [],
            })));
        }
    };

    let rows = match low_stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "name": row.get::<_, String>(1)?,
            "sku": row.get::<_, String>(2)?,
            "current_stock": row.get::<_, i32>(3)?,
            "min_stock": row.get::<_, i32>(4)?,
        }))
    }) {
        Ok(r) => r,
        Err(_) => {
            return (StatusCode::OK, Json(serde_json::json!({
                "total_products": total_products,
                "low_stock_count": low_stock_count,
                "zero_stock_count": zero_stock_count,
                "today_transactions": today_transactions,
                "total_value": format!("{:.2}", total_value),
                "low_stock_products": [],
            })));
        }
    };

    let low_stock_products: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();

    (StatusCode::OK, Json(serde_json::json!({
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "zero_stock_count": zero_stock_count,
        "today_transactions": today_transactions,
        "total_value": format!("{:.2}", total_value),
        "low_stock_products": low_stock_products,
    })))
}
