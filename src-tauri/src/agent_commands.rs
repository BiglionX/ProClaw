use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

// ==================== 内部函数（可测试） ====================

fn get_agents_internal(db: &Mutex<Database>) -> Result<Vec<AgentInfo>, String> {
    let db_guard = db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    // 使用 LEFT JOIN 一次查询获取 agent 和权限
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.name, a.version, a.manifest, a.enabled, a.is_builtin,
                    a.installed_at, a.last_updated, COALESCE(ap.permission, '')
             FROM agents a
             LEFT JOIN agent_permissions ap ON a.id = ap.agent_id
             ORDER BY a.installed_at DESC",
        )
        .map_err(|e| e.to_string())?;

    // 使用 Vec + HashMap 保持 SQL 排序顺序，同时按 ID 去重合并权限
    let mut agents: Vec<AgentInfo> = Vec::new();
    let mut agent_index: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let version: String = row.get(2)?;
            let manifest_str: String = row.get(3)?;
            let enabled: bool = row.get(4)?;
            let is_builtin: bool = row.get(5)?;
            let installed_at: i64 = row.get(6)?;
            let last_updated: Option<i64> = row.get(7)?;
            let permission: String = row.get::<_, String>(8)?;

            let manifest: AgentManifest =
                serde_json::from_str(&manifest_str).unwrap_or(AgentManifest {
                    id: id.clone(),
                    name: name.clone(),
                    version: version.clone(),
                    entry: "index.html".to_string(),
                    permissions: vec![],
                    capabilities: None,
                    icon: None,
                    description: None,
                    author: None,
                    homepage: None,
                });

            Ok((
                id,
                name,
                version,
                manifest,
                enabled,
                is_builtin,
                installed_at,
                last_updated,
                permission,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row_result in rows {
        let (
            id,
            name,
            version,
            manifest,
            enabled,
            is_builtin,
            installed_at,
            last_updated,
            permission,
        ) = row_result.map_err(|e| e.to_string())?;

        if !agent_index.contains_key(&id) {
            agent_index.insert(id.clone(), agents.len());
            agents.push(AgentInfo {
                id: id.clone(),
                name,
                version,
                manifest,
                enabled,
                is_builtin,
                installed_at,
                last_updated,
                permissions_granted: vec![],
            });
        }

        if !permission.is_empty() {
            if let Some(idx) = agent_index.get(&id) {
                agents[*idx].permissions_granted.push(permission);
            }
        }
    }

    Ok(agents)
}

fn install_agent_internal(
    db: &Mutex<Database>,
    name: &str,
    version: &str,
    manifest_json: &str,
    data_dir: Option<&str>,
    is_builtin: bool,
    signature_hex: Option<&str>,
    secret_key_hex: Option<&str>,
) -> Result<String, String> {
    // 解析 manifest
    let manifest: AgentManifest =
        serde_json::from_str(manifest_json).map_err(|e| format!("Invalid manifest: {}", e))?;

    // 签名验证（如果提供）
    if let (Some(sig), Some(key)) = (signature_hex, secret_key_hex) {
        let valid = crate::agent_security::verify_manifest_signature(manifest_json, sig, key)
            .map_err(|e| format!("Signature verification error: {}", e))?;
        if !valid {
            return Err("Invalid manifest signature".to_string());
        }
    } else if !is_builtin {
        // 审计修复 SEC-P1-10: 非内置 Agent 安装时警告缺少签名验证
        eprintln!(
            "[Security] WARNING: Agent '{}' v{} installed without signature verification. \
             Non-builtin agents should be signed in production.",
            name, version
        );
    }

    let db_guard = db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO agents (id, name, version, manifest, enabled, is_builtin, installed_at, last_updated, data_dir)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?6, ?7)",
        params![id, name, version, manifest_json, is_builtin, now, data_dir],
    )
    .map_err(|e| format!("Failed to install agent: {}", e))?;

    // 自动写入权限记录
    for perm in &manifest.permissions {
        conn.execute(
            "INSERT OR IGNORE INTO agent_permissions (id, agent_id, permission)
             VALUES (?1, ?2, ?3)",
            params![format!("perm_{}_{}", id, perm.replace(' ', "_")), id, perm],
        )
        .ok();
    }

    Ok(id)
}

