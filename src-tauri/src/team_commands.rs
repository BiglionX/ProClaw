use crate::database::Database;
use crate::types::{AiTeam, CreateTeamPayload, ImportTeamPayload, TeamMember, UpdateTeamPayload};
use rusqlite::params;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

/// 获取当前时间戳 (ISO 8601)
fn now_iso() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| {
            let secs = d.as_secs();
            let days = secs / 86400;
            let time = secs % 86400;
            let hours = time / 3600;
            let minutes = (time % 3600) / 60;
            let seconds = time % 60;

            let mut y = 1970i64;
            let mut remaining = days as i64;
            loop {
                let year_days = if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 {
                    366
                } else {
                    365
                };
                if remaining < year_days {
                    break;
                }
                remaining -= year_days;
                y += 1;
            }
            let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
            let month_days = if leap {
                [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            } else {
                [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            };
            let mut m = 1usize;
            for (i, &md) in month_days.iter().enumerate() {
                if remaining < md as i64 {
                    m = i + 1;
                    break;
                }
                remaining -= md as i64;
            }
            format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
                y, m, remaining + 1, hours, minutes, seconds
            )
        })
        .unwrap_or_else(|_| "2026-01-01T00:00:00".to_string())
}

/// 从数据库行映射为 AiTeam
fn map_row_to_aiteam(row: &rusqlite::Row) -> rusqlite::Result<AiTeam> {
    let tags_str: String = row.get::<_, String>("tags").unwrap_or_else(|_| "[]".into());
    let tags: Vec<String> = serde_json::from_str(&tags_str)
        .unwrap_or_else(|e| {
            eprintln!("[Team] Failed to parse tags JSON: {}", e);
            vec![]
        });

    let members_str: String = row
        .get::<_, String>("members_json")
        .unwrap_or_else(|_| "[]".into());
    let members: Vec<TeamMember> = serde_json::from_str(&members_str)
        .unwrap_or_else(|e| {
            eprintln!("[Team] Failed to parse members JSON: {}", e);
            vec![]
        });

    let workflow_str: String = row
        .get::<_, String>("workflow_json")
        .unwrap_or_else(|_| "{}".into());
    let workflow: serde_json::Value =
        serde_json::from_str(&workflow_str).unwrap_or(serde_json::Value::Object(
            serde_json::Map::new(),
        ));

    let triggers_str: String = row
        .get::<_, String>("triggers_json")
        .unwrap_or_else(|_| "{}".into());
    let triggers: serde_json::Value =
        serde_json::from_str(&triggers_str).unwrap_or(serde_json::Value::Object(
            serde_json::Map::new(),
        ));

    Ok(AiTeam {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        category: row.get("category")?,
        config_json: row.get("config_json")?,
        source: row.get("source")?,
        version: row.get("version")?,
        publish_status: row.get("publish_status")?,
        tags,
        members,
        workflow,
        triggers,
        thumbnail_url: row.get("thumbnail_url")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

// ============================================================
// 创建 AiTeam
// ============================================================
#[tauri::command]
pub fn create_team(
    db: State<'_, Mutex<Database>>,
    payload: CreateTeamPayload,
) -> Result<AiTeam, String> {
    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    let tags_json = serde_json::to_string(&payload.tags).unwrap_or_else(|_| "[]".into());
    let members_json =
        serde_json::to_string(&payload.members).unwrap_or_else(|_| "[]".into());
    let workflow_json = serde_json::to_string(
        &payload
            .workflow
            .unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
    )
    .unwrap_or_else(|_| "{}".into());
    let triggers_json = serde_json::to_string(
        &payload
            .triggers
            .unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
    )
    .unwrap_or_else(|_| "{}".into());

    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    conn.execute(
        "INSERT INTO teams (id, name, description, category, config_json, source, version, publish_status, tags, members_json, workflow_json, triggers_json, thumbnail_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)",
        params![
            id,
            payload.name,
            payload.description,
            payload.category,
            "{}", // config_json = 原始导入数据，创建时为空
            "local",
            "1.0.0",
            "private",
            tags_json,
            members_json,
            workflow_json,
            triggers_json,
            payload.category.as_deref(), // thumbnail_url 暂用空或 category 占位
            now,
        ],
    )
    .map_err(|e| format!("创建团队失败: {}", e))?;

    // 查询并返回完整对象
    let mut stmt = conn
        .prepare("SELECT * FROM teams WHERE id = ?1")
        .map_err(|e| format!("查询失败: {}", e))?;
    let team = stmt
        .query_row(params![id], |row| map_row_to_aiteam(row))
        .map_err(|e| format!("读取数据失败: {}", e))?;

    Ok(team)
}

// ============================================================
// 获取所有 AiTeam
// ============================================================
#[tauri::command]
pub fn get_teams(db: State<'_, Mutex<Database>>) -> Result<Vec<AiTeam>, String> {
    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    let mut stmt = conn
        .prepare("SELECT * FROM teams ORDER BY created_at DESC")
        .map_err(|e| format!("查询失败: {}", e))?;

    let teams = stmt
        .query_map([], |row| map_row_to_aiteam(row))
        .map_err(|e| format!("读取数据失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("数据转换失败: {}", e))?;

    Ok(teams)
}

// ============================================================
// 获取单个 AiTeam
// ============================================================
#[tauri::command]
pub fn get_team_by_id(
    db: State<'_, Mutex<Database>>,
    id: String,
) -> Result<AiTeam, String> {
    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    let mut stmt = conn
        .prepare("SELECT * FROM teams WHERE id = ?1")
        .map_err(|e| format!("查询失败: {}", e))?;

    let team = stmt
        .query_row(params![id], |row| map_row_to_aiteam(row))
        .map_err(|e| format!("团队不存在: {}", e))?;

    Ok(team)
}

// ============================================================
// 更新 AiTeam
// ============================================================
#[tauri::command]
pub fn update_team(
    db: State<'_, Mutex<Database>>,
    id: String,
    payload: UpdateTeamPayload,
) -> Result<AiTeam, String> {
    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    // 检查是否存在
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM teams WHERE id = ?1",
            params![id],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .map_err(|e| format!("查询失败: {}", e))?;

    if !exists {
        return Err("团队不存在".into());
    }

    let now = now_iso();

    // 逐个更新字段，使用独立 UPDATE
    if let Some(name) = &payload.name {
        conn.execute(
            "UPDATE teams SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )
        .map_err(|e| format!("更新名称失败: {}", e))?;
    }
    if let Some(desc) = &payload.description {
        conn.execute(
            "UPDATE teams SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![desc, now, id],
        )
        .map_err(|e| format!("更新描述失败: {}", e))?;
    }
    if let Some(cat) = &payload.category {
        conn.execute(
            "UPDATE teams SET category = ?1, updated_at = ?2 WHERE id = ?3",
            params![cat, now, id],
        )
        .map_err(|e| format!("更新分类失败: {}", e))?;
    }
    if let Some(tags) = &payload.tags {
        let tags_json = serde_json::to_string(tags).unwrap_or_else(|_| "[]".into());
        conn.execute(
            "UPDATE teams SET tags = ?1, updated_at = ?2 WHERE id = ?3",
            params![tags_json, now, id],
        )
        .map_err(|e| format!("更新标签失败: {}", e))?;
    }
    if let Some(members) = &payload.members {
        let members_json = serde_json::to_string(members).unwrap_or_else(|_| "[]".into());
        conn.execute(
            "UPDATE teams SET members_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![members_json, now, id],
        )
        .map_err(|e| format!("更新成员失败: {}", e))?;
    }
    if let Some(wf) = &payload.workflow {
        let wf_json = serde_json::to_string(wf).unwrap_or_else(|_| "{}".into());
        conn.execute(
            "UPDATE teams SET workflow_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![wf_json, now, id],
        )
        .map_err(|e| format!("更新工作流失败: {}", e))?;
    }
    if let Some(tr) = &payload.triggers {
        let tr_json = serde_json::to_string(tr).unwrap_or_else(|_| "{}".into());
        conn.execute(
            "UPDATE teams SET triggers_json = ?1, updated_at = ?2 WHERE id = ?3",
            params![tr_json, now, id],
        )
        .map_err(|e| format!("更新触发器失败: {}", e))?;
    }
    if let Some(ver) = &payload.version {
        conn.execute(
            "UPDATE teams SET version = ?1, updated_at = ?2 WHERE id = ?3",
            params![ver, now, id],
        )
        .map_err(|e| format!("更新版本失败: {}", e))?;
    }
    if let Some(status) = &payload.publish_status {
        conn.execute(
            "UPDATE teams SET publish_status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )
        .map_err(|e| format!("更新状态失败: {}", e))?;
    }
    if let Some(thumb) = &payload.thumbnail_url {
        conn.execute(
            "UPDATE teams SET thumbnail_url = ?1, updated_at = ?2 WHERE id = ?3",
            params![thumb, now, id],
        )
        .map_err(|e| format!("更新缩略图失败: {}", e))?;
    }

    // 返回更新后的对象
    let mut stmt = conn
        .prepare("SELECT * FROM teams WHERE id = ?1")
        .map_err(|e| format!("查询失败: {}", e))?;
    let team = stmt
        .query_row(params![id], |row| map_row_to_aiteam(row))
        .map_err(|e| format!("读取数据失败: {}", e))?;

    Ok(team)
}

// ============================================================
// 删除 AiTeam
// ============================================================
#[tauri::command]
pub fn delete_team(db: State<'_, Mutex<Database>>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    let affected = conn
        .execute("DELETE FROM teams WHERE id = ?1", params![id])
        .map_err(|e| format!("删除失败: {}", e))?;

    if affected == 0 {
        return Err("团队不存在".into());
    }

    Ok(())
}

// ============================================================
// 导入 AiTeam (从 JSON 文件)
// ============================================================
#[tauri::command]
pub fn import_team(
    db: State<'_, Mutex<Database>>,
    team_json: String,
) -> Result<AiTeam, String> {
    let payload: ImportTeamPayload =
        serde_json::from_str(&team_json).map_err(|e| format!("JSON解析失败: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let name = payload.team_name;
    let description = payload
        .team_config
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let category = payload
        .team_config
        .get("category")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let source = payload
        .metadata
        .as_ref()
        .and_then(|m| m.get("source"))
        .and_then(|v| v.as_str())
        .unwrap_or("nvwax-marketplace")
        .to_string();

    // 从 team_config 提取 members/tags/workflow
    let members: Vec<TeamMember> = payload
        .team_config
        .get("members")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let tags: Vec<String> = payload
        .team_config
        .get("tags")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let workflow = payload
        .team_config
        .get("workflow")
        .cloned()
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    let triggers = payload
        .team_config
        .get("triggers")
        .cloned()
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    let version = payload
        .team_config
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0.0")
        .to_string();

    let now = now_iso();
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".into());
    let members_json = serde_json::to_string(&members).unwrap_or_else(|_| "[]".into());
    let workflow_json = serde_json::to_string(&workflow).unwrap_or_else(|_| "{}".into());
    let triggers_json = serde_json::to_string(&triggers).unwrap_or_else(|_| "{}".into());

    let conn = db.lock().map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    conn.execute(
        "INSERT INTO teams (id, name, description, category, config_json, source, version, publish_status, tags, members_json, workflow_json, triggers_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
        params![
            id,
            name,
            description,
            category,
            team_json, // config_json 保存原始导入数据
            source,
            version,
            "private",
            tags_json,
            members_json,
            workflow_json,
            triggers_json,
            now,
        ],
    )
    .map_err(|e| format!("存储失败: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM teams WHERE id = ?1")
        .map_err(|e| format!("查询失败: {}", e))?;

    let team = stmt
        .query_row(params![id], |row| map_row_to_aiteam(row))
        .map_err(|e| format!("读取数据失败: {}", e))?;

    Ok(team)
}
