//! Hermes Skills - Tauri 命令层
//!
//! 把 SkillStore 的 SQL 操作从 JS 端代理到 Rust 端。
//! 数据完全在主 Database(Mutex<Database>)中,与业务表共享加密/事务策略。
//!
//! 注册到 main.rs:
//!   .invoke_handler(tauri::generate_handler![
//!       hermes_db_exec, hermes_db_run, hermes_db_all, hermes_db_get,
//!   ])
//!
//! 调用方(JS 端):
//!   invoke('hermes_db_exec', { sql, params })
//!   invoke('hermes_db_run', { sql, params })
//!   invoke('hermes_db_all', { sql, params })
//!   invoke('hermes_db_get', { sql, params })

use rusqlite::{params_from_iter, types::Value};
use std::sync::Mutex;
use tauri::State;

use crate::database::Database;

/// 把 JS 端传来的 params:Vec<serde_json::Value> 转成 rusqlite::params
fn to_sql_params(params: Vec<serde_json::Value>) -> Vec<Value> {
    params
        .into_iter()
        .map(|v| match v {
            serde_json::Value::Null => Value::Null,
            serde_json::Value::Bool(b) => Value::Integer(b as i64),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    Value::Real(f)
                } else {
                    Value::Text(n.to_string())
                }
            }
            serde_json::Value::String(s) => Value::Text(s),
            // 对象/数组:序列化为 JSON 字符串
            other => Value::Text(other.to_string()),
        })
        .collect()
}

/// 执行无返回的 SQL(CREATE TABLE / INSERT / UPDATE / DELETE)
#[tauri::command]
pub fn hermes_db_exec(
    db: State<'_, Mutex<Database>>,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let conn = conn.connection();
    let p = to_sql_params(params.unwrap_or_default());
    conn.execute(&sql, params_from_iter(p.iter()))
        .map_err(|e| format!("hermes_db_exec failed: {}", e))?;
    Ok(())
}

/// 执行 INSERT/UPDATE/DELETE,返回 lastInsertRowid + changes
#[tauri::command]
pub fn hermes_db_run(
    db: State<'_, Mutex<Database>>,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> Result<HermesRunResult, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let conn = conn.connection();
    let p = to_sql_params(params.unwrap_or_default());
    let result = conn
        .execute(&sql, params_from_iter(p.iter()))
        .map_err(|e| format!("hermes_db_run failed: {}", e))?;
    Ok(HermesRunResult {
        last_insert_rowid: conn.last_insert_rowid(),
        changes: result as i64,
    })
}

/// 查询多行,返回 JSON 数组
#[tauri::command]
pub fn hermes_db_all(
    db: State<'_, Mutex<Database>>,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let conn = conn.connection();
    let p = to_sql_params(params.unwrap_or_default());

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("hermes_db_all prepare failed: {}", e))?;

    let column_count = stmt.column_count();
    let column_names: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
        .collect();

    let rows = stmt
        .query_map(params_from_iter(p.iter()), |row| {
            let mut obj = serde_json::Map::new();
            for (i, name) in column_names.iter().enumerate() {
                let v: Value = row.get(i).unwrap_or(Value::Null);
                let json_v = match v {
                    Value::Null => serde_json::Value::Null,
                    Value::Integer(n) => serde_json::Value::Number(n.into()),
                    Value::Real(f) => serde_json::Number::from_f64(f)
                        .map(serde_json::Value::Number)
                        .unwrap_or(serde_json::Value::Null),
                    Value::Text(t) => serde_json::Value::String(t),
                    Value::Blob(b) => {
                        serde_json::Value::String(format!("<blob {} bytes>", b.len()))
                    }
                };
                obj.insert(name.clone(), json_v);
            }
            Ok(serde_json::Value::Object(obj))
        })
        .map_err(|e| format!("hermes_db_all query_map failed: {}", e))?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("hermes_db_all row error: {}", e))?);
    }
    Ok(out)
}

/// 查询单行
#[tauri::command]
pub fn hermes_db_get(
    db: State<'_, Mutex<Database>>,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> Result<Option<serde_json::Value>, String> {
    // 复用 all,但只取第一行;若没匹配则返回 None
    let mut rows = hermes_db_all(db, sql, params)?;
    Ok(rows.pop())
}

#[derive(serde::Serialize)]
pub struct HermesRunResult {
    pub last_insert_rowid: i64,
    pub changes: i64,
}

/* =========================== Hermes Schema Bootstrap =========================== */

/**
 * Hermes 表的完整 DDL(与 src/lib/hermes/skillStore.ts: SCHEMA_SQL 镜像)。
 * 在 Rust 侧主动建好,避免 JS 端 exec 异步 race。
 */
const HERMES_SCHEMA_SQL: &str = include_str!("../hermes_schema.sql");

/// 初始化 Hermes 表(SkillStore + EvolutionLog)。
/// 内部函数:可在 main.rs 启动时直接调,不需要走 IPC。
/// 接受 &Database（main.rs 中 Mutex::new 之前调用）或 &Mutex<Database>。
pub fn hermes_bootstrap_internal(db: &Database) -> Result<(), String> {
    let conn = db.connection();
    conn.execute_batch(HERMES_SCHEMA_SQL)
        .map_err(|e| format!("hermes_bootstrap failed: {}", e))?;
    Ok(())
}

/// IPC 版本:JS 端可以主动 invoke 确认 schema 已就绪。
/// (实际 main.rs 启动时已调用 internal 版本,这里主要给 Storybook 调试。)
#[tauri::command]
pub fn hermes_bootstrap(db: State<'_, Mutex<Database>>) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    hermes_bootstrap_internal(&db)
}

// 高层命令(可选):让 JS 端不直接传 SQL,而是调用语义化方法。
// 例如 hermes_list_skills() 返回 Skill[]。
//
// 这样 SkillStore 完全在 Rust 侧实现,JS 端只能调高层 API,无法执行任意 SQL。
// 安全性更高,但实现成本也更高。
//
// 当前 v1 方案:TauriRpcExecutor 直接代理 SQL,简单直接。
// 未来如需收紧权限,可在本文件加 hermes_list_skills 等高层命令。
