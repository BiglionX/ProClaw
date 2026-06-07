// 用户管理 API (Phase 6)
// 提供用户 CRUD、角色分配、密码管理

use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use super::AppState;
use super::auth::hash_password;
use rusqlite::params;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub user_type: Option<String>,
    pub external_type: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: Option<String>,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct UserQuery {
    pub search: Option<String>,
    pub user_type: Option<String>,
    pub role: Option<String>,
}

/// 获取用户列表
pub async fn list_users(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<UserQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT u.id, u.name, u.phone, u.email, u.user_type, u.external_type, \
         u.is_active, u.created_at, u.last_login_at, \
         COALESCE(r.name, '') as role_name, COALESCE(r.permissions, '[]') as permissions \
         FROM users u \
         LEFT JOIN user_roles ur ON u.id = ur.user_id \
         LEFT JOIN roles r ON ur.role_id = r.id \
         WHERE 1=1"
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref t) = query.user_type {
        let idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND u.user_type = ?{}", idx));
        params_vec.push(Box::new(t.clone()));
    }

    if let Some(ref s) = query.search {
        if !s.is_empty() {
            let idx = params_vec.len() + 1;
            let idx2 = idx + 1;
            sql.push_str(&format!(" AND (u.name LIKE ?{} OR u.phone LIKE ?{} OR u.email LIKE ?{})", idx, idx2, idx + 2));
            let pattern = format!("%{}%", s);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    if let Some(ref r) = query.role {
        let idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND r.name = ?{}", idx));
        params_vec.push(Box::new(r.clone()));
    }

    sql.push_str(" ORDER BY u.created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "name": row.get::<_, String>(1)?,
            "phone": row.get::<_, Option<String>>(2)?,
            "email": row.get::<_, Option<String>>(3)?,
            "user_type": row.get::<_, String>(4)?,
            "external_type": row.get::<_, Option<String>>(5)?,
            "is_active": row.get::<_, bool>(6)?,
            "created_at": row.get::<_, String>(7)?,
            "last_login_at": row.get::<_, Option<String>>(8)?,
            "role": row.get::<_, String>(9)?,
            "permissions": serde_json::from_str::<serde_json::Value>(
                &row.get::<_, String>(10)?
            ).unwrap_or(serde_json::json!([])),
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let users: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    (StatusCode::OK, Json(serde_json::json!({ "data": users, "total": users.len() })))
}

/// 获取单个用户
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let user = match conn.query_row(
        "SELECT u.id, u.name, u.phone, u.email, u.user_type, u.external_type, \
         u.is_active, u.created_at, u.last_login_at, \
         COALESCE(r.name, '') as role_name, COALESCE(r.permissions, '[]') as permissions \
         FROM users u \
         LEFT JOIN user_roles ur ON u.id = ur.user_id \
         LEFT JOIN roles r ON ur.role_id = r.id \
         WHERE u.id = ?1",
        params![id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "phone": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "user_type": row.get::<_, String>(4)?,
                "external_type": row.get::<_, Option<String>>(5)?,
                "is_active": row.get::<_, bool>(6)?,
                "created_at": row.get::<_, String>(7)?,
                "last_login_at": row.get::<_, Option<String>>(8)?,
                "role": row.get::<_, String>(9)?,
                "permissions": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(10)?).unwrap_or(serde_json::json!([])),
            }))
        },
    ) {
        Ok(u) => u,
        Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "User not found"}))),
    };

    (StatusCode::OK, Json(serde_json::json!({ "data": user })))
}

/// 创建用户
pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    if payload.name.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Name is required"})));
    }

    let id = Uuid::new_v4().to_string();
    let user_type = payload.user_type.as_deref().unwrap_or("internal");

    // 哈希密码
    let password_hash = if let Some(ref pwd) = payload.password {
        if !pwd.is_empty() {
            match hash_password(pwd) {
                Ok(h) => Some(h),
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
            }
        } else {
            None
        }
    } else {
        None
    };

    if let Err(e) = conn.execute(
        "INSERT INTO users (id, name, phone, email, user_type, external_type, password_hash) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, payload.name, payload.phone, payload.email, user_type, payload.external_type, password_hash],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    // 分配角色
    if let Some(ref role_name) = payload.role {
        if let Err(e) = assign_user_role(&conn, &id, role_name) {
            if let Err(db_err) = conn.execute("DELETE FROM users WHERE id = ?1", params![id]) {
                eprintln!("[Users] Failed to rollback user after role assignment error: {}", db_err);
            }
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e})));
        }
    }

    (StatusCode::CREATED, Json(serde_json::json!({
        "id": id,
        "name": payload.name,
        "message": "User created successfully"
    })))
}

