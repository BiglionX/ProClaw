use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 获取所有联系人（合并 users + customers + suppliers）
#[tauri::command]
pub fn get_contacts(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let search = options
        .as_ref()
        .and_then(|o| o.get("search"))
        .and_then(|s| s.as_str())
        .unwrap_or("");

    let search_pattern = format!("%{}%", search);

    let mut results = Vec::new();

    // 1. 获取外部用户（客户/供应商）
    let mut sql = String::from(
        "SELECT id, name, phone, email, user_type, external_type, is_active, created_at, updated_at
         FROM users
         WHERE deleted_at IS NULL
         AND user_type = 'external'",
    );
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if !search.is_empty() {
        sql.push_str(" AND (name LIKE ?1 OR phone LIKE ?1 OR email LIKE ?1)");
        params_vec.push(Box::new(search_pattern.clone()));
    }
    sql.push_str(" ORDER BY name ASC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(
        rusqlite::params_from_iter(params_vec.iter().map(|p| p.as_ref())),
        |row| {
            let _user_type: String = row.get(2)?;
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "phone": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "contact_type": row.get::<_, String>(4)?, // user_type as contact_type
                "external_type": row.get::<_, Option<String>>(5)?,
                "is_active": row.get::<_, bool>(6)?,
                "created_at": row.get::<_, String>(7)?,
                "updated_at": row.get::<_, String>(8)?,
            }))
        },
    ).map_err(|e| e.to_string())?;

    for row in rows {
        if let Ok(val) = row {
            results.push(val);
        }
    }

    // 2. 获取内部用户（团队成员）
    let mut sql2 = String::from(
        "SELECT id, name, phone, email, user_type, external_type, is_active, created_at, updated_at
         FROM users
         WHERE deleted_at IS NULL
         AND (user_type = 'internal' OR user_type IS NULL)",
    );

    if !search.is_empty() {
        sql2.push_str(" AND (name LIKE ?1 OR phone LIKE ?1 OR email LIKE ?1)");
    }
    sql2.push_str(" ORDER BY name ASC");

    let mut stmt2 = conn.prepare(&sql2).map_err(|e| e.to_string())?;
    let params_iter2: Vec<Box<dyn rusqlite::types::ToSql>> = if !search.is_empty() {
        vec![Box::new(search_pattern)]
    } else {
        vec![]
    };

    let rows2 = stmt2.query_map(
        rusqlite::params_from_iter(params_iter2.iter().map(|p| p.as_ref())),
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "phone": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "contact_type": "team",
                "external_type": row.get::<_, Option<String>>(5)?,
                "is_active": row.get::<_, bool>(6)?,
                "created_at": row.get::<_, String>(7)?,
                "updated_at": row.get::<_, String>(8)?,
            }))
        },
    ).map_err(|e| e.to_string())?;

    for row in rows2 {
        if let Ok(val) = row {
            results.push(val);
        }
    }

    Ok(serde_json::json!({ "data": results }))
}

/// 获取消息列表（两个用户之间的对话）
#[tauri::command]
pub fn get_messages(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let from_user = params
        .get("from_user")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let to_user = params
        .get("to_user")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let limit = params
        .get("limit")
        .and_then(|v| v.as_i64())
        .unwrap_or(50);

    let sql = "SELECT id, from_user, to_user, content, content_type, is_read, created_at
               FROM messages
               WHERE ((from_user = ?1 AND to_user = ?2) OR (from_user = ?2 AND to_user = ?1))
               AND deleted_at IS NULL
               ORDER BY created_at DESC
               LIMIT ?3";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![from_user, to_user, limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "from_user": row.get::<_, String>(1)?,
                "to_user": row.get::<_, String>(2)?,
                "content": row.get::<_, String>(3)?,
                "content_type": row.get::<_, String>(4)?,
                "is_read": row.get::<_, bool>(5)?,
                "created_at": row.get::<_, i64>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let results: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    // 返回时反转顺序，让最老的在前面
    let results: Vec<serde_json::Value> = results.into_iter().rev().collect();

    Ok(serde_json::json!({ "data": results }))
}

