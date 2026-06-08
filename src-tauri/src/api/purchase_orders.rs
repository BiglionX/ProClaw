// 采购订单管理 API 处理器
// 提供采购订单 CRUD、收货确认（自动增加库存）等 RESTful API

use super::AppState;
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rusqlite::params;
use serde::Deserialize;
use uuid::Uuid;

/// 采购订单创建请求
#[derive(Debug, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub supplier_id: String,
    pub order_date: Option<String>,
    pub expected_delivery_date: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub items: Vec<PurchaseOrderItemRequest>,
}

/// 采购订单明细请求
#[derive(Debug, Deserialize)]
pub struct PurchaseOrderItemRequest {
    pub product_id: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub notes: Option<String>,
}

/// 采购订单列表查询参数
#[derive(Debug, Deserialize)]
pub struct PurchaseOrderQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub supplier_id: Option<String>,
}

/// 获取采购订单列表
pub async fn get_purchase_orders(
    State(state): State<AppState>,
    Query(query): Query<PurchaseOrderQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name, \
         po.order_date, po.expected_delivery_date, po.status, \
         po.total_amount, po.paid_amount, po.payment_status, \
         po.notes, po.created_by, po.created_at, po.updated_at \
         FROM purchase_orders po \
         LEFT JOIN suppliers s ON po.supplier_id = s.id \
         WHERE po.deleted_at IS NULL",
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref status) = query.status {
        if !status.is_empty() {
            sql.push_str(" AND po.status = ?1");
            params_vec.push(Box::new(status.clone()));
        }
    }

    if let Some(ref supplier_id) = query.supplier_id {
        if !supplier_id.is_empty() {
            let idx = params_vec.len() + 1;
            sql.push_str(&format!(" AND po.supplier_id = ?{}", idx));
            params_vec.push(Box::new(supplier_id.clone()));
        }
    }

    if let Some(ref search) = query.search {
        if !search.is_empty() {
            let idx = params_vec.len() + 1;
            let idx2 = idx + 1;
            sql.push_str(&format!(
                " AND (po.po_number LIKE ?{} OR s.name LIKE ?{})",
                idx, idx2
            ));
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY po.created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Query error: {}", e)})),
            )
        }
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "po_number": row.get::<_, String>(1)?,
            "supplier_id": row.get::<_, String>(2)?,
            "supplier_name": row.get::<_, Option<String>>(3)?,
            "order_date": row.get::<_, String>(4)?,
            "expected_delivery_date": row.get::<_, Option<String>>(5)?,
            "status": row.get::<_, String>(6)?,
            "total_amount": row.get::<_, f64>(7)?,
            "paid_amount": row.get::<_, f64>(8)?,
            "payment_status": row.get::<_, String>(9)?,
            "notes": row.get::<_, Option<String>>(10)?,
            "created_by": row.get::<_, Option<String>>(11)?,
            "created_at": row.get::<_, String>(12)?,
            "updated_at": row.get::<_, String>(13)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Query error: {}", e)})),
            )
        }
    };

    let result: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (
        StatusCode::OK,
        Json(serde_json::json!({ "data": result, "total": result.len() })),
    )
}

/// 获取单个采购订单（含明细）
pub async fn get_purchase_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let order = match conn.query_row(
        "SELECT po.id, po.po_number, po.supplier_id, s.name as supplier_name, \
         po.order_date, po.expected_delivery_date, po.status, \
         po.total_amount, po.paid_amount, po.payment_status, \
         po.notes, po.created_by, po.created_at, po.updated_at \
         FROM purchase_orders po \
         LEFT JOIN suppliers s ON po.supplier_id = s.id \
         WHERE po.id = ?1 AND po.deleted_at IS NULL",
        params![id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "po_number": row.get::<_, String>(1)?,
                "supplier_id": row.get::<_, String>(2)?,
                "supplier_name": row.get::<_, Option<String>>(3)?,
                "order_date": row.get::<_, String>(4)?,
                "expected_delivery_date": row.get::<_, Option<String>>(5)?,
                "status": row.get::<_, String>(6)?,
                "total_amount": row.get::<_, f64>(7)?,
                "paid_amount": row.get::<_, f64>(8)?,
                "payment_status": row.get::<_, String>(9)?,
                "notes": row.get::<_, Option<String>>(10)?,
                "created_by": row.get::<_, Option<String>>(11)?,
                "created_at": row.get::<_, String>(12)?,
                "updated_at": row.get::<_, String>(13)?,
            }))
        },
    ) {
        Ok(o) => o,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Purchase order not found"})),
            )
        }
    };

    let mut stmt = match conn.prepare(
        "SELECT poi.id, poi.product_id, p.name as product_name, p.sku, \
         poi.quantity, poi.unit_price, poi.total_price, poi.received_quantity, poi.notes \
         FROM purchase_order_items poi \
         LEFT JOIN products p ON poi.product_id = p.id \
         WHERE poi.purchase_order_id = ?1 ORDER BY poi.id",
    ) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Query error: {}", e)})),
            )
        }
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
            "received_quantity": row.get::<_, i32>(7)?,
            "notes": row.get::<_, Option<String>>(8)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Query error: {}", e)})),
            )
        }
    };

    let items: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (
        StatusCode::OK,
        Json(serde_json::json!({ "order": order, "items": items })),
    )
}

