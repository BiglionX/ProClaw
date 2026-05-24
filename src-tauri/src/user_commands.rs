// 用户管理 Tauri 命令 (Phase 6)
// 提供桌面端用户 CRUD、角色分配、密码管理

use crate::database::Database;
use crate::api::auth::hash_password;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建用户 (Tauri command)
#[tauri::command]
pub fn create_user_cmd(
    db: tauri::State<Mutex<Database>>,
    name: String,
    phone: Option<String>,
    email: Option<String>,
    user_type: Option<String>,
    password: Option<String>,
    role: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    if name.trim().is_empty() {
        return Err("Name is required".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let utype = user_type.unwrap_or_else(|| "internal".to_string());

    let password_hash = if let Some(ref pwd) = password {
        if !pwd.is_empty() { Some(hash_password(pwd)?) } else { None }
    } else { None };

    conn.execute(
        "INSERT INTO users (id, name, phone, email, user_type, password_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, name, phone, email, utype, password_hash],
    ).map_err(|e| e.to_string())?;

    if let Some(ref role_name) = role {
        assign_user_role(&conn, &id, role_name)?;
    }

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "message": "User created successfully"
    }))
}

/// 获取用户列表
#[tauri::command]
pub fn get_users_cmd(
    db: tauri::State<Mutex<Database>>,
    search: Option<String>,
    user_type: Option<String>,
    role: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
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
    let mut pv: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref t) = user_type {
        sql.push_str(&format!(" AND u.user_type = ?{}", pv.len() + 1));
        pv.push(Box::new(t.clone()));
    }
    if let Some(ref s) = search {
        if !s.is_empty() {
            let idx = pv.len() + 1;
            sql.push_str(&format!(" AND (u.name LIKE ?{} OR u.phone LIKE ?{} OR u.email LIKE ?{})", idx, idx+1, idx+2));
            let pattern = format!("%{}%", s);
            pv.push(Box::new(pattern.clone()));
            pv.push(Box::new(pattern.clone()));
            pv.push(Box::new(pattern));
        }
    }
    if let Some(ref r) = role {
        sql.push_str(&format!(" AND r.name = ?{}", pv.len() + 1));
        pv.push(Box::new(r.clone()));
    }

    sql.push_str(" ORDER BY u.created_at DESC LIMIT 200");

    let refs: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|b| b.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(refs.as_slice(), |row| {
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
    }).map_err(|e| e.to_string())?;

    let users: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(serde_json::json!({ "data": users, "total": users.len() }))
}

/// 获取单个用户
#[tauri::command]
pub fn get_user_by_id_cmd(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.query_row(
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
    ).map_err(|e| e.to_string())
}

/// 更新用户
#[tauri::command]
pub fn update_user_cmd(
    db: tauri::State<Mutex<Database>>,
    id: String,
    name: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    is_active: Option<bool>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)", params![id],
        |row| row.get(0),
    ).unwrap_or(false);

    if !exists {
        return Err("User not found".to_string());
    }

    let mut sets = vec![];
    let mut pv: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    macro_rules! optional_field {
        ($field:expr, $col:expr) => {
            if let Some(ref v) = $field {
                sets.push(format!("{} = ?{}", $col, pv.len() + 1));
                pv.push(Box::new(v.clone()));
            }
        };
    }

    optional_field!(name, "name");
    optional_field!(phone, "phone");
    optional_field!(email, "email");
    if let Some(active) = is_active {
        sets.push(format!("is_active = ?{}", pv.len() + 1));
        pv.push(Box::new(active));
    }

    if sets.is_empty() {
        return Err("No fields to update".to_string());
    }

    sets.push("updated_at = CURRENT_TIMESTAMP".to_string());
    let idx = pv.len() + 1;
    pv.push(Box::new(id));
    let sql = format!("UPDATE users SET {} WHERE id = ?{}", sets.join(", "), idx);

    let refs: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, rusqlite::params_from_iter(refs)).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"message": "User updated successfully"}))
}

/// 删除用户
#[tauri::command]
pub fn delete_user_cmd(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let affected = conn.execute(
        "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    ).unwrap_or(0);

    if affected == 0 {
        return Err("User not found".to_string());
    }

    Ok(serde_json::json!({"message": "User deactivated successfully"}))
}

/// 分配用户角色
#[tauri::command]
pub fn assign_user_role_cmd(
    db: tauri::State<Mutex<Database>>,
    user_id: String,
    role_name: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    assign_user_role(db.connection(), &user_id, &role_name)?;
    Ok(serde_json::json!({"message": "Role assigned successfully"}))
}

/// 修改用户密码
#[tauri::command]
pub fn change_user_password_cmd(
    db: tauri::State<Mutex<Database>>,
    user_id: String,
    new_password: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let hash = hash_password(&new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![hash, user_id],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"message": "Password changed successfully"}))
}

/// 获取角色列表
#[tauri::command]
pub fn get_roles_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare("SELECT id, name, description, permissions FROM roles ORDER BY id")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i32>(0)?,
            "name": row.get::<_, String>(1)?,
            "description": row.get::<_, Option<String>>(2)?,
            "permissions": serde_json::from_str::<serde_json::Value>(
                &row.get::<_, Option<String>>(3).unwrap_or_default().unwrap_or("[]".to_string())
            ).unwrap_or(serde_json::json!([])),
        }))
    }).map_err(|e| e.to_string())?;

    let roles: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(serde_json::json!({ "data": roles }))
}

/// 获取当前用户信息
#[tauri::command]
pub fn get_current_user_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 默认返回 boss 用户（桌面端简化）
    let user = conn.query_row(
        "SELECT u.id, u.name, u.email, u.user_type, \
         COALESCE(r.name, '') as role_name, COALESCE(r.permissions, '[]') as permissions \
         FROM users u \
         LEFT JOIN user_roles ur ON u.id = ur.user_id \
         LEFT JOIN roles r ON ur.role_id = r.id \
         WHERE u.is_active = 1 AND u.user_type = 'internal' LIMIT 1",
        [],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "email": row.get::<_, Option<String>>(2)?,
                "user_type": row.get::<_, String>(3)?,
                "role": row.get::<_, String>(4)?,
                "permissions": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(5)?).unwrap_or(serde_json::json!([])),
            }))
        },
    ).ok();

    Ok(user.unwrap_or(serde_json::json!({"error": "No active user found"})))
}

/// 内部分配角色函数
fn assign_user_role(conn: &rusqlite::Connection, user_id: &str, role_name: &str) -> Result<(), String> {
    let role_id: i32 = conn.query_row(
        "SELECT id FROM roles WHERE name = ?1", params![role_name],
        |row| row.get(0),
    ).map_err(|_| format!("Role '{}' not found", role_name))?;

    let _ = conn.execute("DELETE FROM user_roles WHERE user_id = ?1", params![user_id]);
    conn.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)",
        params![user_id, role_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
