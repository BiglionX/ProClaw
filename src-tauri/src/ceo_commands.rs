use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcpEntry {
    pub id: String,
    pub context_type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i64>,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub created_by: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcpEntryInput {
    pub context_type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i64>,
    pub created_by: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcpEntryUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i64>,
    pub status: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CeoTask {
    pub id: String,
    pub task_id: String,
    pub assigned_agent_id: String,
    pub r#type: Option<String>,
    pub description: Option<String>,
    pub expected_output: Option<String>,
    pub priority: i64,
    pub status: String,
    pub result: Option<String>,
    pub created_at: i64,
    pub deadline: Option<i64>,
    pub completed_at: Option<i64>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CeoTaskInput {
    pub task_id: Option<String>,
    pub assigned_agent_id: String,
    pub r#type: Option<String>,
    pub description: Option<String>,
    pub expected_output: Option<String>,
    pub priority: Option<i64>,
    pub deadline: Option<i64>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub total: i64,
    pub pending: i64,
    pub in_progress: i64,
    pub completed: i64,
    pub failed: i64,
    pub cancelled: i64,
}

// ==================== 内部辅助函数 ====================

fn now_timestamp() -> i64 {
    Utc::now().timestamp()
}

fn parse_metadata(metadata: Option<&str>) -> String {
    metadata.unwrap_or("{}").to_string()
}

fn pcp_entry_from_row(
    row: &rusqlite::Row,
) -> rusqlite::Result<PcpEntry> {
    Ok(PcpEntry {
        id: row.get("id")?,
        context_type: row.get("context_type")?,
        title: row.get("title")?,
        description: row.get("description")?,
        priority: row.get("priority")?,
        status: row.get("status")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        created_by: row.get("created_by")?,
        metadata: row.get("metadata")?,
    })
}

fn ceo_task_from_row(
    row: &rusqlite::Row,
) -> rusqlite::Result<CeoTask> {
    Ok(CeoTask {
        id: row.get("id")?,
        task_id: row.get("task_id")?,
        assigned_agent_id: row.get("assigned_agent_id")?,
        r#type: row.get("type")?,
        description: row.get("description")?,
        expected_output: row.get("expected_output")?,
        priority: row.get("priority")?,
        status: row.get("status")?,
        result: row.get("result")?,
        created_at: row.get("created_at")?,
        deadline: row.get("deadline")?,
        completed_at: row.get("completed_at")?,
        metadata: row.get("metadata")?,
    })
}

// ==================== PCP 操作 ====================

/// 新增 PCP 条目
#[tauri::command]
pub fn pcp_add_entry(
    db: tauri::State<Mutex<Database>>,
    entry: PcpEntryInput,
) -> Result<PcpEntry, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();
    let created_by_val = entry.created_by.clone().unwrap_or_else(|| "boss".to_string());

    conn.execute(
        "INSERT INTO project_context (id, context_type, title, description, priority, status, created_at, updated_at, created_by, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?6, ?7, ?8)",
        params![
            id,
            entry.context_type,
            entry.title,
            entry.description,
            entry.priority.unwrap_or(3),
            now,
            created_by_val,
            parse_metadata(entry.metadata.as_deref()),
        ],
    )
    .map_err(|e| format!("Failed to add PCP entry: {}", e))?;

    Ok(PcpEntry {
        id,
        context_type: entry.context_type,
        title: entry.title,
        description: entry.description,
        priority: entry.priority,
        status: "active".to_string(),
        created_at: now,
        updated_at: now,
        created_by: created_by_val.clone(),
        metadata: entry.metadata,
    })
}

/// 更新 PCP 条目
#[tauri::command]
pub fn pcp_update_entry(
    db: tauri::State<Mutex<Database>>,
    id: String,
    update: PcpEntryUpdate,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    let mut set_clauses = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(title) = &update.title {
        set_clauses.push("title = ?");
        param_values.push(Box::new(title.clone()));
    }
    if let Some(description) = &update.description {
        set_clauses.push("description = ?");
        param_values.push(Box::new(description.clone()));
    }
    if let Some(priority) = update.priority {
        set_clauses.push("priority = ?");
        param_values.push(Box::new(priority));
    }
    if let Some(ref status) = update.status {
        set_clauses.push("status = ?");
        param_values.push(Box::new(status.clone()));
    }
    if let Some(ref metadata) = update.metadata {
        set_clauses.push("metadata = ?");
        param_values.push(Box::new(metadata.clone()));
    }

    if set_clauses.is_empty() {
        return Err("No fields to update".to_string());
    }

    set_clauses.push("updated_at = ?");
    param_values.push(Box::new(now));
    param_values.push(Box::new(id.clone()));

    let sql = format!(
        "UPDATE project_context SET {} WHERE id = ?",
        set_clauses.join(", ")
    );

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update PCP entry: {}", e))?;

    Ok(())
}

/// 查询 PCP 条目
#[tauri::command]
pub fn pcp_query_entries(
    db: tauri::State<Mutex<Database>>,
    context_type: Option<String>,
    status: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<PcpEntry>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, context_type, title, description, priority, status, created_at, updated_at, created_by, metadata
         FROM project_context WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref ct) = context_type {
        sql.push_str(" AND context_type = ?");
        param_values.push(Box::new(ct.clone()));
    }
    if let Some(ref s) = status {
        sql.push_str(" AND status = ?");
        param_values.push(Box::new(s.clone()));
    }

    sql.push_str(" ORDER BY priority ASC, created_at DESC");

    if let Some(lim) = limit {
        sql.push_str(" LIMIT ?");
        param_values.push(Box::new(lim));
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), pcp_entry_from_row)
        .map_err(|e| e.to_string())?;

    let results: Vec<PcpEntry> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 软删除 PCP 条目（设为 archived）
#[tauri::command]
pub fn pcp_delete_entry(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    conn.execute(
        "UPDATE project_context SET status = 'archived', updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| format!("Failed to archive PCP entry: {}", e))?;

    Ok(())
}

// ==================== CEO 任务操作 ====================

/// 创建 CEO 任务
#[tauri::command]
pub fn ceo_create_task(
    db: tauri::State<Mutex<Database>>,
    task: CeoTaskInput,
) -> Result<CeoTask, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let task_id = task.task_id.unwrap_or_else(|| format!("task_{}", Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown")));
    let now = now_timestamp();

    conn.execute(
        "INSERT INTO ceo_tasks (id, task_id, assigned_agent_id, type, description, expected_output, priority, status, created_at, deadline, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9, ?10)",
        params![
            id,
            task_id,
            task.assigned_agent_id,
            task.r#type,
            task.description,
            task.expected_output,
            task.priority.unwrap_or(2),
            now,
            task.deadline,
            parse_metadata(task.metadata.as_deref()),
        ],
    )
    .map_err(|e| format!("Failed to create CEO task: {}", e))?;

    Ok(CeoTask {
        id,
        task_id,
        assigned_agent_id: task.assigned_agent_id,
        r#type: task.r#type,
        description: task.description,
        expected_output: task.expected_output,
        priority: task.priority.unwrap_or(2),
        status: "pending".to_string(),
        result: None,
        created_at: now,
        deadline: task.deadline,
        completed_at: None,
        metadata: task.metadata,
    })
}

/// 查询 CEO 任务列表
#[tauri::command]
pub fn ceo_get_tasks(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
    assigned_agent_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<CeoTask>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, task_id, assigned_agent_id, type, description, expected_output, priority, status, result, created_at, deadline, completed_at, metadata
         FROM ceo_tasks WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref s) = status {
        sql.push_str(" AND status = ?");
        param_values.push(Box::new(s.clone()));
    }
    if let Some(ref agent_id) = assigned_agent_id {
        sql.push_str(" AND assigned_agent_id = ?");
        param_values.push(Box::new(agent_id.clone()));
    }

    sql.push_str(" ORDER BY created_at DESC");

    if let Some(lim) = limit {
        sql.push_str(" LIMIT ?");
        param_values.push(Box::new(lim));
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), ceo_task_from_row)
        .map_err(|e| e.to_string())?;

    let results: Vec<CeoTask> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 更新 CEO 任务状态
#[tauri::command]
pub fn ceo_update_task_status(
    db: tauri::State<Mutex<Database>>,
    task_id: String,
    status: String,
    result: Option<String>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    let valid_statuses = ["pending", "in_progress", "completed", "failed", "cancelled"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err(format!("Invalid status '{}'. Must be one of: {:?}", status, valid_statuses));
    }

    if status == "completed" || status == "failed" {
        conn.execute(
            "UPDATE ceo_tasks SET status = ?1, result = ?2, completed_at = ?3 WHERE task_id = ?4",
            params![status, result, now, task_id],
        )
        .map_err(|e| format!("Failed to update task status: {}", e))?;
    } else {
        conn.execute(
            "UPDATE ceo_tasks SET status = ?1, result = COALESCE(?2, result) WHERE task_id = ?3",
            params![status, result, task_id],
        )
        .map_err(|e| format!("Failed to update task status: {}", e))?;
    }

    Ok(())
}

/// 获取 CEO 任务统计数据
#[tauri::command]
pub fn ceo_get_task_stats(
    db: tauri::State<Mutex<Database>>,
) -> Result<TaskStats, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let pending: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'pending'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let in_progress: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'in_progress'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let completed: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'completed'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let failed: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'failed'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let cancelled: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'cancelled'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(TaskStats {
        total,
        pending,
        in_progress,
        completed,
        failed,
        cancelled,
    })
}

// ==================== 决策日志结构体 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionLogEntry {
    pub id: String,
    pub decision_type: String,
    pub proposed_content: String,
    pub boss_decision: Option<String>,
    pub boss_feedback: Option<String>,
    pub final_content: Option<String>,
    pub context_snapshot: String,
    pub estimated_risk: Option<String>,
    pub created_at: i64,
    pub approved_at: Option<i64>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionLogInput {
    pub decision_type: String,
    pub proposed_content: String,
    pub boss_decision: Option<String>,
    pub boss_feedback: Option<String>,
    pub final_content: Option<String>,
    pub context_snapshot: Option<String>,
    pub estimated_risk: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionStats {
    pub total: i64,
    pub approved: i64,
    pub rejected: i64,
    pub edited: i64,
    pub snoozed: i64,
    pub pending: i64,
    pub approval_rate: f64,
    pub most_rejected_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreferenceEntry {
    pub key: String,
    pub value: String,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyConfigPackage {
    pub version: String,
    pub exported_at: i64,
    pub anonymized: bool,
    pub pcp_entries: Vec<serde_json::Value>,
    pub decision_log_summary: Vec<serde_json::Value>,
    pub preferences: Vec<PreferenceEntry>,
    pub installed_agents: Vec<serde_json::Value>,
}

fn decision_log_from_row(
    row: &rusqlite::Row,
) -> rusqlite::Result<DecisionLogEntry> {
    Ok(DecisionLogEntry {
        id: row.get("id")?,
        decision_type: row.get("decision_type")?,
        proposed_content: row.get("proposed_content")?,
        boss_decision: row.get("boss_decision")?,
        boss_feedback: row.get("boss_feedback")?,
        final_content: row.get("final_content")?,
        context_snapshot: row.get("context_snapshot")?,
        estimated_risk: row.get("estimated_risk")?,
        created_at: row.get("created_at")?,
        approved_at: row.get("approved_at")?,
        metadata: row.get("metadata")?,
    })
}

// ==================== 决策日志操作 ====================

/// 添加决策日志
#[tauri::command]
pub fn ceo_add_decision_log(
    db: tauri::State<Mutex<Database>>,
    log_entry: DecisionLogInput,
) -> Result<DecisionLogEntry, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();

    // 获取当前的 PCP 快照
    let context_snapshot = log_entry.context_snapshot.unwrap_or_else(|| {
        let snapshot: String = conn
            .query_row(
                "SELECT COALESCE(json_group_array(json_object('id', id, 'context_type', context_type, 'title', title, 'description', description, 'priority', priority, 'status', status)), '[]') FROM project_context WHERE status = 'active'",
                [],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "[]".to_string());
        snapshot
    });

    let approved_at = if log_entry.boss_decision.is_some() {
        Some(now)
    } else {
        None
    };

    conn.execute(
        "INSERT INTO ceo_decision_logs (id, decision_type, proposed_content, boss_decision, boss_feedback, final_content, context_snapshot, estimated_risk, created_at, approved_at, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            log_entry.decision_type,
            log_entry.proposed_content,
            log_entry.boss_decision,
            log_entry.boss_feedback,
            log_entry.final_content,
            context_snapshot,
            log_entry.estimated_risk,
            now,
            approved_at,
            log_entry.metadata.clone().unwrap_or_else(|| "{}".to_string()),
        ],
    )
    .map_err(|e| format!("Failed to add decision log: {}", e))?;

    Ok(DecisionLogEntry {
        id,
        decision_type: log_entry.decision_type,
        proposed_content: log_entry.proposed_content,
        boss_decision: log_entry.boss_decision,
        boss_feedback: log_entry.boss_feedback,
        final_content: log_entry.final_content,
        context_snapshot,
        estimated_risk: log_entry.estimated_risk,
        created_at: now,
        approved_at,
        metadata: log_entry.metadata,
    })
}

/// 查询决策日志
#[tauri::command]
pub fn ceo_query_decision_logs(
    db: tauri::State<Mutex<Database>>,
    decision_type: Option<String>,
    boss_decision: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    days_back: Option<i64>,
) -> Result<Vec<DecisionLogEntry>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, decision_type, proposed_content, boss_decision, boss_feedback, final_content, context_snapshot, estimated_risk, created_at, approved_at, metadata
         FROM ceo_decision_logs WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref dt) = decision_type {
        sql.push_str(" AND decision_type = ?");
        param_values.push(Box::new(dt.clone()));
    }
    if let Some(ref bd) = boss_decision {
        sql.push_str(" AND boss_decision = ?");
        param_values.push(Box::new(bd.clone()));
    }
    if let Some(days) = days_back {
        let cutoff = now_timestamp() - days * 86400;
        sql.push_str(" AND created_at >= ?");
        param_values.push(Box::new(cutoff));
    }

    sql.push_str(" ORDER BY created_at DESC");

    if let Some(lim) = limit {
        sql.push_str(" LIMIT ?");
        param_values.push(Box::new(lim));
    }
    if let Some(off) = offset {
        sql.push_str(" OFFSET ?");
        param_values.push(Box::new(off));
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), decision_log_from_row)
        .map_err(|e| e.to_string())?;

    let results: Vec<DecisionLogEntry> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 获取决策统计
