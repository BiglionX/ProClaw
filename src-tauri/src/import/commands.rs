//! 数据导入 Tauri Commands（7 个）
//!
//! 调用方：前端 `src/lib/services/importService.ts`
//! 注册位置：`src-tauri/src/invoke_handler.rs` 的 `generate_handler!` 宏

use directories::ProjectDirs;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use zip::ZipArchive;

use crate::database::Database;
use crate::import::executor;
use crate::import::types::{
    is_valid_target, ConflictStrategy, FieldMapping, ImageArchiveManifest, ImageManifestEntry,
    ImportBatch, ImportError, ImportRequest, ImportResult, ImportTemplate,
};
use crate::import::validator;

// ==================== 入参辅助结构 ====================

#[derive(Debug, Deserialize)]
pub struct CreateBatchArgs {
    pub file_name: String,
    pub file_type: String,
    pub file_size: Option<i64>,
    pub file_hash: Option<String>,
    pub total_rows: i64,
    pub conflict_strategy: String,
}

#[derive(Debug, Deserialize)]
pub struct ListBatchesArgs {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct CommandResult<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> CommandResult<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    fn err(e: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(e.into()),
        }
    }
}

// ==================== 1. import_create_batch ====================

/// v1.2 P1：target_type 接受 inventory/purchases/sales/suppliers/customers（None 或非法值时回退 products）
#[tauri::command]
pub fn import_create_batch(
    db: State<'_, Mutex<Database>>,
    file_name: String,
    file_type: String,
    file_size: Option<i64>,
    file_hash: Option<String>,
    total_rows: i64,
    conflict_strategy: String,
    target_type: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let strategy = ConflictStrategy::from_str(&conflict_strategy);
    let strategy_str = match strategy {
        ConflictStrategy::Skip => "skip",
        ConflictStrategy::Overwrite => "overwrite",
        ConflictStrategy::Duplicate => "duplicate",
    };

    // v1.2 P1: 接受 target_type，未传或非法值时回退到 'products'（向后兼容 MVP）
    let target = target_type
        .as_deref()
        .filter(|s| is_valid_target(s))
        .unwrap_or(crate::import::TARGET_PRODUCTS);

    conn.execute(
        "INSERT INTO import_batches
         (id, file_name, file_type, file_size, file_hash, total_rows, conflict_strategy, target_type, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')",
        params![id, file_name, file_type, file_size, file_hash, total_rows, strategy_str, target],
    )
    .map_err(|e| format!("创建 import batch 失败：{}", e))?;

    Ok(id)
}

// ==================== 2. import_update_mapping ====================

#[tauri::command]
pub fn import_update_mapping(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
    mapping: Vec<FieldMapping>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let json = serde_json::to_string(&mapping).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE import_batches SET mapping_json = ?1, status = 'mapping' WHERE id = ?2",
        params![json, batch_id],
    )
    .map_err(|e| format!("更新 mapping 失败：{}", e))?;
    Ok(())
}

// ==================== 3. import_validate ====================

#[tauri::command]
pub fn import_validate(request: ImportRequest) -> Result<Vec<ImportError>, String> {
    Ok(validator::validate_request(&request))
}

// ==================== 4. import_execute ====================

#[tauri::command]
pub fn import_execute(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
    request: ImportRequest,
) -> Result<ImportResult, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 更新 batch 状态为 importing
    conn.execute(
        "UPDATE import_batches SET status = 'importing', started_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| e.to_string())?;

    let result = executor::execute(conn, &batch_id, &request)?;
    Ok(result)
}

// ==================== 5. import_get_batch ====================

#[tauri::command]
pub fn import_get_batch(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
) -> Result<Option<ImportBatch>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let result = conn
        .query_row(
            "SELECT id, user_id, file_name, file_hash, file_size, file_type, target_type,
                    mapping_json, conflict_strategy, status, total_rows, success_rows,
                    failed_rows, skipped_rows, started_at, finished_at, error_report_json, created_at,
                    last_heartbeat_at, processed_rows, paused_reason
             FROM import_batches WHERE id = ?1",
            params![batch_id],
            |row| {
                Ok(ImportBatch {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    file_name: row.get(2)?,
                    file_hash: row.get(3)?,
                    file_size: row.get(4)?,
                    file_type: row.get(5)?,
                    target_type: row.get(6)?,
                    mapping_json: row.get(7)?,
                    conflict_strategy: row.get(8)?,
                    status: row.get(9)?,
                    total_rows: row.get(10)?,
                    success_rows: row.get(11)?,
                    failed_rows: row.get(12)?,
                    skipped_rows: row.get(13)?,
                    started_at: row.get(14)?,
                    finished_at: row.get(15)?,
                    error_report_json: row.get(16)?,
                    created_at: row.get(17)?,
                    last_heartbeat_at: row.get(18)?,
                    processed_rows: row.get(19)?,
                    paused_reason: row.get(20)?,
                })
            },
        )
        .ok();
    Ok(result)
}

// ==================== 6. import_list_batches ====================

