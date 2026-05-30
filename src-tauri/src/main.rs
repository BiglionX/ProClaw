#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod sync_engine;
mod api;
mod services;
mod utils;
mod auth;

// 模块化命令文件
pub mod types;
mod types_tests;

// 进销存版模块
#[cfg(feature = "inventory")]
pub mod product_commands;
#[cfg(feature = "inventory")]
pub mod inventory_commands;
#[cfg(feature = "inventory")]
pub mod purchase_commands;
#[cfg(feature = "inventory")]
pub mod sales_commands;
#[cfg(feature = "inventory")]
pub mod finance_commands;

pub mod setup_commands;
pub mod common_commands;
pub mod team_commands;
pub mod user_commands;
pub mod approval_commands;
pub mod subscription_commands;
pub mod message_commands;
pub mod call_commands;
pub mod invitation_commands;
pub mod store_commands;
pub mod ceo_commands;

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

use database::{Database, get_database_path};
use store_commands::*;
use ceo_commands::*;
use sync_engine::*;
use sync_engine::SyncEngine;
use services::cloud_backup_service::CloudBackupService;
use api::AppState;
use api::websocket::WebSocketManager;
use utils::crypto::Aes256GcmCipher;
use utils::key_manager::KeyManager;
use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::Mutex;

// 重新导出所有命令
#[cfg(feature = "inventory")]
use product_commands::*;
#[cfg(feature = "inventory")]
use inventory_commands::*;
#[cfg(feature = "inventory")]
use purchase_commands::*;
#[cfg(feature = "inventory")]
use sales_commands::*;
#[cfg(feature = "inventory")]
use finance_commands::*;
use setup_commands::*;
use common_commands::*;
use team_commands::*;
use user_commands::*;
use approval_commands::*;
use subscription_commands::*;
use message_commands::*;
use call_commands::*;
use invitation_commands::*;
#[cfg(feature = "virtual_company")]
use agent_commands::*;
#[cfg(feature = "virtual_company")]
use finance_agent_commands::*;
#[cfg(feature = "virtual_company")]
use market_commands::*;

#[tokio::main]
async fn main() {
    // 初始化数据库
    let db_path = get_database_path();
    println!("Database path: {:?}", db_path);

    let db = Database::new(db_path.clone()).expect("Failed to create database");
    db.initialize().expect("Failed to initialize database");
    println!("Database initialized successfully");

    // 开发环境: 自动创建测试用户和配对码
    {
        let conn = db.connection();
        let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0)).unwrap_or(0);
        if user_count == 0 {
            conn.execute(
                "INSERT INTO users (id, name, phone, user_type, plan_type) VALUES ('u_test001', '管理员', '13800138000', 'internal', 'professional')",
                [],
            ).ok();
            conn.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES ('u_test001', 1)",
                [],
            ).ok();
            conn.execute(
                "INSERT INTO pairing_codes (id, code, created_by, expires_at) VALUES ('pc_001', '888888', 'u_test001', (SELECT CAST(strftime('%s', 'now') AS INTEGER) + 86400))",
                [],
            ).ok();
            println!("Seeded test user and pairing code '888888'");
        }
    }

    // 创建同步引擎（使用独立的数据库实例）
    let sync_engine = SyncEngine::new(Database::new(db_path.clone()).expect("Failed to create database"));

    // 创建云备份服务（使用独立的数据库实例）
    let encryption_key = [0u8; 32]; // 实际应用中应从配置或用户输入获取
    let cloud_backup_service = Arc::new(CloudBackupService::new(
        Database::new(db_path.clone()).expect("Failed to create database"),
        &encryption_key
    ));

    // 将主数据库包装在 Mutex 中以支持多线程访问
    // Tauri State 使用 Mutex<Database>（不包 Arc），HTTP 服务器使用 Arc<Mutex<Database>>
    let db = Mutex::new(db);

    // Phase 6: 初始化 JWT 密钥管理器
    let key_manager = KeyManager::from_env_or_default();
    let jwt_secret = key_manager.as_bytes().to_vec();
    // 设置全局 JWT 密钥供中间件使用
    api::JWT_SECRET.set(jwt_secret.clone()).ok();

    // 创建 axum 应用状态（使用独立数据库连接，SQLite WAL 支持多连接）
    let http_db = Arc::new(Mutex::new(Database::new(db_path.clone()).expect("Failed to create HTTP DB")));
    let cipher = Arc::new(Aes256GcmCipher::new(&[0u8; 32]));
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
    
    match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => {
            let axum_app = api::create_router(app_state);
            tokio::spawn(async move {
                axum::serve(listener, axum_app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
            });
        }
        Err(e) => {
            eprintln!("Warning: Could not bind HTTP server to {}: {}. HTTP API will be unavailable.", addr, e);
        }
    }

    // 启动 Tauri 应用
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db)
        .manage(sync_engine)
        .manage(cloud_backup_service)
        .manage(ws_manager)
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
            // 库存管理
            create_inventory_transaction,
            get_inventory_transactions,
            get_inventory_stats,
            // 数据分析
            get_sales_trend,
            get_product_analytics,
            // 采购管理
            create_supplier,
            get_suppliers,
            create_purchase_order,
            get_purchase_orders,
            get_purchase_order_detail,
            // 销售管理
            create_customer,
            get_customers,
            create_sales_order,
            get_sales_orders,
            // 财务报表
            get_profit_loss_report,
            get_cash_flow_report,
            get_financial_summary,
            // 文件上传
            upload_image,
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
            // 付款记录 (Phase 6)
            record_payment_cmd,
            get_payments_cmd,
            // 补充的采购/销售命令
            update_purchase_order_cmd,
            delete_purchase_order_cmd,
            receive_purchase_order_cmd,
            update_sales_order_cmd,
            delete_sales_order_cmd,
            submit_sales_order_cmd,
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
        ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
