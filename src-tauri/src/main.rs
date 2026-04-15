#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod sync_engine;

// 模块化命令文件
pub mod types;
pub mod product_commands;
pub mod inventory_commands;
pub mod purchase_commands;
pub mod sales_commands;
pub mod finance_commands;
pub mod common_commands;

use database::{Database, get_database_path};
use sync_engine::{SyncEngine, start_sync, get_sync_status};
use std::sync::Mutex;

// 重新导出所有命令
use product_commands::*;
use inventory_commands::*;
use purchase_commands::*;
use sales_commands::*;
use finance_commands::*;
use common_commands::*;

fn main() {
    // 初始化数据库
    let db_path = get_database_path();
    println!("Database path: {:?}", db_path);

    let db = Database::new(db_path.clone()).expect("Failed to create database");
    db.initialize().expect("Failed to initialize database");
    println!("Database initialized successfully");

    // 创建同步引擎
    let sync_engine = SyncEngine::new(Database::new(db_path).expect("Failed to create database"));

    // 将数据库包装在 Mutex 中以支持多线程访问
    let db = Mutex::new(db);

    tauri::Builder::default()
        .manage(db)
        .manage(sync_engine)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