#[tauri::command]
pub fn import_list_batches(
    db: State<'_, Mutex<Database>>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ImportBatch>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let limit = limit.unwrap_or(20).clamp(1, 100);
    let offset = offset.unwrap_or(0).max(0);

    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, file_name, file_hash, file_size, file_type, target_type,
                    mapping_json, conflict_strategy, status, total_rows, success_rows,
                    failed_rows, skipped_rows, started_at, finished_at, error_report_json, created_at,
                    last_heartbeat_at, processed_rows, paused_reason
             FROM import_batches
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit, offset], |row| {
            Ok(ImportBatch {
                id: row.get(0)?,
                user_id: row.get(1)?,
                file_name: row.get(2)?,
                file_hash: row.get(3)?,
                file_size: row.get(4)?,
                file_type: row.get(5)?,
                target_type: row.get(6)?,
                mapping_json: row.get(7)?,
                conflict_strategy: row.get(8)?,
                status: row.get(9)?,
                total_rows: row.get(10)?,
                success_rows: row.get(11)?,
                failed_rows: row.get(12)?,
                skipped_rows: row.get(13)?,
                started_at: row.get(14)?,
                finished_at: row.get(15)?,
                error_report_json: row.get(16)?,
                created_at: row.get(17)?,
                last_heartbeat_at: row.get(18)?,
                processed_rows: row.get(19)?,
                paused_reason: row.get(20)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

// ==================== 7. import_rollback ====================

#[tauri::command]
pub fn import_rollback(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
) -> Result<usize, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let count = executor::rollback_batch(conn, &batch_id)?;
    Ok(count)
}

// ==================== v1.3 Import Center：pause / resume / cancel / retry ====================

/// 通用：读取一个 batch 行的当前状态字段，供校验转换合法性
fn current_status(
    conn: &rusqlite::Connection,
    batch_id: &str,
) -> Result<String, String> {
    conn.query_row(
        "SELECT status FROM import_batches WHERE id = ?1",
        params![batch_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("查询 batch 状态失败：{}", e))
}

/// v1.3：从 `&Connection` 直接读取单个 batch（避免在已持锁场景下嵌套调用 `import_get_batch`）
fn fetch_batch(
    conn: &rusqlite::Connection,
    batch_id: &str,
) -> Result<Option<ImportBatch>, String> {
    let result = conn
        .query_row(
            "SELECT id, user_id, file_name, file_hash, file_size, file_type, target_type,
                    mapping_json, conflict_strategy, status, total_rows, success_rows,
                    failed_rows, skipped_rows, started_at, finished_at, error_report_json, created_at,
                    last_heartbeat_at, processed_rows, paused_reason
             FROM import_batches WHERE id = ?1",
            params![batch_id],
            |row| {
                Ok(ImportBatch {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    file_name: row.get(2)?,
                    file_hash: row.get(3)?,
                    file_size: row.get(4)?,
                    file_type: row.get(5)?,
                    target_type: row.get(6)?,
                    mapping_json: row.get(7)?,
                    conflict_strategy: row.get(8)?,
                    status: row.get(9)?,
                    total_rows: row.get(10)?,
                    success_rows: row.get(11)?,
                    failed_rows: row.get(12)?,
                    skipped_rows: row.get(13)?,
                    started_at: row.get(14)?,
                    finished_at: row.get(15)?,
                    error_report_json: row.get(16)?,
                    created_at: row.get(17)?,
                    last_heartbeat_at: row.get(18)?,
                    processed_rows: row.get(19)?,
                    paused_reason: row.get(20)?,
                })
            },
        )
        .ok();
    Ok(result)
}

/// v1.3：暂停导入任务（核心 SQL 逻辑）
///
/// - 仅允许从 `importing` / `pending` / `retrying` 转为 `paused`
/// - 写入 `paused_reason` 与 `last_heartbeat_at`
/// - executor 每 100 行会检查此状态并自动退出循环
pub fn pause_impl(
    conn: &rusqlite::Connection,
    batch_id: &str,
    reason: Option<String>,
) -> Result<ImportBatch, String> {
    let current = current_status(conn, batch_id)?;
    if !matches!(current.as_str(), "importing" | "pending" | "retrying") {
        return Err(format!(
            "当前状态 '{}' 不允许暂停（仅 importing/pending/retrying 可暂停）",
            current
        ));
    }

    let reason_str = reason.unwrap_or_else(|| "用户主动暂停".to_string());
    conn.execute(
        "UPDATE import_batches
         SET status = 'paused', paused_reason = ?1, last_heartbeat_at = CURRENT_TIMESTAMP
         WHERE id = ?2",
        params![reason_str, batch_id],
    )
    .map_err(|e| format!("暂停失败：{}", e))?;

    fetch_batch(conn, batch_id)?
        .ok_or_else(|| "暂停后无法读取 batch".to_string())
}

#[tauri::command]
pub fn import_pause(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
    reason: Option<String>,
) -> Result<ImportBatch, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    pause_impl(db.connection(), &batch_id, reason)
}

/// v1.3：继续导入任务（核心 SQL 逻辑）
///
/// - 仅允许从 `paused` 转为 `pending`（队列等待重新执行）
/// - 真正继续处理由前端重新调用 `import_execute` 触发（同 batch_id 复用即可）
pub fn resume_impl(
    conn: &rusqlite::Connection,
    batch_id: &str,
) -> Result<ImportBatch, String> {
    let current = current_status(conn, batch_id)?;
    if current != "paused" {
        return Err(format!(
            "当前状态 '{}' 不允许继续（仅 paused 可继续）",
            current
        ));
    }

    conn.execute(
        "UPDATE import_batches
         SET status = 'pending', paused_reason = NULL, last_heartbeat_at = CURRENT_TIMESTAMP
         WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| format!("继续失败：{}", e))?;

    fetch_batch(conn, batch_id)?
        .ok_or_else(|| "继续后无法读取 batch".to_string())
}

#[tauri::command]
pub fn import_resume(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
) -> Result<ImportBatch, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    resume_impl(db.connection(), &batch_id)
}

/// v1.3：取消导入任务（核心 SQL 逻辑）
///
/// - 允许从 `pending` / `importing` / `paused` / `retrying` 转为 `cancelled`
/// - 取消后 executor 下次心跳检查时会停止写入新行（若尚未结束）
pub fn cancel_impl(
    conn: &rusqlite::Connection,
    batch_id: &str,
) -> Result<ImportBatch, String> {
    let current = current_status(conn, batch_id)?;
    if matches!(
        current.as_str(),
        "success" | "failed" | "cancelled" | "partial"
    ) {
        return Err(format!(
            "当前状态 '{}' 已是终态，无需取消",
            current
        ));
    }

    conn.execute(
        "UPDATE import_batches
         SET status = 'cancelled', finished_at = CURRENT_TIMESTAMP,
             paused_reason = COALESCE(paused_reason, '用户取消')
         WHERE id = ?1",
        params![batch_id],
    )
    .map_err(|e| format!("取消失败：{}", e))?;

    fetch_batch(conn, batch_id)?
        .ok_or_else(|| "取消后无法读取 batch".to_string())
}

#[tauri::command]
pub fn import_cancel(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
) -> Result<ImportBatch, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    cancel_impl(db.connection(), &batch_id)
}

/// v1.3：重试失败的导入（核心 SQL 逻辑）
///
/// - 仅允许从 `failed` / `partial` / `cancelled` 重试
/// - 复制原 batch 的 file_name / file_hash / file_size / file_type / target_type / mapping_json
/// - 创建新 batch（id 重新生成），重置 status='pending'、计数清零
/// - 返回新 batch_id
pub fn retry_impl(
    conn: &rusqlite::Connection,
    batch_id: &str,
    conflict_strategy: Option<String>,
) -> Result<String, String> {
    // 读取原 batch
    let src: (String, Option<String>, Option<i64>, String, String, Option<String>, String) = conn
        .query_row(
            "SELECT file_name, file_hash, file_size, file_type, target_type,
                    mapping_json, conflict_strategy
             FROM import_batches WHERE id = ?1",
            params![batch_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .map_err(|e| format!("查询原 batch 失败：{}", e))?;

    let current = current_status(conn, batch_id)?;
    if !matches!(current.as_str(), "failed" | "partial" | "cancelled") {
        return Err(format!(
            "当前状态 '{}' 不允许重试（仅 failed/partial/cancelled 可重试）",
            current
        ));
    }

    let new_id = Uuid::new_v4().to_string();
    let new_strategy = conflict_strategy.unwrap_or(src.6);

    conn.execute(
        "INSERT INTO import_batches
         (id, file_name, file_hash, file_size, file_type, target_type,
          mapping_json, conflict_strategy, status, processed_rows)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', 0)",
        params![
            new_id,
            src.0,
            src.1,
            src.2,
            src.3,
            src.4,
            src.5,
            new_strategy
        ],
    )
    .map_err(|e| format!("创建重试 batch 失败：{}", e))?;

    Ok(new_id)
}

#[tauri::command]
pub fn import_retry(
    db: State<'_, Mutex<Database>>,
    batch_id: String,
    conflict_strategy: Option<String>,
) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    retry_impl(db.connection(), &batch_id, conflict_strategy)
}

// ==================== 辅助：导入已完成（前端用） ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportSummary {
    pub batch_id: String,
    pub total: i64,
    pub success: i64,
    pub failed: i64,
    pub skipped: i64,
    pub status: String,
}

