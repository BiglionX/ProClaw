// 销售订单管理 API 处理器
// 提供销售订单 CRUD、提交（自动扣减库存）等 RESTful API

use super::quantity_price::{line_amount, round_money};
use super::AppState;
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rusqlite::{params, Transaction};
use serde::Deserialize;
use uuid::Uuid;

/// 条件扣减库存错误（P0-06）
#[derive(Debug)]
pub(crate) enum DeductStockError {
    NotFound,
    Insufficient { current: i32, required: i32 },
    Db(String),
}

/// P0-06：条件扣减默认 SKU，affected_rows=0 视为库存不足。
/// `product_id` 仍是 `products.id`（等于 SPU id），不改明细外键。
pub(crate) fn try_deduct_product_stock(
    tx: &Transaction<'_>,
    product_id: &str,
    quantity: i32,
) -> Result<(), DeductStockError> {
    match crate::sku_stock::deduct_default_sku(tx, product_id, quantity) {
        Ok(()) => Ok(()),
        Err(crate::sku_stock::SkuStockError::NoSku) => Err(DeductStockError::NotFound),
        Err(crate::sku_stock::SkuStockError::Insufficient { current, required }) => {
            Err(DeductStockError::Insufficient { current, required })
        }
        Err(crate::sku_stock::SkuStockError::Db(msg)) => Err(DeductStockError::Db(msg)),
    }
}

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
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

struct SalesOrderPage {
    data: Vec<serde_json::Value>,
    total: i64,
    page: i64,
    page_size: i64,
}

fn query_sales_order_page(
    conn: &rusqlite::Connection,
    status: Option<&str>,
    customer_id: Option<&str>,
    search: Option<&str>,
    page: i64,
    requested_page_size: Option<i64>,
) -> Result<SalesOrderPage, String> {
    let mut sql = String::from(
        "SELECT so.id, so.so_number, so.customer_id, c.name as customer_name, \
         so.order_date, so.expected_delivery_date, so.status, \
         so.total_amount, so.paid_amount, so.payment_status, \
         so.shipping_address, so.notes, so.created_by, so.created_at, so.updated_at \
         FROM sales_orders so \
         LEFT JOIN customers c ON so.customer_id = c.id \
         WHERE so.deleted_at IS NULL",
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(status) = status.filter(|s| !s.is_empty()) {
        sql.push_str(" AND so.status = ?1");
        params_vec.push(Box::new(status.to_string()));
    }
    if let Some(customer_id) = customer_id.filter(|s| !s.is_empty()) {
        let idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND so.customer_id = ?{idx}"));
        params_vec.push(Box::new(customer_id.to_string()));
    }
    if let Some(search) = search.filter(|s| !s.is_empty()) {
        let idx = params_vec.len() + 1;
        let idx2 = idx + 1;
        sql.push_str(&format!(
            " AND (so.so_number LIKE ?{idx} OR c.name LIKE ?{idx2})"
        ));
        let pattern = format!("%{search}%");
        params_vec.push(Box::new(pattern.clone()));
        params_vec.push(Box::new(pattern));
    }

    let count_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();
    let total = crate::database::count_unpaged(conn, &sql, count_refs.as_slice())
        .map_err(|e| e.to_string())?;

    sql.push_str(" ORDER BY so.created_at DESC");
    let page_size = crate::database::clamp_page_size(requested_page_size, 200);
    let page = page.max(1);
    crate::database::append_limit_offset(
        &mut sql,
        &mut params_vec,
        page_size,
        (page - 1) * page_size,
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let data = stmt
        .query_map(params_refs.as_slice(), |row| {
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
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SalesOrderPage {
        data,
        total,
        page,
        page_size,
    })
}

/// 获取销售订单列表
pub async fn get_sales_orders(
    State(state): State<AppState>,
    Query(query): Query<SalesOrderQuery>,
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

    match query_sales_order_page(
        conn,
        query.status.as_deref(),
        query.customer_id.as_deref(),
        query.search.as_deref(),
        query.page.unwrap_or(1),
        query.page_size,
    ) {
        Ok(page) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "data": page.data,
                "total": page.total,
                "page": page.page,
                "page_size": page.page_size,
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)})),
        ),
    }
}

