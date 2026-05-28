use crate::database::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

/// 市场 Agent 简要信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketAgentBrief {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: String,
    pub icon_url: Option<String>,
    pub permissions: Vec<String>,
    pub price: i64,
    pub category: String,
    pub downloads: i64,
    pub rating: f64,
}

/// 市场 Agent 详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketAgentDetail {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: String,
    pub icon_url: Option<String>,
    pub permissions: Vec<String>,
    pub price: i64,
    pub category_id: Option<String>,
    pub category_name: String,
    pub downloads: i64,
    pub rating: f64,
    pub screenshots: Vec<String>,
    pub signature: Option<String>,
    pub checksum: Option<String>,
    pub manifest_json: Option<String>,
    pub homepage: Option<String>,
    pub file_size: i64,
    pub status: String,
}

/// 市场分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCategory {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
}

/// 获取市场 Agent 列表（分页）
#[tauri::command]
pub fn get_market_agents(
    db: tauri::State<Mutex<Database>>,
    category: Option<String>,
    search: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut conditions = vec!["ma.status = 'published'".to_string()];
    let mut query_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref cat) = category {
        if !cat.is_empty() {
            let idx = query_params.len() + 1;
            conditions.push(format!("mc.name = ?{}", idx));
            query_params.push(Box::new(cat.clone()));
        }
    }

    if let Some(ref s) = search {
        if !s.is_empty() {
            let idx = query_params.len() + 1;
            conditions.push(format!("(ma.name LIKE ?{} OR ma.description LIKE ?{})", idx, idx));
            query_params.push(Box::new(format!("%{}%", s)));
        }
    }

    let where_sql = conditions.join(" AND ");

    // 查询总数
    let count_sql = format!(
        "SELECT COUNT(*) FROM market_agents ma
         LEFT JOIN market_categories mc ON ma.category_id = mc.id
         WHERE {}",
        where_sql
    );
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = query_params.iter().map(|p| p.as_ref()).collect();
    let total: i64 = conn
        .query_row(&count_sql, count_refs.as_slice(), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // 查询数据
    let data_sql = format!(
        "SELECT ma.id, ma.name, ma.version, ma.description, ma.author,
                ma.icon_url, ma.permissions_json, ma.price, mc.name as category_name,
                ma.downloads, ma.rating
         FROM market_agents ma
         LEFT JOIN market_categories mc ON ma.category_id = mc.id
         WHERE {}
         ORDER BY ma.downloads DESC
         LIMIT ?{} OFFSET ?{}",
        where_sql,
        query_params.len() + 1,
        query_params.len() + 2
    );

    let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for p in query_params {
        all_params.push(p);
    }
    all_params.push(Box::new(page_size));
    all_params.push(Box::new(offset));

    let all_refs: Vec<&dyn rusqlite::types::ToSql> = all_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    let agents: Vec<serde_json::Value> = stmt
        .query_map(all_refs.as_slice(), |row| {
            let perms_str: String = row.get::<_, String>(6)?;
            let permissions: Vec<String> =
                serde_json::from_str(&perms_str).unwrap_or_default();
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "version": row.get::<_, String>(2)?,
                "description": row.get::<_, Option<String>>(3)?,
                "author": row.get::<_, String>(4)?,
                "icon": row.get::<_, Option<String>>(5)?,
                "permissions": permissions,
                "price": row.get::<_, i64>(7)?,
                "category": row.get::<_, String>(8)?,
                "downloads": row.get::<_, i64>(9)?,
                "rating": row.get::<_, f64>(10)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "data": agents,
        "total": total,
        "page": page,
        "page_size": page_size,
    }))
}

