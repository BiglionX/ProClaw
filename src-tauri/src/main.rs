#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::{Database, get_database_path};
use std::sync::Mutex;

fn main() {
    // 初始化数据库
    let db_path = get_database_path();
    println!("Database path: {:?}", db_path);
    
    let db = Database::new(db_path).expect("Failed to create database");
    db.initialize().expect("Failed to initialize database");
    println!("Database initialized successfully");
    
    // 将数据库包装在 Mutex 中以支持多线程访问
    let db = Mutex::new(db);
    
    tauri::Builder::default()
        .manage(db)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
