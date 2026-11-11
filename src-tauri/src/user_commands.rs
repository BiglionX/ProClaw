// 用户管理 Tauri 命令 (Phase 6)
// 提供桌面端用户 CRUD、角色分配、密码管理

use crate::api::auth::hash_password;
use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 创建用户 (Tauri command)
/// 审计修复 R6: 添加输入长度校验
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
    if name.len() > 128 {
        return Err("Name is too long (max 128 characters)".to_string());
    }
    if let Some(ref p) = phone {
        if p.len() > 20 {
            return Err("Phone number too long".to_string());
        }
    }
    if let Some(ref e) = email {
        if e.len() > 254 {
            return Err("Email too long".to_string());
        }
        if !e.contains('@') || !e.contains('.') {
            return Err("Invalid email format".to_string());
        }
    }

    let id = Uuid::new_v4().to_string();
    let utype = user_type.unwrap_or_else(|| "internal".to_string());

    let password_hash = if let Some(ref pwd) = password {
        if !pwd.is_empty() {
            Some(hash_password(pwd)?)
        } else {
            None
        }
    } else {
        None
    };

    conn.execute(
        "INSERT INTO users (id, name, phone, email, user_type, password_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, name, phone, email, utype, password_hash],
    ).map_err(|e| e.to_string())?;

    if let Some(ref role_name) = role {
        assign_user_role(conn, &id, role_name)?;
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
         WHERE 1=1",
    );
    let mut pv: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref t) = user_type {
        sql.push_str(&format!(" AND u.user_type = ?{}", pv.len() + 1));
        pv.push(Box::new(t.clone()));
    }
    if let Some(ref s) = search {
        if !s.is_empty() {
            let idx = pv.len() + 1;
            sql.push_str(&format!(
                " AND (u.name LIKE ?{} OR u.phone LIKE ?{} OR u.email LIKE ?{})",
                idx,
                idx + 1,
                idx + 2
            ));
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

    let total = {
        let refs: Vec<&dyn rusqlite::types::ToSql> = pv.iter().map(|b| b.as_ref()).collect();
        crate::database::count_unpaged(conn, &sql, refs.as_slice()).map_err(|e| e.to_string())?
    };

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
    Ok(serde_json::json!({ "data": users, "total": total }))
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

    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1)",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

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
    conn.execute(&sql, rusqlite::params_from_iter(refs))
        .map_err(|e| e.to_string())?;

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

    let affected = conn
        .execute(
            "UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![id],
        )
        .unwrap_or(0);

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

/// 修改当前账号密码。必须提供旧密码；本地命令没有独立的 JWT，调用方只能改自己知道旧密码的那个账号。
/// HTTP `PUT /api/users/:id/password` 另外要求路径 id 等于 JWT sub。
#[tauri::command]
pub fn change_user_password_cmd(
    db: tauri::State<Mutex<Database>>,
    user_id: String,
    old_password: String,
    new_password: String,
) -> Result<serde_json::Value, String> {
    let old_password = old_password.trim().to_string();
    if old_password.is_empty() {
        return Err("必须提供旧密码".to_string());
    }
    if new_password.len() < 6 {
        return Err("新密码至少 6 位".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let current_hash: Option<String> = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|_| "User not found".to_string())?;

    if !crate::api::auth::verify_password(&old_password, current_hash.as_deref()) {
        return Err("旧密码不正确".to_string());
    }

    let hash = hash_password(&new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![hash, user_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"message": "Password changed successfully"}))
}

/// 获取角色列表
#[tauri::command]
pub fn get_roles_cmd(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare("SELECT id, name, description, permissions FROM roles ORDER BY id")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i32>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, Option<String>>(2)?,
                "permissions": serde_json::from_str::<serde_json::Value>(
                    &row.get::<_, Option<String>>(3).unwrap_or_default().unwrap_or("[]".to_string())
                ).unwrap_or(serde_json::json!([])),
            }))
        })
        .map_err(|e| e.to_string())?;

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