#[tauri::command]
pub fn ceo_get_decision_stats(
    db: tauri::State<Mutex<Database>>,
) -> Result<DecisionStats, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let approved: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'approved'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let rejected: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'rejected'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let edited: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'edited'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let snoozed: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'snoozed'", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let pending: i64 = conn
        .query_row("SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision IS NULL", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let total_decided = approved + rejected + edited;
    let approval_rate = if total_decided > 0 {
        (approved as f64) / (total_decided as f64)
    } else {
        0.0
    };

    // 最常拒绝的类型
    let most_rejected_type: Option<String> = conn
        .query_row(
            "SELECT decision_type FROM ceo_decision_logs WHERE boss_decision = 'rejected' GROUP BY decision_type ORDER BY COUNT(*) DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    Ok(DecisionStats {
        total,
        approved,
        rejected,
        edited,
        snoozed,
        pending,
        approval_rate,
        most_rejected_type,
    })
}

/// 更新决策日志状态（Boss 确认/拒绝后调用）
#[tauri::command]
pub fn ceo_update_decision_log(
    db: tauri::State<Mutex<Database>>,
    id: String,
    boss_decision: String,
    boss_feedback: Option<String>,
    final_content: Option<String>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    let valid_decisions = ["approved", "rejected", "edited", "snoozed"];
    if !valid_decisions.contains(&boss_decision.as_str()) {
        return Err(format!("Invalid decision '{}'. Must be one of: {:?}", boss_decision, valid_decisions));
    }

    conn.execute(
        "UPDATE ceo_decision_logs SET boss_decision = ?1, boss_feedback = ?2, final_content = COALESCE(?3, final_content), approved_at = ?4 WHERE id = ?5",
        params![boss_decision, boss_feedback, final_content, now, id],
    )
    .map_err(|e| format!("Failed to update decision log: {}", e))?;

    Ok(())
}

