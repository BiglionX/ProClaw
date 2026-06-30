#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod auth;
mod database;
mod services;
mod sync_engine;
mod utils;

// 模块化命令文件
pub mod types;
mod types_tests;

// Light 版产品模块（只读 + 基础 CRUD，不含采购销售）
#[cfg(any(feature = "light", feature = "inventory"))]
pub mod product_commands;
#[cfg(any(feature = "light", feature = "inventory"))]
pub mod store_commands;

// 进销存版模块
#[cfg(feature = "inventory")]
pub mod finance_commands;
#[cfg(feature = "inventory")]
pub mod inventory_aging_commands; // PRD v12.0 灵活库存老化
#[cfg(feature = "inventory")]
pub mod inventory_calibration_commands; // PRD v12.0 灵活库存微盘点/置信度
#[cfg(feature = "inventory")]
pub mod inventory_commands;
#[cfg(feature = "inventory")]
pub mod payment_commands;
#[cfg(feature = "inventory")]
pub mod purchase_commands;
#[cfg(feature = "inventory")]
pub mod purchase_return_commands;
#[cfg(feature = "inventory")]
pub mod reconciliation_commands;
#[cfg(feature = "inventory")]
pub mod sales_commands;
#[cfg(feature = "inventory")]
pub mod sales_return_commands;

pub mod approval_commands;
pub mod call_commands;
pub mod ceo_commands;
pub mod common_commands;
pub mod invitation_commands;
pub mod message_commands;
pub mod plugin_loader;
pub mod plugin_manager;
pub mod setup_commands;
pub mod subscription_commands;
pub mod team_commands;
pub mod tray_commands;
pub mod user_commands;

// 云备份模块（Cloud 版）
pub mod agent_profile_commands;
pub mod cloud_backup_commands;
pub mod secretary_commands;

// 行业插件命令（Phase 4）
pub mod beauty_commands;
pub mod catering_commands;
pub mod pet_commands;

// 八大新行业插件命令
pub mod auto_parts_commands;
pub mod community_group_buy_commands;
pub mod convenience_commands;
pub mod decoration_material_commands;
pub mod fresh_food_commands;
pub mod hardware_commands;
pub mod liquor_commands;
pub mod phone_accessories_commands;

// 虚拟公司版模块
#[cfg(feature = "virtual_company")]
pub mod agent_commands;
#[cfg(feature = "virtual_company")]
pub mod agent_sandbox;
#[cfg(feature = "virtual_company")]
pub mod agent_security;
#[cfg(feature = "virtual_company")]
pub mod finance_agent_commands;
#[cfg(feature = "virtual_company")]
pub mod market_commands;

use api::websocket::WebSocketManager;
use api::AppState;
use database::{get_database_path, Database};
use services::cloud_backup_service::CloudBackupService;
use services::nvwax_billing::NvwaXBilling;
use services::nvwax_client::NvwaXClient;
use std::io::Write;
use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;
use std::sync::Mutex;
use sync_engine::SyncEngine;
use utils::crypto::Aes256GcmCipher;
use utils::key_manager::KeyManager;

// 重新导出所有命令
pub mod commands;
mod invoke_handler;
use commands::stats::CommandStatsCollector;

// 全局命令统计收集器
lazy_static::lazy_static! {
    pub static ref COMMAND_STATS: CommandStatsCollector = CommandStatsCollector::new();
}

/// 修复 v1.0.7 闪退 #2: 启动期致命错误处理
/// 作用: 写明详细日志到 %TEMP%\proclaw-diag.log 后再退出（不 panic）
/// 原因: 原代码用 .expect(...)? 直接 panic，stdout/stderr 被 windows_subsystem="windows" 吞掉
///       用户报告"闪退"时无任何信息可查
/// 提示: 用户侧排查时引导查看 diag 日志
fn fatal_exit(context: &str, err: impl std::fmt::Display) -> ! {
    let msg = format!("FATAL [{}]: {}", context, err);
    eprintln!("{}", msg);
    diag_log(&msg);
    diag_log("─────────────────────────────────────────────────");
    diag_log("应用启动失败，即将退出。请按以下顺序排查：");
    diag_log("  1. 检查 C:\\Users\\<User>\\AppData\\Local\\com.proclaw.desktop\\ 目录是否可写");
    diag_log("  2. 检查磁盘空间（AppData 所在盘至少保留 1GB）");
    diag_log("  3. 暂时关闭杀软/防火墙后重试");
    diag_log("  4. 查看完整日志: %TEMP%\\proclaw-diag.log");
    diag_log("─────────────────────────────────────────────────");
    std::process::exit(1);
}

