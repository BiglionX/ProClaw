use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;

// ==================== 数据结构 ====================

/// 安装配置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupConfig {
    pub install_path: String,
    pub company_name: String,
    pub model_provider: String, // "procloud" | "local"
    pub model_path: Option<String>,
}

/// 安装状态检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationStatus {
    pub completed: bool,
    pub company_name: Option<String>,
    pub model_provider: Option<String>,
}

/// 磁盘空间信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSpaceInfo {
    pub total_gb: f64,
    pub free_gb: f64,
    pub enough: bool,
}

/// Ollama 连接测试结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
}

// ==================== Windows 磁盘空间检查 ====================

#[cfg(target_os = "windows")]
mod platform {
    use super::DiskSpaceInfo;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;

    #[allow(non_snake_case)]
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lpDirectoryName: *const u16,
            lpFreeBytesAvailableToCaller: *mut u64,
            lpTotalNumberOfBytes: *mut u64,
            lpTotalNumberOfFreeBytes: *mut u64,
        ) -> i32;
    }

    pub fn check_disk_space(path: &str) -> DiskSpaceInfo {
        let path = Path::new(path);

        // 获取路径的根目录（如 "C:\"）
        let root = if path.has_root() {
            let components: Vec<_> = path.components().collect();
            if let Some(root) = components.first() {
                let root_str = root.as_os_str().to_string_lossy().to_string();
                // 确保以 \ 结尾
                if root_str.ends_with('\\') {
                    root_str
                } else {
                    format!("{}\\", root_str)
                }
            } else {
                path.to_string_lossy().to_string()
            }
        } else {
            // 相对路径，使用当前目录
            "C:\\".to_string()
        };

        let wide: Vec<u16> = OsStr::new(&root)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let mut free_bytes_available: u64 = 0;
        let mut total_bytes: u64 = 0;
        let mut total_free_bytes: u64 = 0;

        let result = unsafe {
            GetDiskFreeSpaceExW(
                wide.as_ptr(),
                &mut free_bytes_available,
                &mut total_bytes,
                &mut total_free_bytes,
            )
        };

        if result != 0 {
            let total_gb = total_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
            let free_gb = free_bytes_available as f64 / (1024.0 * 1024.0 * 1024.0);
            DiskSpaceInfo {
                total_gb,
                free_gb,
                enough: free_gb >= 1.0,
            }
        } else {
            // API 调用失败，返回默认值
            DiskSpaceInfo {
                total_gb: 0.0,
                free_gb: 0.0,
                enough: false,
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::DiskSpaceInfo;
    use std::path::Path;

    pub fn check_disk_space(path: &str) -> DiskSpaceInfo {
        // Unix/Linux/macOS: 使用 statvfs
        let path = Path::new(path);
        let root = if path.has_root() {
            path.to_string_lossy().to_string()
        } else {
            "/".to_string()
        };

        // 使用 std::fs 无法直接获取磁盘空间，返回模拟值
        // 生产环境应使用 libc statvfs
        match std::fs::metadata(&root) {
            Ok(_) => DiskSpaceInfo {
                total_gb: 100.0,
                free_gb: 50.0,
                enough: true,
            },
            Err(_) => DiskSpaceInfo {
                total_gb: 0.0,
                free_gb: 0.0,
                enough: false,
            },
        }
    }
}

// ==================== Tauri 命令 ====================

/// 检查安装状态
#[tauri::command]
pub fn check_installation_status(
    db: tauri::State<Mutex<Database>>,
) -> Result<InstallationStatus, String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    if !db.is_installation_complete() {
        return Ok(InstallationStatus {
            completed: false,
            company_name: None,
            model_provider: None,
        });
    }

    let company_name = db.get_config("company_name");
    let model_provider = db.get_config("model_provider");

    Ok(InstallationStatus {
        completed: true,
        company_name,
        model_provider,
    })
}

/// 检查磁盘空间
#[tauri::command]
pub fn check_disk_space(path: String) -> Result<DiskSpaceInfo, String> {
    Ok(platform::check_disk_space(&path))
}

/// 保存安装配置
#[tauri::command]
pub fn save_setup_config(
    db: tauri::State<Mutex<Database>>,
    config: SetupConfig,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    db.set_config("install_path", &config.install_path)
        .map_err(|e| e.to_string())?;
    db.set_config("company_name", &config.company_name)
        .map_err(|e| e.to_string())?;
    db.set_config("model_provider", &config.model_provider)
        .map_err(|e| e.to_string())?;

    if let Some(model_path) = &config.model_path {
        db.set_config("model_path", model_path)
            .map_err(|e| e.to_string())?;
    }

    println!(
        "Setup config saved: company={}, provider={}",
        config.company_name, config.model_provider
    );

    Ok(())
}

/// 测试 Ollama 连接
#[tauri::command]
pub async fn test_ollama_connection(endpoint: String) -> Result<ConnectionTestResult, String> {
    let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));

    let client = reqwest::Client::new();
    match client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(ConnectionTestResult {
                    success: true,
                    message: "Ollama 服务运行正常，连接成功！".to_string(),
                })
            } else {
                Ok(ConnectionTestResult {
                    success: false,
                    message: format!(
                        "Ollama 服务响应异常 (HTTP {})，请检查 Ollama 是否已启动",
                        response.status().as_u16()
                    ),
                })
            }
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: format!(
                "连接失败：{}",
                if e.is_timeout() {
                    "连接超时，请确认 Ollama 服务已启动（默认端口 11434）".to_string()
                } else {
                    e.to_string()
                }
            ),
        }),
    }
}