// ==================== 偏好管理 ====================

/// 获取所有偏好配置
#[tauri::command]
pub fn ceo_get_learning_preferences(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<PreferenceEntry>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare("SELECT key, value, updated_at FROM ceo_preferences ORDER BY key")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(PreferenceEntry {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let results: Vec<PreferenceEntry> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 更新偏好配置
#[tauri::command]
pub fn ceo_update_preference(
    db: tauri::State<Mutex<Database>>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    let valid_keys = ["budget_sensitivity", "risk_tolerance", "auto_approve_threshold", "decision_style"];
    if !valid_keys.contains(&key.as_str()) {
        return Err(format!("Invalid preference key '{}'", key));
    }

    conn.execute(
        "INSERT OR REPLACE INTO ceo_preferences (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params![key, value, now],
    )
    .map_err(|e| format!("Failed to update preference: {}", e))?;

    Ok(())
}

// ==================== 公司配置包导出/导入 ====================

/// 导出公司发展配置包
#[tauri::command]
pub fn ceo_export_company_config(
    db: tauri::State<Mutex<Database>>,
    anonymized: Option<bool>,
) -> Result<CompanyConfigPackage, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let should_anonymize = anonymized.unwrap_or(false);

    // 导出 PCP 条目
    let mut stmt = conn
        .prepare(
            "SELECT id, context_type, title, description, priority, status, created_at, created_by FROM project_context"
        )
        .map_err(|e| e.to_string())?;

    let pcp_rows = stmt
        .query_map([], |row| {
            let mut map = serde_json::Map::new();
            map.insert("id".to_string(), serde_json::Value::String(row.get::<_, String>(0)?));
            map.insert("context_type".to_string(), serde_json::Value::String(row.get::<_, String>(1)?));
            let title: Option<String> = row.get(2)?;
            map.insert("title".to_string(), serde_json::to_value(title).unwrap_or_default());
            let desc: Option<String> = row.get(3)?;
            map.insert("description".to_string(), serde_json::to_value(desc).unwrap_or_default());
            map.insert("priority".to_string(), serde_json::to_value(row.get::<_, Option<i64>>(4)?).unwrap_or_default());
            map.insert("status".to_string(), serde_json::Value::String(row.get::<_, String>(5)?));
            map.insert("created_at".to_string(), serde_json::to_value(row.get::<_, i64>(6)?).unwrap_or_default());
            let created_by: String = row.get(7)?;
            if should_anonymize {
                map.insert("created_by".to_string(), serde_json::Value::String(if created_by == "boss" { "Boss".to_string() } else { "CEO_Agent".to_string() }));
            } else {
                map.insert("created_by".to_string(), serde_json::Value::String(created_by));
            }
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| e.to_string())?;

    let pcp_entries: Vec<serde_json::Value> = pcp_rows.filter_map(|r| r.ok()).collect();

    // 导出决策日志摘要（最近50条）
    let mut log_stmt = conn
        .prepare(
            "SELECT id, decision_type, proposed_content, boss_decision, boss_feedback, created_at, estimated_risk
             FROM ceo_decision_logs ORDER BY created_at DESC LIMIT 50"
        )
        .map_err(|e| e.to_string())?;

    let log_rows = log_stmt
        .query_map([], |row| {
            let mut map = serde_json::Map::new();
            map.insert("id".to_string(), serde_json::Value::String(row.get::<_, String>(0)?));
            map.insert("decision_type".to_string(), serde_json::Value::String(row.get::<_, String>(1)?));
            map.insert("proposed_content".to_string(), serde_json::Value::String(row.get::<_, String>(2)?));
            map.insert("boss_decision".to_string(), serde_json::to_value(row.get::<_, Option<String>>(3)?).unwrap_or_default());
            map.insert("boss_feedback".to_string(), serde_json::to_value(row.get::<_, Option<String>>(4)?).unwrap_or_default());
            map.insert("created_at".to_string(), serde_json::to_value(row.get::<_, i64>(5)?).unwrap_or_default());
            map.insert("estimated_risk".to_string(), serde_json::to_value(row.get::<_, Option<String>>(6)?).unwrap_or_default());
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| e.to_string())?;

    let decision_log_summary: Vec<serde_json::Value> = log_rows.filter_map(|r| r.ok()).collect();

    // 导出偏好
    let mut pref_stmt = conn
        .prepare("SELECT key, value, updated_at FROM ceo_preferences")
        .map_err(|e| e.to_string())?;

    let pref_rows = pref_stmt
        .query_map([], |row| {
            Ok(PreferenceEntry {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let preferences: Vec<PreferenceEntry> = pref_rows.filter_map(|r| r.ok()).collect();

    // 导出已安装 Agent 列表
    let mut agent_stmt = conn
        .prepare("SELECT id, name, version, enabled FROM agents WHERE is_builtin = 1")
        .map_err(|e| e.to_string())?;

    let agent_rows = agent_stmt
        .query_map([], |row| {
            let mut map = serde_json::Map::new();
            map.insert("id".to_string(), serde_json::Value::String(row.get::<_, String>(0)?));
            let name: String = row.get(1)?;
            if should_anonymize {
                map.insert("name".to_string(), serde_json::Value::String(name.replace("Agent", "代理")));
            } else {
                map.insert("name".to_string(), serde_json::Value::String(name));
            }
            map.insert("version".to_string(), serde_json::Value::String(row.get::<_, String>(2)?));
            map.insert("enabled".to_string(), serde_json::to_value(row.get::<_, bool>(3)?).unwrap_or_default());
            Ok(serde_json::Value::Object(map))
        })
        .map_err(|e| e.to_string())?;

    let installed_agents: Vec<serde_json::Value> = agent_rows.filter_map(|r| r.ok()).collect();

    Ok(CompanyConfigPackage {
        version: "1.0.0".to_string(),
        exported_at: now_timestamp(),
        anonymized: should_anonymize,
        pcp_entries,
        decision_log_summary,
        preferences,
        installed_agents,
    })
}

/// 导入公司发展配置包
#[tauri::command]
pub fn ceo_import_company_config(
    db: tauri::State<Mutex<Database>>,
    config: CompanyConfigPackage,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = now_timestamp();

    let mut import_count = 0i64;

    // 导入 PCP 条目（跳过已存在的）
    for entry in &config.pcp_entries {
        let id = entry.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let context_type = entry.get("context_type").and_then(|v| v.as_str()).unwrap_or("goal");
        let title = entry.get("title").and_then(|v| v.as_str());
        let description = entry.get("description").and_then(|v| v.as_str());
        let priority = entry.get("priority").and_then(|v| v.as_i64()).unwrap_or(3);
        let status = entry.get("status").and_then(|v| v.as_str()).unwrap_or("active");

        let result = conn.execute(
            "INSERT OR IGNORE INTO project_context (id, context_type, title, description, priority, status, created_at, updated_at, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 'ceo_agent')",
            params![id, context_type, title, description, priority, status, now],
        );
        if let Ok(affected) = result {
            import_count += affected as i64;
        }
    }

    // 导入偏好
    for pref in &config.preferences {
        conn.execute(
            "INSERT OR REPLACE INTO ceo_preferences (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![pref.key, pref.value, now],
        )
        .ok();
    }

    Ok(format!("成功导入 {} 条 PCP 条目和 {} 项偏好设置", import_count, config.preferences.len()))
}

// ==================== 单元测试 ====================

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
    fn test_pcp_add_and_query() {
        let db = setup_test_db();

        // 添加 PCP 条目
        let entry = PcpEntryInput {
            context_type: "goal".to_string(),
            title: Some("Q3 完成 100 个付费用户".to_string()),
            description: Some("第三季度目标".to_string()),
            priority: Some(1),
            created_by: Some("boss".to_string()),
            metadata: None,
        };

        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let id = Uuid::new_v4().to_string();
        let now = now_timestamp();

        conn.execute(
            "INSERT INTO project_context (id, context_type, title, description, priority, status, created_at, updated_at, created_by, metadata)
             VALUES (?1, 'goal', ?2, ?3, 1, 'active', ?4, ?4, 'boss', '{}')",
            params![id, entry.title, entry.description, now],
        ).unwrap();

        // 查询
        let mut stmt = conn.prepare(
            "SELECT id, context_type, title, description, priority, status, created_at, updated_at, created_by, metadata
             FROM project_context WHERE id = ?1"
        ).unwrap();

        let result: PcpEntry = stmt.query_row(params![id], pcp_entry_from_row).unwrap();
        assert_eq!(result.context_type, "goal");
        assert_eq!(result.title.unwrap(), "Q3 完成 100 个付费用户");
        assert_eq!(result.priority, Some(1));
    }

    #[test]
    fn test_pcp_filter_by_type() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        // 插入不同类型
        for (i, ct) in ["vision", "goal", "milestone"].iter().enumerate() {
            conn.execute(
                "INSERT INTO project_context (id, context_type, title, priority, status, created_at, updated_at, created_by, metadata)
                 VALUES (?1, ?2, ?3, 1, 'active', ?4, ?4, 'boss', '{}')",
                params![format!("test_{}", i), ct, format!("Test {}", ct), now],
            ).unwrap();
        }

        let mut stmt = conn.prepare(
            "SELECT id, context_type, title, description, priority, status, created_at, updated_at, created_by, metadata
             FROM project_context WHERE context_type = 'goal'"
        ).unwrap();

        let results: Vec<PcpEntry> = stmt.query_map([], pcp_entry_from_row)
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].context_type, "goal");
    }

    #[test]
    fn test_ceo_task_crud() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        let id = Uuid::new_v4().to_string();
        let task_id = "test_task_001".to_string();

        // 创建任务
        conn.execute(
            "INSERT INTO ceo_tasks (id, task_id, assigned_agent_id, type, description, priority, status, created_at, deadline, metadata)
             VALUES (?1, ?2, 'finance_agent', 'create_report', '生成财务报表', 1, 'pending', ?3, ?4, '{}')",
            params![id, task_id, now, now + 86400],
        ).unwrap();

        // 查询
        let task: CeoTask = conn.query_row(
            "SELECT id, task_id, assigned_agent_id, type, description, expected_output, priority, status, result, created_at, deadline, completed_at, metadata
             FROM ceo_tasks WHERE task_id = ?1",
            params![task_id],
            ceo_task_from_row,
        ).unwrap();

        assert_eq!(task.status, "pending");
        assert_eq!(task.assigned_agent_id, "finance_agent");

        // 更新状态
        conn.execute(
            "UPDATE ceo_tasks SET status = 'completed', completed_at = ?1 WHERE task_id = ?2",
            params![now, task_id],
        ).unwrap();

        let updated: CeoTask = conn.query_row(
            "SELECT id, task_id, assigned_agent_id, type, description, expected_output, priority, status, result, created_at, deadline, completed_at, metadata
             FROM ceo_tasks WHERE task_id = ?1",
            params![task_id],
            ceo_task_from_row,
        ).unwrap();

        assert_eq!(updated.status, "completed");
        assert!(updated.completed_at.is_some());
    }

    #[test]
    fn test_task_stats() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        // 插入不同状态的任务
        let statuses = ["pending", "pending", "in_progress", "completed", "failed"];
        for (i, s) in statuses.iter().enumerate() {
            conn.execute(
                "INSERT INTO ceo_tasks (id, task_id, assigned_agent_id, type, priority, status, created_at, metadata)
                 VALUES (?1, ?2, 'agent_x', 'test', 1, ?3, ?4, '{}')",
                params![format!("st_{}", i), format!("st_task_{}", i), s, now],
            ).unwrap();
        }

        let total: i64 = conn.query_row("SELECT COUNT(*) FROM ceo_tasks", [], |row| row.get(0)).unwrap();
        let pending: i64 = conn.query_row("SELECT COUNT(*) FROM ceo_tasks WHERE status = 'pending'", [], |row| row.get(0)).unwrap();

        assert_eq!(total, 5);
        assert_eq!(pending, 2);
    }

    // ==================== 决策日志测试 ====================

    #[test]
    fn test_decision_log_crud() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();
        let id = Uuid::new_v4().to_string();

        // 插入决策日志
        let proposed = serde_json::json!({
            "action": "add_goal",
            "title": "Q4 海外市场拓展",
            "priority": 1
        }).to_string();

        conn.execute(
            "INSERT INTO ceo_decision_logs (id, decision_type, proposed_content, boss_decision, boss_feedback, context_snapshot, estimated_risk, created_at, approved_at, metadata)
             VALUES (?1, 'context_add', ?2, 'approved', '同意', '[]', 'medium', ?3, ?3, '{}')",
            params![id, proposed, now],
        ).unwrap();

        // 查询
        let entry: DecisionLogEntry = conn.query_row(
            "SELECT id, decision_type, proposed_content, boss_decision, boss_feedback, final_content, context_snapshot, estimated_risk, created_at, approved_at, metadata
             FROM ceo_decision_logs WHERE id = ?1",
            params![id],
            decision_log_from_row,
        ).unwrap();

        assert_eq!(entry.decision_type, "context_add");
        assert_eq!(entry.boss_decision.unwrap(), "approved");
        assert_eq!(entry.estimated_risk.unwrap(), "medium");
    }

    #[test]
    fn test_decision_stats() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        // 插入不同决策结果的日志
        let decisions = vec![
            ("approved", "context_add"),
            ("approved", "task_dispatch"),
            ("rejected", "context_add"),
            ("rejected", "context_add"),
            ("edited", "task_dispatch"),
        ];

        for (i, (decision, d_type)) in decisions.iter().enumerate() {
            conn.execute(
                "INSERT INTO ceo_decision_logs (id, decision_type, proposed_content, boss_decision, context_snapshot, created_at, metadata)
                 VALUES (?1, ?2, '{}', ?3, '[]', ?4, '{}')",
                params![format!("ds_{}", i), d_type, decision, now],
            ).unwrap();
        }

        // 统计
        let approved: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'approved'", [], |row| row.get(0)
        ).unwrap();
        let rejected: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ceo_decision_logs WHERE boss_decision = 'rejected'", [], |row| row.get(0)
        ).unwrap();
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ceo_decision_logs", [], |row| row.get(0)
        ).unwrap();

        assert_eq!(total, 5);
        assert_eq!(approved, 2);
        assert_eq!(rejected, 2);

        let approval_rate = approved as f64 / (approved + rejected + 1i64) as f64; // +1 for edited
        assert!((approval_rate - 0.4).abs() < 0.01);
    }

    #[test]
    fn test_preferences() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        // 默认偏好应已存在
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ceo_preferences", [], |row| row.get(0)
        ).unwrap();
        assert_eq!(count, 4);

        // 更新偏好
        conn.execute(
            "INSERT OR REPLACE INTO ceo_preferences (key, value, updated_at) VALUES ('budget_sensitivity', '8', ?1)",
            params![now],
        ).unwrap();

        let value: String = conn.query_row(
            "SELECT value FROM ceo_preferences WHERE key = 'budget_sensitivity'", [], |row| row.get(0)
        ).unwrap();
        assert_eq!(value, "8");
    }

    #[test]
    fn test_export_company_config() {
        let db = setup_test_db();
        let db_guard = db.lock().unwrap();
        let conn = db_guard.connection();
        let now = now_timestamp();

        // 插入一些 PCP 条目
        conn.execute(
            "INSERT INTO project_context (id, context_type, title, priority, status, created_at, updated_at, created_by)
             VALUES ('export_test_1', 'goal', '测试目标', 1, 'active', ?1, ?1, 'boss')",
            params![now],
        ).unwrap();

        // 插入决策日志
        conn.execute(
            "INSERT INTO ceo_decision_logs (id, decision_type, proposed_content, boss_decision, context_snapshot, created_at, metadata)
             VALUES ('export_log_1', 'context_add', '{\"test\":true}', 'approved', '[]', ?1, '{}')",
            params![now],
        ).unwrap();

        // 验证导出数据
        let pcp_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM project_context WHERE id LIKE 'export_%'", [], |row| row.get(0)
        ).unwrap();
        assert!(pcp_count > 0);

        let log_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM ceo_decision_logs WHERE id LIKE 'export_%'", [], |row| row.get(0)
        ).unwrap();
        assert_eq!(log_count, 1);
    }
}
