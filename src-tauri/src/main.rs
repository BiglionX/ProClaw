#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;
mod sync_engine;

use database::{Database, get_database_path};
use commands::*;
use sync_engine::{SyncEngine, start_sync, get_sync_status};
use std::sync::Mutex;

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