/// 为桌面端 UI 签发 WebSocket / LiveKit 用的 JWT（本地 Tauri 进程可信）
#[tauri::command]
pub fn get_ws_session_cmd(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let user_id: String = conn
        .query_row(
            "SELECT u.id FROM users u WHERE u.is_active = 1 AND u.user_type = 'internal' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "No active internal user found".to_string())?;

    let (role, permissions) = crate::api::auth::get_user_role_and_permissions(&conn, &user_id);

    let secret = crate::api::JWT_SECRET
        .get()
        .ok_or_else(|| "JWT_SECRET not initialized".to_string())?;

    let access_token = crate::api::auth::generate_token(
        &user_id,
        "desktop",
        &role,
        &permissions,
        secret,
        3600,
        crate::api::auth::TOKEN_TYPE_ACCESS,
    )
    .map_err(|e| format!("Failed to generate token: {}", e))?;

    Ok(serde_json::json!({
        "user_id": user_id,
        "access_token": access_token,
    }))
}

/// 内部分配角色函数
fn assign_user_role(
    conn: &rusqlite::Connection,
    user_id: &str,
    role_name: &str,
) -> Result<(), String> {
    let role_id: i32 = conn
        .query_row(
            "SELECT id FROM roles WHERE name = ?1",
            params![role_name],
            |row| row.get(0),
        )
        .map_err(|_| format!("Role '{}' not found", role_name))?;

    if let Err(e) = conn.execute(
        "DELETE FROM user_roles WHERE user_id = ?1",
        params![user_id],
    ) {
        eprintln!(
            "[UserRoles] Failed to clear existing roles for {}: {}",
            user_id, e
        );
    }
    conn.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)",
        params![user_id, role_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// =========================================================================
// v13.1.1: 本地账号无登录模式命令
// =========================================================================

/// 确保某个角色存在；不存在则创建。返回 role_id。
/// 使用 INSERT OR IGNORE + 重新 SELECT，避免 TOCTOU 竞态产生重复角色
fn ensure_role(
    conn: &rusqlite::Connection,
    name: &str,
    description: &str,
    permissions: &str,
) -> Result<i32, String> {
    conn.execute(
        "INSERT OR IGNORE INTO roles (name, description, permissions) VALUES (?1, ?2, ?3)",
        params![name, description, permissions],
    )
    .map_err(|e| format!("Failed to create role {}: {}", name, e))?;
    conn.query_row(
        "SELECT id FROM roles WHERE name = ?1",
        params![name],
        |row| row.get::<_, i32>(0),
    )
    .map_err(|e| format!("Failed to read role {}: {}", name, e))
}

/// 注册本地账号（v13.1.1 本地账号无登录模式，原子化）
/// - 写入 SQLite users 表（argon2 哈希）+ user_roles 关联
/// - 首个本地用户自动获 boss 角色，后续用户获 user 角色
/// - 同时写入 OS keyring；若 keyring 失败，回滚 SQLite 插入，保证不产生账号僵尸
#[tauri::command]
pub fn register_local_cmd(
    db: tauri::State<Mutex<Database>>,
    email: String,
    password: String,
    display_name: Option<String>,
) -> Result<serde_json::Value, String> {
    // 输入校验
    let email_trim = email.trim().to_lowercase();
    if email_trim.is_empty() || !email_trim.contains('@') || !email_trim.contains('.') {
        return Err("请输入有效的邮箱地址".to_string());
    }
    if email_trim.len() > 254 {
        return Err("邮箱过长（最多 254 字符）".to_string());
    }
    if password.len() < 6 {
        return Err("密码长度至少为 6 位".to_string());
    }
    if password.len() > 128 {
        return Err("密码过长（最多 128 字符）".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 邮箱唯一性检查（提前抓出大多数重复请求；并发场景由 UNIQUE INDEX 兑底）
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ?1 AND deleted_at IS NULL)",
            params![email_trim],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if exists {
        return Err("该邮箱已被注册".to_string());
    }

    // 判断是否首个本地用户
    let user_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE is_active = 1 AND user_type = 'internal' AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let id = Uuid::new_v4().to_string();
    let name = display_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| email_trim.clone());

    let password_hash = hash_password(&password)?;

    // Step 1: 写 SQLite（users + 角色）
    let role_name = if user_count == 0 {
        ensure_role(conn, "boss", "老板", "[\"*\"]")?;
        "boss".to_string()
    } else {
        ensure_role(conn, "user", "本地用户", "[\"*\"]")?;
        "user".to_string()
    };

    if let Err(e) = conn.execute(
        "INSERT INTO users (id, name, email, user_type, password_hash, is_active) VALUES (?1, ?2, ?3, 'internal', ?4, 1)",
        params![id, name, email_trim, password_hash],
    ) {
        // 捕获并发场景下的 UNIQUE 冲突（idx_users_email_unique），返回友好错误
        let msg = e.to_string();
        if msg.contains("UNIQUE constraint failed") && msg.contains("email") {
            return Err("该邮箱已被注册".to_string());
        }
        return Err(format!("Failed to create user: {}", msg));
    }

    if let Err(e) = assign_user_role(conn, &id, &role_name) {
        // 角色分配失败，回滚 users 插入
        let _ = conn.execute("DELETE FROM users WHERE id = ?1", params![id]);
        return Err(format!("Failed to assign role: {}", e));
    }

    // Step 2: 写 OS keyring（失败时回滚 SQLite，避免账号僵尸化）
    if let Err(e) = crate::password_storage_commands::set_keyring_password_internal(&id, &password)
    {
        eprintln!(
            "[Auth] Keyring save failed for new user {}, rolling back SQLite: {}",
            id, e
        );
        let _ = conn.execute("DELETE FROM user_roles WHERE user_id = ?1", params![id]);
        let _ = conn.execute("DELETE FROM users WHERE id = ?1", params![id]);
        return Err(format!("无法写入密码到系统凭据存储: {}", e));
    }

    Ok(serde_json::json!({
        "id": id,
        "email": email_trim,
        "name": name,
        "role": role_name,
        "is_first_user": user_count == 0,
    }))
}

/// 列出所有本地账号（侧边栏切账号用）
/// 仅返回非删除、非外部的内部用户基本信息
/// 使用 GROUP BY + GROUP_CONCAT 聚合多角色，避免 LEFT JOIN user_roles 产生重复行
#[tauri::command]
pub fn list_local_users_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT u.id, u.name, u.email, \
             GROUP_CONCAT(COALESCE(r.name, ''), '|') as roles_csv, \
             u.last_login_at \
             FROM users u \
             LEFT JOIN user_roles ur ON u.id = ur.user_id \
             LEFT JOIN roles r ON ur.role_id = r.id \
             WHERE u.is_active = 1 AND u.user_type = 'internal' AND u.deleted_at IS NULL \
             GROUP BY u.id \
             ORDER BY (u.last_login_at IS NULL) ASC, u.last_login_at DESC, u.created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            // 解析 GROUP_CONCAT 后的多角色字符串，取首个非空作为主角色
            let roles_csv: Option<String> = row.get(3)?;
            let primary_role = roles_csv
                .as_deref()
                .and_then(|s| s.split('|').find(|p| !p.is_empty()))
                .unwrap_or("")
                .to_string();
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "email": row.get::<_, Option<String>>(2)?,
                "role": primary_role,
                "last_login_at": row.get::<_, Option<String>>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let users: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(serde_json::json!({ "data": users }))
}

/// 切换本地账号（v13.1.1 无密码切换）
/// 验证目标账号存在且 is_active，更新 last_login_at，返回完整账号信息
#[tauri::command]
pub fn switch_local_account_cmd(
    db: tauri::State<Mutex<Database>>,
    account_id: String,
) -> Result<serde_json::Value, String> {
    if account_id.is_empty() {
        return Err("account_id is required".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 验证账号存在且启用
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?1 AND is_active = 1 AND deleted_at IS NULL)",
            params![account_id],
            |row| row.get(0),
        )
        .unwrap_or(false);
    if !exists {
        return Err("账号不存在或已停用".to_string());
    }

    // 更新最后登录时间
    conn.execute(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![account_id],
    )
    .map_err(|e| e.to_string())?;

    // 返回完整账号信息（含角色）
    // 使用 GROUP BY 聚合多角色，避免 query_row 返回多行报错
    let user = conn
        .query_row(
            "SELECT u.id, u.name, u.email, u.user_type, \
             GROUP_CONCAT(COALESCE(r.name, ''), '|') as roles_csv, \
             GROUP_CONCAT(COALESCE(r.permissions, ''), '||') as perms_csv \
             FROM users u \
             LEFT JOIN user_roles ur ON u.id = ur.user_id \
             LEFT JOIN roles r ON ur.role_id = r.id \
             WHERE u.id = ?1 \
             GROUP BY u.id",
            params![account_id],
            |row| {
                // 解析角色名（主角色取首个非空）
                let roles_csv: String = row.get(4)?;
                let primary_role = roles_csv
                    .split('|')
                    .find(|p| !p.is_empty())
                    .unwrap_or("")
                    .to_string();

                // 聚合权限：收集所有角色的 permissions（JSON 数组），合并去重
                let perms_csv: String = row.get(5)?;
                let mut all_perms: Vec<String> = Vec::new();
                for chunk in perms_csv.split("||") {
                    if chunk.is_empty() {
                        continue;
                    }
                    if let Ok(arr) = serde_json::from_str::<Vec<String>>(chunk) {
                        for p in arr {
                            if !all_perms.contains(&p) {
                                all_perms.push(p);
                            }
                        }
                    }
                }
                // 主角色追加通配符（与 get_user_role_and_permissions 逻辑一致）
                if primary_role == "boss" && !all_perms.contains(&"*".to_string()) {
                    all_perms.push("*".to_string());
                }

                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "name": row.get::<_, String>(1)?,
                    "email": row.get::<_, Option<String>>(2)?,
                    "user_type": row.get::<_, String>(3)?,
                    "role": primary_role,
                    "permissions": all_perms,
                }))
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(user)
}
