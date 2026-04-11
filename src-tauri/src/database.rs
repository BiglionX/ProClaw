use rusqlite::{Connection, Result};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Database not initialized")]
    NotInitialized,
}

pub type DbResult<T> = Result<T, DatabaseError>;

pub struct Database {
    conn: Connection,
}

impl Database {
    /// 创建或打开数据库连接
    pub fn new(db_path: PathBuf) -> DbResult<Self> {
        // 确保目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let conn = Connection::open(&db_path)?;
        
        // 启用 WAL 模式以提高并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        
        Ok(Self { conn })
    }
    
    /// 初始化数据库 Schema
    pub fn initialize(&self) -> DbResult<()> {
        let schema = include_str!("../src/db/schema.sql");
        self.conn.execute_batch(schema)?;
        Ok(())
    }
    
    /// 获取数据库连接引用
    pub fn connection(&self) -> &Connection {
        &self.conn
    }
    
    /// 获取可变的数据库连接引用
    pub fn connection_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }
    
    /// 关闭数据库连接
    pub fn close(self) -> DbResult<()> {
        // Connection 会在 drop 时自动关闭
        Ok(())
    }
}

/// 获取数据库文件路径
pub fn get_database_path() -> PathBuf {
    let proj_dirs = directories::ProjectDirs::from("com", "proclaw", "desktop")
        .expect("Failed to get project directories");
    
    proj_dirs.data_local_dir().join("proclaw.db")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    
    #[test]
    fn test_database_creation() {
        let temp_dir = env::temp_dir().join("proclaw_test");
        let db_path = temp_dir.join("test.db");
        
        let db = Database::new(db_path.clone()).unwrap();
        assert!(db_path.exists());
        
        // 清理
        std::fs::remove_file(&db_path).ok();
        std::fs::remove_dir(&temp_dir).ok();
    }
    
    #[test]
    fn test_database_initialization() {
        let temp_dir = env::temp_dir().join("proclaw_test_init");
        let db_path = temp_dir.join("test_init.db");
        
        let db = Database::new(db_path.clone()).unwrap();
        db.initialize().unwrap();
        
        // 验证表是否创建
        let table_count: i64 = db.conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
                [],
                |row| row.get(0)
            )
            .unwrap();
        
        assert!(table_count > 0);
        
        // 清理
        std::fs::remove_file(&db_path).ok();
        std::fs::remove_dir(&temp_dir).ok();
    }
}