/// 获取市场 Agent 详情
#[tauri::command]
pub fn get_market_agent_detail(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<serde_json::Value, String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    conn.query_row(
        "SELECT ma.id, ma.name, ma.version, ma.description, ma.author,
                ma.icon_url, ma.permissions_json, ma.price,
                mc.id as category_id, mc.name as category_name,
                ma.downloads, ma.rating, ma.screenshots_json,
                ma.signature, ma.checksum, ma.manifest_json,
                ma.homepage, ma.file_size, ma.status
         FROM market_agents ma
         LEFT JOIN market_categories mc ON ma.category_id = mc.id
         WHERE ma.id = ?1",
        params![agent_id],
        |row| {
            let perms_str: String = row.get::<_, String>(6)?;
            let permissions: Vec<String> =
                serde_json::from_str(&perms_str).unwrap_or_default();
            let screens_str: String = row.get::<_, String>(12)?;
            let screenshots: Vec<String> =
                serde_json::from_str(&screens_str).unwrap_or_default();

            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "version": row.get::<_, String>(2)?,
                "description": row.get::<_, Option<String>>(3)?,
                "author": row.get::<_, String>(4)?,
                "icon": row.get::<_, Option<String>>(5)?,
                "permissions": permissions,
                "price": row.get::<_, i64>(7)?,
                "category_id": row.get::<_, Option<String>>(8)?,
                "category": row.get::<_, String>(9)?,
                "downloads": row.get::<_, i64>(10)?,
                "rating": row.get::<_, f64>(11)?,
                "screenshots": screenshots,
                "signature": row.get::<_, Option<String>>(13)?,
                "checksum": row.get::<_, Option<String>>(14)?,
                "manifest_json": row.get::<_, Option<String>>(15)?,
                "homepage": row.get::<_, Option<String>>(16)?,
                "file_size": row.get::<_, i64>(17)?,
                "status": row.get::<_, String>(18)?,
            }))
        },
    )
    .map_err(|e| format!("Agent not found: {}", e))
}

/// 获取市场分类列表
#[tauri::command]
pub fn get_market_categories(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, name, icon FROM market_categories ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let categories: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "icon": row.get::<_, Option<String>>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

/// 下载市场 Agent 包（开发阶段返回 manifest_json + 签名信息，后续对接 nvwa.proclaw.cc）
#[tauri::command]
pub fn download_market_agent_package(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<serde_json::Value, String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    let result = conn.query_row(
        "SELECT id, name, version, manifest_json, permissions_json,
                signature, checksum, icon_url, description, author
         FROM market_agents
         WHERE id = ?1 AND status = 'published'",
        params![agent_id],
        |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let version: String = row.get(2)?;
            let manifest_json: Option<String> = row.get(3)?;
            let perms_str: String = row.get::<_, String>(4)?;
            let signature: Option<String> = row.get(5)?;
            let checksum: Option<String> = row.get(6)?;
            let icon: Option<String> = row.get(7)?;
            let description: Option<String> = row.get(8)?;
            let author: Option<String> = row.get(9)?;

            let permissions: Vec<String> =
                serde_json::from_str(&perms_str).unwrap_or_default();

            // 如果没有 manifest_json，则构建一个
            let manifest: serde_json::Value = if let Some(ref mj) = manifest_json {
                serde_json::from_str(mj).unwrap_or_else(|_| {
                    serde_json::json!({
                        "id": id,
                        "name": name,
                        "version": version,
                        "entry": "index.html",
                        "permissions": permissions,
                        "icon": icon,
                        "description": description,
                        "author": author,
                    })
                })
            } else {
                serde_json::json!({
                    "id": id,
                    "name": name,
                    "version": version,
                    "entry": "index.html",
                    "permissions": permissions,
                    "icon": icon,
                    "description": description,
                    "author": author,
                })
            };

            Ok(serde_json::json!({
                "manifest": manifest,
                "manifest_json": serde_json::to_string(&manifest).unwrap_or_default(),
                "signature": signature,
                "checksum": checksum,
            }))
        },
    );

    result.map_err(|e| format!("Failed to get package: {}", e))
}

#[cfg(test)]
mod tests {
    use crate::database::Database;
    use std::sync::Mutex;

    fn setup_test_db() -> Mutex<Database> {
        let db = Database::new_in_memory().expect("Failed to create test DB");
        db.initialize().expect("Failed to init test DB");
        Mutex::new(db)
    }

    #[test]
    fn test_get_market_categories() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM market_categories", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 4, "Should have 4 market categories");
    }

    #[test]
    fn test_get_market_agents_count() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM market_agents WHERE status = 'published'", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 5, "Should have 5 market agents");
    }

    #[test]
    fn test_market_agent_detail() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();

        let row = conn.query_row(
            "SELECT name, permissions_json, price FROM market_agents WHERE id = 'ma_task'",
            [],
            |row| {
                let name: String = row.get(0)?;
                let perms: String = row.get(1)?;
                let price: i64 = row.get(2)?;
                Ok((name, perms, price))
            },
        ).unwrap();

        assert_eq!(row.0, "任务管理 Agent");
        assert!(row.1.contains("send_message"));
        assert_eq!(row.2, 0);
    }
}
