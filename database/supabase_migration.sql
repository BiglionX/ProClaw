-- ============================================================
-- Supabase Cloud Migration Script
-- ProClaw Pro 版云备份与中继所需云表
-- 
-- 运行方式：
--   1. 打开 Supabase Dashboard → SQL Editor
--   2. 粘贴并执行此脚本
--   3. 或在本地 Supabase CLI: supabase db push
-- ============================================================

-- ============================================================
-- 加密对象表 - 存储端到端加密的业务数据备份
-- ============================================================
CREATE TABLE IF NOT EXISTS encrypted_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,              -- 用户/设备标识
    table_name TEXT NOT NULL,           -- 源表名 (products, customers, etc.)
    record_id TEXT NOT NULL,            -- 源记录 ID
    encrypted_data TEXT NOT NULL,       -- Base64 编码的 AES-256-GCM 加密数据
    data_hash TEXT,                     -- SHA-256 校验和
    version INTEGER DEFAULT 1,          -- 数据格式版本号
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_encrypted_user ON encrypted_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_table_record ON encrypted_objects(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_created ON encrypted_objects(created_at DESC);

-- 启用 RLS (用户只能访问自己的数据)
ALTER TABLE encrypted_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own encrypted data"
    ON encrypted_objects
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- 中继消息表 - 用于移动端和桌面端之间的云中继通信
-- ============================================================
CREATE TABLE IF NOT EXISTS relay_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,            -- 发送者 ID
    receiver_id TEXT NOT NULL,          -- 接收者 ID (设备 token 或用户ID)
    message_type TEXT DEFAULT 'chat',   -- chat, order, sync, command
    encrypted_content TEXT NOT NULL,    -- Base64 编码的 AES-256-GCM 加密消息
    is_delivered BOOLEAN DEFAULT FALSE, -- 是否已送达
    delivered_at TIMESTAMPTZ,           -- 送达时间
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_relay_receiver ON relay_messages(receiver_id, is_delivered);
CREATE INDEX IF NOT EXISTS idx_relay_created ON relay_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relay_sender ON relay_messages(sender_id);

-- 启用 RLS
ALTER TABLE relay_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert relay messages"
    ON relay_messages
    FOR INSERT
    WITH CHECK (sender_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can read their own relay messages"
    ON relay_messages
    FOR SELECT
    USING (receiver_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete delivered messages"
    ON relay_messages
    FOR DELETE
    USING (
        receiver_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND is_delivered = TRUE
    );

-- ============================================================
-- 同步队列表 - 增量同步追踪
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,            -- 设备标识
    table_name TEXT NOT NULL,           -- 表名
    record_id TEXT NOT NULL,            -- 记录 ID
    operation TEXT NOT NULL,            -- INSERT, UPDATE, DELETE
    payload JSONB,                      -- 变更数据 (未加密，仅结构信息)
    status TEXT DEFAULT 'pending',     -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at ASC);

-- 启用 RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync queue"
    ON sync_queue
    FOR ALL
    USING (device_id = current_setting('request.jwt.claims', true)::json->>'sub')
    WITH CHECK (device_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- 同步日志表 - 同步操作审计
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    sync_type TEXT NOT NULL,            -- full, upload_only, download_only
    status TEXT NOT NULL,               -- success, partial, failed
    records_uploaded INTEGER DEFAULT 0,
    records_downloaded INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_device ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);

-- ============================================================
-- 清理函数 - 自动清理过期的中继消息
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_relay_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM relay_messages
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_delivered = TRUE;
END;
$$ LANGUAGE plpgsql;

-- (可选) 创建 cron 作业定期清理
-- SELECT cron.schedule('cleanup-relay', '0 2 * * *', 'SELECT cleanup_expired_relay_messages()');

-- ============================================================
-- 使用说明
-- ============================================================
-- 
-- 1. 安全配置:
--    - 确保在 Supabase Dashboard → Authentication → Settings
--      中启用了 Row Level Security
--    - 确保 API Keys 中的 anon/public key 已启用 RLS bypass
--
-- 2. 数据加密:
--    - 所有 encrypted_data / encrypted_content 均由客户端
--      使用 AES-256-GCM 加密后 Base64 编码上传
--    - 服务端永不可解密数据 (零知识架构)
--
-- 3. 性能优化:
--    - 中继消息在送达后可批量删除以节省存储
--    - 加密对象建议定期清理旧版本
--    - 同步队列的 processed 记录可定期归档
