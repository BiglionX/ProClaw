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
pub mod product_commands;
pub mod inventory_commands;
pub mod purchase_commands;
pub mod sales_commands;
pub mod finance_commands;
pub mod common_commands;
pub mod team_commands;
pub mod user_commands;
pub mod approval_commands;
pub mod subscription_commands;
pub mod message_commands;
pub mod call_commands;

use database::{Database, get_database_path};
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
use product_commands::*;
use inventory_commands::*;
use purchase_commands::*;
use sales_commands::*;
use finance_commands::*;
use common_commands::*;
use team_commands::*;
use user_commands::*;
use approval_commands::*;
use subscription_commands::*;
use message_commands::*;
use call_commands::*;

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
        .manage(db)
        .manage(sync_engine)
        .manage(cloud_backup_service)
        .manage(ws_manager)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
