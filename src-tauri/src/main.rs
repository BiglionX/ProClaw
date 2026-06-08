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
pub mod user_commands;

// 云备份模块（Cloud 版）
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
use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;
use sync_engine::SyncEngine;
use sync_engine::*;
use utils::crypto::Aes256GcmCipher;
use utils::key_manager::KeyManager;

// 重新导出所有命令
pub mod commands;
use commands::core::CoreModule;
use commands::product::ProductModule;
use commands::{stats::CommandStatsCollector, ModuleRegistry};

// 全局命令统计收集器
lazy_static::lazy_static! {
    pub static ref COMMAND_STATS: CommandStatsCollector = CommandStatsCollector::new();
}
#[cfg(any(feature = "inventory", feature = "virtual_company"))]
use commands::agent::AgentModule;
#[cfg(any(feature = "inventory", feature = "virtual_company"))]
use commands::cloud::CloudModule;
use commands::industry_auto_parts::IndustryAutoPartsModule;
use commands::industry_beauty::IndustryBeautyModule;
use commands::industry_catering::IndustryCateringModule;
use commands::industry_community_group_buy::IndustryCommunityGroupBuyModule;
use commands::industry_convenience::IndustryConvenienceModule;
use commands::industry_decoration_material::IndustryDecorationMaterialModule;
use commands::industry_fresh_food::IndustryFreshFoodModule;
use commands::industry_hardware::IndustryHardwareModule;
use commands::industry_liquor::IndustryLiquorModule;
use commands::industry_pet::IndustryPetModule;
use commands::industry_phone_accessories::IndustryPhoneAccessoriesModule;
#[cfg(feature = "inventory")]
use commands::inventory::InventoryModule;
use commands::plugin::PluginModule;

// 命令实现模块（用于 Tauri generate_handler! 宏）
#[cfg(feature = "virtual_company")]
use agent_commands::*;
use approval_commands::*;
use auto_parts_commands::*;
use beauty_commands::*;
use call_commands::*;
use catering_commands::*;
use ceo_commands::*;
use cloud_backup_commands::*;
use common_commands::*;
use community_group_buy_commands::*;
use convenience_commands::*;
use decoration_material_commands::*;
#[cfg(feature = "virtual_company")]
use finance_agent_commands::*;
#[cfg(feature = "inventory")]
use finance_commands::*;
use fresh_food_commands::*;
use hardware_commands::*;
#[cfg(feature = "inventory")]
use inventory_commands::*;
use invitation_commands::*;
use liquor_commands::*;
#[cfg(feature = "virtual_company")]
use market_commands::*;
use message_commands::*;
#[cfg(feature = "inventory")]
use payment_commands::*;
use pet_commands::*;
use phone_accessories_commands::*;
use plugin_loader::*;
use plugin_manager::*;
#[cfg(any(feature = "light", feature = "inventory"))]
use product_commands::*;
#[cfg(feature = "inventory")]
use purchase_commands::*;
#[cfg(feature = "inventory")]
use purchase_return_commands::*;
#[cfg(feature = "inventory")]
use reconciliation_commands::*;
#[cfg(feature = "inventory")]
use sales_commands::*;
#[cfg(feature = "inventory")]
use sales_return_commands::*;
use secretary_commands::*;
use services::nvwax_commands::*;
use setup_commands::*;
#[cfg(any(feature = "light", feature = "inventory"))]
use store_commands::*;
use subscription_commands::*;
use team_commands::*;
use user_commands::*;

/// 构建命令注册表
fn build_command_registry() -> ModuleRegistry {
    let mut registry = ModuleRegistry::new();

    // 按优先级顺序注册模块
    registry.register(CoreModule);
    registry.register(ProductModule);
    #[cfg(feature = "inventory")]
    registry.register(InventoryModule);
    #[cfg(any(feature = "inventory", feature = "virtual_company"))]
    registry.register(AgentModule);
    #[cfg(any(feature = "inventory", feature = "virtual_company"))]
    registry.register(CloudModule);
    registry.register(PluginModule);
    // 行业插件模块
    registry.register(IndustryCateringModule);
    registry.register(IndustryBeautyModule);
    registry.register(IndustryPetModule);
    registry.register(IndustryConvenienceModule);
    registry.register(IndustryLiquorModule);
    registry.register(IndustryPhoneAccessoriesModule);
    registry.register(IndustryFreshFoodModule);
    registry.register(IndustryAutoPartsModule);
    registry.register(IndustryHardwareModule);
    registry.register(IndustryDecorationMaterialModule);
    registry.register(IndustryCommunityGroupBuyModule);

    registry
}