/// 更新用户
pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)", params![id],
        |row| row.get(0),
    ).unwrap_or(false);

    if !exists {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "User not found"})));
    }

    let mut updates = vec![];
    let mut param_idx = 1;

    if payload.name.is_some() {
        updates.push(format!("name = ?{}", param_idx));
        param_idx += 1;
    }
    if payload.phone.is_some() {
        updates.push(format!("phone = ?{}", param_idx));
        param_idx += 1;
    }
    if payload.email.is_some() {
        updates.push(format!("email = ?{}", param_idx));
        param_idx += 1;
    }
    if let Some(_is_active) = payload.is_active {
        updates.push(format!("is_active = ?{}", param_idx));
        param_idx += 1;
    }

    if updates.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "No fields to update"})));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP".to_string());

    let sql = format!("UPDATE users SET {} WHERE id = ?{}", updates.join(", "), param_idx);

    let mut p: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref name) = payload.name { p.push(Box::new(name.clone())); }
    if let Some(ref phone) = payload.phone { p.push(Box::new(phone.clone())); }
    if let Some(ref email) = payload.email { p.push(Box::new(email.clone())); }
    if let Some(is_active) = payload.is_active { p.push(Box::new(is_active)); }
    p.push(Box::new(id));
    let refs: Vec<&dyn rusqlite::types::ToSql> = p.iter().map(|b| b.as_ref()).collect();

    if let Err(e) = conn.execute(&sql, rusqlite::params_from_iter(refs.iter().cloned())) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    (StatusCode::OK, Json(serde_json::json!({"message": "User updated successfully"})))
}

/// 删除用户（软删除）
pub async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let affected = conn.execute(
        "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    ).unwrap_or(0);

    if affected == 0 {
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "User not found"})));
    }

    (StatusCode::OK, Json(serde_json::json!({"message": "User deactivated successfully"})))
}

/// 分配角色
pub async fn assign_role(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<AssignRoleRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    match assign_user_role(&conn, &id, &payload.role) {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"message": "Role assigned successfully"}))),
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e}))),
    }
}

/// 修改密码
pub async fn change_password(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 如果是修改自己的密码，需要验证旧密码
    if let Some(ref old_pwd) = payload.old_password {
        let current_hash: Option<String> = match conn.query_row(
            "SELECT password_hash FROM users WHERE id = ?1", params![id],
            |row| row.get(0),
        ) {
            Ok(h) => h,
            Err(_) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "User not found"}))),
        };

        if !super::auth::verify_password(old_pwd, current_hash.as_deref()) {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Old password is incorrect"})));
        }
    }

    let new_hash = match hash_password(&payload.new_password) {
        Ok(h) => h,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    if let Err(e) = conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_hash, id],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    (StatusCode::OK, Json(serde_json::json!({"message": "Password changed successfully"})))
}

/// 分配用户角色
fn assign_user_role(conn: &rusqlite::Connection, user_id: &str, role_name: &str) -> Result<(), String> {
    // 查找角色ID
    let role_id: i32 = conn.query_row(
        "SELECT id FROM roles WHERE name = ?1",
        params![role_name],
        |row| row.get(0),
    ).map_err(|_| format!("Role '{}' not found", role_name))?;

    // 清除旧角色
    if let Err(e) = conn.execute("DELETE FROM user_roles WHERE user_id = ?1", params![user_id]) {
        eprintln!("[Users] Failed to clear existing roles for {}: {}", user_id, e);
    }

    // 分配新角色
    conn.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)",
        params![user_id, role_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