/// 创建采购订单
pub async fn create_purchase_order(
    State(state): State<AppState>,
    Json(payload): Json<CreatePurchaseOrderRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let po_number = format!("PO-{}", &id[..8]);
    let order_date = payload.order_date.as_deref().unwrap_or("");

    if payload.items.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Order must have at least one item"})),
        );
    }

    let supplier_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM suppliers WHERE id = ?1 AND deleted_at IS NULL)",
            params![payload.supplier_id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !supplier_exists {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Supplier not found"})),
        );
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Transaction error: {}", e)})),
            )
        }
    };

    if let Err(e) = tx.execute(
        "INSERT INTO purchase_orders (id, po_number, supplier_id, order_date, \
         expected_delivery_date, status, total_amount, paid_amount, payment_status, \
         notes, created_by) \
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0.0, 0.0, 'unpaid', ?6, ?7)",
        params![
            id,
            po_number,
            payload.supplier_id,
            order_date,
            payload.expected_delivery_date,
            payload.notes,
            payload.created_by,
        ],
    ) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to create order: {}", e)})),
        );
    }

    for item in &payload.items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = item.quantity as f64 * item.unit_price;

        if let Err(e) = tx.execute(
            "INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, \
             unit_price, total_price, received_quantity, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            params![
                item_id,
                id,
                item.product_id,
                item.quantity,
                item.unit_price,
                total_price,
                item.notes
            ],
        ) {
            let _ = tx.rollback();
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to insert item: {}", e)})),
            );
        }
    }

    let total_amount: f64 = match tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM purchase_order_items WHERE purchase_order_id = ?1",
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
        "UPDATE purchase_orders SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update total: {}", e)})),
        );
    }

    if let Err(e) = tx.commit() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})),
        );
    }

    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": id,
            "po_number": po_number,
            "total_amount": total_amount,
            "message": "Purchase order created successfully"
        })),
    )
}

/// 更新采购订单
pub async fn update_purchase_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<CreatePurchaseOrderRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let status: String = match conn.query_row(
        "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Purchase order not found"})),
            )
        }
    };

    if status != "draft" {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Only draft orders can be updated"})),
        );
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Transaction error: {}", e)})),
            )
        }
    };

    if let Err(e) = tx.execute(
        "UPDATE purchase_orders SET supplier_id = ?1, order_date = ?2, \
         expected_delivery_date = ?3, notes = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
        params![
            payload.supplier_id,
            payload.order_date,
            payload.expected_delivery_date,
            payload.notes,
            id
        ],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update order: {}", e)})),
        );
    }

    if let Err(e) = tx.execute(
        "DELETE FROM purchase_order_items WHERE purchase_order_id = ?1",
        params![id],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to clear old items: {}", e)})),
        );
    }

    for item in &payload.items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = item.quantity as f64 * item.unit_price;
        if let Err(e) = tx.execute(
            "INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            params![item_id, id, item.product_id, item.quantity, item.unit_price, total_price, item.notes],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to insert item: {}", e)})));
        }
    }

    let total_amount: f64 = tx.query_row(
        "SELECT COALESCE(SUM(total_price), 0.0) FROM purchase_order_items WHERE purchase_order_id = ?1",
        params![id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    if let Err(e) = tx.execute(
        "UPDATE purchase_orders SET total_amount = ?1 WHERE id = ?2",
        params![total_amount, id],
    ) {
        let _ = tx.rollback();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update total: {}", e)})),
        );
    }

    if let Err(e) = tx.commit() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})),
        );
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "id": id,
            "total_amount": total_amount,
            "message": "Purchase order updated successfully"
        })),
    )
}

/// 确认收货（增加库存）
pub async fn receive_purchase_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let status: String = match conn.query_row(
        "SELECT status FROM purchase_orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Purchase order not found"})),
            )
        }
    };

    if status != "confirmed" && status != "draft" {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                serde_json::json!({"error": format!("Cannot receive order with status '{}'", status)}),
            ),
        );
    }

    let tx = match conn.unchecked_transaction() {
        Ok(tx) => tx,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Transaction error: {}", e)})),
            )
        }
    };

    // 在闭包中收集明细，避免借用 tx
    let items: Vec<(String, i32, f64)> = {
        let mut stmt = match tx.prepare(
            "SELECT product_id, quantity, unit_price FROM purchase_order_items WHERE purchase_order_id = ?1"
        ) {
            Ok(s) => s,
            Err(e) => {
                return (StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Query error: {}", e)})));
            }
        };
        let rows = match stmt.query_map(params![id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, f64>(2)?,
            ))
        }) {
            Ok(r) => r,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Query error: {}", e)})),
                );
            }
        };
        rows.filter_map(|r| r.ok()).collect()
    }; // stmt 在这里被 drop

    for (product_id, quantity, _unit_price) in &items {
        let exists: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
                params![product_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !exists {
            let _ = tx.rollback();
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": format!("Product {} not found", product_id)})),
            );
        }

        if let Err(e) = tx.execute(
            "UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![quantity, product_id],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to increase inventory: {}", e)})));
        }

        let txn_id = Uuid::new_v4().to_string();
        if let Err(e) = tx.execute(
            "INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, \
             reference_no, reason, notes) VALUES (?1, ?2, 'inbound', ?3, ?4, 'purchase_order', '采购入库')",
            params![txn_id, product_id, quantity, id],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to record inventory transaction: {}", e)})));
        }

        if let Err(e) = tx.execute(
            "UPDATE purchase_order_items SET received_quantity = received_quantity + ?1 WHERE purchase_order_id = ?2 AND product_id = ?3",
            params![quantity, id, product_id],
        ) {
            let _ = tx.rollback();
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to update received quantity: {}", e)})));
        }
    }

    if let Err(e) = tx.execute(
        "UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    ) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update status: {}", e)})));
    }

    if let Err(e) = tx.commit() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Commit error: {}", e)})),
        );
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "id": id,
            "status": "received",
            "message": "Purchase order received successfully. Inventory updated."
        })),
    )
}