/// 获取单个销售订单（含明细）
pub async fn get_sales_order(
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
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Sales order not found"})),
            )
        }
    };

    let mut stmt = match conn.prepare(
        "SELECT soi.id, soi.product_id, p.name as product_name, p.sku, \
         soi.quantity, soi.unit_price, soi.total_price, soi.shipped_quantity, soi.notes \
         FROM sales_order_items soi \
         LEFT JOIN products p ON soi.product_id = p.id \
         WHERE soi.sales_order_id = ?1 ORDER BY soi.id",
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
            "shipped_quantity": row.get::<_, i32>(7)?,
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

/// 创建销售订单
pub async fn create_sales_order(
    State(state): State<AppState>,
    Json(payload): Json<CreateSalesOrderRequest>,
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
    let so_number = format!("SO-{}", &id[..8]);
    let order_date = payload.order_date.as_deref().unwrap_or("");

    if payload.items.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Order must have at least one item"})),
        );
    }

    let customer_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM customers WHERE id = ?1 AND deleted_at IS NULL)",
            params![payload.customer_id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !customer_exists {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Customer not found"})),
        );
    }

    for (idx, item) in payload.items.iter().enumerate() {
        if let Err(e) = super::quantity_price::validate_order_item_qty_price(
            idx,
            item.quantity,
            item.unit_price,
        ) {
            return e;
        }
        let product_exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
                params![item.product_id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        if !product_exists {
            return (
                StatusCode::BAD_REQUEST,
                Json(
                    serde_json::json!({"error": format!("Product {} not found", item.product_id)}),
                ),
            );
        }
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
        "INSERT INTO sales_orders (id, so_number, customer_id, order_date, \
         expected_delivery_date, status, total_amount, paid_amount, payment_status, \
         shipping_address, notes, created_by) \
         VALUES (?1, ?2, ?3, ?4, ?5, 'draft', 0.0, 0.0, 'unpaid', ?6, ?7, ?8)",
        params![
            id,
            so_number,
            payload.customer_id,
            order_date,
            payload.expected_delivery_date,
            payload.shipping_address,
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
        let total_price = line_amount(item.quantity, item.unit_price);

        if let Err(e) = tx.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, \
             unit_price, total_price, shipped_quantity, notes) \
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
        "SELECT COALESCE(SUM(total_price), 0.0) FROM sales_order_items WHERE sales_order_id = ?1",
        params![id],
        |row| row.get(0),
    ) {
        Ok(t) => round_money(t),
        Err(e) => {
            let _ = tx.rollback();
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to calculate total: {}", e)})),
            );
        }
    };

    if let Err(e) = tx.execute(
        "UPDATE sales_orders SET total_amount = ?1 WHERE id = ?2",
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
            "so_number": so_number,
            "total_amount": total_amount,
            "message": "Sales order created successfully"
        })),
    )
}

/// 更新销售订单
pub async fn update_sales_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<CreateSalesOrderRequest>,
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
        "SELECT status FROM sales_orders WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| row.get(0),
    ) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Sales order not found"})),
            )
        }
    };

    if status != "draft" {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Only draft orders can be updated"})),
        );
    }

    if payload.items.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Order must have at least one item"})),
        );
    }
    for (idx, item) in payload.items.iter().enumerate() {
        if let Err(e) = super::quantity_price::validate_order_item_qty_price(
            idx,
            item.quantity,
            item.unit_price,
        ) {
            return e;
        }
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
        "UPDATE sales_orders SET customer_id = ?1, order_date = ?2, \
         expected_delivery_date = ?3, shipping_address = ?4, notes = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
        params![payload.customer_id, payload.order_date, payload.expected_delivery_date, payload.shipping_address, payload.notes, id],
    ) {
        let _ = tx.rollback();
        return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update order: {}", e)})));
    }

    if let Err(e) = tx.execute(
        "DELETE FROM sales_order_items WHERE sales_order_id = ?1",
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
        let total_price = line_amount(item.quantity, item.unit_price);
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
    let total_amount = round_money(total_amount);

    if let Err(e) = tx.execute(
        "UPDATE sales_orders SET total_amount = ?1 WHERE id = ?2",
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
            "message": "Sales order updated successfully"
        })),
    )
}

