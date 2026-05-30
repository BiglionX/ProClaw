-- Migration 021: 扩展 api_usage_logs 表，增加 resource_type 和 metadata 字段
-- 对应 PRD v8.0 第 6.2 节

-- 1. 增加 resource_type 字段
ALTER TABLE api_usage_logs
ADD COLUMN IF NOT EXISTS resource_type TEXT
CHECK(resource_type IN ('sync', 'order', 'theme', 'domain', 'cdn', 'api', 'storage', 'hosting', 'retention', 'other'));

-- 2. 增加 metadata JSONB 字段（存储额外计费信息）
ALTER TABLE api_usage_logs
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. 为 resource_type 创建索引
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_resource_type ON api_usage_logs(resource_type);

-- 4. 创建联合索引（常用查询模式）
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_resource ON api_usage_logs(user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_date ON api_usage_logs(user_id, created_at);
