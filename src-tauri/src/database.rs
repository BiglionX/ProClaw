use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
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

    /// 创建内存数据库（用于测试）
    pub fn new_in_memory() -> DbResult<Self> {
        let conn = Connection::open_in_memory()?;
        Ok(Self { conn })
    }

    /// 初始化数据库 Schema
    pub fn initialize(&self) -> DbResult<()> {
        // 加载基础schema
        let schema = include_str!("../../src/db/schema.sql");
        self.conn.execute_batch(schema)?;
        
        // 加载SPU-SKU电商架构schema (SQLite版本)
        let spu_sku_schema = include_str!("../../database/spu_sku_schema_sqlite.sql");
        self.conn.execute_batch(spu_sku_schema)?;
        
        // 运行迁移：员工邀请与角色权限自动分配（PRD v4.3）
        let migration = include_str!("../../src/db/migrations/006_add_employee_invitation_fields.sql");
        self.conn.execute_batch(migration).ok(); // 忽略错误（如果已经运行过）

        // 运行迁移：财务管理 Agent 数据表（PRD v6.0）
        let finance_migration = include_str!("../../src/db/migrations/009_finance_agent_tables.sql");
        self.conn.execute_batch(finance_migration).ok(); // 忽略错误（如果已经运行过）

        // 运行迁移：Agent 市场数据表（PRD v6.0）
        let market_migration = include_str!("../../database/migrations/010_market_agents.sql");
        self.conn.execute_batch(market_migration).ok();

        // 自动安装内置 Agent
        let builtin_count: i64 = self.conn
            .query_row(
                "SELECT COUNT(*) FROM agents WHERE is_builtin = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if builtin_count == 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;

            // 预定义所有内置 Agent
            let builtins = vec![
                ("proclaw-finance-agent", "财务管理 Agent", vec!["read_user", "read_finance", "write_finance", "show_notification"], "内置财务管理 Agent - 记账、预算、报表、发票管理"),
                ("proclaw-task-agent", "任务管理 Agent", vec!["read_user", "send_message", "show_notification"], "看板式任务管理，支持任务分配、进度跟踪、优先级排序"),
                ("proclaw-crm-agent", "客户关系 Agent", vec!["read_user", "read_contacts", "send_message"], "管理客户联系人、沟通记录、商机跟踪，支持标签分类"),
                ("proclaw-docs-agent", "文档协作 Agent", vec!["read_user", "read_files", "write_files"], "Markdown 编辑器，支持版本历史、文档分类归档"),
                ("proclaw-hr-agent", "人事管理 Agent", vec!["read_user", "send_message", "show_notification"], "员工信息管理、考勤记录、请假审批、工资单生成"),
            ];

            for (id, name, permissions, description) in &builtins {
                let manifest = serde_json::json!({
                    "id": id,
                    "name": name,
                    "version": "1.0.0",
                    "entry": "index.html",
                    "description": description,
                    "author": "ProClaw 官方",
                    "permissions": permissions,
                }).to_string();
                self.conn.execute(
                    "INSERT INTO agents (id, name, version, manifest, enabled, is_builtin, installed_at)
                     VALUES (?1, ?2, '1.0.0', ?3, 1, 1, ?4)",
                    params![id, name, manifest, now],
                ).ok();
                println!("Installed built-in Agent: {}", name);
            }
        }
        
        Ok(())
    }

    /// 获取数据库连接引用
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// 获取可变的数据库连接引用
    #[allow(dead_code)]
    pub fn connection_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// 关闭数据库连接
    #[allow(dead_code)]
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

        let _db = Database::new(db_path.clone()).unwrap();
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
        let table_count: i64 = db.connection()
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
