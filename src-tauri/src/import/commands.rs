//! ProClaw 批量导入中心 - Tauri 命令层（v1.2 P1）
//!
//! 13 个 Tauri 命令，与前端 `src/lib/services/importService.ts` 一一对应。

use crate::database::Database;
use crate::import::executor::{execute_batch as exec_execute_batch, validate_batch as exec_validate_batch};
use crate::import::parser::parse_bytes;
use crate::import::templates::{default_templates_dir, ensure_templates, list_templates, TemplateInfo};
use crate::import::types::{
    BatchStatus, ExecuteRequest as _ExecuteRequest, ImportBatch, ImportBatchError, ImportRequest,
    ImportTarget, ValidateRequest as _ValidateRequest,
};
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

// ============================================
// 1. import_create_batch：上传文件 + 创建批次
// ============================================

/// 创建批次：上传文件 + 创建 import_batches 行，返回 batch_id + 解析摘要
#[tauri::command]
pub fn import_create_batch(
    db: tauri::State<Mutex<Database>>,
    request: ImportRequest,
) -> Result<ImportCreateResponse, String> {
    let target_type = request.target_type.clone();
    let target = ImportTarget::from_str(&target_type)
        .ok_or_else(|| format!("未知的目标类型: {}", target_type))?;

    let source_format = request.source_format.clone();
    if !matches!(source_format.as_str(), "csv" | "xlsx" | "json") {
        return Err(format!("不支持的文件格式: {}", source_format));
    }

    // 1) 解析文件（如果是 base64）
    let bytes = if let Some(b64) = &request.source_base64 {
        use base64::{engine::general_purpose, Engine as _};
        general_purpose::STANDARD
            .decode(b64.trim())
            .map_err(|e| format!("base64 解码失败: {}", e))?
    } else {
        return Err("必须提供 source_base64（暂未支持无文件模式）".to_string());
    };

    let parsed = parse_bytes(&bytes, &source_format)?;
    let total_rows = parsed.total_rows as i64;

    // 2) 写文件到 APPDATA/proclaw/desktop/import_uploads/<batch_id>/
    let id = Uuid::new_v4().to_string();
    let upload_dir = default_templates_dir()
        .parent()
        .unwrap_or(&std::env::temp_dir())
        .join("import_uploads")
        .join(&id);
    std::fs::create_dir_all(&upload_dir)
        .map_err(|e| format!("创建上传目录失败: {}", e))?;
    let target_file = upload_dir.join(&request.source_filename);
    std::fs::write(&target_file, &bytes).map_err(|e| format!("写文件失败: {}", e))?;
    let size_bytes = bytes.len() as i64;

    // 3) 写 import_batches 行
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();
    conn.execute(
        "INSERT INTO import_batches
            (id, target_type, source_filename, source_format, source_size, source_path,
             row_count, status, processed_rows, success_rows, failed_rows, skipped_rows,
             started_at, performed_by, notes)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'mapping', 0, 0, 0, 0, datetime('now'), ?8, ?9)",
        params![
            id,
            target_type,
            request.source_filename,
            source_format,
            size_bytes,
            target_file.to_string_lossy().to_string(),
            total_rows,
            request.performed_by,
            request.notes,
        ],
    )
    .map_err(|e| format!("写 import_batches 失败: {}", e))?;

    // 4) 返回批次信息 + 解析摘要
    Ok(ImportCreateResponse {
        batch_id: id,
        target_type,
        target_label: target.display_name().to_string(),
        total_rows,
        headers: parsed.headers.clone(),
        sample_rows: parsed
            .rows
            .iter()
            .take(3)
            .map(|r| r.fields.clone())
            .collect(),
        source_path: Some(target_file.to_string_lossy().to_string()),
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImportCreateResponse {
    pub batch_id: String,
    pub target_type: String,
    pub target_label: String,
    pub total_rows: i64,
    pub headers: Vec<String>,
    pub sample_rows: Vec<HashMap<String, String>>,
    /// v1.3 源文件实际写入路径（用于老格式 preview/execute 时定位文件）
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub source_path: Option<String>,
}

// ============================================
// 2. import_parse_batch：重新解析已上传文件（用于"换文件"场景）
// ============================================

#[tauri::command]
pub fn import_parse_file(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<ImportCreateResponse, String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let (target_type, source_format, source_path): (String, String, Option<String>) = conn
        .query_row(
            "SELECT target_type, source_format, source_path FROM import_batches WHERE id = ?1",
            params![batch_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("查询批次失败: {}", e))?;

    let path = source_path.ok_or_else(|| "批次没有 source_path，请重新上传".to_string())?;
    let target = ImportTarget::from_str(&target_type)
        .ok_or_else(|| format!("未知的目标类型: {}", target_type))?;

    let bytes = std::fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let parsed = parse_bytes(&bytes, &source_format)?;
    let total_rows = parsed.total_rows as i64;

    // 更新 row_count + status 回 mapping
    conn.execute(
        "UPDATE import_batches SET row_count = ?1, status = 'mapping' WHERE id = ?2",
        params![total_rows, batch_id],
    )
    .map_err(|e| e.to_string())?;

    // 清掉历史错误（重新解析前）
    conn.execute("DELETE FROM import_batch_errors WHERE batch_id = ?1", params![batch_id])
        .map_err(|e| e.to_string())?;

    Ok(ImportCreateResponse {
        batch_id,
        target_type,
        target_label: target.display_name().to_string(),
        total_rows,
        headers: parsed.headers.clone(),
        sample_rows: parsed
            .rows
            .iter()
            .take(3)
            .map(|r| r.fields.clone())
            .collect(),
        source_path: Some(path),
    })
}

// ============================================
// 3. import_upload_file：占位（暂不区分，直接合并到 import_create_batch）
// ============================================

#[tauri::command]
pub fn import_upload_file(
    _db: tauri::State<Mutex<Database>>,
    _batch_id: String,
) -> Result<(), String> {
    Err("deprecated: use import_create_batch with source_base64".to_string())
}

// ============================================
// 4. import_validate_batch：校验
// ============================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ValidateResponse {
    pub batch_id: String,
    pub status: String,
    pub valid_rows: i64,
    pub invalid_rows: i64,
    pub error_count: i64,
}

#[tauri::command]
pub fn import_validate_batch(
    db: tauri::State<Mutex<Database>>,
    request: _ValidateRequest,
) -> Result<ValidateResponse, String> {
    let batch_id = request.batch_id;
    let column_mapping = request.column_mapping;
    let default_values = request.default_values.unwrap_or_default();

    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let (target_type, source_format, source_path): (String, String, Option<String>) = conn
        .query_row(
            "SELECT target_type, source_format, source_path FROM import_batches WHERE id = ?1",
            params![batch_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("查询批次失败: {}", e))?;

    let target = ImportTarget::from_str(&target_type)
        .ok_or_else(|| format!("未知的目标类型: {}", target_type))?;

    let parsed = {
        let path = source_path.ok_or_else(|| "批次没有 source_path，请重新上传".to_string())?;
        let bytes = std::fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
        parse_bytes(&bytes, &source_format)?
    };

    let validated = exec_validate_batch(&parsed, target, &column_mapping, &default_values);

    // 写错误日志
    let mut error_count: i64 = 0;
    let mut invalid_rows: i64 = 0;
    let mut valid_rows: i64 = 0;

    // 状态置 validating
    conn.execute(
        "UPDATE import_batches SET status = 'validating', column_mapping = ?1 WHERE id = ?2",
        params![serde_json::to_string(&column_mapping).ok(), batch_id],
    )
    .map_err(|e| e.to_string())?;

    // 清掉上一次的错误（重新校验前）
    conn.execute("DELETE FROM import_batch_errors WHERE batch_id = ?1", params![batch_id])
        .map_err(|e| e.to_string())?;

    for v in &validated {
        if v.is_valid {
            valid_rows += 1;
            continue;
        }
        invalid_rows += 1;
        for err in &v.errors {
            error_count += 1;
            conn.execute(
                "INSERT INTO import_batch_errors
                    (id, batch_id, row_index, field_name, error_code, error_message, raw_value, phase)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'validating')",
                params![
                    Uuid::new_v4().to_string(),
                    batch_id,
                    v.row_index as i64,
                    err.field,
                    err.code,
                    err.message,
                    err.raw_value
                ],
            )
            .map_err(|e| format!("写错误日志失败: {}", e))?;
        }
    }

    let status = if invalid_rows == 0 {
        BatchStatus::Mapping
    } else {
        BatchStatus::Validating
    };

    Ok(ValidateResponse {
        batch_id,
        status: status.as_str().to_string(),
        valid_rows,
        invalid_rows,
        error_count,
    })
}

// ============================================
// 5. import_execute_batch：执行
// ============================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExecuteResponse {
    pub batch_id: String,
    pub status: String, // success / partial / failed
    pub processed_rows: i64,
    pub success_rows: i64,
    pub failed_rows: i64,
    pub skipped_rows: i64,
    pub finished_at: String,
}

#[tauri::command]
pub fn import_execute_batch(
    db: tauri::State<Mutex<Database>>,
    request: _ExecuteRequest,
) -> Result<ExecuteResponse, String> {
    let batch_id = request.batch_id;
    let column_mapping = request.column_mapping;
    let default_values = request.default_values.unwrap_or_default();
    let skip_errors = request.skip_errors.unwrap_or(true);

    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let (target_type, source_format, source_path): (String, String, Option<String>) = conn
        .query_row(
        "SELECT target_type, source_format, source_path FROM import_batches WHERE id = ?1",
        params![batch_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )
    .map_err(|e| format!("查询批次失败: {}", e))?;

    let target = ImportTarget::from_str(&target_type)
        .ok_or_else(|| format!("未知的目标类型: {}", target_type))?;

    // 写 status = importing + 更新时间戳
    conn.execute(
        "UPDATE import_batches SET status = 'importing', column_mapping = ?1 WHERE id = ?2",
        params![serde_json::to_string(&column_mapping).ok(), batch_id],
    )
    .map_err(|e| e.to_string())?;

    let parsed = {
        let path = source_path.ok_or_else(|| "批次没有 source_path，请重新上传".to_string())?;
        let bytes = std::fs::read(&path).map_err(|e| format!("读取文件失败: {}", e))?;
        parse_bytes(&bytes, &source_format)?
    };

    let stats = exec_execute_batch(&dbg, &batch_id, target, &parsed, &column_mapping, &default_values, skip_errors)?;

    // 更新 processed / success / failed / skipped + finished_at + 最终状态
    let final_status = if stats.processed == 0 {
        BatchStatus::Failed
    } else if stats.failed == 0 {
        BatchStatus::Success
    } else if stats.success == 0 {
        BatchStatus::Failed
    } else {
        BatchStatus::Partial
    };

    let finished_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "UPDATE import_batches SET
            status = ?1, processed_rows = ?2, success_rows = ?3, failed_rows = ?4,
            skipped_rows = ?5, finished_at = ?6
         WHERE id = ?7",
        params![
            final_status.as_str(),
            stats.processed,
            stats.success,
            stats.failed,
            stats.skipped,
            finished_at,
            batch_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(ExecuteResponse {
        batch_id,
        status: final_status.as_str().to_string(),
        processed_rows: stats.processed,
        success_rows: stats.success,
        failed_rows: stats.failed,
        skipped_rows: stats.skipped,
        finished_at,
    })
}

// ============================================
// 6. import_pause_batch / cancel_batch / retry_batch
// ============================================

#[tauri::command]
pub fn import_pause_batch(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<(), String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();
    conn.execute(
        "UPDATE import_batches SET status = 'paused' WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_cancel_batch(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<(), String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();
    conn.execute(
        "UPDATE import_batches SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_retry_batch(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<ExecuteResponse, String> {
    // 简化：从已完成（partial / failed）的批次清掉错误并重新跑
    // 实际生产可以做更精细的"只重试 error_count > 0 的行"，这里保持完整性
    {
        let dbg = db.lock().map_err(|e| e.to_string())?;
        let conn = dbg.connection();
        // 重置 status + 清错误日志
        conn.execute(
            "UPDATE import_batches SET status = 'retrying' WHERE id = ?1",
            params![batch_id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM import_batch_errors WHERE batch_id = ?1",
            params![batch_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // 直接复用 import_execute_batch 跑一遍
    let column_mapping: HashMap<String, String> = {
        let dbg = db.lock().map_err(|e| e.to_string())?;
        let conn = dbg.connection();
        let s: Option<String> = conn
            .query_row(
                "SELECT column_mapping FROM import_batches WHERE id = ?1",
                params![batch_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .flatten();
        match s {
            Some(json) => serde_json::from_str(&json).unwrap_or_default(),
            None => HashMap::new(),
        }
    };

    import_execute_batch(
        db,
        _ExecuteRequest {
            batch_id,
            column_mapping,
            default_values: None,
            skip_errors: Some(true),
        },
    )
}

// ============================================
// 7. import_get_batch / list_batches / get_batch_errors
// ============================================

#[tauri::command]
pub fn import_get_batch(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<Option<ImportBatch>, String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();
    load_batch_by_id(conn, &batch_id)
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct ListBatchesRequest {
    #[serde(default)]
    pub target_type: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}
fn default_limit() -> i64 { 50 }

#[tauri::command]
pub fn import_list_batches(
    db: tauri::State<Mutex<Database>>,
    request: Option<ListBatchesRequest>,
) -> Result<Vec<ImportBatch>, String> {
    let req = request.unwrap_or_default();
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let mut sql = String::from(
        "SELECT id, target_type, source_filename, source_format, source_size, source_path,
                row_count, column_mapping, status, processed_rows, success_rows,
                failed_rows, skipped_rows, error_summary, dedup_key,
                started_at, finished_at, performed_by, notes
         FROM import_batches WHERE 1=1",
    );
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(t) = req.target_type.as_ref().filter(|s| !s.is_empty()) {
        sql.push_str(" AND target_type = ?");
        params_vec.push(Box::new(t.clone()));
    }
    if let Some(s) = req.status.as_ref().filter(|s| !s.is_empty()) {
        sql.push_str(" AND status = ?");
        params_vec.push(Box::new(s.clone()));
    }
    sql.push_str(" ORDER BY started_at DESC LIMIT ? OFFSET ?");
    params_vec.push(Box::new(req.limit));
    params_vec.push(Box::new(req.offset));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(params_refs.as_slice(), row_to_batch)
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    while let Some(r) = rows.next() {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn import_get_batch_errors(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ImportBatchError>, String> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, batch_id, row_index, field_name, error_code, error_message, raw_value, phase, created_at
             FROM import_batch_errors WHERE batch_id = ?1
             ORDER BY row_index ASC LIMIT ?2 OFFSET ?3",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![batch_id, limit, offset], |row| {
            Ok(ImportBatchError {
                id: row.get(0)?,
                batch_id: row.get(1)?,
                row_index: row.get(2)?,
                field_name: row.get(3)?,
                error_code: row.get(4)?,
                error_message: row.get(5)?,
                raw_value: row.get(6)?,
                phase: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ============================================
// 8. import_get_templates / import_list_mapping_templates / import_save_mapping_template
// ============================================

#[tauri::command]
pub fn import_get_templates(
    _db: tauri::State<Mutex<Database>>,
) -> Result<Vec<TemplateInfo>, String> {
    let dir = default_templates_dir();
    // 顺手确保已生成（首次启动可能没执行过 ensure_templates）
    let _ = ensure_templates(&dir);
    Ok(list_templates(&dir))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MappingTemplate {
    pub id: String,
    pub target_type: String,
    pub template_name: String,
    pub mapping: HashMap<String, String>,
    pub config: Option<HashMap<String, String>>,
    pub use_count: i64,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct ListMappingTemplateRequest {
    #[serde(default)]
    pub target_type: Option<String>,
}

#[tauri::command]
pub fn import_list_mapping_templates(
    db: tauri::State<Mutex<Database>>,
    request: Option<ListMappingTemplateRequest>,
) -> Result<Vec<MappingTemplate>, String> {
    let req = request.unwrap_or_default();
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let map_row = |row: &rusqlite::Row| -> rusqlite::Result<MappingTemplate> {
        let id: String = row.get(0)?;
        let target_type: String = row.get(1)?;
        let template_name: String = row.get(2)?;
        let mapping_json: String = row.get(3)?;
        let config_json: Option<String> = row.get(4)?;
        let use_count: i64 = row.get(5)?;
        let last_used_at: Option<String> = row.get(6)?;
        let mapping: HashMap<String, String> =
            serde_json::from_str(&mapping_json).unwrap_or_default();
        let config = config_json.and_then(|s| serde_json::from_str(&s).ok());
        Ok(MappingTemplate {
            id,
            target_type,
            template_name,
            mapping,
            config,
            use_count,
            last_used_at,
        })
    };

    // 根据是否带 target_type 过滤，分两路 query_map
    let rows_vec: Vec<MappingTemplate> = if let Some(t) = req
        .target_type
        .as_ref()
        .filter(|s| !s.is_empty())
    {
        let mut stmt = conn
            .prepare(
                "SELECT id, target_type, template_name, mapping_json, config_json, use_count, last_used_at
                 FROM import_field_mapping_templates WHERE target_type = ?1
                 ORDER BY last_used_at DESC LIMIT 20",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![t], map_row)
            .map_err(|e| format!("查询映射模板失败: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, target_type, template_name, mapping_json, config_json, use_count, last_used_at
                 FROM import_field_mapping_templates
                 ORDER BY last_used_at DESC LIMIT 20",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_row)
            .map_err(|e| format!("查询映射模板失败: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    Ok(rows_vec)
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SaveMappingTemplateRequest {
    pub target_type: String,
    pub template_name: String,
    pub mapping: HashMap<String, String>,
    #[serde(default)]
    pub config: Option<HashMap<String, String>>,
}

#[tauri::command]
pub fn import_save_mapping_template(
    db: tauri::State<Mutex<Database>>,
    request: SaveMappingTemplateRequest,
) -> Result<MappingTemplate, String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let id = Uuid::new_v4().to_string();
    let mapping_json = serde_json::to_string(&request.mapping).map_err(|e| e.to_string())?;
    let config_json = request
        .config
        .as_ref()
        .map(|c| serde_json::to_string(c).ok())
        .flatten();

    // UPSERT: 同 (target, name) 已存在则更新
    conn.execute(
        "INSERT INTO import_field_mapping_templates
            (id, target_type, template_name, mapping_json, config_json, use_count, last_used_at, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5, 1, datetime('now'), datetime('now'))
         ON CONFLICT(target_type, template_name) DO UPDATE SET
            mapping_json = excluded.mapping_json,
            config_json = excluded.config_json,
            use_count = use_count + 1,
            last_used_at = datetime('now')",
        params![id, request.target_type, request.template_name, mapping_json, config_json],
    )
    .map_err(|e| format!("保存映射模板失败: {}", e))?;

    // 取最终 id（可能是更新后的）
    let final_id: String = conn
        .query_row(
            "SELECT id FROM import_field_mapping_templates WHERE target_type = ?1 AND template_name = ?2",
            params![request.target_type, request.template_name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(MappingTemplate {
        id: final_id,
        target_type: request.target_type,
        template_name: request.template_name,
        mapping: request.mapping,
        config: request.config,
        use_count: 1,
        last_used_at: Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
    })
}

// ============================================
// 内置：DB row → struct 工具函数
// ============================================

fn row_to_batch(row: &rusqlite::Row) -> rusqlite::Result<ImportBatch> {
    Ok(ImportBatch {
        id: row.get(0)?,
        target_type: row.get(1)?,
        source_filename: row.get(2)?,
        source_format: row.get(3)?,
        source_size: row.get(4)?,
        source_path: row.get(5)?,
        row_count: row.get(6)?,
        column_mapping: row.get(7)?,
        status: row.get(8)?,
        processed_rows: row.get(9)?,
        success_rows: row.get(10)?,
        failed_rows: row.get(11)?,
        skipped_rows: row.get(12)?,
        error_summary: row.get(13)?,
        dedup_key: row.get(14)?,
        started_at: row.get(15)?,
        finished_at: row.get(16)?,
        performed_by: row.get(17)?,
        notes: row.get(18)?,
    })
}

fn load_batch_by_id(
    conn: &rusqlite::Connection,
    batch_id: &str,
) -> Result<Option<ImportBatch>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, target_type, source_filename, source_format, source_size, source_path,
                    row_count, column_mapping, status, processed_rows, success_rows,
                    failed_rows, skipped_rows, error_summary, dedup_key,
                    started_at, finished_at, performed_by, notes
             FROM import_batches WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let batch = stmt
        .query_row(params![batch_id], row_to_batch)
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(batch)
}

// ============================================
// 单元测试（不需要 DB 的部分）
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_import_create_response_struct_has_required_fields() {
        // 仅做结构体序列化检查，防止字段名漂移
        let r = ImportCreateResponse {
            batch_id: "x".into(),
            target_type: "products".into(),
            target_label: "商品库".into(),
            total_rows: 0,
            headers: vec![],
            sample_rows: vec![],
            source_path: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        assert!(s.contains("batch_id"));
        assert!(s.contains("target_type"));
        assert!(s.contains("target_label"));
        assert!(s.contains("total_rows"));
        assert!(s.contains("headers"));
        assert!(s.contains("sample_rows"));
    }
}

// ============================================
// v1.3 老系统数据迁移 — 新增 3 个命令
// ============================================

use crate::import::aggregator::{
    persist_customer_with_contacts, persist_product_with_skus,
};
use crate::import::category_resolver::bulk_ensure_categories;
use crate::import::parser_legacy::parse_legacy_file;
use crate::import::types::{
    CategoryCreateSummary, LegacyExecuteRequest, LegacyParseResult,
};

/// 供应商 upsert（按 code → name 优先），私有辅助函数
fn ensure_supplier_legacy(
    conn: &rusqlite::Connection,
    code: &str,
    name: &str,
) -> Result<String, String> {
    use rusqlite::OptionalExtension;
    use uuid::Uuid;

    // 优先按 code 找
    if !code.is_empty() {
        if let Some(id) = conn
            .query_row(
                "SELECT id FROM suppliers WHERE code = ?1 AND deleted_at IS NULL LIMIT 1",
                rusqlite::params![code],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        {
            return Ok(id);
        }
    }
    // 再按 name 找
    if !name.is_empty() {
        if let Some(id) = conn
            .query_row(
                "SELECT id FROM suppliers WHERE name = ?1 AND deleted_at IS NULL LIMIT 1",
                rusqlite::params![name],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
        {
            return Ok(id);
        }
    }
    // 新建
    let id = Uuid::new_v4().to_string();
    let code_opt: Option<&str> = if code.is_empty() { None } else { Some(code) };
    conn.execute(
        "INSERT INTO suppliers (id, name, code, is_active, created_at, updated_at, sync_status)
         VALUES (?1, ?2, ?3, 1, datetime('now'), datetime('now'), 'pending')",
        rusqlite::params![id, name, code_opt],
    )
    .map_err(|e| format!("创建供应商失败: {}", e))?;
    Ok(id)
}

// ----------------------------------------------------------------------------
// import_preview_legacy：上传后立刻解析 + 探测表头 + 聚合预览
// （仅做预览，不写库，不创建批次 — 用户在 Step 4 编辑后再调 import_execute_legacy）
// ----------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Deserialize)]
pub struct LegacyPreviewRequest {
    /// 文件绝对路径（前端从 base64 解码后写到 import_uploads/<batch_id>/ 下）
    pub source_path: String,
    /// 目标类型：customers / products / suppliers
    pub target_type: String,
}

#[tauri::command]
pub fn import_preview_legacy(
    request: LegacyPreviewRequest,
) -> Result<LegacyParseResult, String> {
    let path = std::path::Path::new(&request.source_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", request.source_path));
    }
    let (result, _rows) = parse_legacy_file(path, &request.target_type)?;
    Ok(result)
}

// ----------------------------------------------------------------------------
// import_execute_legacy：根据用户编辑的聚合规则执行老格式导入
// ----------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Serialize)]
pub struct LegacyExecuteResponse {
    pub batch_id: String,
    pub status: String, // success / partial / failed
    pub customers_created: i64,
    pub customer_contacts_created: i64,
    pub products_created: i64,
    pub product_skus_created: i64,
    pub suppliers_created: i64,
    pub categories_summary: CategoryCreateSummary,
    pub finished_at: String,
}

#[tauri::command]
pub fn import_execute_legacy(
    db: tauri::State<Mutex<Database>>,
    request: LegacyExecuteRequest,
) -> Result<LegacyExecuteResponse, String> {
    let batch_id = request.batch_id;
    let _skip_errors = request.skip_errors.unwrap_or(true);
    let skip_category = request.skip_category_auto_create.unwrap_or(false);

    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    // 1) 查 source_path + 校验状态
    let (target_type, source_path): (String, Option<String>) = conn
        .query_row(
            "SELECT target_type, source_path FROM import_batches WHERE id = ?1",
            rusqlite::params![batch_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("查询批次失败: {}", e))?;

    let path = source_path.ok_or_else(|| "批次没有 source_path，请重新上传".to_string())?;
    let target = crate::import::types::ImportTarget::from_str(&target_type)
        .ok_or_else(|| format!("未知的目标类型: {}", target_type))?;

    // 2) 解析（拿到聚合预览）
    let (preview, _rows) = parse_legacy_file(std::path::Path::new(&path), &target_type)?;

    // 3) 把 status 置 importing
    conn.execute(
        "UPDATE import_batches SET status = 'importing', column_mapping = ?1 WHERE id = ?2",
        rusqlite::params![
            serde_json::to_string(&request.column_mapping).ok(),
            batch_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    // ===== P0-S3：每 1000 行/组一个独立事务 =====
    // ===== P1-S2：批量预清理本批次旧数据，避免 N+1 单条 DELETE =====
    // ===== P1-M1 + P1-M2：类别空字符串防护 + supplier 路径找不到列报错 =====

    const CHUNK_SIZE: usize = 1000;
    let mut customers_created = 0i64;
    let mut customer_contacts_created = 0i64;
    let mut products_created = 0i64;
    let mut product_skus_created = 0i64;
    let mut suppliers_created = 0i64;
    let mut categories_summary = CategoryCreateSummary::default();
    let mut processed_rows: i64 = 0;

    match target {
        crate::import::types::ImportTarget::Customers => {
            // 预清理：本批次旧的联系人（精准回滚基础）
            conn.execute(
                "DELETE FROM customer_contacts WHERE batch_id = ?1",
                rusqlite::params![batch_id],
            )
            .map_err(|e| e.to_string())?;

            // 类别批量建档
            if !skip_category {
                if let Some(cats) = preview.categories_to_create.get("customer") {
                    let (created, skipped) = bulk_ensure_categories(conn, "customer", cats, &batch_id)?;
                    categories_summary.customer_created = created;
                    categories_summary.customer_skipped = skipped;
                }
            }
            // chunked：每 1000 个聚合组一个事务
            for chunk in preview.customer_groups.chunks(CHUNK_SIZE) {
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
                for agg in chunk {
                    let _cid = persist_customer_with_contacts(&tx, agg, skip_category, &batch_id)?;
                    customers_created += 1;
                    customer_contacts_created += agg.contacts.len() as i64;
                    processed_rows += 1;
                }
                tx.commit().map_err(|e| format!("commit customer chunk 失败: {}", e))?;
                conn.execute(
                    "UPDATE import_batches SET processed_rows = ?1 WHERE id = ?2",
                    rusqlite::params![processed_rows, batch_id],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        crate::import::types::ImportTarget::Products => {
            conn.execute(
                "DELETE FROM product_sku WHERE batch_id = ?1",
                rusqlite::params![batch_id],
            )
            .map_err(|e| e.to_string())?;

            if !skip_category {
                if let Some(cats) = preview.categories_to_create.get("product") {
                    let (created, skipped) = bulk_ensure_categories(conn, "product", cats, &batch_id)?;
                    categories_summary.product_created = created;
                    categories_summary.product_skipped = skipped;
                }
            }
            for chunk in preview.product_groups.chunks(CHUNK_SIZE) {
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
                for agg in chunk {
                    let _pid = persist_product_with_skus(&tx, agg, skip_category, &batch_id)?;
                    products_created += 1;
                    product_skus_created += agg.variants.len() as i64;
                    processed_rows += 1;
                }
                tx.commit().map_err(|e| format!("commit product chunk 失败: {}", e))?;
                conn.execute(
                    "UPDATE import_batches SET processed_rows = ?1 WHERE id = ?2",
                    rusqlite::params![processed_rows, batch_id],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        crate::import::types::ImportTarget::Suppliers => {
            // 类别批量建档
            if !skip_category {
                if let Some(cats) = preview.categories_to_create.get("supplier") {
                    let (created, skipped) = bulk_ensure_categories(conn, "supplier", cats, &batch_id)?;
                    categories_summary.supplier_created = created;
                    categories_summary.supplier_skipped = skipped;
                }
            }
            // M2：找不到 '供应商编号' / '供应商名称' 列直接报错（不再 fallback）
            let code_idx: usize = preview
                .field_names
                .iter()
                .position(|f| f.contains("供应商编号"))
                .ok_or_else(|| {
                    "供应商文件缺少 '供应商编号' 列，请检查表头是否包含「供应商编号」".to_string()
                })?;
            let name_idx: usize = preview
                .field_names
                .iter()
                .position(|f| f.contains("供应商名称"))
                .ok_or_else(|| {
                    "供应商文件缺少 '供应商名称' 列，请检查表头是否包含「供应商名称」".to_string()
                })?;
            let category_idx: Option<usize> = preview
                .field_names
                .iter()
                .position(|f| f.contains("供应商类别"));

            let total = _rows.len();
            let mut valid_count = 0i64;
            let mut valid_seen = 0i64;
            // chunked：每 1000 行一个事务
            for chunk_start in (0..total).step_by(CHUNK_SIZE) {
                let chunk_end = (chunk_start + CHUNK_SIZE).min(total);
                let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
                for row_idx in chunk_start..chunk_end {
                    let row = &_rows[row_idx];
                    valid_seen += 1;
                    if row.len() <= code_idx {
                        continue;
                    }
                    let code = row[code_idx].trim().to_string();
                    if code.is_empty() {
                        continue;
                    }
                    let name = row
                        .get(name_idx)
                        .map(|s| s.trim().to_string())
                        .unwrap_or_default();
                    let category_name = category_idx
                        .and_then(|i| row.get(i))
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty());

                    if let Some(ref cn) = category_name {
                        crate::import::category_resolver::ensure_category(
                            &tx, "supplier", cn,
                        )?;
                    }
                    let _ = ensure_supplier_legacy(&tx, &code, &name)?;
                    suppliers_created += 1;
                    valid_count += 1;
                }
                tx.commit().map_err(|e| format!("commit supplier chunk 失败: {}", e))?;
                processed_rows = valid_seen;
                conn.execute(
                    "UPDATE import_batches SET processed_rows = ?1 WHERE id = ?2",
                    rusqlite::params![processed_rows, batch_id],
                )
                .map_err(|e| e.to_string())?;
            }
            // 避免 unused warning
                let _ = valid_count;
        }
        _ => {
            return Err(format!(
                "目标类型 {} 暂不支持老格式导入，请用标准 CSV/JSON 流程",
                target_type
            ));
        }
    }

    // 5) 提交
    // tx.commit() 已在每个 chunk 内完成，本函数不再包外层事务

    // 6) 更新批次状态
    let final_status = "success";
    let finished_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let final_processed = customers_created + products_created + suppliers_created;
    conn.execute(
        "UPDATE import_batches SET
            status = ?1, processed_rows = ?2, success_rows = ?3, failed_rows = 0,
            skipped_rows = 0, finished_at = ?4,
            notes = COALESCE(notes, '') || ?5
         WHERE id = ?6",
        rusqlite::params![
            final_status,
            final_processed,
            final_processed,
            finished_at,
            format!(
                " | v1.3 legacy: customers={}, contacts={}, products={}, skus={}, suppliers={}",
                customers_created, customer_contacts_created,
                products_created, product_skus_created, suppliers_created
            ),
            batch_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(LegacyExecuteResponse {
        batch_id,
        status: final_status.to_string(),
        customers_created,
        customer_contacts_created,
        products_created,
        product_skus_created,
        suppliers_created,
        categories_summary,
        finished_at,
    })
}

// ----------------------------------------------------------------------------
// import_rollback_batch：撤销已完成的导入（不限时）
//
// 范围（决策 2026-07-02）：
//   - 删除 customer_contacts / product_sku 中 source = 'import_legacy' 的行
//   - 删除 categories 中 source = 'import_legacy' 的行
//   - 不动 customers / products / suppliers 主表（用户可能已手动改过）
//   - 不动 import_batches / import_batch_errors（保留历史）
// ----------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Serialize)]
pub struct RollbackResponse {
    pub batch_id: String,
    pub contacts_deleted: i64,
    pub product_skus_deleted: i64,
    pub categories_deleted: i64,
    pub rolled_back_at: String,
}

#[tauri::command]
pub fn import_rollback_batch(
    db: tauri::State<Mutex<Database>>,
    batch_id: String,
) -> Result<RollbackResponse, String> {
    let dbg = db.lock().map_err(|e| e.to_string())?;
    let conn = dbg.connection();

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // P0-S1 修复：按 batch_id 精准过滤，避免跨批次误删
    let contacts_deleted = tx
        .execute(
            "DELETE FROM customer_contacts WHERE batch_id = ?1",
            rusqlite::params![batch_id],
        )
        .map_err(|e| e.to_string())? as i64;

    let product_skus_deleted = tx
        .execute(
            "DELETE FROM product_sku WHERE batch_id = ?1",
            rusqlite::params![batch_id],
        )
        .map_err(|e| e.to_string())? as i64;

    let categories_deleted = tx
        .execute(
            "DELETE FROM categories WHERE batch_id = ?1",
            rusqlite::params![batch_id],
        )
        .map_err(|e| e.to_string())? as i64;

    tx.commit().map_err(|e| e.to_string())?;

    let rolled_back_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    Ok(RollbackResponse {
        batch_id,
        contacts_deleted,
        product_skus_deleted,
        categories_deleted,
        rolled_back_at,
    })
}