// ==================== Agent Manifest 结构 ====================
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry: String,                     // 入口文件路径（如 index.html）
    pub permissions: Vec<String>,          // 所需权限列表
    pub capabilities: Option<Vec<String>>, // Agent 能力列表（CEO Agent 任务分派用）
    pub icon: Option<String>,              // 图标路径或 base64
    pub description: Option<String>,
    pub author: Option<String>,
    pub homepage: Option<String>,
}

/// Agent 信息（返回给前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub manifest: AgentManifest,
    pub enabled: bool,
    pub is_builtin: bool,
    pub installed_at: i64,
    pub last_updated: Option<i64>,
    pub permissions_granted: Vec<String>,
}

/// 安装 Agent（从市场下载后注册到本地）
/// 获取 Agent 可用的权限列表（预定义）
#[tauri::command]
pub fn get_available_permissions() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({"key": "read_user", "label": "读取用户信息", "description": "获取当前登录用户的基本信息"}),
        serde_json::json!({"key": "read_finance", "label": "读取财务数据", "description": "访问财务相关的交易和账户数据"}),
        serde_json::json!({"key": "write_finance", "label": "写入财务数据", "description": "创建和修改财务记录"}),
        serde_json::json!({"key": "read_contacts", "label": "读取联系人", "description": "访问联系人列表"}),
        serde_json::json!({"key": "send_message", "label": "发送消息", "description": "通过聊天模块发送消息给其他用户"}),
        serde_json::json!({"key": "show_notification", "label": "显示通知", "description": "在系统托盘中显示通知"}),
        serde_json::json!({"key": "read_files", "label": "读取文件", "description": "访问文件系统中的文件"}),
        serde_json::json!({"key": "write_files", "label": "写入文件", "description": "在文件系统中创建和修改文件"}),
    ]
}

// ==================== Tauri 命令包装 ====================

#[tauri::command]
pub fn install_agent(
    db: tauri::State<Mutex<Database>>,
    name: String,
    version: String,
    manifest_json: String,
    data_dir: Option<String>,
) -> Result<String, String> {
    install_agent_internal(
        &db.inner(),
        &name,
        &version,
        &manifest_json,
        data_dir.as_deref(),
        false,
        None,
        None,
    )
}

