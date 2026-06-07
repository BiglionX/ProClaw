// 销售订单管理 API 处理器
// 提供销售订单 CRUD、提交（自动扣减库存）等 RESTful API

use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use super::AppState;
use rusqlite::params;
use uuid::Uuid;

/// 销售订单创建请求
#[derive(Debug, Deserialize)]
pub struct CreateSalesOrderRequest {
    pub customer_id: String,
    pub order_date: Option<String>,
    pub expected_delivery_date: Option<String>,
    pub shipping_address: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub items: Vec<SalesOrderItemRequest>,
}

/// 销售订单明细请求
#[derive(Debug, Deserialize)]
pub struct SalesOrderItemRequest {
    pub product_id: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub notes: Option<String>,
}

/// 销售订单列表查询参数
#[derive(Debug, Deserialize)]
pub struct SalesOrderQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub customer_id: Option<String>,
}

/// 获取销售订单列表
pub async fn get_sales_orders(
    State(state): State<AppState>,
    Query(query): Query<SalesOrderQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT so.id, so.so_number, so.customer_id, c.name as customer_name, \
         so.order_date, so.expected_delivery_date, so.status, \
         so.total_amount, so.paid_amount, so.payment_status, \
         so.shipping_address, so.notes, so.created_by, so.created_at, so.updated_at \
         FROM sales_orders so \
         LEFT JOIN customers c ON so.customer_id = c.id \
         WHERE so.deleted_at IS NULL"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref status) = query.status {
        if !status.is_empty() {
            sql.push_str(" AND so.status = ?1");
            params_vec.push(Box::new(status.clone()));
        }
    }

    if let Some(ref customer_id) = query.customer_id {
        if !customer_id.is_empty() {
            let idx = params_vec.len() + 1;
            sql.push_str(&format!(" AND so.customer_id = ?{}", idx));
            params_vec.push(Box::new(customer_id.clone()));
        }
    }

    if let Some(ref search) = query.search {
        if !search.is_empty() {
            let idx = params_vec.len() + 1;
            let idx2 = idx + 1;
            sql.push_str(&format!(" AND (so.so_number LIKE ?{} OR c.name LIKE ?{})", idx, idx2));
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY so.created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "so_number": row.get::<_, String>(1)?,
            "customer_id": row.get::<_, String>(2)?,
            "customer_name": row.get::<_, Option<String>>(3)?,
            "order_date": row.get::<_, String>(4)?,
            "expected_delivery_date": row.get::<_, Option<String>>(5)?,
            "status": row.get::<_, String>(6)?,
            "total_amount": row.get::<_, f64>(7)?,
            "paid_amount": row.get::<_, f64>(8)?,
            "payment_status": row.get::<_, String>(9)?,
            "shipping_address": row.get::<_, Option<String>>(10)?,
            "notes": row.get::<_, Option<String>>(11)?,
            "created_by": row.get::<_, Option<String>>(12)?,
            "created_at": row.get::<_, String>(13)?,
            "updated_at": row.get::<_, String>(14)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let result: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (StatusCode::OK, Json(serde_json::json!({ "data": result, "total": result.len() })))
}

/// 获取单个销售订单（含明细）
pub async fn get_sales_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let order = match conn.query_row(
        "SELECT so.id, so.so_number, so.customer_id, c.name as customer_name, \
         so.order_date, so.expected_delivery_date, so.status, \
         so.total_amount, so.paid_amount, so.payment_status, \
         so.shipping_address, so.notes, so.created_by, so.created_at, so.updated_at \
         FROM sales_orders so \
         LEFT JOIN customers c ON so.customer_id = c.id \
         WHERE so.id = ?1 AND so.deleted_at IS NULL",
        params![id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "so_number": row.get::<_, String>(1)?,
                "customer_id": row.get::<_, String>(2)?,
                "customer_name": row.get::<_, Option<String>>(3)?,
                "order_date": row.get::<_, String>(4)?,
                "expected_delivery_date": row.get::<_, Option<String>>(5)?,
                "status": row.get::<_, String>(6)?,
                "total_amount": row.get::<_, f64>(7)?,
                "paid_amount": row.get::<_, f64>(8)?,
                "payment_status": row.get::<_, String>(9)?,
                "shipping_address": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "created_by": row.get::<_, Option<String>>(12)?,
                "created_at": row.get::<_, String>(13)?,
                "updated_at": row.get::<_, String>(14)?,
            }))
        },
    ) {
        Ok(o) => o,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Sales order not found"}))),
    };

    let mut stmt = match conn.prepare(
        "SELECT soi.id, soi.product_id, p.name as product_name, p.sku, \
         soi.quantity, soi.unit_price, soi.total_price, soi.shipped_quantity, soi.notes \
         FROM sales_order_items soi \
         LEFT JOIN products p ON soi.product_id = p.id \
         WHERE soi.sales_order_id = ?1 ORDER BY soi.id"
    ) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let rows = match stmt.query_map(params![id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "product_id": row.get::<_, String>(1)?,
            "product_name": row.get::<_, Option<String>>(2)?,
            "sku": row.get::<_, Option<String>>(3)?,
            "quantity": row.get::<_, i32>(4)?,
            "unit_price": row.get::<_, f64>(5)?,
            "total_price": row.get::<_, f64>(6)?,
            "shipped_quantity": row.get::<_, i32>(7)?,
            "notes": row.get::<_, Option<String>>(8)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let items: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (StatusCode::OK, Json(serde_json::json!({ "order": order, "items": items })))
}

/// 创建销售订单
pub async fn create_sales_order(
    State(state): State<AppState>,
    Json(payload): Json<CreateSalesOrderRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let so_number = format!("SO-{}", &id[..8]);
    let order_date = payload.order_date.as_deref().unwrap_or("");

    if payload.items.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Order must have at least one item"})));
    }

    let customer_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM customers WHERE id = ?1 AND deleted_at IS NULL)",
        params![payload.customer_id],
        |row| row.get(0),
    ).unwrap_or(false);

    if !customer_exists {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Customer not found"})));
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Transaction error: {}", e)}))),
    };

    if let Err(e) = tx.execute(
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, \
         expected_delivery_date, status, total_amount, paid_amount, payment_status, \
         shipping_address, notes, created_by) \
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0.0, 0.0, 'unpaid', ?6, ?7, ?8)",
        params![
            id, so_number, payload.customer_id, order_date,
            payload.expected_delivery_date,
            payload.shipping_address, payload.notes, payload.created_by,
        ],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to create order: {}", e)})));
    }

    for item in &payload.items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = item.quantity as f64 * item.unit_price;

        if let Err(e) = tx.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, \
             unit_price, total_price, shipped_quantity, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            params![item_id, id, item.product_id, item.quantity, item.unit_price, total_price, item.notes],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to insert item: {}", e)})));
        }
    }

    let total_amount: f64 = match tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM sales_order_items WHERE sales_order_id = ?1",
        params![id],
        |row| row.get(0),
    ) {
        Ok(t) => t,
        Err(e) => {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to calculate total: {}", e)})));
        }
    };

    if let Err(e) = tx.execute(
        "UPDATE sales_orders SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    ) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update total: {}", e)})));
    }

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})));
    }

    (StatusCode::CREATED, Json(serde_json::json!({
        "id": id,
        "so_number": so_number,
        "total_amount": total_amount,
        "message": "Sales order created successfully"
    })))
}