/// 备份并删除损坏的数据库文件（主db + WAL -shm + -wal）
/// 用于 main 启动时检测到 readonly/corrupted 后的自动恢复
fn backup_and_remove_corrupted_db_files(db_path: &Path) {
    // 备份主 db 文件（保留证据，方便排查）
    let backup = db_path.with_extension("db.corrupted");
    if let Err(e) = std::fs::rename(db_path, &backup) {
        eprintln!("备份损坏 db 失败: {}. 尝试直接删除...", e);
        let _ = std::fs::remove_file(db_path);
    } else {
        eprintln!("✓ 损坏 db 已备份到: {:?}", backup);
    }
    // 删除 -shm 和 -wal（WAL 模式的辅助文件，可能持有读锁）
    let _ = std::fs::remove_file(db_path.with_extension("db-shm"));
    let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
}

/// v7: 诊断日志 - 同时写入 stderr 和文件（%TEMP%\proclaw-diag.log）
/// 解决 windows_subsystem="windows" 导致 release 构建控制台输出不可见的问题
fn diag_log(msg: &str) {
    eprintln!("[PROCLAW_DIAG] {}", msg);
    if let Ok(temp) = std::env::var("TEMP") {
        let log_path = std::path::PathBuf::from(&temp).join("proclaw-diag.log");
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let _ = writeln!(f, "[{}] {}", ts, msg);
        }
    }
}