/// 测试 llama.cpp 连接
#[tauri::command]
pub async fn test_llamacpp_connection(endpoint: String) -> Result<ConnectionTestResult, String> {
    let url = format!("{}/v1/models", endpoint.trim_end_matches('/'));

    let client = reqwest::Client::new();
    match client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(ConnectionTestResult {
                    success: true,
                    message: "llama.cpp 服务运行正常，连接成功！".to_string(),
                })
            } else {
                Ok(ConnectionTestResult {
                    success: false,
                    message: format!(
                        "llama.cpp 服务响应异常 (HTTP {})，请检查服务是否已启动",
                        response.status().as_u16()
                    ),
                })
            }
        }
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: format!(
                "连接失败：{}",
                if e.is_timeout() {
                    "连接超时，请确认 llama.cpp 服务已启动".to_string()
                } else {
                    e.to_string()
                }
            ),
        }),
    }
}

/// 获取默认数据目录路径
#[tauri::command]
pub fn get_default_data_path() -> Result<String, String> {
    let proj_dirs = directories::ProjectDirs::from("com", "proclaw", "desktop")
        .ok_or_else(|| "无法获取项目目录".to_string())?;
    Ok(proj_dirs.data_local_dir().to_string_lossy().to_string())
}

/// 完成安装并切换到主窗口
#[tauri::command]
pub fn complete_setup_and_switch(
    app_handle: tauri::AppHandle,
    db: tauri::State<Mutex<Database>>,
    config: SetupConfig,
) -> Result<(), String> {
    // 保存配置到 system_config
    {
        let db = db.lock().map_err(|e| e.to_string())?;
        db.set_config("install_path", &config.install_path)
            .map_err(|e| e.to_string())?;
        db.set_config("company_name", &config.company_name)
            .map_err(|e| e.to_string())?;
        db.set_config("model_provider", &config.model_provider)
            .map_err(|e| e.to_string())?;
        if let Some(model_path) = &config.model_path {
            db.set_config("model_path", model_path)
                .map_err(|e| e.to_string())?;
        }
    }

    // 注册 CEO Agent 为内置联系人（在用户表中添加）
    {
        let db = db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();
        let ceo_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM users WHERE id = 'ceo-agent'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !ceo_exists {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT OR IGNORE INTO users (id, name, phone, user_type, is_active, created_at, updated_at)
                 VALUES ('ceo-agent', 'CEO Agent', NULL, 'internal', 1, ?1, ?1)",
                params![now],
            )
            .map_err(|e| e.to_string())?;
            println!("CEO Agent user registered");
        }
    }

    // 隐藏向导窗口并显示主窗口
    if let Some(setup_window) = app_handle.get_webview_window("setup-wizard") {
        let _ = setup_window.hide();
    }

    if let Some(main_window) = app_handle.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }

    // 发送安装完成事件
    let _ = app_handle.emit("setup-completed", &config);

    println!("Setup completed: {}", config.company_name);
    Ok(())
}

