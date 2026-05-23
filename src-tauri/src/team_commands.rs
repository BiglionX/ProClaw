use crate::database::Database;
use crate::types::{ImportedTeam, ImportTeamPayload};
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
            // 简单格式化: YYYY-MM-DDTHH:MM:SS
            let days = secs / 86400;
            let time = secs % 86400;
            let hours = time / 3600;
            let minutes = (time % 3600) / 60;
            let seconds = time % 60;

            // 从 Unix epoch 计算年/月/日 (简化但实用)
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

/// 导入 AI 团队配置
#[tauri::command]
pub fn import_team(
    db: State<'_, Mutex<Database>>,
    team_json: String,
) -> Result<ImportedTeam, String> {
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

    let created_at = now_iso();

    let conn = db
        .lock()
        .map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    conn.execute(
        "INSERT INTO teams (id, name, description, category, config_json, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![id, name, description, category, team_json, source, created_at],
    )
    .map_err(|e| format!("存储失败: {}", e))?;

    Ok(ImportedTeam {
        id: id.clone(),
        name,
        description,
        category,
        config_json: team_json,
        source,
        created_at,
    })
}

/// 获取所有已导入的 AI 团队
#[tauri::command]
pub fn get_teams(db: State<'_, Mutex<Database>>) -> Result<Vec<ImportedTeam>, String> {
    let conn = db
        .lock()
        .map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    let mut stmt = conn
        .prepare("SELECT id, name, description, category, config_json, source, created_at FROM teams ORDER BY created_at DESC")
        .map_err(|e| format!("查询失败: {}", e))?;

    let teams = stmt
        .query_map([], |row| {
            Ok(ImportedTeam {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                config_json: row.get(4)?,
                source: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("读取数据失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("数据转换失败: {}", e))?;

    Ok(teams)
}

/// 删除已导入的 AI 团队
#[tauri::command]
pub fn delete_team(db: State<'_, Mutex<Database>>, id: String) -> Result<(), String> {
    let conn = db
        .lock()
        .map_err(|e| format!("数据库锁定失败: {}", e))?;
    let conn = conn.connection();

    conn.execute("DELETE FROM teams WHERE id = ?1", params![id])
        .map_err(|e| format!("删除失败: {}", e))?;

    Ok(())
}