/// 发送消息
#[tauri::command]
pub fn send_message(
    db: tauri::State<Mutex<Database>>,
    message: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let from_user = message
        .get("from_user")
        .and_then(|v| v.as_str())
        .ok_or("缺少发送者")?;
    let to_user = message
        .get("to_user")
        .and_then(|v| v.as_str())
        .ok_or("缺少接收者")?;
    let content = message
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or("缺少消息内容")?;
    let content_type = message
        .get("content_type")
        .and_then(|v| v.as_str())
        .unwrap_or("text");
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO messages (id, from_user, to_user, content, content_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, from_user, to_user, content, content_type, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "from_user": from_user,
        "to_user": to_user,
        "content": content,
        "content_type": content_type,
        "is_read": false,
        "created_at": now,
    }))
}

/// 标记消息已读
#[tauri::command]
pub fn mark_message_read(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let message_id = params
        .get("message_id")
        .and_then(|v| v.as_str())
        .ok_or("缺少消息ID")?;

    conn.execute(
        "UPDATE messages SET is_read = 1 WHERE id = ?1",
        params![message_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

/// 标记两个用户之间的所有消息为已读
#[tauri::command]
pub fn mark_conversation_read(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let from_user = params
        .get("from_user")
        .and_then(|v| v.as_str())
        .ok_or("缺少发送者")?;
    let to_user = params
        .get("to_user")
        .and_then(|v| v.as_str())
        .ok_or("缺少接收者")?;

    conn.execute(
        "UPDATE messages SET is_read = 1 WHERE from_user = ?1 AND to_user = ?2 AND is_read = 0",
        params![from_user, to_user],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

/// 获取最近联系人（带最后一条消息预览）
#[tauri::command]
pub fn get_recent_contacts(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let user_id = params
        .get("user_id")
        .and_then(|v| v.as_str())
        .ok_or("缺少用户ID")?;

    // 查询与当前用户有消息往来的所有联系人，并附上最后一条消息和未读数
    let sql = "
        SELECT 
            u.id, u.name, u.phone, u.email, u.user_type, u.external_type,
            last_msg.content as last_message,
            last_msg.created_at as last_message_time,
            last_msg.is_read as last_is_read,
            last_msg.from_user as last_from,
            (SELECT COUNT(*) FROM messages m2 WHERE m2.from_user = u.id AND m2.to_user = ?1 AND m2.is_read = 0) as unread_count
        FROM users u
        LEFT JOIN (
            SELECT m.* FROM messages m
            WHERE m.id IN (
                SELECT MAX(id) FROM messages
                WHERE (from_user = ?1 OR to_user = ?1)
                AND deleted_at IS NULL
                GROUP BY CASE WHEN from_user = ?1 THEN to_user ELSE from_user END
            )
        ) last_msg ON (last_msg.from_user = u.id OR last_msg.to_user = u.id) AND u.id != ?1
        WHERE u.id != ?1 AND u.deleted_at IS NULL AND last_msg.id IS NOT NULL
        ORDER BY last_msg.created_at DESC
        LIMIT 50
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![user_id, user_id, user_id, user_id, user_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "phone": row.get::<_, Option<String>>(2)?,
                "email": row.get::<_, Option<String>>(3)?,
                "contact_type": row.get::<_, String>(4)?,
                "external_type": row.get::<_, Option<String>>(5)?,
                "last_message": row.get::<_, Option<String>>(6)?,
                "last_message_time": row.get::<_, Option<i64>>(7)?,
                "last_is_read": row.get::<_, Option<bool>>(8)?,
                "last_from": row.get::<_, Option<String>>(9)?,
                "unread_count": row.get::<_, i64>(10)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let results: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(serde_json::json!({ "data": results }))
}

/// 添加外部联系人
#[tauri::command]
pub fn add_contact(
    db: tauri::State<Mutex<Database>>,
    contact: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = contact.get("name").and_then(|v| v.as_str()).ok_or("缺少姓名")?;
    let phone = contact.get("phone").and_then(|v| v.as_str()).map(|s| s.to_string());
    let email = contact.get("email").and_then(|v| v.as_str()).map(|s| s.to_string());
    let external_type = contact.get("external_type").and_then(|v| v.as_str()).unwrap_or("customer");
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO users (id, name, phone, email, user_type, external_type, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'external', ?5, 1, ?6, ?6)",
        params![id, name, phone, email, external_type, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "phone": phone,
        "email": email,
        "contact_type": "external",
        "external_type": external_type,
        "is_active": true,
        "created_at": now,
    }))
}

/// 获取未读消息总数
#[tauri::command]
pub fn get_unread_count(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let user_id = params
        .get("user_id")
        .and_then(|v| v.as_str())
        .ok_or("缺少用户ID")?;

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM messages WHERE to_user = ?1 AND is_read = 0 AND deleted_at IS NULL",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "count": count }))
}
