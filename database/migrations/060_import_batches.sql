-- ProClaw 数据导入批次审计表
-- 030+ 系列迁移：商品数据导入 MVP
-- 仅记录 batch 元数据与汇总；行级错误存 error_report_json

CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    file_name TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    file_type TEXT NOT NULL,                       -- xlsx | csv | json
    target_type TEXT NOT NULL,                     -- MVP 仅 'products'
    mapping_json TEXT,                             -- 字段映射快照
    conflict_strategy TEXT DEFAULT 'skip' CHECK(conflict_strategy IN ('skip','overwrite','duplicate')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','parsing','mapping','validating','importing','success','partial','failed','cancelled')),
    total_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    error_report_json TEXT,                        -- 行级错误汇总 JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_batches_user_id ON import_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at);

-- 用于按 batch 回滚的关联字段（MVP 阶段先落库；executor.rs 在写 SPU/SKU/images 时携带 batch_id 以便 rollback）
-- 注：MVP 不修改 product_spus/product_skus/product_images 的表结构；rollback 阶段改为按 file_name 软删除后回退
-- （实际通过 UPDATE status='deleted' 实现，依赖 product_spus.status 的 CHECK 约束）