/// 更新销售订单
pub async fn update_sales_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<CreateSalesOrderRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let status: String = match conn.query_row(
        "SELECT status FROM sales_orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Sales order not found"}))),
    };

    if status != "draft" {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Only draft orders can be updated"})));
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Transaction error: {}", e)}))),
    };

    if let Err(e) = tx.execute(
        "UPDATE sales_orders SET customer_id = ?1, order_date = ?2, \
         expected_delivery_date = ?3, shipping_address = ?4, notes = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
        params![payload.customer_id, payload.order_date, payload.expected_delivery_date, payload.shipping_address, payload.notes, id],
    ) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update order: {}", e)})));
    }

    if let Err(e) = tx.execute("DELETE FROM sales_order_items WHERE sales_order_id = ?1", params![id]) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to clear old items: {}", e)})));
    }

    for item in &payload.items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = item.quantity as f64 * item.unit_price;
        if let Err(e) = tx.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price, shipped_quantity, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            params![item_id, id, item.product_id, item.quantity, item.unit_price, total_price, item.notes],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to insert item: {}", e)})));
        }
    }

    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM sales_order_items WHERE sales_order_id = ?1",
        params![id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    if let Err(e) = tx.execute("UPDATE sales_orders SET total_amount = ?1 WHERE id = ?2", params![total_amount, id]) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update total: {}", e)})));
    }

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})));
    }

    (StatusCode::OK, Json(serde_json::json!({
        "id": id,
        "total_amount": total_amount,
        "message": "Sales order updated successfully"
    })))
}

/// 提交销售订单（确认 + 自动扣减库存）
pub async fn submit_sales_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let status: String = match conn.query_row(
        "SELECT status FROM sales_orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Sales order not found"}))),
    };

    if status != "draft" {
        return (StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": format!("Cannot submit order with status '{}'", status)})));
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Transaction error: {}", e)}))),
    };

    // 先在闭包中收集明细，避免借用 tx
    let items: Vec<(String, i32)> = {
        let mut stmt = match tx.prepare(
            "SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?1"
        ) {
            Ok(s) => s,
            Err(e) => {
                return (StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Query error: {}", e)})));
            }
        };
        let rows = match stmt.query_map(params![id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        }) {
            Ok(r) => r,
            Err(e) => {
                return (StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Query error: {}", e)})));
            }
        };
        rows.filter_map(|r| r.ok()).collect()
    }; // stmt 在这里被 drop，tx 可以重新使用了

    for (product_id, quantity) in &items {
        let current_stock: i32 = match tx.query_row(
            "SELECT current_stock FROM products WHERE id = ?1 AND deleted_at IS NULL",
            params![product_id],
            |row| row.get(0),
        ) {
            Ok(s) => s,
            Err(_) => {
                let _ = tx.rollback();
                return (StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({"error": format!("Product {} not found", product_id)})));
            }
        };

        if current_stock < *quantity {
            let _ = tx.rollback();
            return (StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("Insufficient stock for product {}. Current: {}, Required: {}",
                        product_id, current_stock, quantity)
                })));
        }

        if let Err(e) = tx.execute(
            "UPDATE products SET current_stock = current_stock - ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![quantity, product_id],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to deduct inventory: {}", e)})));
        }

        let txn_id = Uuid::new_v4().to_string();
        if let Err(e) = tx.execute(
            "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, \
             reference_no, reason, notes) VALUES (?1, ?2, 'outbound', ?3, ?4, 'sales_order', '销售出库')",
            params![txn_id, product_id, quantity, id],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to record inventory transaction: {}", e)})));
        }
    }

    if let Err(e) = tx.execute(
        "UPDATE sales_orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    ) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update status: {}", e)})));
    }

    if let Err(e) = tx.commit() {
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})));
    }

    (StatusCode::OK, Json(serde_json::json!({
        "id": id,
        "status": "confirmed",
        "message": "Sales order submitted successfully. Inventory deducted."
    })))
}