// ==================== 8. import_extract_images（v1.3 新增）====================

/// 允许的图片扩展名白名单
const IMAGE_EXT_ALLOWLIST: &[&str] = &["png", "jpg", "jpeg", "webp"];

/// 获取 AppData 下 import_images 目录
fn import_images_root() -> Result<std::path::PathBuf, String> {
    let proj_dirs = ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取 AppData 路径".to_string())?;
    let root = proj_dirs.data_dir().join("import_images");
    fs::create_dir_all(&root)
        .map_err(|e| format!("创建 import_images 目录失败：{}", e))?;
    Ok(root)
}

/// 解析文件名得到 SPU / SKU 编码
///
/// 约定 1：`SPU_x.png` → spu=SPU
/// 约定 2：`SPU_SKU_x.png` 或 `SPU-SKU-x.png` → spu=SPU, sku=SKU
/// 约定 3：`a/b/c/SPU_x.png`（含子目录）→ 同上，取最后一段
/// v1.3：解析图片文件名约定
///
/// 约定 1：`SPU_x.png` → spu=SPU（第二段不是 SKU 关键字，视为别名/用途后缀）
/// 约定 2：`SPU_SKU[-anything]_rest.png` → spu=SPU, sku=SKU（去掉 `-` 后的细分）
/// 约定 3：`a/b/c/SPU_x.png`（含子目录）→ 取最后一段后按约定 1/2 处理
/// 约定 4：`SPU-SKU.png`（仅横线）→ spu=SPU, sku=SKU
///
/// 判定：split 后第二段若以字面量 "SKU" 开头，则为 SKU 编码；否则视为普通别名。
fn parse_image_name(archive_name: &str) -> (Option<String>, Option<String>) {
    // 去掉子目录路径
    let base = archive_name.rsplit(['/', '\\']).next().unwrap_or(archive_name);
    // 去掉扩展名
    let stem = base.rsplit_once('.').map(|(s, _)| s).unwrap_or(base);

    // 按 _ 拆分（首段 = SPU 候选，第二段可能为 SKU）
    let mut primary = stem.split('_').filter(|s| !s.is_empty());
    let first_raw = primary.next().map(|s| s.to_string());
    let second_raw = primary.next().map(|s| s.to_string());

    // SPU 解析：优先取 _ 后的第二段；若只有一段，再尝试按 - 拆（约定 4）
    let (spu, sku) = match (first_raw, second_raw) {
        (Some(first), Some(second)) => {
            // 约定 1/2/3: first_raw 是 SPU, second_raw 可能是 SKU
            let sku_candidate = sku_marker(&second);
            (Some(first), sku_candidate)
        }
        (Some(only), None) => {
            // 只有一段（无下划线），尝试按 - 拆（约定 4: SPU-SKU）
            let mut dash_parts = only.split('-').filter(|s| !s.is_empty());
            let spu_candidate = dash_parts.next().map(|s| s.to_string());
            let sku_candidate = dash_parts.next().and_then(sku_marker);
            (spu_candidate, sku_candidate)
        }
        (None, _) => (None, None),
    };

    (spu, sku)
}

/// 判定第二段是否为 SKU 编码（以字面量 "SKU" 开头），是则返回 Some("SKU")
fn sku_marker(seg: &str) -> Option<String> {
    // 去掉 "-..." 后缀（如 "SKU-A" → "SKU"）
    let key = seg.split('-').next().unwrap_or(seg);
    if key.eq_ignore_ascii_case("SKU") {
        Some(key.to_string())
    } else {
        None
    }
}

/// v1.3：解压用户上传的图片 zip 包，返回 manifest
///
/// - 接收 zip 字节数组 + 原文件名
/// - 写 `<app_data>/import_images/<sha256>.zip` 备份
/// - 解压到 `<app_data>/import_images/<sha256>/`
/// - 过滤白名单（png/jpg/jpeg/webp）
/// - 解析文件名约定：`<SPU>[_<SKU>]_<任意>.png`
/// - 返回 `ImageArchiveManifest`，前端把它传给 `import_execute`
#[tauri::command]
pub fn import_extract_images(file_name: String, file_bytes: Vec<u8>) -> Result<ImageArchiveManifest, String> {
    // 1. 计算 SHA-256
    let mut hasher = Sha256::new();
    hasher.update(&file_bytes);
    let hash = format!("{:x}", hasher.finalize());
    let short = &hash[..16]; // 取前 16 位作为目录名

    // 保留 file_name 供错误信息使用（v1.3：仅记录，未来用于审计/回溯）
    let _archive_label = file_name;

    // 2. 写入 zip 备份
    let root = import_images_root()?;
    let zip_path = root.join(format!("{}.zip", short));
    if !zip_path.exists() {
        let mut f = File::create(&zip_path)
            .map_err(|e| format!("写入 zip 备份失败：{}", e))?;
        f.write_all(&file_bytes)
            .map_err(|e| format!("写入 zip 备份失败：{}", e))?;
    }

    // 3. 解压目录
    let extract_dir = root.join(short);
    fs::create_dir_all(&extract_dir)
        .map_err(|e| format!("创建解压目录失败：{}", e))?;

    // 4. 解析 zip
    let cursor = std::io::Cursor::new(file_bytes);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("打开 zip 失败：{}", e))?;

    let mut entries: Vec<ImageManifestEntry> = Vec::new();
    let mut total_size: u64 = 0;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("读取 zip entry {} 失败：{}", i, e))?;
        let archive_name = file.name().to_string();

        // 跳过目录条目
        if file.is_dir() {
            continue;
        }

        // 白名单校验（按扩展名）
        let ext = archive_name
            .rsplit_once('.')
            .map(|(_, e)| e.to_lowercase())
            .unwrap_or_default();
        if !IMAGE_EXT_ALLOWLIST.contains(&ext.as_str()) {
            continue;
        }

        // 跳过路径穿越（zip slip 防护）
        let safe_name = archive_name
            .replace('\\', "/")
            .split('/')
            .filter(|s| !s.is_empty() && *s != ".." && *s != ".")
            .collect::<Vec<_>>()
            .join("/");
        if safe_name.is_empty() {
            continue;
        }

        // 写入文件
        let out_path = extract_dir.join(&safe_name);
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).ok();
        }
        let mut out = File::create(&out_path)
            .map_err(|e| format!("写入 {} 失败：{}", out_path.display(), e))?;
        let mut buf = Vec::with_capacity(file.size() as usize);
        file.read_to_end(&mut buf)
            .map_err(|e| format!("读取 {} 失败：{}", archive_name, e))?;
        out.write_all(&buf)
            .map_err(|e| format!("写入 {} 失败：{}", out_path.display(), e))?;
        let size = buf.len() as u64;
        total_size += size;

        // 解析 SPU / SKU
        let (spu_code, sku_code) = parse_image_name(&safe_name);

        entries.push(ImageManifestEntry {
            archive_name: safe_name,
            spu_code,
            sku_code,
            size_bytes: size,
            local_path: out_path.to_string_lossy().to_string(),
        });
    }

    let manifest = ImageArchiveManifest {
        archive_dir: extract_dir.to_string_lossy().to_string(),
        entries,
        total_size,
    };

    // v1.3：持久化 manifest.json 到 extract_dir，供后续 import_execute 读取
    write_manifest_to_disk(&extract_dir, &manifest)?;

    Ok(manifest)
}

