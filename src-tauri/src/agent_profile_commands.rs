use crate::database::Database;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

// ==================== 数据结构 ====================

/// Agent 个性化覆盖记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfileOverride {
    pub agent_id: String,
    pub display_name: Option<String>,
    pub avatar_key: Option<String>,
    pub custom_avatar_path: Option<String>,
    pub updated_at: String,
}

/// 上传自定义头像的输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadAvatarInput {
    pub agent_id: String,
    /// data URL（如 "data:image/png;base64,iVBORw0K..."），仅取 base64 部分
    pub data_url: String,
}

/// 上传头像的返回：相对路径（供 read_custom_avatar 使用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadAvatarResult {
    pub relative_path: String,
    pub size_bytes: u64,
}

// ==================== 内部辅助 ====================

/// 获取用户头像存储目录
fn avatar_dir() -> Result<PathBuf, String> {
    let proj_dirs = directories::ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取项目目录".to_string())?;
    let dir = proj_dirs.data_local_dir().join("avatars");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("创建头像目录失败: {}", e))?;
    }
    Ok(dir)
}

/// 解析 data URL 中的 mime + base64 数据
fn parse_data_url(data_url: &str) -> Result<(&str, Vec<u8>), String> {
    // 形如 "data:image/png;base64,iVBORw0K..."
    let prefix = "base64,";
    let idx = data_url
        .find(prefix)
        .ok_or_else(|| "data URL 格式错误，缺少 base64,".to_string())?;
    let meta = &data_url[5..idx]; // "image/png;...; "
    let mime = meta.split(';').next().unwrap_or("image/png");
    let b64 = &data_url[idx + prefix.len()..];
    let bytes = BASE64
        .decode(b64)
        .map_err(|e| format!("base64 解码失败: {}", e))?;
    Ok((mime, bytes))
}

fn mime_to_ext(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/svg+xml" => "svg",
        _ => "png",
    }
}

fn profile_from_row(row: &rusqlite::Row) -> rusqlite::Result<AgentProfileOverride> {
    Ok(AgentProfileOverride {
        agent_id: row.get("agent_id")?,
        display_name: row.get("display_name")?,
        avatar_key: row.get("avatar_key")?,
        custom_avatar_path: row.get("custom_avatar_path")?,
        updated_at: row.get("updated_at")?,
    })
}

// ==================== Tauri 命令 ====================

/// 查询单个 Agent 的个性化覆盖
#[tauri::command]
pub fn get_agent_profile_override(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<Option<AgentProfileOverride>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT agent_id, display_name, avatar_key, custom_avatar_path, updated_at
             FROM agent_profile_overrides WHERE agent_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(params![agent_id], profile_from_row)
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// 列出所有 Agent 个性化覆盖（供前端批量读取）
#[tauri::command]
pub fn list_agent_profile_overrides(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<AgentProfileOverride>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT agent_id, display_name, avatar_key, custom_avatar_path, updated_at
             FROM agent_profile_overrides ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], profile_from_row)
        .map_err(|e| e.to_string())?;

    let results: Vec<AgentProfileOverride> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 创建或更新 Agent 个性化覆盖
#[tauri::command]
pub fn upsert_agent_profile_override(
    db: tauri::State<Mutex<Database>>,
    profile: AgentProfileOverride,
) -> Result<AgentProfileOverride, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO agent_profile_overrides
         (agent_id, display_name, avatar_key, custom_avatar_path, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(agent_id) DO UPDATE SET
           display_name = excluded.display_name,
           avatar_key = excluded.avatar_key,
           custom_avatar_path = excluded.custom_avatar_path,
           updated_at = excluded.updated_at",
        params![
            profile.agent_id,
            profile.display_name,
            profile.avatar_key,
            profile.custom_avatar_path,
            now,
        ],
    )
    .map_err(|e| format!("upsert agent_profile_overrides 失败: {}", e))?;

    Ok(AgentProfileOverride {
        agent_id: profile.agent_id,
        display_name: profile.display_name,
        avatar_key: profile.avatar_key,
        custom_avatar_path: profile.custom_avatar_path,
        updated_at: now,
    })
}

/// 删除 Agent 个性化覆盖
#[tauri::command]
pub fn delete_agent_profile_override(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let deleted = conn
        .execute(
            "DELETE FROM agent_profile_overrides WHERE agent_id = ?1",
            params![agent_id],
        )
        .map_err(|e| e.to_string())?;
    Ok(deleted > 0)
}

/// 上传自定义头像（base64 → 文件）
#[tauri::command]
pub fn upload_custom_avatar(input: UploadAvatarInput) -> Result<UploadAvatarResult, String> {
    let (mime, bytes) = parse_data_url(&input.data_url)?;
    let ext = mime_to_ext(mime);

    // 文件名用 agent_id 避免冲突（自动覆盖）
    let safe_id: String = input
        .agent_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let file_name = format!("{}.{}", safe_id, ext);
    let dir = avatar_dir()?;
    let target = dir.join(&file_name);

    fs::write(&target, &bytes).map_err(|e| format!("写入头像文件失败: {}", e))?;

    let relative = format!("avatars/{}", file_name);
    Ok(UploadAvatarResult {
        relative_path: relative,
        size_bytes: bytes.len() as u64,
    })
}

/// 读取自定义头像并返回 data URL，供前端 <Avatar src={dataUrl}> 使用
#[tauri::command]
pub fn read_custom_avatar(relative_path: String) -> Result<String, String> {
    // 相对路径（相对 app_data_dir）
    let proj_dirs = directories::ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取项目目录".to_string())?;
    let path = proj_dirs
        .data_local_dir()
        .join(&relative_path);

    if !path.exists() {
        return Err(format!("头像文件不存在: {}", relative_path));
    }

    let bytes = fs::read(&path).map_err(|e| format!("读取头像文件失败: {}", e))?;
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };
    let b64 = BASE64.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}