#[tokio::main]
async fn main() {
    // 初始化数据库
    let db_path = get_database_path();
    println!("Database path: {:?}", db_path);

    // 审计修复 #11+白屏修复+闪退修复 #2: 优雅处理 db 初始化失败
    // - 第一次失败：自动备份损坏文件 + 删除 -shm/-wal + 重建 db
    // - 第二次还失败：fatal_exit 写详细日志后退出（替代原 .expect 直接 panic）
    // - 退出后用户可从 %TEMP%\proclaw-diag.log 看到原因，不再出现"无声闪退"
    let db = match Database::new(db_path.clone()) {
        Ok(db) => db,
        Err(e) => {
            eprintln!("⚠️ 数据库打开失败: {}. 尝试自动恢复（备份+重建）...", e);
            diag_log(&format!("WARN: 第一次 Database::new 失败: {}，尝试恢复...", e));
            backup_and_remove_corrupted_db_files(&db_path);
            match Database::new(db_path.clone()) {
                Ok(db) => db,
                Err(e2) => fatal_exit("Database::new 二次失败", format!("{} (首次: {})", e2, e)),
            }
        }
    };
    let db = match db.initialize() {
        Ok(()) => db,
        Err(e) => {
            eprintln!("⚠️ 数据库初始化失败: {}. 尝试自动恢复...", e);
            diag_log(&format!("WARN: db.initialize 失败: {}，尝试恢复...", e));
            backup_and_remove_corrupted_db_files(&db_path);
            let db = match Database::new(db_path.clone()) {
                Ok(db) => db,
                Err(e2) => fatal_exit("重建 Database::new 失败", e2),
            };
            match db.initialize() {
                Ok(()) => db,
                Err(e2) => fatal_exit(
                    "db.initialize 二次失败",
                    format!("{} (首次: {})", e2, e),
                ),
            }
        }
    };
    println!("Database initialized successfully");

    // 开发环境: 自动创建测试用户和配对码
    {
        let conn = db.connection();
        let user_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
            .unwrap_or(0);
        if user_count == 0 {
            conn.execute(
                "INSERT INTO users (id, name, phone, user_type, plan_type) VALUES ('u_test001', '管理员', '13800138000', 'internal', 'professional')",
                [],
            ).ok();
            conn.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES ('u_test001', 1)",
                [],
            )
            .ok();
            conn.execute(
                "INSERT INTO pairing_codes (id, code, created_by, expires_at) VALUES ('pc_001', '888888', 'u_test001', (SELECT CAST(strftime('%s', 'now') AS INTEGER) + 86400))",
                [],
            ).ok();
            println!("Seeded test user and pairing code '888888'");
        }
    }

    // Phase 6: 初始化 JWT 密钥管理器（必须在云备份之前，用于派生密钥）
    let key_manager = KeyManager::from_env_or_default();
    let jwt_secret = key_manager.as_bytes().to_vec();
    // 设置全局 JWT 密钥供中间件使用
    api::JWT_SECRET.set(jwt_secret.clone()).ok();

    // 创建同步引擎（使用独立的数据库实例）
    // 审计修复 #11: 5个独立连接共享WAL无重试机制。WAL模式支持多读单写，
    // 当前设计为迁移过渡方案，后续应用连接池统一管理。
    // 闪退修复 #2: Database::new 改 fatal_exit，不再静默 panic
    let sync_engine = SyncEngine::new(match Database::new(db_path.clone()) {
        Ok(db) => db,
        Err(e) => fatal_exit("同步引擎数据库创建", e),
    });
    // 审计修复 #10: 多个独立 DB 实例竞争同一 WAL 文件是已知过渡设计，
    // SQLite WAL 模式支持多读单写，但缺少 SQLITE_BUSY 重试。

    // 审计修复 #2: 从 KeyManager 派生云备份独立密钥，不再使用全零密钥
    // 闪退修复 #2: Database::new 改 fatal_exit
    let backup_encryption_key =
        KeyManager::derive_from_key(&key_manager, b"proclaw-cloud-backup-key-v1");
    let cloud_backup_db = match Database::new(db_path.clone()) {
        Ok(db) => db,
        Err(e) => fatal_exit("云备份数据库创建", e),
    };
    let cloud_backup_service = Arc::new(CloudBackupService::new(
        cloud_backup_db,
        &backup_encryption_key,
    ));

    // Phase 10: 初始化 NvwaX API 客户端和计费服务
    // 审计修复 SEC-P0-04: 密钥和盐值从环境变量读取，不再硬编码
    let nvwax_key_salt_str = std::env::var("NVWAX_KEY_SALT")
        .unwrap_or_else(|_| {
            eprintln!("[Security] WARNING: NVWAX_KEY_SALT env var not set, using default. Set this in production!");
            "proclaw-nvwax-default-salt".to_string()
        });
    let nvwax_key_salt = nvwax_key_salt_str.as_bytes();
    let nvwax_password = std::env::var("NVWAX_CIPHER_PASSWORD")
        .unwrap_or_else(|_| {
            eprintln!("[Security] WARNING: NVWAX_CIPHER_PASSWORD env var not set, using default. Set this in production!");
            "proclaw-nvwax-default-cipher-key".to_string()
        });
    // 闪退修复 #2: NvwaX cipher 创建改 fatal_exit
    let nvwax_cipher = Arc::new(match Aes256GcmCipher::from_password(&nvwax_password, nvwax_key_salt) {
        Ok(c) => c,
        Err(e) => fatal_exit("NvwaX cipher 创建", e),
    });

    // 优先使用环境变量 NVWAX_API_KEY，其次尝试从数据库加载已保存的 Key
    // 审计修复 #15: 解密/加载失败时打印警告，不再静默回退为空字符串
    let nvwax_api_key = {
        if let Ok(key) = std::env::var("NVWAX_API_KEY") {
            if !key.is_empty() {
                key
            } else {
                eprintln!("[NvwaX] WARNING: NVWAX_API_KEY env var is empty");
                String::new()
            }
        } else {
            // 尝试从数据库读取已保存的 API Key（加密存储，需解密）
            match db.connection().query_row(
                "SELECT value FROM system_config WHERE key = 'nvwax_api_key'",
                [],
                |row| row.get::<_, String>(0),
            ) {
                Ok(encrypted) => match nvwax_cipher.decrypt_string(&encrypted) {
                    Ok(key) => key,
                    Err(e) => {
                        eprintln!("[NvwaX] WARNING: Failed to decrypt stored API key: {}", e);
                        String::new()
                    }
                },
                Err(_) => {
                    // 未配置 API Key 是正常情况，不打印警告
                    String::new()
                }
            }
        }
    };
    let nvwax_client = Arc::new(NvwaXClient::new(nvwax_api_key.clone()));

    // 将主数据库包装在 Mutex 中以支持多线程访问
    // Tauri State 使用 Mutex<Database>（不包 Arc），HTTP 服务器使用 Arc<Mutex<Database>>
    let db = Mutex::new(db);

    // 闪退修复 #2: billing db 改 fatal_exit
    let nvwax_billing_db = match Database::new(db_path.clone()) {
        Ok(db) => Arc::new(Mutex::new(db)),
        Err(e) => fatal_exit("billing 数据库创建", e),
    };
    let nvwax_billing = Arc::new(NvwaXBilling::new(nvwax_billing_db));

    // 审计修复 #1/#22: 从 KeyManager 派生 HTTP API 独立加密密钥（与云备份密钥分离）
    // 闪退修复 #2: cipher / http db 改 fatal_exit
    let api_encryption_key = KeyManager::derive_from_key(&key_manager, b"proclaw-http-api-key-v1");
    let cipher = Arc::new(match Aes256GcmCipher::new(&api_encryption_key) {
        Ok(c) => c,
        Err(e) => fatal_exit("HTTP API cipher 创建", e),
    });
    // 创建 axum 应用状态（使用独立数据库连接，SQLite WAL 支持多连接）
    let http_db = match Database::new(db_path.clone()) {
        Ok(db) => Arc::new(Mutex::new(db)),
        Err(e) => fatal_exit("HTTP 数据库创建", e),
    };
    let ws_manager = Arc::new(WebSocketManager::new());
    let app_state = AppState {
        db: http_db,
        cipher,
        ws_manager: ws_manager.clone(),
        cloud_backup: cloud_backup_service.clone(),
        jwt_secret: Arc::new(jwt_secret),
    };

    // 启动 HTTP 服务器（在后台运行）
    // 审计修复 SEC-P0-02: 绑定 localhost 而非 0.0.0.0，防止局域网内任意设备访问
    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 8888));
    println!("Starting HTTP server on http://{}", addr);

    let _http_handle = match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => {
            let axum_app = api::create_router(app_state);
            // 审计修复 R4: 保留 JoinHandle 防止任务泄漏
            let handle = tokio::spawn(async move {
                if let Err(e) = axum::serve(
                    listener,
                    axum_app.into_make_service_with_connect_info::<SocketAddr>(),
                )
                .await
                {
                    eprintln!(
                        "[HTTP Server] Fatal error: {}. HTTP API is now unavailable.",
                        e
                    );
                }
            });
            Some(handle)
        }
        Err(e) => {
            eprintln!(
                "Warning: Could not bind HTTP server to {}: {}. HTTP API will be unavailable.",
                addr, e
            );
            None
        }
    };

    // 启动 Tauri 应用
    // 闪退修复 #2: Tauri run 绑定到 _run_result，异常时调用 fatal_exit 写日志再退出
    let _run_result = invoke_handler::apply(tauri::Builder::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        // ========== 窗口关闭事件拦截：最小化到托盘 ==========
        // 仅拦截 main 窗口，setup-wizard 不受影响
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    diag_log("main window close intercepted -> hidden to tray");
                }
            }
        })
        .manage(db)
        .manage(sync_engine)
        .manage(cloud_backup_service)
        .manage(ws_manager)
        .manage(nvwax_client.clone())
        .manage(nvwax_billing.clone())
        .manage(nvwax_cipher.clone())
        // v7: on_page_load 回调 - 在页面加载完成时注入 JS 诊断（修复 v6 eval() 时序 bug）
        .on_page_load(|webview, payload| {
            let label = webview.label().to_string();
            match payload.event() {
                tauri::webview::PageLoadEvent::Started => {
                    diag_log(&format!("PAGE_STARTED: label={}", label));
                    // v8: 非破坏性诊断 - 仅修改 document.title，不替换 body.innerHTML
                    // 修复: body.innerHTML 替换会销毁 <div id="root">，导致 React createRoot 失败 (#299)
                    let _ = webview.eval(
                        "document.title = '[Loading] ProClaw...';"
                    );
                }
                tauri::webview::PageLoadEvent::Finished => {
                    let url = payload.url().to_string();
                    diag_log(&format!("PAGE_FINISHED: label={}, url={}", label, url));
                    // v7: 注入 JS 错误捕获（在页面真正加载完成后）
                    if let Err(e) = webview.eval(r#"(function(){
                        window.__proclaw_diag__ = window.__proclaw_diag__ || {log:[], errors:[]};
                        window.__proclaw_diag__.errors.push('[PAGE_LOAD] ' + location.href);
                        if (!window.__proclaw_err_installed__) {
                            window.__proclaw_err_installed__ = true;
                            var oe = console.error;
                            console.error = function(){
                                var a = Array.prototype.slice.call(arguments);
                                window.__proclaw_diag__.errors.push(a.map(String).join(' '));
                                document.title = '[ERR] ' + (a[0] || 'unknown');
                                oe.apply(console, arguments);
                            };
                            window.addEventListener('error', function(e){
                                window.__proclaw_diag__.errors.push('[WIN_ERROR] ' + e.message + ' @ ' + (e.filename||'') + ':' + (e.lineno||''));
                                document.title = '[WIN_ERROR] ' + e.message;
                            });
                            window.addEventListener('unhandledrejection', function(e){
                                window.__proclaw_diag__.errors.push('[REJECTION] ' + String(e.reason));
                                document.title = '[REJECTION] ' + String(e.reason);
                            });
                        }
                        console.log('[PROCLAW_DIAG] error capture installed, url=' + location.href);
                    })();"#) {
                        diag_log(&format!("eval FAILED for {}: {}", label, e));
                    }
                }
            }
        })
        .setup(|app| {
            use tauri::Manager;

            // ========== 系统托盘 ==========
            // 构建托盘右键菜单
            let show_item = tauri::menu::MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)
                .map_err(|e| format!("MenuItem show failed: {}", e))?;
            let quit_item = tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)
                .map_err(|e| format!("MenuItem quit failed: {}", e))?;
            let tray_menu = tauri::menu::Menu::with_items(app, &[&show_item, &quit_item])
                .map_err(|e| format!("Menu build failed: {}", e))?;

            // 修复 v1.0.7 闪退 #1: 托盘图标三级回退，避免 panic
            // 优先级: 1) app.default_window_icon()（tauri 2.11 从 bundle.icon[0] 回退）
            //         2) Image::new_owned 创建透明 32x32 占位
            //         3) 无图标托盘（允许）
            // 原因: 原 .ok_or(...)? 在 tauri 2.11 打包后 default_window_icon() 可能返回 None
            //       （虽然 tauri 2.11 应该从 bundle.icon 回退，但出于防御性仍提供多重回退）
            //       → 进程 panic 闪退
            let tray_icon = app.default_window_icon().cloned().or_else(|| {
                diag_log("WARN: default_window_icon() returned None, creating 32x32 transparent fallback");
                Some(tauri::image::Image::new_owned(vec![0u8; 32 * 32 * 4], 32, 32))
            });
            diag_log(&format!(
                "✓ Tray icon resolved: {}",
                if tray_icon.is_some() { "OK" } else { "none" }
            ));

            // 构建托盘图标
            let mut tray_builder = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .tooltip("ProClaw Desktop")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
            if let Some(ic) = tray_icon {
                tray_builder = tray_builder.icon(ic);
            }
            let _tray = tray_builder
                .build(app)
                .map_err(|e| format!("Tray build failed: {}", e))?;
            diag_log("System tray icon created");

            // 检查安装状态，决定显示哪个窗口
            let is_installed = match app.state::<Mutex<Database>>().lock() {
                Ok(db) => db.is_installation_complete(),
                Err(e) => {
                    diag_log(&format!("WARN: Could not lock database for setup check: {}", e));
                    false
                }
            };
            diag_log(&format!("is_installed={}", is_installed));

            if is_installed {
                // v7: 隐藏非活动窗口（避免双窗口同时渲染）
                if let Some(w) = app.get_webview_window("setup-wizard") {
                    let _ = w.hide();
                    diag_log("setup-wizard hidden (is_installed=true)");
                }
                // 已安装：显示主窗口
                if let Some(main_window) = app.get_webview_window("main") {
                    // v5: Tauri 2.x setup() 阶段窗口默认 16x16 占位，必须显式设置
                    if let Err(e) = main_window.set_size(tauri::PhysicalSize::new(1200u32, 800u32)) {
                        diag_log(&format!("WARN: main set_size failed: {}", e));
                    }
                    if let Err(e) = main_window.set_position(tauri::PhysicalPosition::new(100i32, 100i32)) {
                        diag_log(&format!("WARN: main set_position failed: {}", e));
                    }
                    match main_window.show() {
                        Ok(_) => diag_log("main shown (1200x800 at 100,100)"),
                        Err(e) => diag_log(&format!("main show FAILED: {}", e)),
                    }
                    if let Err(e) = main_window.unminimize() {
                        diag_log(&format!("WARN: main unminimize failed: {}", e));
                    }
                    if let Err(e) = main_window.set_focus() {
                        diag_log(&format!("WARN: main set_focus failed: {}", e));
                    }
                    // v8: 仅 debug 模式自动开 DevTools(release 移除 feature "devtools" 后本分支永远 false，
                    //   避免 release 用户看到 "启动时 DevTools 窗口与主窗口同时弹出" 的乱跳现象)。
                    //   如果 debug 用户需要可以临时把 any(...) 改回 all(debug_assertions, feature = "devtools")。
                    #[cfg(debug_assertions)]
                    {
                        main_window.open_devtools();
                        diag_log("main devtools opened (debug only)");
                    }
                    // v7: eval 已移至 on_page_load 回调（修复时序问题）
                } else {
                    diag_log("ERROR: main window not found in app state");
                }
                diag_log("Installation detected, showing main window");
            } else {
                // v9: 未安装: 隐藏 main (预声明但 visible:false) + 动态创建 setup-wizard
                // 修复窗口乱跳: 避免两个 webview 同时 load (tauri.conf.json 不预声明 setup-wizard)
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                    diag_log("main hidden (is_installed=false)");
                }
                // 动态创建 setup-wizard (index.html + #/setup hash)
                match tauri::WebviewWindowBuilder::new(
                    app,
                    "setup-wizard",
                    tauri::WebviewUrl::App("index.html".into()),
                )
                .title("ProClaw 安装向导")
                .inner_size(720.0, 620.0)
                .center()
                .resizable(false)
                .decorations(false)
                .visible(false)
                .build()
                {
                    Ok(setup_window) => {
                        // 切到 #/setup hash (HashRouter 路由)
                        let _ = setup_window.eval("window.location.hash = '#/setup';");
                        if let Err(e) = setup_window.show() {
                            diag_log(&format!("setup-wizard show FAILED: {}", e));
                        } else {
                            diag_log("setup-wizard dynamically created and shown");
                        }
                        let _ = setup_window.set_focus();
                    }
                    Err(e) => {
                        diag_log(&format!("setup-wizard dynamic create FAILED: {}", e));
                    }
                }
                diag_log("No installation detected, showing setup wizard");
            }

            Ok(())
        })
        .run(tauri::generate_context!());
    // 闪退修复 #2: Tauri run 异常不要 panic，写详细日志后再退出
    if let Err(e) = _run_result {
        fatal_exit("Tauri 应用运行时", e);
    }
}
