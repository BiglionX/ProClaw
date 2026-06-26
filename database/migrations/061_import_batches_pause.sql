-- v1.3 P1：Import Center 任务管理 - 扩展 import_batches 状态机
-- 背景：原 CHECK 约束不允许 'paused' / 'retrying' 状态，且无心跳/进度/暂停原因列
-- SQLite 无法 ALTER CHECK 约束，必须 DROP+RECREATE

-- 1) 重建表（保留所有原数据 + 新列）
CREATE TABLE new_import_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    file_name TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    file_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    mapping_json TEXT,
    conflict_strategy TEXT DEFAULT 'skip' CHECK(conflict_strategy IN ('skip','overwrite','duplicate')),
    -- v1.3 扩展：新增 'paused' / 'retrying'
    status TEXT DEFAULT 'pending' CHECK(status IN (
        'pending','parsing','mapping','validating','importing',
        'paused','retrying',
        'success','partial','failed','cancelled'
    )),
    total_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    error_report_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- v1.3 新增列
    last_heartbeat_at TIMESTAMP,                          -- 暂停点标记；executor 每 100 行写入一次
    processed_rows INTEGER DEFAULT 0,                     -- 断点续导进度（与 success+failed+skipped 之和可能不同，因正在处理行未计入）
    paused_reason TEXT                                   -- 暂停原因（用户主动/系统限流/校验失败等）
);

-- 2) 迁移数据（保留所有历史批次）
INSERT INTO new_import_batches (
    id, user_id, file_name, file_hash, file_size, file_type, target_type,
    mapping_json, conflict_strategy, status,
    total_rows, success_rows, failed_rows, skipped_rows,
    started_at, finished_at, error_report_json, created_at
)
SELECT
    id, user_id, file_name, file_hash, file_size, file_type, target_type,
    mapping_json, conflict_strategy, status,
    total_rows, success_rows, failed_rows, skipped_rows,
    started_at, finished_at, error_report_json, created_at
FROM import_batches;

-- 3) 替换
DROP TABLE import_batches;
ALTER TABLE new_import_batches RENAME TO import_batches;

-- 4) 重建索引
CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at);
-- v1.3 新增索引：用于 Import Center 按状态过滤 + 按最后心跳清理僵尸批次
CREATE INDEX IF NOT EXISTS idx_import_batches_last_heartbeat ON import_batches(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_import_batches_target_type ON import_batches(target_type);

-- 5) 兜底：补齐老批次的新列（NOT NULL 默认值）
UPDATE import_batches SET processed_rows = 0 WHERE processed_rows IS NULL;