/// v1.3：把 manifest 持久化到 extract_dir/manifest.json（供后续 import_execute 复用）
fn write_manifest_to_disk(
    extract_dir: &std::path::Path,
    manifest: &ImageArchiveManifest,
) -> Result<(), String> {
    let json = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("序列化 manifest 失败：{}", e))?;
    let manifest_path = extract_dir.join("manifest.json");
    fs::write(&manifest_path, json)
        .map_err(|e| format!("写入 manifest.json 失败：{}", e))?;
    Ok(())
}

/// v1.3：从 `<app_data>/import_images/<hash>/manifest.json` 读取已落盘的清单
///
/// - `relative_path` 即 `ImportRequest.image_archive` 字段（如 `import_images/abc123`）
/// - 解析为绝对路径并读取 manifest.json
/// - 文件缺失 / JSON 损坏时返回明确错误（不是 silently 跳过）
pub fn load_image_archive(relative_path: &str) -> Result<ImageArchiveManifest, String> {
    let proj_dirs = ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取 AppData 路径".to_string())?;
    let manifest_path = proj_dirs
        .data_dir()
        .join(relative_path)
        .join("manifest.json");
    if !manifest_path.exists() {
        return Err(format!(
            "manifest.json 不存在：{}（请确认 zip 解压成功）",
            manifest_path.display()
        ));
    }
    let bytes = fs::read(&manifest_path)
        .map_err(|e| format!("读取 manifest.json 失败：{}", e))?;
    let manifest: ImageArchiveManifest = serde_json::from_slice(&bytes)
        .map_err(|e| format!("解析 manifest.json 失败：{}", e))?;
    Ok(manifest)
}

// ==================== v1.3 C1：导入模板列表与下载 ====================

/// 模板目录根（AppData 内）
///
/// - 默认：`<app_data>/import_templates/`
/// - 测试覆盖：当 env `PROCLAW_TEMPLATE_DIR` 已设置时直接复用（不再走 AppData 路径）
fn import_templates_root() -> Result<std::path::PathBuf, String> {
    if let Ok(custom) = std::env::var("PROCLAW_TEMPLATE_DIR") {
        if !custom.is_empty() {
            let p = std::path::PathBuf::from(custom);
            fs::create_dir_all(&p)
                .map_err(|e| format!("创建 PROCLAW_TEMPLATE_DIR 失败：{}", e))?;
            return Ok(p);
        }
    }
    let proj_dirs = ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取 AppData 路径".to_string())?;
    let root = proj_dirs.data_dir().join(crate::import::types::TEMPLATE_DIR_NAME);
    fs::create_dir_all(&root)
        .map_err(|e| format!("创建 import_templates 目录失败：{}", e))?;
    Ok(root)
}

/// v1.3 C2：定位模板源目录（exe 资源 / dev public）
///
/// - 优先级 1：`<exe_dir>/resources/templates/`（prod 打包后）
/// - 优先级 2：向上找 `public/templates/`（dev 模式 current_exe 在 target/debug 下）
/// - 优先级 3：Cargo manifest 父目录的 `public/templates/`（cargo test 场景）
fn locate_template_source() -> Option<std::path::PathBuf> {
    // 1) prod: <exe_dir>/resources/templates
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let prod = exe_dir.join("resources").join(crate::import::types::TEMPLATE_DIR_NAME);
            if prod.is_dir() {
                return Some(prod);
            }
            // 2) dev (target/debug/proclaw-desktop.exe) -> ../../../public/templates
            let dev = exe_dir
                .join("..")
                .join("..")
                .join("..")
                .join("public")
                .join("templates");
            if dev.is_dir() {
                if let Ok(canonical) = dev.canonicalize() {
                    return Some(canonical);
                }
                return Some(dev);
            }
        }
    }
    // 3) CARGO_MANIFEST_DIR 兼容（cargo test）
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let p = std::path::PathBuf::from(manifest)
            .join("..")
            .join("public")
            .join("templates");
        if p.is_dir() {
            if let Ok(canonical) = p.canonicalize() {
                return Some(canonical);
            }
            return Some(p);
        }
    }
    None
}

/// v1.3 C2：把源目录里的 5 套模板 + examples.zip 拷贝到 AppData/import_templates
///
/// - 跳过已存在文件（避免覆盖用户修改）
/// - 源目录不存在 → 返回 0（不报错）
/// - 调用方：main.rs 的 setup() 钩子（首次启动）
#[tauri::command]
pub fn import_setup_templates() -> Result<usize, String> {
    let dest = import_templates_root()?;
    let src = match locate_template_source() {
        Some(s) => s,
        None => {
            eprintln!(
                "[v1.3 C2] 模板源目录未找到（{} 与 dev 路径都不存在），跳过首次启动拷贝",
                crate::import::types::TEMPLATE_DIR_NAME
            );
            return Ok(0);
        }
    };

    let entries = match fs::read_dir(&src) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("[v1.3 C2] 读取模板源目录失败：{}", e);
            return Ok(0);
        }
    };

    let mut copied = 0usize;
    for entry in entries.flatten() {
        let src_path = entry.path();
        if !src_path.is_file() {
            continue;
        }
        let file_name = match src_path.file_name().and_then(|s| s.to_str()) {
            Some(n) => n,
            None => continue,
        };
        // 只拷贝 .xlsx 和 examples.zip；其余（如 README）跳过
        let is_template = file_name.ends_with(crate::import::types::TEMPLATE_FILENAME_SUFFIX);
        let is_examples = file_name == crate::import::types::EXAMPLES_ZIP_NAME;
        if !is_template && !is_examples {
            continue;
        }
        let dest_path = dest.join(file_name);
        if dest_path.exists() {
            // 已存在：跳过（避免覆盖）
            continue;
        }
        if let Err(e) = fs::copy(&src_path, &dest_path) {
            eprintln!(
                "[v1.3 C2] 拷贝 {} 失败：{}",
                file_name, e
            );
            continue;
        }
        copied += 1;
    }
    eprintln!(
        "[v1.3 C2] 已从 {} 拷贝 {} 个模板到 {}",
        src.display(),
        copied,
        dest.display()
    );
    Ok(copied)
}

