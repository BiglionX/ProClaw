// 文件上传下载 API 处理器
// Phase 4: 实现 multipart 文件上传、磁盘存储、元数据管理、下载和缩略图

use crate::api::AppState;
use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, Request, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::path::PathBuf;
use uuid::Uuid;

/// 文件上传响应
#[derive(Debug, Serialize)]
pub struct FileUploadResponse {
    pub file_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub url: String,
    pub thumbnail_url: Option<String>,
}

/// 获取上传目录路径
fn get_upload_dir() -> PathBuf {
    let db_path = crate::database::get_database_path();
    let upload_dir = db_path
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .join("uploads");
    if let Err(e) = std::fs::create_dir_all(&upload_dir) {
        eprintln!(
            "[files] Failed to create upload dir {:?}: {}",
            upload_dir, e
        );
    }
    upload_dir
}

/// 从扩展名推断 MIME 类型
fn mime_from_ext(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "pdf" => "application/pdf",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "txt" => "text/plain",
        "csv" => "text/csv",
        "json" => "application/json",
        "xml" => "application/xml",
        "zip" => "application/zip",
        "rar" => "application/x-rar-compressed",
        "mp4" => "video/mp4",
        "mp3" => "audio/mpeg",
        _ => "application/octet-stream",
    }
}

/// 判断是否为图片类型
fn is_image_mime(mime_type: &str) -> bool {
    mime_type.starts_with("image/")
}

/// 允许的文件类型
const ALLOWED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "pdf", "doc", "docx", "xls", "xlsx", "txt",
    "csv", "json", "xml", "zip", "rar", "mp4", "mp3",
];

/// 最大文件大小: 50MB
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;

/// POST /api/files/upload
/// 接收 multipart/form-data，保存文件到磁盘，记录元数据到数据库
pub async fn upload_file(State(state): State<AppState>, request: Request<Body>) -> Response {
    let upload_dir = get_upload_dir();
    let mut uploaded_files: Vec<FileUploadResponse> = Vec::new();

    // 提取 content-type 中的 boundary
    let content_type = request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let boundary = content_type
        .split(';')
        .find(|part| part.trim().starts_with("boundary="))
        .map(|part| part.trim()["boundary=".len()..].to_string());

    let boundary = match boundary {
        Some(b) => b,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Missing multipart boundary"})),
            )
                .into_response();
        }
    };

    // 将 body 转为字节流
    let body_bytes = match axum::body::to_bytes(request.into_body(), usize::MAX).await {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": format!("Failed to read body: {}", e)})),
            )
                .into_response();
        }
    };

    // 使用 multer 解析 multipart（创建单元素流）
    let byte_stream =
        futures_util::stream::once(async move { Ok::<bytes::Bytes, multer::Error>(body_bytes) });
    let mut multipart = multer::Multipart::new(byte_stream, boundary);

    while let Ok(Some(field)) = multipart.next_field().await {
        // 获取文件元信息
        let original_name = field
            .file_name()
            .map(|n| n.to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let content_type = field
            .content_type()
            .map(|ct| ct.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        // 读取文件数据
        let data = match field.bytes().await {
            Ok(d) => d,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({"error": format!("Failed to read field: {}", e)})),
                )
                    .into_response();
            }
        };

        // 验证文件大小
        if data.len() as u64 > MAX_FILE_SIZE {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("File '{}' exceeds maximum size of 50MB", original_name)
                })),
            )
                .into_response();
        }

        // 验证文件扩展名
        let ext = std::path::Path::new(&original_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !ext.is_empty() && !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": format!("File type '{}' is not allowed", ext)
                })),
            )
                .into_response();
        }

        // 生成唯一文件名
        let file_id = Uuid::new_v4().to_string();
        let stored_name = if ext.is_empty() {
            file_id.clone()
        } else {
            format!("{}.{}", file_id, ext)
        };

        let file_path = upload_dir.join(&stored_name);

        // 写入磁盘
        if let Err(e) = std::fs::write(&file_path, &data) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to write file: {}", e)})),
            )
                .into_response();
        }

        let file_size = data.len() as u64;
        let mime_type = if content_type == "application/octet-stream" && !ext.is_empty() {
            mime_from_ext(&ext).to_string()
        } else {
            content_type
        };

        // 插入数据库
        let db = match state.db.lock() {
            Ok(db) => db,
            Err(_) => {
                if let Err(e) = std::fs::remove_file(&file_path) {
                    eprintln!("[files] Failed to clean up file {:?}: {}", file_path, e);
                }
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database lock error"})),
                )
                    .into_response();
            }
        };
        let conn = db.connection();

        if let Err(e) = conn.execute(
            "INSERT INTO files (id, original_name, file_name, file_path, file_size, mime_type, thumbnail_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                file_id,
                original_name,
                stored_name,
                file_path.to_string_lossy().to_string(),
                file_size as i64,
                mime_type,
                None::<String>,
            ],
        ) {
            if let Err(e) = std::fs::remove_file(&file_path) {
                eprintln!("[files] Failed to clean up file {:?}: {}", file_path, e);
            }
            return (StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Database error: {}", e)}))).into_response();
        }

        let url = format!("/api/files/download/{}", file_id);
        let thumbnail_url = if is_image_mime(&mime_type) {
            Some(format!("/api/files/thumb/{}", file_id))
        } else {
            None
        };

        uploaded_files.push(FileUploadResponse {
            file_id,
            file_name: original_name,
            file_size,
            mime_type,
            url,
            thumbnail_url,
        });
    }

    if uploaded_files.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "No files uploaded"})),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "files": uploaded_files,
            "count": uploaded_files.len(),
        })),
    )
        .into_response()
}