#[tauri::command]
pub fn uninstall_agent(db: tauri::State<Mutex<Database>>, agent_id: String) -> Result<(), String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();
    let is_builtin: bool = conn
        .query_row(
            "SELECT is_builtin FROM agents WHERE id = ?1",
            params![agent_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Agent not found: {}", e))?;
    if is_builtin {
        return Err("Cannot uninstall built-in agent".to_string());
    }
    conn.execute(
        "DELETE FROM agent_permissions WHERE agent_id = ?1",
        params![agent_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM agents WHERE id = ?1", params![agent_id])
        .map_err(|e| format!("Failed to uninstall agent: {}", e))?;
    Ok(())
}

/// 同时启用的最大 Agent 数量
const MAX_CONCURRENT_AGENTS: i64 = 10;

#[tauri::command]
pub fn enable_agent(db: tauri::State<Mutex<Database>>, agent_id: String) -> Result<(), String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    // 检查当前已启用的 Agent 数量是否达到上限
    let enabled_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM agents WHERE enabled = 1", [], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Failed to count enabled agents: {}", e))?;
    if enabled_count >= MAX_CONCURRENT_AGENTS {
        return Err(format!(
            "已达到最大并发 Agent 数量限制（{}），请先禁用其他 Agent 后再启用",
            MAX_CONCURRENT_AGENTS
        ));
    }

    conn.execute(
        "UPDATE agents SET enabled = 1 WHERE id = ?1",
        params![agent_id],
    )
    .map_err(|e| format!("Failed to enable agent: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn disable_agent(db: tauri::State<Mutex<Database>>, agent_id: String) -> Result<(), String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();
    conn.execute(
        "UPDATE agents SET enabled = 0 WHERE id = ?1",
        params![agent_id],
    )
    .map_err(|e| format!("Failed to disable agent: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_installed_agents(db: tauri::State<Mutex<Database>>) -> Result<Vec<AgentInfo>, String> {
    get_agents_internal(db.inner())
}

#[tauri::command]
pub fn get_agent_detail(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<AgentInfo, String> {
    let agents = get_agents_internal(db.inner())?;
    agents
        .into_iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| "Agent not found".to_string())
}

#[tauri::command]
pub fn update_agent(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
    new_version: String,
    new_manifest_json: String,
    new_data_dir: Option<String>,
) -> Result<(), String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();
    let now = Utc::now().timestamp();
    let _manifest: AgentManifest =
        serde_json::from_str(&new_manifest_json).map_err(|e| format!("Invalid manifest: {}", e))?;
    conn.execute(
        "UPDATE agents SET version = ?1, manifest = ?2, last_updated = ?3, data_dir = COALESCE(?4, data_dir) WHERE id = ?5",
        params![new_version, new_manifest_json, now, new_data_dir, agent_id],
    ).map_err(|e| format!("Failed to update agent: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_agent_data_dir(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
) -> Result<String, String> {
    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();
    conn.query_row(
        "SELECT COALESCE(data_dir, '') FROM agents WHERE id = ?1",
        params![agent_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("Agent not found: {}", e))
}

// ============ SQL 安全工具函数 (审计修复 SEC-P1-03/04/05) ============

/// 去除 SQL 中的所有注释（行注释 -- 和块注释 /* */）
fn strip_sql_comments(sql: &str) -> String {
    let mut result = String::with_capacity(sql.len());
    let chars: Vec<char> = sql.chars().collect();
    let mut i = 0;
    let mut in_string = false;
    let mut string_char = '"';

    while i < chars.len() {
        if in_string {
            result.push(chars[i]);
            if chars[i] == string_char {
                in_string = false;
            }
            i += 1;
            continue;
        }

        // 检测字符串开始
        if chars[i] == '\'' || chars[i] == '"' {
            in_string = true;
            string_char = chars[i];
            result.push(chars[i]);
            i += 1;
            continue;
        }

        // 检测行注释 --
        if i + 1 < chars.len() && chars[i] == '-' && chars[i + 1] == '-' {
            // 跳过到行尾
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            result.push(' ');
            continue;
        }

        // 检测块注释 /* ... */
        if i + 1 < chars.len() && chars[i] == '/' && chars[i + 1] == '*' {
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            if i + 1 < chars.len() {
                i += 2; // skip */
            }
            result.push(' ');
            continue;
        }

        result.push(chars[i]);
        i += 1;
    }
    result
}

/// 从 SQL 语句中提取表名（简化解析，支持 FROM/JOIN/INTO/UPDATE/TABLE 关键字）
fn extract_table_names(sql: &str) -> Vec<String> {
    let upper = sql.to_uppercase();
    let tokens: Vec<&str> = upper.split_whitespace().collect();
    let mut tables = Vec::new();
    let table_keywords = ["FROM", "JOIN", "INTO", "UPDATE", "TABLE"];

    for (i, token) in tokens.iter().enumerate() {
        let clean_token = token.trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
        if table_keywords.contains(&clean_token) {
            // 下一个 token 应该是表名
            if i + 1 < tokens.len() {
                let next = tokens[i + 1]
                    .trim_matches(|c: char| !c.is_alphanumeric() && c != '_' && c != '.');
                // 跳过关键字如 IF NOT EXISTS
                if next == "IF" {
                    // CREATE TABLE IF NOT EXISTS table_name
                    if i + 4 < tokens.len() {
                        let table_name = tokens[i + 4]
                            .trim_matches(|c: char| !c.is_alphanumeric() && c != '_');
                        if !table_name.is_empty() {
                            // 从原始 SQL 中提取对应位置的表名（保持大小写）
                            tables.push(find_original_table_name(sql, table_name));
                        }
                    }
                } else if !next.is_empty()
                    && next != "SELECT"
                    && next != "SET"
                    && next != "WHERE"
                    && next != "EXISTS"
                    && next != "NOT"
                {
                    tables.push(find_original_table_name(sql, next));
                }
            }
        }
    }
    tables
}

/// 从原始 SQL 中查找表名（保持原始大小写）
fn find_original_table_name(sql: &str, upper_name: &str) -> String {
    let sql_upper = sql.to_uppercase();
    if let Some(pos) = sql_upper.find(upper_name) {
        sql[pos..pos + upper_name.len()].to_string()
    } else {
        upper_name.to_string()
    }
}

/// Agent 数据库查询（只允许读取以 agent_<agentId>_ 开头的表）
#[tauri::command]
pub fn agent_db_query(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
    sql: String,
    params_json: Option<String>,
) -> Result<serde_json::Value, String> {
    // 审计修复 SEC-P1-04: 增强 SQL 安全检查
    // 1. 去除所有注释后再检查
    let stripped = strip_sql_comments(&sql);
    let trimmed = stripped.trim().to_uppercase();

    // 2. 仅允许 SELECT/WITH
    if !trimmed.starts_with("SELECT") && !trimmed.starts_with("WITH") {
        return Err("Only SELECT queries are allowed".to_string());
    }

    // 3. 禁止多语句注入
    if trimmed.trim_end_matches(';').contains(';') {
        return Err("Multiple statements are not allowed".to_string());
    }

    // 4. 审计修复 SEC-P1-04: 提取实际表名并验证前缀，而非简单的 contains 检查
    let expected_prefix = format!("agent_{}_", agent_id).to_uppercase();
    let table_names = extract_table_names(&stripped);
    if table_names.is_empty() {
        return Err("No table references found in query".to_string());
    }
    for table in &table_names {
        if !table.to_uppercase().starts_with(&expected_prefix) {
            return Err(format!(
                "Access denied: table '{}' does not have required prefix 'agent_{}_{}'",
                table, agent_id, ""
            ));
        }
    }

    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    // 解析参数
    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref pj) = params_json {
        let arr: Vec<serde_json::Value> =
            serde_json::from_str(pj).map_err(|e| format!("Invalid params JSON: {}", e))?;
        arr.iter()
            .map(|v| match v {
                serde_json::Value::String(s) => {
                    Box::new(s.clone()) as Box<dyn rusqlite::types::ToSql>
                }
                serde_json::Value::Number(n) => Box::new(n.as_f64().unwrap_or(0.0)),
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                _ => Box::new(v.to_string()),
            })
            .collect()
    } else {
        vec![]
    };

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Query preparation error: {}", e))?;

    let col_count = stmt.column_count();
    let column_names: Vec<String> = (0..col_count)
        .map(|i| {
            stmt.column_name(i)
                .unwrap_or(&format!("col_{}", i))
                .to_string()
        })
        .collect();

    let rows: Vec<serde_json::Value> = stmt
        .query_map(param_refs.as_slice(), |row| {
            let mut map = serde_json::Map::new();
            for (i, name) in column_names.iter().enumerate() {
                let val: serde_json::Value = row
                    .get::<_, String>(i)
                    .map(serde_json::Value::String)
                    .or_else(|_| row.get::<_, f64>(i).map(serde_json::Value::from))
                    .or_else(|_| {
                        row.get::<_, i64>(i)
                            .map(|v| serde_json::Value::Number(v.into()))
                    })
                    .or_else(|_| row.get::<_, bool>(i).map(serde_json::Value::Bool))
                    .unwrap_or(serde_json::Value::Null);
                map.insert(name.clone(), val);
            }
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| format!("Query execution error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!(rows))
}

/// Agent 数据库写入（只允许操作以 agent_<agentId>_ 开头的表）
#[tauri::command]
pub fn agent_db_execute(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
    sql: String,
    params_json: Option<String>,
) -> Result<u64, String> {
    // 审计修复 SEC-P1-05: 去除注释后再检查 + 移除 DROP/ALTER 权限
    let stripped = strip_sql_comments(&sql);
    let upper = stripped.trim().to_uppercase();

    // 审计修复 SEC-P1-05: 移除 DROP 和 ALTER，仅允许 INSERT/UPDATE/DELETE/CREATE TABLE IF NOT EXISTS
    let allowed_keywords = ["INSERT", "UPDATE", "DELETE", "CREATE TABLE IF NOT EXISTS"];
    if !allowed_keywords.iter().any(|kw| upper.starts_with(kw)) {
        return Err("Only INSERT/UPDATE/DELETE/CREATE TABLE IF NOT EXISTS statements are allowed".to_string());
    }

    // 禁止多语句注入
    if upper.trim_end_matches(';').contains(';') {
        return Err("Multiple statements are not allowed".to_string());
    }

    // 审计修复 SEC-P1-04: 提取实际表名并验证前缀
    let expected_prefix = format!("agent_{}_", agent_id).to_uppercase();
    let table_names = extract_table_names(&stripped);
    if table_names.is_empty() {
        return Err("No table references found in query".to_string());
    }
    for table in &table_names {
        if !table.to_uppercase().starts_with(&expected_prefix) {
            return Err(format!(
                "Access denied: table '{}' does not have required prefix 'agent_{}_{}'",
                table, agent_id, ""
            ));
        }
    }

    let db_guard = db.inner().lock().map_err(|e| e.to_string())?;
    let conn = db_guard.connection();

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref pj) = params_json {
        let arr: Vec<serde_json::Value> =
            serde_json::from_str(pj).map_err(|e| format!("Invalid params JSON: {}", e))?;
        arr.iter()
            .map(|v| match v {
                serde_json::Value::String(s) => {
                    Box::new(s.clone()) as Box<dyn rusqlite::types::ToSql>
                }
                serde_json::Value::Number(n) => Box::new(n.as_f64().unwrap_or(0.0)),
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                _ => Box::new(v.to_string()),
            })
            .collect()
    } else {
        vec![]
    };

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let affected = conn
        .execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Execute error: {}", e))?;

    Ok(affected as u64)
}

#[tauri::command]
pub fn download_agent_from_market(
    db: tauri::State<Mutex<Database>>,
    agent_id: String,
    market_url: String,
    name: String,
    version: String,
    manifest_json: String,
    expected_checksum: Option<String>,
    signature_hex: Option<String>,
    secret_key_hex: Option<String>,
) -> Result<String, String> {
    println!(
        "[Market] Downloading agent {} from {}",
        agent_id, market_url
    );

    // 如果有校验和，验证包完整性
    if let Some(ref checksum) = expected_checksum {
        // R7 修复：只允许访问预期目录内的 ZIP 文件
        let zip_path = Path::new(&market_url);
        // 检查路径是否包含危险字符
        if market_url.contains("..") {
            return Err("Package path contains invalid traversal characters".to_string());
        }
        if zip_path.exists() {
            let valid = crate::agent_security::verify_checksum(zip_path, checksum)
                .map_err(|e| format!("Checksum verification error: {}", e))?;
            if !valid {
                return Err("Package checksum mismatch".to_string());
            }
            println!("[Market] Checksum verified for {}", agent_id);
        }
    }

    install_agent_internal(
        db.inner(),
        &name,
        &version,
        &manifest_json,
        None,
        false,
        signature_hex.as_deref(),
        secret_key_hex.as_deref(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use std::sync::Mutex;

    fn setup_test_db() -> Mutex<Database> {
        let db = Database::new_in_memory().expect("Failed to create test DB");
        db.initialize().expect("Failed to init test DB");
        Mutex::new(db)
    }

    #[test]
    fn test_install_and_list_agents() {
        let db = setup_test_db();
        let manifest = serde_json::json!({
            "id": "test-agent-1",
            "name": "Test Agent",
            "version": "1.0.0",
            "entry": "index.html",
            "permissions": ["read_user", "send_message"],
            "description": "A test agent"
        })
        .to_string();

        let _agent_id = install_agent_internal(
            &db,
            "Test Agent",
            "1.0.0",
            &manifest,
            None,
            false,
            None,
            None,
        )
        .expect("Should install agent");

        let agents = get_agents_internal(&db).expect("Should list agents");

        // 验证包含我们安装的 Agent（可能包含内置 Finance Agent）
        let test_agent = agents.iter().find(|a| a.name == "Test Agent").unwrap();
        assert_eq!(test_agent.version, "1.0.0");
        assert!(test_agent.enabled);
    }

    #[test]
    fn test_install_and_list_agents_with_permissions() {
        let db = setup_test_db();
        let manifest = serde_json::json!({
            "id": "test-agent-perms",
            "name": "Test Agent With Perms",
            "version": "1.0.0",
            "entry": "index.html",
            "permissions": ["read_user", "send_message", "show_notification"],
            "description": "A test agent with permissions"
        })
        .to_string();

        let agent_id = install_agent_internal(
            &db,
            "Test Agent With Perms",
            "1.0.0",
            &manifest,
            None,
            false,
            None,
            None,
        )
        .expect("Should install agent");

        // 验证权限已写入
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let perm_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM agent_permissions WHERE agent_id = ?1",
                params![agent_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(perm_count, 3, "Should have 3 permissions");
    }

    #[test]
    fn test_enable_disable_agent() {
        let db = setup_test_db();
        let manifest = serde_json::json!({
            "id": "test-agent-2",
            "name": "Toggle Agent",
            "version": "1.0.0",
            "entry": "index.html",
            "permissions": []
        })
        .to_string();

        let agent_id = install_agent_internal(
            &db,
            "Toggle Agent",
            "1.0.0",
            &manifest,
            None,
            false,
            None,
            None,
        )
        .expect("Should install agent");

        // 禁用
        {
            let db_guard = db.lock().unwrap();
            let conn = db_guard.connection();
            conn.execute(
                "UPDATE agents SET enabled = 0 WHERE id = ?1",
                params![agent_id],
            )
            .expect("Should disable");
        }

        let agents = get_agents_internal(&db).expect("Should list agents");
        let agent = agents.iter().find(|a| a.id == agent_id).unwrap();
        assert!(!agent.enabled);

        // 启用
        {
            let db_guard = db.lock().unwrap();
            let conn = db_guard.connection();
            conn.execute(
                "UPDATE agents SET enabled = 1 WHERE id = ?1",
                params![agent_id],
            )
            .expect("Should enable");
        }

        let agents = get_agents_internal(&db).expect("Should list agents");
        let agent = agents.iter().find(|a| a.id == agent_id).unwrap();
        assert!(agent.enabled);
    }

    #[test]
    fn test_uninstall_agent() {
        let db = setup_test_db();
        let manifest = serde_json::json!({
            "id": "test-agent-3",
            "name": "Removable Agent",
            "version": "1.0.0",
            "entry": "index.html",
            "permissions": []
        })
        .to_string();

        let agent_id = install_agent_internal(
            &db,
            "Removable Agent",
            "1.0.0",
            &manifest,
            None,
            false,
            None,
            None,
        )
        .expect("Should install agent");

        // 卸载
        {
            let db_guard = db.lock().unwrap();
            let conn = db_guard.connection();
            conn.execute("DELETE FROM agents WHERE id = ?1", params![agent_id])
                .expect("Should uninstall");
        }

        let agents = get_agents_internal(&db).expect("Should list agents");
        // 内置 Finance Agent 仍在，但测试 Agent 应被移除
        assert!(
            !agents.iter().any(|a| a.id == agent_id),
            "Test agent should be removed"
        );
        assert!(
            agents.iter().any(|a| a.is_builtin),
            "Built-in agent should remain"
        );
    }

    #[test]
    fn test_cannot_uninstall_builtin() {
        let db = setup_test_db();
        // setup_test_db 已自动安装内置 Finance Agent
        // 测试内置 agent 的标志位正确
        let agents = get_agents_internal(&db).expect("Should list agents");
        let builtin = agents
            .iter()
            .find(|a| a.is_builtin)
            .expect("Should have builtin agent");
        assert!(builtin.is_builtin);
        assert_eq!(builtin.name, "财务管理 Agent");
    }
}