/// 计算文件 SHA-256（同步）
fn sha256_of_file(path: &std::path::Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("读取文件失败：{}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

/// 从文件名 `<name>-template.xlsx` 中提取模板 ID（去掉 `-template.xlsx` 后缀）
fn extract_template_name(file_name: &str) -> Option<String> {
    if !file_name.ends_with(crate::import::types::TEMPLATE_FILENAME_SUFFIX) {
        return None;
    }
    let stem = file_name
        .strip_suffix(crate::import::types::TEMPLATE_FILENAME_SUFFIX)?;
    if stem.is_empty() {
        return None;
    }
    Some(stem.to_string())
}

/// 纯函数版：扫描指定目录，返回所有 `<name>-template.xlsx` 模板元数据
///
/// - 跳过非文件条目
/// - 文件名不符合 `<name>-template.xlsx` 约定的跳过
/// - target_type 通过 `TEMPLATE_DEFINITIONS` 反查；找不到时回退为 name
/// - 按 `TEMPLATE_DEFINITIONS` 顺序排序
pub fn list_templates_at(root: &std::path::Path) -> Vec<ImportTemplate> {
    let entries = match fs::read_dir(root) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };
    let mut templates: Vec<ImportTemplate> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let file_name = match path.file_name().and_then(|s| s.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        let name = match extract_template_name(&file_name) {
            Some(n) => n,
            None => continue,
        };
        let target_type = crate::import::types::TEMPLATE_DEFINITIONS
            .iter()
            .find(|(id, _, _)| *id == name)
            .map(|(_, t, _)| t.to_string())
            .unwrap_or_else(|| name.clone());
        let size_bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let sha256 = sha256_of_file(&path).unwrap_or_default();
        templates.push(ImportTemplate {
            name,
            target_type,
            file_name,
            size_bytes,
            sha256,
        });
    }
    templates.sort_by_key(|t| {
        crate::import::types::TEMPLATE_DEFINITIONS
            .iter()
            .position(|(id, _, _)| *id == t.name)
            .unwrap_or(usize::MAX)
    });
    templates
}

/// 纯函数版：读取指定目录下 `<name>-template.xlsx` 的字节内容
pub fn read_template_bytes_at(root: &std::path::Path, name: &str) -> Result<TemplateBytes, String> {
    if name.is_empty() {
        return Err("模板名不能为空".to_string());
    }
    let file_name = format!("{}{}", name, crate::import::types::TEMPLATE_FILENAME_SUFFIX);
    let path = root.join(&file_name);
    if !path.exists() {
        return Err(format!("模板文件不存在：{}", path.display()));
    }
    let bytes = fs::read(&path).map_err(|e| format!("读取模板失败：{}", e))?;
    Ok(TemplateBytes { file_name, bytes })
}

/// 纯函数版：读取指定目录下 `examples.zip` 的字节内容
pub fn read_examples_zip_at(root: &std::path::Path) -> Result<TemplateBytes, String> {
    let path = root.join(crate::import::types::EXAMPLES_ZIP_NAME);
    if !path.exists() {
        return Err(format!("examples.zip 不存在：{}", path.display()));
    }
    let bytes = fs::read(&path).map_err(|e| format!("读取 examples.zip 失败：{}", e))?;
    Ok(TemplateBytes {
        file_name: crate::import::types::EXAMPLES_ZIP_NAME.to_string(),
        bytes,
    })
}

/// v1.3 C1：扫描 `<app_data>/import_templates/` 目录，返回所有模板的元数据
///
/// - 文件命名约定：`<name>-template.xlsx`
/// - 每个模板对应 `ImportTemplate { name, target_type, file_name, size_bytes, sha256 }`
/// - 目录不存在 → 返回空数组（首次启动 / 资源未拷贝时不报错）
#[tauri::command]
pub fn import_list_templates() -> Result<Vec<ImportTemplate>, String> {
    let root = match import_templates_root() {
        Ok(r) => r,
        Err(_) => return Ok(Vec::new()), // 无法获取 AppData 时返回空，不阻塞 UI
    };
    Ok(list_templates_at(&root))
}

/// v1.3 C1：根据 `name` 读取模板文件字节内容（前端保存对话框用）
///
/// - 返回 `{ file_name, bytes: number[] }` 让前端用 `tauri-plugin-dialog` 保存
#[derive(Debug, Serialize)]
pub struct TemplateBytes {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[tauri::command]
pub fn import_get_template_bytes(name: String) -> Result<TemplateBytes, String> {
    let root = import_templates_root()?;
    read_template_bytes_at(&root, &name)
}

/// v1.3 C1：获取 examples.zip（5 套模板 + 10 张示例图片）
#[tauri::command]
pub fn import_get_examples_zip() -> Result<TemplateBytes, String> {
    let root = import_templates_root()?;
    read_examples_zip_at(&root)
}

// ==================== v1.3 单测 ====================

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write as IoWrite;

    /// 构造一个简单的内存 zip（含 3 张图片 + 1 个非白名单文件）
    fn build_test_zip() -> Vec<u8> {
        let mut buf = std::io::Cursor::new(Vec::new());
        {
            let mut zip = zip::ZipWriter::new(&mut buf);
            let opts: zip::write::FileOptions = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Stored);
            zip.start_file("SP001_main.png", opts).unwrap();
            zip.write_all(b"\x89PNG\r\n\x1a\nfake-png-bytes-1").unwrap();
            zip.start_file("SP002_SKU-A_thumb.jpg", opts).unwrap();
            zip.write_all(b"\xff\xd8\xff\xe0fake-jpeg").unwrap();
            zip.start_file("note.txt", opts).unwrap();
            zip.write_all(b"should be skipped").unwrap();
            zip.start_file("SP003.svg", opts).unwrap();
            zip.write_all(b"<svg></svg>").unwrap(); // 不在白名单
            zip.finish().unwrap();
        }
        buf.into_inner()
    }

    #[test]
    fn test_parse_image_name_variants() {
        // 单段：SPU
        let (spu, sku) = parse_image_name("SP001_main.png");
        assert_eq!(spu.as_deref(), Some("SP001"));
        assert!(sku.is_none());

        // 双段：SPU + SKU
        let (spu, sku) = parse_image_name("SP002_SKU-A_thumb.jpg");
        assert_eq!(spu.as_deref(), Some("SP002"));
        assert_eq!(sku.as_deref(), Some("SKU"));

        // 带子目录
        let (spu, sku) = parse_image_name("foo/bar/SP003.png");
        assert_eq!(spu.as_deref(), Some("SP003"));
        assert!(sku.is_none());

        // 横线分隔
        let (spu, sku) = parse_image_name("SP004-SKU.png");
        assert_eq!(spu.as_deref(), Some("SP004"));
        assert_eq!(sku.as_deref(), Some("SKU"));

        // 无扩展名
        let (spu, sku) = parse_image_name("SP005");
        assert_eq!(spu.as_deref(), Some("SP005"));
        assert!(sku.is_none());
    }

    #[test]
    fn test_image_ext_allowlist() {
        // 白名单成员
        assert!(IMAGE_EXT_ALLOWLIST.contains(&"png"));
        assert!(IMAGE_EXT_ALLOWLIST.contains(&"jpg"));
        assert!(IMAGE_EXT_ALLOWLIST.contains(&"jpeg"));
        assert!(IMAGE_EXT_ALLOWLIST.contains(&"webp"));
        // 非白名单
        assert!(!IMAGE_EXT_ALLOWLIST.contains(&"svg"));
        assert!(!IMAGE_EXT_ALLOWLIST.contains(&"gif"));
        assert!(!IMAGE_EXT_ALLOWLIST.contains(&"bmp"));
    }

    #[test]
    fn test_import_extract_images_real_zip() {
        let bytes = build_test_zip();
        let manifest = import_extract_images("products.zip".to_string(), bytes)
            .expect("extract should succeed");

        // 仅 2 张图（note.txt / SP003.svg 被过滤）
        assert_eq!(manifest.entries.len(), 2, "应当只保留 png/jpg");

        let names: Vec<&str> = manifest
            .entries
            .iter()
            .map(|e| e.archive_name.as_str())
            .collect();
        assert!(names.contains(&"SP001_main.png"));
        assert!(names.contains(&"SP002_SKU-A_thumb.jpg"));

        // SPU 解析正确
        let sp001 = manifest.entries.iter().find(|e| e.archive_name == "SP001_main.png").unwrap();
        assert_eq!(sp001.spu_code.as_deref(), Some("SP001"));
        assert!(sp001.sku_code.is_none());

        let sp002 = manifest.entries.iter().find(|e| e.archive_name == "SP002_SKU-A_thumb.jpg").unwrap();
        assert_eq!(sp002.spu_code.as_deref(), Some("SP002"));
        assert_eq!(sp002.sku_code.as_deref(), Some("SKU"));

        // total_size > 0
        assert!(manifest.total_size > 0);

        // archive_dir 指向 AppData 下 import_images/<hash>
        assert!(manifest.archive_dir.contains("import_images"));
    }

    #[test]
    fn test_import_extract_images_idempotent() {
        // 同一字节数组解压两次：第二次应复用目录，entries 数量一致
        let bytes = build_test_zip();
        let m1 = import_extract_images("dup.zip".to_string(), bytes.clone()).unwrap();
        let m2 = import_extract_images("dup.zip".to_string(), bytes).unwrap();
        assert_eq!(m1.archive_dir, m2.archive_dir);
        assert_eq!(m1.entries.len(), m2.entries.len());
    }

    #[test]
    fn test_import_extract_images_empty_zip() {
        // 空 zip：entries 为空
        let bytes = {
            let buf = std::io::Cursor::new(Vec::new());
            let mut zip = zip::ZipWriter::new(buf);
            zip.finish().expect("finish empty zip").into_inner()
        };
        let manifest = import_extract_images("empty.zip".to_string(), bytes).unwrap();
        assert_eq!(manifest.entries.len(), 0);
        assert_eq!(manifest.total_size, 0);
    }

    // ==================== v1.3 B2 状态机转换测试 ====================

    /// 构造最小可用的内存数据库，含 v1.3 扩展后的 import_batches 表
    fn setup_status_machine_db() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE import_batches (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'default',
                file_name TEXT NOT NULL, file_hash TEXT, file_size INTEGER,
                file_type TEXT NOT NULL, target_type TEXT NOT NULL,
                mapping_json TEXT,
                conflict_strategy TEXT DEFAULT 'skip' CHECK(conflict_strategy IN ('skip','overwrite','duplicate')),
                status TEXT DEFAULT 'pending' CHECK(status IN (
                    'pending','parsing','mapping','validating','importing',
                    'paused','retrying',
                    'success','partial','failed','cancelled'
                )),
                total_rows INTEGER DEFAULT 0, success_rows INTEGER DEFAULT 0,
                failed_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0,
                started_at TIMESTAMP, finished_at TIMESTAMP,
                error_report_json TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_heartbeat_at TIMESTAMP, processed_rows INTEGER DEFAULT 0,
                paused_reason TEXT
            );
            "#,
        )
        .expect("建表失败");
        conn
    }

    /// 插入一个指定状态的 batch，返回 batch_id
    fn insert_batch_with_status(
        conn: &rusqlite::Connection,
        file_name: &str,
        status: &str,
    ) -> String {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO import_batches (id, file_name, file_type, target_type, status, mapping_json, conflict_strategy)
             VALUES (?1, ?2, 'xlsx', 'products', ?3, '[]', 'skip')",
            params![id, file_name, status],
        )
        .expect("插入 batch 失败");
        id
    }

    fn read_status(conn: &rusqlite::Connection, id: &str) -> String {
        conn.query_row(
            "SELECT status FROM import_batches WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap()
    }

    fn read_paused_reason(conn: &rusqlite::Connection, id: &str) -> Option<String> {
        conn.query_row(
            "SELECT paused_reason FROM import_batches WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(None)
    }

    // ------- pause_impl 接受/拒绝矩阵 -------

    #[test]
    fn test_pause_accepts_pending() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "a.xlsx", "pending");
        let b = pause_impl(&conn, &id, None).expect("pending 应可暂停");
        assert_eq!(b.status, "paused");
        assert_eq!(b.paused_reason.as_deref(), Some("用户主动暂停"));
        assert!(b.last_heartbeat_at.is_some());
    }

    #[test]
    fn test_pause_accepts_importing() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "b.xlsx", "importing");
        let b = pause_impl(&conn, &id, Some("暂停以修复".to_string())).unwrap();
        assert_eq!(b.status, "paused");
        assert_eq!(b.paused_reason.as_deref(), Some("暂停以修复"));
    }

    #[test]
    fn test_pause_accepts_retrying() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "c.xlsx", "retrying");
        let b = pause_impl(&conn, &id, None).unwrap();
        assert_eq!(b.status, "paused");
    }

    #[test]
    fn test_pause_rejects_terminal_states() {
        // success / failed / cancelled / partial 都不可暂停
        for terminal in ["success", "failed", "cancelled", "partial"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", terminal);
            let r = pause_impl(&conn, &id, None);
            assert!(r.is_err(), "终态 {} 不应可暂停", terminal);
            assert!(r.unwrap_err().contains("不允许暂停"));
        }
    }

    // ------- resume_impl 接受/拒绝矩阵 -------

    #[test]
    fn test_resume_accepts_paused() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "a.xlsx", "paused");
        let b = resume_impl(&conn, &id).expect("paused 应可继续");
        assert_eq!(b.status, "pending");
        assert!(b.paused_reason.is_none(), "resume 后 paused_reason 应清空");
    }

    #[test]
    fn test_resume_rejects_non_paused() {
        // pending / importing / success / failed 都不应可继续
        for st in ["pending", "importing", "success", "failed", "cancelled"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", st);
            let r = resume_impl(&conn, &id);
            assert!(r.is_err(), "状态 {} 不应可继续", st);
            assert!(r.unwrap_err().contains("不允许继续"));
        }
    }

    // ------- cancel_impl 接受/拒绝矩阵 -------

    #[test]
    fn test_cancel_accepts_active_states() {
        for st in ["pending", "importing", "paused", "retrying"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", st);
            let b = cancel_impl(&conn, &id).expect("active 应可取消");
            assert_eq!(b.status, "cancelled");
            assert!(b.finished_at.is_some());
        }
    }

    #[test]
    fn test_cancel_rejects_terminal_states() {
        for terminal in ["success", "failed", "cancelled", "partial"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", terminal);
            let r = cancel_impl(&conn, &id);
            assert!(r.is_err(), "终态 {} 不应可取消", terminal);
            assert!(r.unwrap_err().contains("已是终态"));
        }
    }

    // ------- retry_impl 接受/拒绝 + 元数据复制 -------

    #[test]
    fn test_retry_accepts_failed_and_copies_metadata() {
        let conn = setup_status_machine_db();
        let src_id = insert_batch_with_status(&conn, "products-2026.xlsx", "failed");

        // 给原 batch 添加一些元数据，便于验证是否被复制
        conn.execute(
            "UPDATE import_batches
             SET file_hash = ?1, file_size = ?2, mapping_json = ?3,
                 conflict_strategy = 'overwrite'
             WHERE id = ?4",
            params![
                Some("abc123hash"),
                Some(1024_i64),
                Some(r#"[{"source":"name","target":"spu_name"}]"#),
                src_id
            ],
        )
        .unwrap();

        let new_id = retry_impl(&conn, &src_id, None).expect("failed 应可重试");

        assert_ne!(new_id, src_id, "新 batch_id 必须不同于源");
        assert_eq!(read_status(&conn, &new_id), "pending");
        assert_eq!(read_status(&conn, &src_id), "failed", "源 batch 状态不应被改写");

        // 验证元数据被复制
        let (file_name, file_hash, file_size, strategy, mapping): (
            String,
            Option<String>,
            Option<i64>,
            String,
            Option<String>,
        ) = conn
            .query_row(
                "SELECT file_name, file_hash, file_size, conflict_strategy, mapping_json
                 FROM import_batches WHERE id = ?1",
                params![new_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .unwrap();
        assert_eq!(file_name, "products-2026.xlsx");
        assert_eq!(file_hash.as_deref(), Some("abc123hash"));
        assert_eq!(file_size, Some(1024));
        assert_eq!(strategy, "overwrite");
        assert!(mapping.unwrap().contains("spu_name"));
    }

    #[test]
    fn test_retry_accepts_partial_and_cancelled() {
        for st in ["partial", "cancelled"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", st);
            let new_id = retry_impl(&conn, &id, None).expect("partial/cancelled 应可重试");
            assert_ne!(new_id, id);
            assert_eq!(read_status(&conn, &new_id), "pending");
        }
    }

    #[test]
    fn test_retry_rejects_active_states() {
        // pending / importing / paused / retrying / success 都不可重试
        for st in ["pending", "importing", "paused", "retrying", "success"] {
            let conn = setup_status_machine_db();
            let id = insert_batch_with_status(&conn, "t.xlsx", st);
            let r = retry_impl(&conn, &id, None);
            assert!(r.is_err(), "状态 {} 不应可重试", st);
            assert!(r.unwrap_err().contains("不允许重试"));
        }
    }

    #[test]
    fn test_retry_overrides_conflict_strategy() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "t.xlsx", "failed");
        conn.execute(
            "UPDATE import_batches SET conflict_strategy = 'skip' WHERE id = ?1",
            params![id],
        )
        .unwrap();
        let new_id = retry_impl(&conn, &id, Some("duplicate".to_string())).unwrap();
        let new_strategy: String = conn
            .query_row(
                "SELECT conflict_strategy FROM import_batches WHERE id = ?1",
                params![new_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(new_strategy, "duplicate", "传入 conflict_strategy 应覆盖原值");
    }

    // ------- 端到端：pending → paused → pending → cancelled -------

    #[test]
    fn test_state_machine_full_cycle() {
        let conn = setup_status_machine_db();
        let id = insert_batch_with_status(&conn, "cycle.xlsx", "pending");

        // 1. pending → paused
        pause_impl(&conn, &id, Some("中途中断".to_string())).unwrap();
        assert_eq!(read_status(&conn, &id), "paused");
        assert_eq!(read_paused_reason(&conn, &id).as_deref(), Some("中途中断"));

        // 2. paused → pending（resume 清空 paused_reason）
        resume_impl(&conn, &id).unwrap();
        assert_eq!(read_status(&conn, &id), "pending");
        assert!(read_paused_reason(&conn, &id).is_none());

        // 3. pending → cancelled
        cancel_impl(&conn, &id).unwrap();
        assert_eq!(read_status(&conn, &id), "cancelled");

        // 4. cancelled → 重试生成新 batch
        let new_id = retry_impl(&conn, &id, None).unwrap();
        assert_eq!(read_status(&conn, &new_id), "pending");
    }

    // ------- 边界：未知 batch_id -------

    #[test]
    fn test_pause_unknown_batch_returns_error() {
        let conn = setup_status_machine_db();
        let r = pause_impl(&conn, "nonexistent-id", None);
        assert!(r.is_err());
    }

    #[test]
    fn test_retry_unknown_batch_returns_error() {
        let conn = setup_status_machine_db();
        let r = retry_impl(&conn, "nonexistent-id", None);
        assert!(r.is_err());
    }

    // ==================== v1.3 C1：模板列表与下载单测 ====================

    /// 创建进程级唯一临时目录（避免并行测试冲突）
    fn make_temp_dir(label: &str) -> std::path::PathBuf {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!(
            "proclaw_test_{}_{}_{:?}",
            label,
            std::process::id(),
            nanos
        ));
        let _ = std::fs::remove_dir_all(&dir); // 先清理（如果上次残留）
        std::fs::create_dir_all(&dir).expect("创建临时目录失败");
        dir
    }

    /// 写一个空 xlsx 字节序列（仅用于文件存在性测试）
    fn touch_template(dir: &std::path::Path, name: &str) {
        let file_name = format!("{}{}", name, crate::import::types::TEMPLATE_FILENAME_SUFFIX);
        let path = dir.join(&file_name);
        std::fs::write(&path, b"fake-xlsx-bytes").expect("写入模板失败");
    }

    // ------- extract_template_name（纯函数）边界条件 -------

    #[test]
    fn test_extract_template_name_matches_suffix() {
        assert_eq!(extract_template_name("products-template.xlsx"), Some("products".to_string()));
        assert_eq!(extract_template_name("inventory-template.xlsx"), Some("inventory".to_string()));
        assert_eq!(
            extract_template_name("suppliers-customers-template.xlsx"),
            Some("suppliers-customers".to_string())
        );
    }

    #[test]
    fn test_extract_template_name_rejects_invalid() {
        // 错误后缀
        assert_eq!(extract_template_name("products.xlsx"), None);
        assert_eq!(extract_template_name("products-template.xls"), None);
        // 空 stem
        assert_eq!(extract_template_name("-template.xlsx"), None);
        // 完全没有后缀
        assert_eq!(extract_template_name("products"), None);
        // 函数只做后缀检查，不解析路径分隔符
        // （list_templates_at 永远只传 file_name() 而非完整路径）
        assert_eq!(
            extract_template_name("subdir/products-template.xlsx"),
            Some("subdir/products".to_string())
        );
    }

    // ------- sha256_of_file（文件 I/O）-------

    #[test]
    fn test_sha256_of_file_computes_correct_hash() {
        let dir = make_temp_dir("sha256");
        let p = dir.join("a.txt");
        std::fs::write(&p, b"hello world").unwrap();
        // SHA-256("hello world") 已知值
        let hash = sha256_of_file(&p).expect("sha256 失败");
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_sha256_of_file_errors_for_missing() {
        let dir = make_temp_dir("sha256_missing");
        let p = dir.join("nope.txt");
        assert!(sha256_of_file(&p).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    // ------- list_templates_at（核心逻辑）-------

    #[test]
    fn test_list_templates_at_returns_empty_when_dir_missing() {
        let dir = make_temp_dir("list_empty");
        std::fs::remove_dir_all(&dir).unwrap(); // 故意删除
        let v = list_templates_at(&dir);
        assert!(v.is_empty());
    }

    #[test]
    fn test_list_templates_at_discovers_valid_templates() {
        let dir = make_temp_dir("list_discover");
        for name in ["products", "inventory", "purchases", "sales", "suppliers-customers"] {
            touch_template(&dir, name);
        }
        let v = list_templates_at(&dir);
        assert_eq!(v.len(), 5);
        // 字段：name / target_type / file_name / size_bytes / sha256
        for t in &v {
            assert!(!t.name.is_empty());
            assert!(!t.target_type.is_empty());
            assert!(t.file_name.ends_with("-template.xlsx"));
            assert!(t.size_bytes > 0);
            assert_eq!(t.sha256.len(), 64); // hex 长度
            assert!(t.sha256.chars().all(|c| c.is_ascii_hexdigit()));
        }
        // 5 个 ID 全部命中
        let names: Vec<&str> = v.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"products"));
        assert!(names.contains(&"suppliers-customers"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_templates_at_skips_non_template_files() {
        let dir = make_temp_dir("list_skip");
        touch_template(&dir, "products");
        // 干扰文件
        std::fs::write(dir.join("readme.md"), b"x").unwrap();
        std::fs::write(dir.join("products.xlsx"), b"wrong-suffix").unwrap();
        std::fs::write(dir.join("inventory-template.xls"), b"wrong-ext").unwrap();
        std::fs::create_dir(dir.join("subdir")).unwrap();
        let v = list_templates_at(&dir);
        assert_eq!(v.len(), 1);
        assert_eq!(v[0].name, "products");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_templates_at_sorts_by_definition_order() {
        let dir = make_temp_dir("list_sort");
        // 反向写入：sales → products → inventory（顺序应被 sort 校正为定义顺序）
        touch_template(&dir, "sales");
        touch_template(&dir, "products");
        touch_template(&dir, "inventory");
        let v = list_templates_at(&dir);
        let names: Vec<&str> = v.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, vec!["products", "inventory", "sales"]);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_list_templates_at_resolves_target_type_via_definitions() {
        let dir = make_temp_dir("list_target");
        touch_template(&dir, "products"); // target_type 来自 TEMPLATE_DEFINITIONS
        let v = list_templates_at(&dir);
        assert_eq!(v[0].name, "products");
        assert_eq!(v[0].target_type, crate::import::types::TARGET_PRODUCTS);
        let _ = std::fs::remove_dir_all(&dir);
    }

    // ------- read_template_bytes_at -------

    #[test]
    fn test_read_template_bytes_at_returns_content() {
        let dir = make_temp_dir("read_ok");
        touch_template(&dir, "products");
        let r = read_template_bytes_at(&dir, "products").expect("读取成功");
        assert_eq!(r.file_name, "products-template.xlsx");
        assert_eq!(r.bytes, b"fake-xlsx-bytes");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_read_template_bytes_at_errors_for_empty_name() {
        let dir = make_temp_dir("read_empty");
        let r = read_template_bytes_at(&dir, "");
        assert!(r.is_err());
        assert!(r.unwrap_err().contains("不能为空"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_read_template_bytes_at_errors_for_missing_file() {
        let dir = make_temp_dir("read_missing");
        let r = read_template_bytes_at(&dir, "products");
        assert!(r.is_err());
        assert!(r.unwrap_err().contains("模板文件不存在"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    // ------- read_examples_zip_at -------

    #[test]
    fn test_read_examples_zip_at_returns_content() {
        let dir = make_temp_dir("examples_ok");
        std::fs::write(dir.join("examples.zip"), b"PK\x03\x04fake-zip").unwrap();
        let r = read_examples_zip_at(&dir).expect("读取 examples.zip 成功");
        assert_eq!(r.file_name, "examples.zip");
        assert_eq!(r.bytes, b"PK\x03\x04fake-zip");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_read_examples_zip_at_errors_when_missing() {
        let dir = make_temp_dir("examples_missing");
        let r = read_examples_zip_at(&dir);
        assert!(r.is_err());
        assert!(r.unwrap_err().contains("examples.zip 不存在"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