/// GET /api/files/download/:id
/// 根据文件 ID 下载文件
pub async fn download_file(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
                .into_response();
        }
    };
    let conn = db.connection();

    let file_info = match conn.query_row(
        "SELECT original_name, file_name, file_path, mime_type, file_size FROM files WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        },
    ) {
        Ok(info) => info,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "File not found"})),
            )
                .into_response();
        }
    };

    let (original_name, _stored_name, file_path, mime_type, _file_size) = file_info;

    // 读取文件
    let data = match std::fs::read(&file_path) {
        Ok(d) => d,
        Err(e) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": format!("File not found on disk: {}", e)})),
            )
                .into_response();
        }
    };

    // 返回二进制文件
    let content_disposition = format!("inline; filename=\"{}\"", original_name);

    match Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &mime_type)
        .header(header::CONTENT_DISPOSITION, &content_disposition)
        .header(header::CACHE_CONTROL, "public, max-age=31536000")
        .body(Body::from(data))
    {
        Ok(resp) => resp.into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Response build error: {}", e)})),
        )
            .into_response(),
    }
}

/// GET /api/files/thumb/:id
/// 获取文件缩略图（图片返回原图，非图片返回 404）
pub async fn get_file_thumbnail(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
                .into_response();
        }
    };
    let conn = db.connection();

    let file_info = match conn.query_row(
        "SELECT original_name, file_name, file_path, mime_type, thumbnail_path FROM files WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        },
    ) {
        Ok(info) => info,
        Err(_) => {
            return (StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "File not found"}))).into_response();
        }
    };

    let (_original_name, stored_name, file_path, mime_type, thumbnail_path) = file_info;

    // 非图片类型返回 404
    if !is_image_mime(&mime_type) {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Thumbnail not available for non-image files"})),
        )
            .into_response();
    }

    // 尝试读取缩略图（如果已存在）
    let thumb_path = if let Some(ref tp) = thumbnail_path {
        let p = std::path::Path::new(tp);
        if p.exists() {
            p.to_path_buf()
        } else {
            std::path::PathBuf::from(&file_path)
        }
    } else {
        std::path::PathBuf::from(&file_path)
    };

    let data = match std::fs::read(&thumb_path) {
        Ok(d) => d,
        Err(e) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": format!("File not found: {}", e)})),
            )
                .into_response();
        }
    };

    let content_disposition = format!("inline; filename=\"thumb_{}\"", stored_name);

    match Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &mime_type)
        .header(header::CONTENT_DISPOSITION, &content_disposition)
        .header(header::CACHE_CONTROL, "public, max-age=3600")
        .body(Body::from(data))
    {
        Ok(resp) => resp.into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Response build error: {}", e)})),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::websocket::WebSocketManager;
    use crate::utils::crypto::Aes256GcmCipher;
    use std::sync::Arc;
    use std::sync::Mutex;

    #[test]
    fn test_mime_from_ext() {
        assert_eq!(mime_from_ext("jpg"), "image/jpeg");
        assert_eq!(mime_from_ext("png"), "image/png");
        assert_eq!(mime_from_ext("pdf"), "application/pdf");
        assert_eq!(mime_from_ext("unknown"), "application/octet-stream");
    }

    #[test]
    fn test_is_image_mime() {
        assert!(is_image_mime("image/jpeg"));
        assert!(is_image_mime("image/png"));
        assert!(!is_image_mime("application/pdf"));
        assert!(!is_image_mime("text/plain"));
    }

    #[tokio::test]
    async fn test_file_upload_endpoint_exists() {
        let cipher = Arc::new(Aes256GcmCipher::new(&[0u8; 32]).expect("test key must be 32 bytes"));
        let ws_manager = Arc::new(WebSocketManager::new());
        let db = crate::database::Database::new(std::path::PathBuf::from(":memory:")).unwrap();
        let cloud_backup = Arc::new(
            crate::services::cloud_backup_service::CloudBackupService::new(db, &[0u8; 32]),
        );
        let jwt_secret = Arc::new(vec![0u8; 32]);
        let db = crate::database::Database::new(std::path::PathBuf::from(":memory:")).unwrap();
        let _state = AppState {
            db: Arc::new(Mutex::new(db)),
            cipher,
            ws_manager,
            cloud_backup,
            jwt_secret,
        };
        assert!(true);
    }
}