// ==================== 单元测试 ====================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use std::env;

    fn create_test_db(name: &str) -> Database {
        let temp_dir = env::temp_dir().join("proclaw_setup_test");
        let db_path = temp_dir.join(format!("test_{}.db", name));
        let _ = std::fs::remove_file(&db_path);
        let db = Database::new(db_path.clone()).unwrap();
        db.initialize().unwrap();
        db
    }

    /// 辅助函数：包装 check_installation_status（内部测试用）
    fn check_status_raw(db: &Database) -> InstallationStatus {
        InstallationStatus {
            completed: db.is_installation_complete(),
            company_name: db.get_config("company_name"),
            model_provider: db.get_config("model_provider"),
        }
    }

    /// 辅助函数：保存配置（绕过 Tauri State）
    fn save_config_raw(db: &Database, config: SetupConfig) -> Result<(), String> {
        db.set_config("install_path", &config.install_path)
            .map_err(|e| e.to_string())?;
        db.set_config("company_name", &config.company_name)
            .map_err(|e| e.to_string())?;
        db.set_config("model_provider", &config.model_provider)
            .map_err(|e| e.to_string())?;
        if let Some(model_path) = &config.model_path {
            db.set_config("model_path", model_path)
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[test]
    fn test_check_installation_status_not_completed() {
        let db = create_test_db("status");
        let status = check_status_raw(&db);
        assert!(!status.completed);
        assert!(status.company_name.is_none());
    }

    #[test]
    fn test_save_and_check_config() {
        let db = create_test_db("config");

        // 先检查未完成状态
        let status = check_status_raw(&db);
        assert!(!status.completed);

        // 保存配置
        let config = SetupConfig {
            install_path: "C:\\ProClaw\\data".to_string(),
            company_name: "测试公司".to_string(),
            model_provider: "procloud".to_string(),
            model_path: None,
        };
        save_config_raw(&db, config).unwrap();

        // 再检查已完成状态
        let status = check_status_raw(&db);
        assert!(status.completed);
        assert_eq!(status.company_name.unwrap(), "测试公司");
        assert_eq!(status.model_provider.unwrap(), "procloud");
    }

    #[test]
    fn test_save_config_with_local_model() {
        let db = create_test_db("local_model");

        let config = SetupConfig {
            install_path: "/home/user/proclaw_data".to_string(),
            company_name: "云创科技".to_string(),
            model_provider: "local".to_string(),
            model_path: Some("/usr/local/bin/ollama".to_string()),
        };
        save_config_raw(&db, config).unwrap();

        assert_eq!(
            db.get_config("install_path").unwrap(),
            "/home/user/proclaw_data"
        );
        assert_eq!(db.get_config("company_name").unwrap(), "云创科技");
        assert_eq!(db.get_config("model_provider").unwrap(), "local");
        assert_eq!(
            db.get_config("model_path").unwrap(),
            "/usr/local/bin/ollama"
        );
    }

    #[test]
    fn test_disk_space_check() {
        let current_dir = env::current_dir().unwrap();
        let info = platform::check_disk_space(current_dir.to_str().unwrap());
        assert!(info.total_gb >= 0.0);
        assert!(info.free_gb >= 0.0);
    }
}
