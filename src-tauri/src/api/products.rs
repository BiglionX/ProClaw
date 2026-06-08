// 产品管理 API 处理器
// 提供产品的 CRUD 操作 RESTful API

use super::AppState;
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rusqlite::params;
use serde::{Deserialize, Serialize};

/// 产品创建/更新请求
#[derive(Debug, Deserialize)]
pub struct ProductRequest {
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: Option<String>,
    pub cost_price: Option<f64>,
    pub sell_price: Option<f64>,
    pub min_stock: Option<i32>,
    pub max_stock: Option<i32>,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
}

/// 产品响应
#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub current_stock: i32,
    pub min_stock: i32,
    pub max_stock: i32,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 分页查询参数
#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

/// 获取产品列表
pub async fn get_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    // 审计修复 #7: 避免 Mutex poison 传播 panic，改用 map_err 优雅处理
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

    // 构建查询
    let mut sql = "SELECT * FROM products WHERE 1=1".to_string();
    let mut params = Vec::new();

    if let Some(cat_id) = query.category_id {
        sql.push_str(" AND category_id = ?");
        params.push(cat_id);
    }

    if let Some(brand_id) = query.brand_id {
        sql.push_str(" AND brand_id = ?");
        params.push(brand_id);
    }

    if let Some(search) = query.search {
        sql.push_str(" AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)");
        let search_pattern = format!("%{}%", search);
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }

    if let Some(is_active) = query.is_active {
        sql.push_str(" AND is_active = ?");
        params.push(is_active.to_string());
    }

    sql.push_str(" ORDER BY created_at DESC");

    // 分页（R7 修复：参数化绑定）
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;
    let idx_limit = params.len() + 1;
    let idx_offset = params.len() + 2;
    params.push(page_size.to_string());
    params.push(offset.to_string());
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", idx_limit, idx_offset));

    // 执行查询
    let mut stmt = match conn.prepare(&sql) {
        Ok(stmt) => stmt,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let product_iter = match stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
        Ok(ProductResponse {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            cost_price: row.get(7)?,
            sell_price: row.get(8)?,
            current_stock: row.get(9)?,
            min_stock: row.get(10)?,
            max_stock: row.get(11)?,
            image_url: row.get(12)?,
            barcode: row.get(13)?,
            is_active: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }) {
        Ok(iter) => iter,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let products: Vec<ProductResponse> = product_iter.filter_map(|r| r.ok()).collect();

    // 统一返回 Json<serde_json::Value>
    (
        StatusCode::OK,
        Json(
            serde_json::to_value(products)
                .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
        ),
    )
}

/// 获取单个产品
pub async fn get_product(
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

    let result = conn.query_row("SELECT * FROM products WHERE id = ?1", params![id], |row| {
        Ok(ProductResponse {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            cost_price: row.get(7)?,
            sell_price: row.get(8)?,
            current_stock: row.get(9)?,
            min_stock: row.get(10)?,
            max_stock: row.get(11)?,
            image_url: row.get(12)?,
            barcode: row.get(13)?,
            is_active: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    });

    match result {
        Ok(product) => (
            StatusCode::OK,
            Json(
                serde_json::to_value(product)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        ),
        Err(rusqlite::Error::QueryReturnedNoRows) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Product not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 创建产品
pub async fn create_product(
    State(state): State<AppState>,
    Json(payload): Json<ProductRequest>,
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

    // 验证SKU唯一性
    let sku_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE sku = ?1)",
            params![payload.sku],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if sku_exists {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "SKU already exists"})),
        );
    }

    // 生成ID
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // 插入数据库
    match conn.execute(
        "INSERT INTO products (id, sku, name, description, category_id, brand_id, unit, cost_price, sell_price, min_stock, max_stock, image_url, barcode, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id,
            payload.sku,
            payload.name,
            payload.description,
            payload.category_id,
            payload.brand_id,
            payload.unit.unwrap_or("件".to_string()),
            payload.cost_price.unwrap_or(0.0),
            payload.sell_price.unwrap_or(0.0),
            payload.min_stock.unwrap_or(0),
            payload.max_stock.unwrap_or(0),
            payload.image_url,
            payload.barcode,
            true,
            now,
            now
        ],
    ) {
        Ok(_) => (),
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()}))
        ),
    };

    // 返回创建的产品
    let product = get_product_by_id(&conn, &id);
    match product {
        Ok(p) => (
            StatusCode::CREATED,
            Json(
                serde_json::to_value(p)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 更新产品
pub async fn update_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<ProductRequest>,
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

    // 检查产品是否存在
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1)",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Product not found"})),
        );
    }

    // 更新数据库
    let now = chrono::Utc::now().to_rfc3339();

    match conn.execute(
        "UPDATE products SET name = ?2, description = ?3, category_id = ?4, brand_id = ?5, unit = ?6, 
         cost_price = ?7, sell_price = ?8, min_stock = ?9, max_stock = ?10, 
         image_url = ?11, barcode = ?12, updated_at = ?13 
         WHERE id = ?1",
        params![
            id,
            payload.name,
            payload.description,
            payload.category_id,
            payload.brand_id,
            payload.unit,
            payload.cost_price,
            payload.sell_price,
            payload.min_stock,
            payload.max_stock,
            payload.image_url,
            payload.barcode,
            now
        ],
    ) {
        Ok(_) => (),
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()}))
        ),
    };

    // 返回更新后的产品
    let product = get_product_by_id(&conn, &id);
    match product {
        Ok(p) => (
            StatusCode::OK,
            Json(
                serde_json::to_value(p)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 删除产品（软删除）
pub async fn delete_product(
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

    // 检查产品是否存在
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1)",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Product not found"})),
        );
    }

    // 软删除：设置 is_active = 0
    let now = chrono::Utc::now().to_rfc3339();

    match conn.execute(
        "UPDATE products SET is_active = 0, updated_at = ?2 WHERE id = ?1",
        params![id, now],
    ) {
        Ok(_) => (
            StatusCode::NO_CONTENT,
            Json(serde_json::json!({"success": true})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 辅助函数：根据ID获取产品
fn get_product_by_id(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<ProductResponse, rusqlite::Error> {
    conn.query_row("SELECT * FROM products WHERE id = ?1", params![id], |row| {
        Ok(ProductResponse {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            cost_price: row.get(7)?,
            sell_price: row.get(8)?,
            current_stock: row.get(9)?,
            min_stock: row.get(10)?,
            max_stock: row.get(11)?,
            image_url: row.get(12)?,
            barcode: row.get(13)?,
            is_active: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    })
}