// 打印已注册的命令（调试用）
#[allow(dead_code)]
fn print_registered_commands() {
    let registry = build_command_registry();
    let commands = registry.get_enabled_commands();
    println!("\n[ProClaw] Registered {} commands:", commands.len());

    // 按模块分组显示
    let mut current_module = String::new();
    for cmd in &commands {
        // 简单按命令名前缀分组
        let module = if cmd.name.starts_with("product")
            || cmd.name.starts_with("create_product")
            || cmd.name.starts_with("get_product")
            || cmd.name.starts_with("update_product")
            || cmd.name.starts_with("delete_product")
            || cmd.name.starts_with("get_brands")
            || cmd.name.starts_with("create_brand")
            || cmd.name.starts_with("get_categories")
            || cmd.name.starts_with("create_category")
            || cmd.name.starts_with("get_store")
            || cmd.name.starts_with("update_store")
        {
            "product"
        } else if cmd.name.starts_with("inventory")
            || cmd.name.starts_with("get_sales_trend")
            || cmd.name.starts_with("get_product_analytics")
        {
            "inventory"
        } else if cmd.name.starts_with("purchase")
            || cmd.name.starts_with("get_suppliers")
            || cmd.name.starts_with("create_supplier")
        {
            "purchase"
        } else if cmd.name.starts_with("sales")
            || cmd.name.starts_with("create_customer")
            || cmd.name.starts_with("get_customers")
        {
            "sales"
        } else if cmd.name.starts_with("ceo") || cmd.name.starts_with("pcp") {
            "ceo"
        } else if cmd.name.starts_with("plugin")
            || cmd.name.starts_with("install")
            || cmd.name.starts_with("uninstall")
            || cmd.name.starts_with("enable")
            || cmd.name.starts_with("disable")
            || cmd.name.starts_with("list_")
        {
            "plugin"
        } else {
            "other"
        };

        if module != current_module {
            println!("  [{}]", module);
            current_module = module.to_string();
        }
        println!("    - {}", cmd.name);
    }
}

