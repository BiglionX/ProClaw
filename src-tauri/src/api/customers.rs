// 客户管理 API 处理器
// 提供客户 CRUD 操作的 RESTful API

use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use super::AppState;
use rusqlite::params;
use uuid::Uuid;

/// 客户创建/更新请求
#[derive(Debug, Deserialize)]
pub struct CustomerRequest {
    pub name: String,
    pub code: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    pub customer_type: Option<String>,
    pub tax_number: Option<String>,
    pub credit_limit: Option<f64>,
    pub notes: Option<String>,
    pub is_active: Option<bool>,
}

/// 客户列表查询参数
#[derive(Debug, Deserialize)]
pub struct CustomerQuery {
    pub search: Option<String>,
}

/// 获取客户列表
pub async fn get_customers(
    State(state): State<AppState>,
    Query(query): Query<CustomerQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, name, code, contact_person, phone, email, address, website, \
         customer_type, tax_number, credit_limit, notes, is_active, created_at, updated_at \
         FROM customers WHERE deleted_at IS NULL"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref search) = query.search {
        if !search.is_empty() {
            sql.push_str(" AND (name LIKE ?1 OR code LIKE ?2 OR contact_person LIKE ?3)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    sql.push_str(" ORDER BY name ASC");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Query error: {}", e)}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "name": row.get::<_, String>(1)?,
            "code": row.get::<_, String>(2)?,
            "contact_person": row.get::<_, Option<String>>(3)?,
            "phone": row.get::<_, Option<String>>(4)?,
            "email": row.get::<_, Option<String>>(5)?,
            "address": row.get::<_, Option<String>>(6)?,
            "website": row.get::<_, Option<String>>(7)?,
            "customer_type": row.get::<_, String>(8)?,
            "tax_number": row.get::<_, Option<String>>(9)?,
            "credit_limit": row.get::<_, f64>(10)?,
            "notes": row.get::<_, Option<String>>(11)?,
            "is_active": row.get::<_, bool>(12)?,
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

/// 获取单个客户
pub async fn get_customer(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let result = conn.query_row(
        "SELECT id, name, code, contact_person, phone, email, address, website, \
         customer_type, tax_number, credit_limit, notes, is_active, created_at, updated_at \
         FROM customers WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "code": row.get::<_, String>(2)?,
                "contact_person": row.get::<_, Option<String>>(3)?,
                "phone": row.get::<_, Option<String>>(4)?,
                "email": row.get::<_, Option<String>>(5)?,
                "address": row.get::<_, Option<String>>(6)?,
                "website": row.get::<_, Option<String>>(7)?,
                "customer_type": row.get::<_, String>(8)?,
                "tax_number": row.get::<_, Option<String>>(9)?,
                "credit_limit": row.get::<_, f64>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "is_active": row.get::<_, bool>(12)?,
                "created_at": row.get::<_, String>(13)?,
                "updated_at": row.get::<_, String>(14)?,
            }))
        },
    );

    match result {
        Ok(customer) => (StatusCode::OK, Json(customer)),
        Err(_) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Customer not found"}))),
    }
}

/// 创建客户
pub async fn create_customer(
    State(state): State<AppState>,
    Json(payload): Json<CustomerRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let code_str = format!("CUST-{}", &id[..8]);
    let code = payload.code.as_deref().unwrap_or(&code_str);
    let customer_type = payload.customer_type.as_deref().unwrap_or("individual");
    let is_active = payload.is_active.unwrap_or(true);
    let credit_limit = payload.credit_limit.unwrap_or(0.0);

    match conn.execute(
        "INSERT INTO customers (id, name, code, contact_person, phone, email, address, website, \
         customer_type, tax_number, credit_limit, notes, is_active) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id, payload.name, code,
            payload.contact_person, payload.phone, payload.email,
            payload.address, payload.website, customer_type,
            payload.tax_number, credit_limit, payload.notes, is_active,
        ],
    ) {
        Ok(_) => (StatusCode::CREATED, Json(serde_json::json!({
            "id": id,
            "code": code,
            "message": "Customer created successfully"
        }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to create customer: {}", e)}))),
    }
}

/// 更新客户
pub async fn update_customer(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<CustomerRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM customers WHERE id = ?1 AND deleted_at IS NULL)",
        params![id],
        |row| row.get(0),
    ).unwrap_or(false);

    if !exists {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Customer not found"})));
    }

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    sets.push(format!("name = ?{}", values.len() + 1));
    values.push(Box::new(payload.name));

    if let Some(ref v) = payload.code {
        sets.push(format!("code = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.contact_person {
        sets.push(format!("contact_person = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.phone {
        sets.push(format!("phone = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.email {
        sets.push(format!("email = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.address {
        sets.push(format!("address = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.website {
        sets.push(format!("website = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.customer_type {
        sets.push(format!("customer_type = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.tax_number {
        sets.push(format!("tax_number = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(v) = payload.credit_limit {
        sets.push(format!("credit_limit = ?{}", values.len() + 1));
        values.push(Box::new(v));
    }
    if let Some(ref v) = payload.notes {
        sets.push(format!("notes = ?{}", values.len() + 1));
        values.push(Box::new(v.clone()));
    }
    if let Some(v) = payload.is_active {
        sets.push(format!("is_active = ?{}", values.len() + 1));
        values.push(Box::new(v));
    }

    sets.push("updated_at = CURRENT_TIMESTAMP".to_string());

    let sql = format!("UPDATE customers SET {} WHERE id = ?{}", sets.join(", "), values.len() + 1);
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|p| p.as_ref()).collect();

    match conn.execute(&sql, params_refs.as_slice()) {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({
            "id": id,
            "message": "Customer updated successfully"
        }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to update customer: {}", e)}))),
    }
}

/// 删除客户（软删除）
pub async fn delete_customer(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database lock error"}))),
    };
    let conn = db.connection();

    match conn.execute(
        "UPDATE customers SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    ) {
        Ok(affected) => {
            if affected > 0 {
                (StatusCode::OK, Json(serde_json::json!({"message": "Customer deleted successfully"})))
            } else {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Customer not found"})))
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to delete customer: {}", e)}))),
    }
}
