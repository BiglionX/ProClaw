-- ============================================================
-- ProClaw Cloud 云服务版插件数据库迁移
-- 需求文档：行业插件功能实现（餐饮 / 美业 / 宠物 / Cloud）
-- 
-- 新增表：
--   cloud_backup_jobs    - 云备份任务记录
--   cloud_backup_config  - 云备份配置
-- 
-- 注意：cloud_token_packages 和 cloud_store_sites 已在较早迁移中
-- ============================================================

-- 云备份任务记录
CREATE TABLE IF NOT EXISTS cloud_backup_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    size_bytes INTEGER,
    table_count INTEGER,
    error_message TEXT
);

-- 云备份配置
CREATE TABLE IF NOT EXISTS cloud_backup_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    user_id TEXT,
    auto_backup BOOLEAN DEFAULT 0,
    frequency TEXT DEFAULT 'daily',
    backup_time TEXT DEFAULT '02:00',
    encrypt_backup BOOLEAN DEFAULT 1,
    retention_days INT DEFAULT 30,
    updated_at TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cloud_backup_jobs_user_id ON cloud_backup_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_backup_jobs_status ON cloud_backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cloud_backup_jobs_started_at ON cloud_backup_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_cloud_backup_config_user_id ON cloud_backup_config(user_id);