#[tokio::main]
async fn main() {
    // 初始化数据库
    let db_path = get_database_path();
    println!("Database path: {:?}", db_path);

    // 审计修复 #11: 改善启动错误信息，提供可操作的故障排除提示
    let db = Database::new(db_path.clone())
        .expect("启动失败: 无法创建数据库。请检查磁盘空间和数据目录权限。");
    db.initialize()
        .expect("启动失败: 数据库初始化失败。数据库文件可能已损坏，请尝试删除后重新启动。");
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
    let sync_engine = SyncEngine::new(
        Database::new(db_path.clone()).expect("启动失败: 同步引擎数据库创建失败。请检查磁盘空间。"),
    );
    // 审计修复 #10: 多个独立 DB 实例竞争同一 WAL 文件是已知过渡设计，
    // SQLite WAL 模式支持多读单写，但缺少 SQLITE_BUSY 重试。

    // 审计修复 #2: 从 KeyManager 派生云备份独立密钥，不再使用全零密钥
    let backup_encryption_key =
        KeyManager::derive_from_key(&key_manager, b"proclaw-cloud-backup-key-v1");
    let cloud_backup_service = Arc::new(CloudBackupService::new(
        Database::new(db_path.clone()).expect("启动失败: 云备份数据库创建失败。请检查磁盘空间。"),
        &backup_encryption_key,
    ));

    // Phase 10: 初始化 NvwaX API 客户端和计费服务
    // 先创建加密器，用于读取数据库中存储的 API Key
    let nvwax_key_salt = b"nvwax_api_key_2024";
    let nvwax_cipher = Arc::new(
        Aes256GcmCipher::from_password("proclaw-nvwax-secure-key", nvwax_key_salt)
            .expect("Failed to create NvwaX cipher"),
    );

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

    let nvwax_billing_db = Arc::new(Mutex::new(
        Database::new(db_path.clone()).expect("Failed to create billing DB"),
    ));
    let nvwax_billing = Arc::new(NvwaXBilling::new(nvwax_billing_db));

    // 审计修复 #1/#22: 从 KeyManager 派生 HTTP API 独立加密密钥（与云备份密钥分离）
    let api_encryption_key = KeyManager::derive_from_key(&key_manager, b"proclaw-http-api-key-v1");
    let cipher = Arc::new(
        Aes256GcmCipher::new(&api_encryption_key)
            .expect("Failed to create HTTP API cipher from derived key"),
    );
    // 创建 axum 应用状态（使用独立数据库连接，SQLite WAL 支持多连接）
    let http_db = Arc::new(Mutex::new(
        Database::new(db_path.clone()).expect("Failed to create HTTP DB"),
    ));
    let ws_manager = Arc::new(WebSocketManager::new());
    let app_state = AppState {
        db: http_db,
        cipher,
        ws_manager: ws_manager.clone(),
        cloud_backup: cloud_backup_service.clone(),
        jwt_secret: Arc::new(jwt_secret),
    };

    // 启动 HTTP 服务器（在后台运行）
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8888));
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
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(db)
        .manage(sync_engine)
        .manage(cloud_backup_service)
        .manage(ws_manager)
        .manage(nvwax_client.clone())
        .manage(nvwax_billing.clone())
        .manage(nvwax_cipher.clone())
        .setup(|app| {
            use tauri::Manager;

            // 检查安装状态，决定显示哪个窗口
            let is_installed = match app.state::<Mutex<Database>>().lock() {
                Ok(db) => db.is_installation_complete(),
                Err(e) => {
                    eprintln!("Warning: Could not lock database for setup check: {}", e);
                    false
                }
            };

            if is_installed {
                // 已安装：显示主窗口
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
                println!("Installation detected, showing main window");
            } else {
                // 未安装：显示向导窗口
                if let Some(setup_window) = app.get_webview_window("setup-wizard") {
                    let _ = setup_window.show();
                    let _ = setup_window.set_focus();
                }
                println!("No installation detected, showing setup wizard");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 产品管理
            create_product,
            get_products,
            get_product_by_id,
            update_product,
            delete_product,
            // SPU-SKU 电商架构
            create_product_spu,
            get_product_spus,
            get_product_spu_by_id,
            update_product_spu,
            delete_product_spu,
            // 商品库模式迁移
            get_library_mode,
            migrate_to_ecommerce_mode,
            downgrade_to_simple_mode,
            // 品牌管理
            create_brand,
            get_brands,
            // 分类管理
            create_category,
            get_categories,
            // 库存管理 (进销存版)
            #[cfg(feature = "inventory")]
            create_inventory_transaction,
            #[cfg(feature = "inventory")]
            get_inventory_transactions,
            #[cfg(feature = "inventory")]
            get_inventory_stats,
            // 数据分析 (进销存版)
            #[cfg(feature = "inventory")]
            get_sales_trend,
            #[cfg(feature = "inventory")]
            get_product_analytics,
            // 采购管理 (进销存版)
            #[cfg(feature = "inventory")]
            create_supplier,
            #[cfg(feature = "inventory")]
            get_suppliers,
            #[cfg(feature = "inventory")]
            create_purchase_order,
            #[cfg(feature = "inventory")]
            get_purchase_orders,
            #[cfg(feature = "inventory")]
            get_purchase_order_detail,
            // 销售管理 (进销存版)
            #[cfg(feature = "inventory")]
            create_customer,
            #[cfg(feature = "inventory")]
            get_customers,
            #[cfg(feature = "inventory")]
            create_sales_order,
            #[cfg(feature = "inventory")]
            get_sales_orders,
            // 财务报表 (进销存版)
            #[cfg(feature = "inventory")]
            get_profit_loss_report,
            #[cfg(feature = "inventory")]
            get_cash_flow_report,
            #[cfg(feature = "inventory")]
            get_financial_summary,
            // 文件上传
            upload_image,
            // 命令统计
            get_command_stats,
            reset_command_stats,
            // 数据库和同步
            get_database_stats,
            get_pending_sync_records,
            mark_as_synced,
            start_sync,
            get_sync_status,
            // AI 团队管理
            create_team,
            get_teams,
            get_team_by_id,
            update_team,
            delete_team,
            import_team,
            // 用户与权限管理 (Phase 6)
            create_user_cmd,
            get_users_cmd,
            get_user_by_id_cmd,
            update_user_cmd,
            delete_user_cmd,
            assign_user_role_cmd,
            change_user_password_cmd,
            get_roles_cmd,
            get_current_user_cmd,
            // 审批工作流 (Phase 6)
            create_approval_cmd,
            get_approvals_cmd,
            approve_request_cmd,
            reject_request_cmd,
            // 付款记录与AR/AP台账 (进销存版)
            #[cfg(feature = "inventory")]
            record_payment_cmd,
            #[cfg(feature = "inventory")]
            record_receipt_cmd,
            #[cfg(feature = "inventory")]
            get_payments_cmd,
            #[cfg(feature = "inventory")]
            get_ar_ap_summary_cmd,
            #[cfg(feature = "inventory")]
            get_ar_ap_detail_cmd,
            // 对账管理 (进销存版)
            #[cfg(feature = "inventory")]
            generate_statement,
            #[cfg(feature = "inventory")]
            send_statement_email,
            #[cfg(feature = "inventory")]
            create_reconciliation_rule,
            #[cfg(feature = "inventory")]
            update_reconciliation_rule,
            #[cfg(feature = "inventory")]
            delete_reconciliation_rule,
            #[cfg(feature = "inventory")]
            get_reconciliation_rules,
            #[cfg(feature = "inventory")]
            set_smtp_config,
            #[cfg(feature = "inventory")]
            get_smtp_config,
            #[cfg(feature = "inventory")]
            check_reconciliation_rules,
            // 补充的采购/销售命令 (进销存版)
            #[cfg(feature = "inventory")]
            update_purchase_order_cmd,
            #[cfg(feature = "inventory")]
            delete_purchase_order_cmd,
            #[cfg(feature = "inventory")]
            receive_purchase_order_cmd,
            #[cfg(feature = "inventory")]
            confirm_purchase_order_cmd,
            #[cfg(feature = "inventory")]
            cancel_purchase_order_cmd,
            #[cfg(feature = "inventory")]
            update_sales_order_cmd,
            #[cfg(feature = "inventory")]
            delete_sales_order_cmd,
            #[cfg(feature = "inventory")]
            submit_sales_order_cmd,
            #[cfg(feature = "inventory")]
            cancel_sales_order_cmd,
            #[cfg(feature = "inventory")]
            mark_sales_shipped_cmd,
            #[cfg(feature = "inventory")]
            mark_sales_delivered_cmd,
            // 采购退货 (进销存版)
            #[cfg(feature = "inventory")]
            create_purchase_return,
            #[cfg(feature = "inventory")]
            get_purchase_returns,
            #[cfg(feature = "inventory")]
            get_purchase_return_detail,
            #[cfg(feature = "inventory")]
            confirm_purchase_return,
            #[cfg(feature = "inventory")]
            cancel_purchase_return,
            #[cfg(feature = "inventory")]
            update_purchase_return,
            // 销售退货 (进销存版)
            #[cfg(feature = "inventory")]
            create_sales_return,
            #[cfg(feature = "inventory")]
            get_sales_returns,
            #[cfg(feature = "inventory")]
            get_sales_return_detail,
            #[cfg(feature = "inventory")]
            confirm_sales_return,
            #[cfg(feature = "inventory")]
            cancel_sales_return,
            // 订阅与计费 (Phase 7)
            get_plans_cmd,
            get_my_subscription_cmd,
            subscribe_plan_cmd,
            cancel_subscription_cmd,
            get_token_summary_cmd,
            get_token_usage_cmd,
            get_invoices_cmd,
            record_token_cmd,
            // Token 定价系统 (PRD v8.0)
            get_token_pricing_cmd,
            get_token_balance_cmd,
            estimate_token_cost_cmd,
            // 联系人与消息
            get_contacts,
            get_messages,
            send_message,
            mark_message_read,
            mark_conversation_read,
            get_recent_contacts,
            add_contact,
            get_unread_count,
            // 通话记录 (v4.1)
            get_call_records_cmd,
            create_call_record_cmd,
            update_call_record_cmd,
            check_user_online_cmd,
            // 外部伙伴邀请 (PRD v4.2)
            create_invitation_cmd,
            accept_invitation_cmd,
            revoke_invitation_cmd,
            get_invitations_cmd,
            // 云托管商城 (PRD v5.0)
            get_cloud_store,
            create_cloud_store,
            upgrade_store_plan,
            reset_store_api_key,
            get_syncable_products,
            sync_all_products_to_cloud,
            sync_incremental_products,
            toggle_product_cloud_visible,
            batch_toggle_products_visible,
            get_cloud_sync_logs,
            get_store_theme,
            update_store_theme,
            generate_store_theme_ai,
            get_store_orders,
            get_store_order,
            mark_store_order_shipped,
            get_store_stats,
            // 商品评价系统 (Phase 5)
            create_product_review,
            get_product_reviews,
            reply_product_review,
            delete_product_review,
            // 优惠券系统 (Phase 5)
            create_coupon,
            get_coupons,
            update_coupon_status,
            delete_coupon,
            use_coupon,
            // Agent 管理 (PRD v6.0)
            #[cfg(feature = "virtual_company")]
            install_agent,
            #[cfg(feature = "virtual_company")]
            uninstall_agent,
            #[cfg(feature = "virtual_company")]
            enable_agent,
            #[cfg(feature = "virtual_company")]
            disable_agent,
            #[cfg(feature = "virtual_company")]
            get_installed_agents,
            #[cfg(feature = "virtual_company")]
            get_agent_detail,
            #[cfg(feature = "virtual_company")]
            update_agent,
            #[cfg(feature = "virtual_company")]
            get_agent_data_dir,
            #[cfg(feature = "virtual_company")]
            get_available_permissions,
            #[cfg(feature = "virtual_company")]
            agent_db_query,
            #[cfg(feature = "virtual_company")]
            agent_db_execute,
            // 财务管理 Agent (PRD v6.0)
            #[cfg(feature = "virtual_company")]
            create_fa_account,
            #[cfg(feature = "virtual_company")]
            get_fa_accounts,
            #[cfg(feature = "virtual_company")]
            update_fa_account_balance,
            #[cfg(feature = "virtual_company")]
            create_fa_transaction,
            #[cfg(feature = "virtual_company")]
            get_fa_transactions,
            #[cfg(feature = "virtual_company")]
            delete_fa_transaction,
            #[cfg(feature = "virtual_company")]
            create_fa_budget,
            #[cfg(feature = "virtual_company")]
            get_fa_budgets,
            #[cfg(feature = "virtual_company")]
            check_fa_budget_alerts,
            #[cfg(feature = "virtual_company")]
            get_fa_category_summary,
            #[cfg(feature = "virtual_company")]
            get_fa_profit_loss,
            #[cfg(feature = "virtual_company")]
            get_fa_monthly_trend,
            #[cfg(feature = "virtual_company")]
            create_fa_invoice,
            #[cfg(feature = "virtual_company")]
            get_fa_invoices,
            #[cfg(feature = "virtual_company")]
            update_fa_invoice_status,
            // Agent 市场 (PRD v6.0)
            #[cfg(feature = "virtual_company")]
            get_market_agents,
            #[cfg(feature = "virtual_company")]
            get_market_agent_detail,
            #[cfg(feature = "virtual_company")]
            get_market_categories,
            #[cfg(feature = "virtual_company")]
            download_market_agent_package,
            // CEO Agent 主控官 (PRD v6.2)
            pcp_add_entry,
            pcp_update_entry,
            pcp_query_entries,
            pcp_delete_entry,
            ceo_create_task,
            ceo_get_tasks,
            ceo_update_task_status,
            ceo_get_task_stats,
            // CEO Agent 决策确认与个性化学习 (PRD v6.3)
            ceo_add_decision_log,
            ceo_query_decision_logs,
            ceo_get_decision_stats,
            ceo_update_decision_log,
            ceo_get_learning_preferences,
            ceo_update_preference,
            ceo_export_company_config,
            ceo_import_company_config,
            // 安装向导 (PRD v6.1)
            check_installation_status,
            check_disk_space,
            save_setup_config,
            test_ollama_connection,
            test_llamacpp_connection,
            get_default_data_path,
            complete_setup_and_switch,
            // 行业插件管理
            list_installed_plugins,
            get_plugin_manifest,
            download_plugin,
            verify_plugin_package,
            verify_plugin_compatibility,
            install_plugin,
            uninstall_plugin,
            get_plugin_assets_path,
            // 插件数据库迁移 (PRD v10.0)
            execute_plugin_migration,
            get_plugin_migration_history,
            // 插件后端动态加载 (PRD v10.0)
            load_plugin_backend,
            unload_plugin_backend,
            get_loaded_backend_plugins,
            // 插件数据库查询/写入 (PRD v10.0)
            plugin_db_query,
            plugin_db_execute,
            // 插件权限 (PRD v10.0)
            get_plugin_permissions,
            verify_plugin_permission,
            // 插件启用/禁用持久化
            enable_plugin,
            disable_plugin,
            get_plugin_enabled_status,
            get_all_plugin_enabled_statuses,
            // 插件签名验证 (PRD v10.0)
            verify_plugin_signature,
            // 插件更新机制 (PRD v10.0)
            check_plugin_update,
            apply_plugin_update,
            // 商务秘书 Agent BAP (PRD v8.5)
            bap_get_all,
            bap_upsert,
            bap_delete_by_type,
            bap_reset_learning,
            // 云备份命令（Cloud 版）
            get_backup_history_cmd,
            get_backup_status_cmd,
            get_backup_config_cmd,
            trigger_cloud_backup_cmd,
            set_auto_backup_schedule_cmd,
            restore_from_backup_cmd,
            // 餐饮行业插件命令
            catering_create_pos_order,
            catering_get_pos_orders,
            catering_settle_pos_order,
            catering_get_daily_summary,
            catering_get_kds_orders,
            catering_mark_kds_item_done,
            // 美业行业插件命令
            beauty_create_appointment,
            beauty_get_appointments,
            beauty_update_appointment_status,
            beauty_get_employees,
            beauty_create_employee,
            // 宠物行业插件命令
            pet_create_profile,
            pet_get_profiles,
            pet_create_boarding,
            pet_get_boarding_records,
            pet_check_out_boarding,
            // 便利店行业插件命令
            cv_get_expiry_alerts,
            cv_get_daily_settlement,
            cv_get_restock_suggestions,
            cv_create_pos_order,
            cv_add_expiry_tracking,
            cv_get_expiry_tracking,
            // 酒水批发行业插件命令
            lw_get_credit_accounts,
            lw_get_credit_transactions,
            lw_create_credit_transaction,
            lw_get_batches,
            lw_create_batch,
            lw_get_price_tiers,
            lw_set_price_tier,
            // 手机配件批发行业插件命令
            pa_get_device_models,
            pa_add_device_model,
            pa_get_quotations,
            pa_create_quotation,
            pa_get_price_history,
            // 食材配送行业插件命令
            ff_get_delivery_routes,
            ff_create_delivery_route,
            ff_get_recurring_templates,
            ff_get_freshness_alerts,
            // 汽车配件行业插件命令
            ap_search_by_oe,
            ap_get_vehicle_models,
            ap_add_vehicle_model,
            ap_get_part_categories,
            ap_add_oe_number,
            // 五金行业插件命令
            hw_get_spec_templates,
            hw_set_spec_template,
            hw_calculate_cutting,
            hw_get_credit_accounts,
            hw_get_unit_conversions,
            hw_add_unit_conversion,
            // 装修材料行业插件命令
            dm_get_projects,
            dm_create_project,
            dm_get_bom_templates,
            dm_create_bom_template,
            dm_get_project_materials,
            // 社区团购行业插件命令
            gb_get_groups,
            gb_create_group,
            gb_get_orders,
            gb_parse_jielong_text,
            gb_verify_pickup,
            // NvwaX API 集成命令
            nvwax_search_agents,
            nvwax_get_agent_detail,
            nvwax_get_categories,
            nvwax_search_aiteams,
            nvwax_get_aiteam_detail,
            nvwax_get_industries,
            nvwax_get_plugin_detail,
            nvwax_create_agent,
            nvwax_get_agents,
            nvwax_get_my_agent_detail,
            nvwax_update_agent,
            nvwax_delete_agent,
            nvwax_publish_agent,
            nvwax_unpublish_agent,
            nvwax_create_aiteam,
            nvwax_get_aiteams,
            nvwax_get_my_aiteam_detail,
            nvwax_update_aiteam,
            nvwax_delete_aiteam,
            nvwax_publish_aiteam,
            nvwax_unpublish_aiteam,
            nvwax_search_agents_global,
            nvwax_search_skills,
            nvwax_unified_search,
            nvwax_export_agent,
            nvwax_export_aiteam,
            nvwax_batch_export,
            nvwax_get_export_history,
            nvwax_get_usage_stats,
            nvwax_get_token_balance,
            nvwax_record_consumption,
            nvwax_sync_usage,
            // NvwaX API Key 管理
            get_nvwax_api_key,
            save_nvwax_api_key,
            clear_nvwax_api_key,
            test_nvwax_connection,
        ])
        .run(tauri::generate_context!())
        .expect("启动失败: Tauri 应用运行时出错。请检查系统资源是否充足。");
}