/// 提交销售订单。与桌面端 `submit_sales_order_on_conn` 同一条路径：
/// 扣默认 SKU、同步商品库存，并把 `shipped_quantity` 写成 `quantity`。
pub async fn submit_sales_order(
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

    match crate::sales_commands::submit_sales_order_on_conn(db.connection(), &id) {
        Ok(body) => (StatusCode::OK, Json(body)),
        Err(message) => {
            let status = if message == "Sales order not found" {
                StatusCode::NOT_FOUND
            } else if message.starts_with("Cannot submit")
                || message.contains("Insufficient stock")
                || message.contains("没有启用的默认 SKU")
                || message.contains("not found")
            {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(serde_json::json!({"error": message})))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::quantity_price::validate_order_item_qty_price;
    use axum::http::StatusCode;
    use rusqlite::{params, Connection, TransactionBehavior};
    use std::sync::{Arc, Barrier};
    use std::thread;

    fn deduct_conn(
        conn: &mut Connection,
        product_id: &str,
        quantity: i32,
    ) -> Result<(), DeductStockError> {
        let tx = conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|e| DeductStockError::Db(e.to_string()))?;
        match try_deduct_product_stock(&tx, product_id, quantity) {
            Ok(()) => {
                tx.commit()
                    .map_err(|e| DeductStockError::Db(e.to_string()))?;
                Ok(())
            }
            Err(e) => {
                let _ = tx.rollback();
                Err(e)
            }
        }
    }

    fn stock_of(conn: &Connection, id: &str) -> i32 {
        conn.query_row(
            "SELECT current_stock FROM product_skus WHERE spu_id = ?1 AND is_active = 1",
            params![id],
            |row| row.get(0),
        )
        .unwrap()
    }

    /// 模拟创建销售单明细前的 DTO 校验：负数量 → 422，库存不变
    #[test]
    fn create_rejects_negative_quantity_stock_unchanged() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE products (
               id TEXT PRIMARY KEY, sku TEXT, name TEXT,
               current_stock INTEGER DEFAULT 0, deleted_at TIMESTAMP, updated_at TIMESTAMP
             );
             INSERT INTO products (id, sku, name, current_stock) VALUES ('p1', 'S1', 'T', 30);
             CREATE TABLE product_skus (
               id TEXT PRIMARY KEY, spu_id TEXT NOT NULL, sku_code TEXT NOT NULL,
               current_stock INTEGER DEFAULT 0, is_default INTEGER DEFAULT 1,
               is_active INTEGER DEFAULT 1, deleted_at TIMESTAMP, updated_at TIMESTAMP, created_at TIMESTAMP
             );
             INSERT INTO product_skus (id, spu_id, sku_code, current_stock, is_default, is_active)
               VALUES ('sku-p1', 'p1', 'S1', 30, 1, 1);",
        )
        .unwrap();

        let before = stock_of(&conn, "p1");
        let err = validate_order_item_qty_price(0, -10, 100.0).unwrap_err();
        assert_eq!(err.0, StatusCode::UNPROCESSABLE_ENTITY);
        assert!(err.1 .0["field"].as_str().unwrap().contains("quantity"));
        assert_eq!(stock_of(&conn, "p1"), before);
    }

    #[test]
    fn create_rejects_negative_unit_price() {
        let err = validate_order_item_qty_price(0, 1, -5.0).unwrap_err();
        assert_eq!(err.0, StatusCode::UNPROCESSABLE_ENTITY);
        assert!(err.1 .0["field"].as_str().unwrap().contains("unit_price"));
    }

    #[test]
    fn db_check_rejects_negative_quantity_insert() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE sales_orders (id TEXT PRIMARY KEY);
             CREATE TABLE products (id TEXT PRIMARY KEY);
             INSERT INTO sales_orders (id) VALUES ('so1');
             INSERT INTO products (id) VALUES ('p1');
             CREATE TABLE sales_order_items (
               id TEXT PRIMARY KEY,
               sales_order_id TEXT NOT NULL REFERENCES sales_orders(id),
               product_id TEXT NOT NULL REFERENCES products(id),
               quantity INTEGER NOT NULL CHECK(quantity > 0),
               unit_price REAL NOT NULL CHECK(unit_price >= 0),
               total_price REAL NOT NULL
             );",
        )
        .unwrap();

        let bad = conn.execute(
            "INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, total_price)
             VALUES ('i1', 'so1', 'p1', -10, 9.9, -99.0)",
            [],
        );
        assert!(bad.is_err(), "CHECK(quantity > 0) must reject -10");
    }

    /// 并发 10 个各扣 1、库存 5 → 恰好 5 成功，库存归 0
    #[test]
    fn concurrent_deduct_five_of_ten_stock_not_negative() {
        let dir = std::env::temp_dir().join(format!(
            "p006_conc_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = std::fs::create_dir_all(&dir);
        let db_path = dir.join("stock.db");
        {
            let conn = Connection::open(&db_path).unwrap();
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 PRAGMA busy_timeout = 8000;
                 CREATE TABLE products (
                   id TEXT PRIMARY KEY, sku TEXT, name TEXT,
                   current_stock INTEGER DEFAULT 0, deleted_at TIMESTAMP, updated_at TIMESTAMP
                 );
                 INSERT INTO products (id, sku, name, current_stock) VALUES ('p1', 'S1', 'T', 5);
                 CREATE TABLE product_skus (
                   id TEXT PRIMARY KEY, spu_id TEXT NOT NULL, sku_code TEXT NOT NULL,
                   current_stock INTEGER DEFAULT 0, is_default INTEGER DEFAULT 1,
                   is_active INTEGER DEFAULT 1, deleted_at TIMESTAMP, updated_at TIMESTAMP, created_at TIMESTAMP
                 );
                 INSERT INTO product_skus (id, spu_id, sku_code, current_stock, is_default, is_active)
                   VALUES ('sku-p1', 'p1', 'S1', 5, 1, 1);",
            )
            .unwrap();
        }

        let barrier = Arc::new(Barrier::new(10));
        let path = Arc::new(db_path.clone());
        let mut handles = Vec::new();
        for _ in 0..10 {
            let barrier = Arc::clone(&barrier);
            let path = Arc::clone(&path);
            handles.push(thread::spawn(move || {
                let mut conn = Connection::open(path.as_ref()).unwrap();
                let _ = conn.execute_batch("PRAGMA busy_timeout = 8000;");
                barrier.wait();
                // busy/locked 时重试；库存不足则计为失败
                for _ in 0..40 {
                    match deduct_conn(&mut conn, "p1", 1) {
                        Ok(()) => return true,
                        Err(DeductStockError::Insufficient { .. }) => return false,
                        Err(DeductStockError::NotFound) => return false,
                        Err(DeductStockError::Db(msg)) => {
                            let lower = msg.to_lowercase();
                            if lower.contains("busy") || lower.contains("locked") {
                                thread::sleep(std::time::Duration::from_millis(15));
                                continue;
                            }
                            return false;
                        }
                    }
                }
                false
            }));
        }

        let success = handles
            .into_iter()
            .map(|h| h.join().unwrap())
            .filter(|ok| *ok)
            .count();

        let conn = Connection::open(&db_path).unwrap();
        let stock = stock_of(&conn, "p1");
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(
            success, 5,
            "exactly 5 of 10 concurrent deducts should succeed"
        );
        assert_eq!(stock, 0, "stock must be 0, not negative");
    }

    #[test]
    fn page_size_1000_returns_at_most_200_and_real_total() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT);
             INSERT INTO customers (id, name) VALUES ('c1', 'Acme');
             CREATE TABLE sales_orders (
               id TEXT PRIMARY KEY,
               so_number TEXT,
               customer_id TEXT,
               order_date TEXT,
               expected_delivery_date TEXT,
               status TEXT,
               total_amount REAL,
               paid_amount REAL,
               payment_status TEXT,
               shipping_address TEXT,
               notes TEXT,
               created_by TEXT,
               created_at TEXT,
               updated_at TEXT,
               deleted_at TEXT
             );",
        )
        .unwrap();
        for i in 0..250 {
            conn.execute(
                "INSERT INTO sales_orders (
                   id, so_number, customer_id, order_date, status,
                   total_amount, paid_amount, payment_status, created_at, updated_at
                 ) VALUES (?1, ?2, 'c1', '2026-01-01', 'draft', 1, 0, 'unpaid', ?3, ?3)",
                params![
                    format!("so-{i}"),
                    format!("SO-{i:04}"),
                    format!("2026-01-01T00:00:{i:02}")
                ],
            )
            .unwrap();
        }

        let page = query_sales_order_page(&conn, None, None, None, 1, Some(1000)).unwrap();
        assert!(page.data.len() <= 200);
        assert_eq!(page.data.len(), 200);
        assert_eq!(page.page_size, 200);
        assert_eq!(page.total, 250);
    }
}
