-- ============================================================
-- ProClaw 内置商务秘书 Agent BAP 数据库迁移
-- 需求文档：需求文档：ProClaw 内置商务秘书 Agent（PRD v8.5）
--
-- 新增表：
--   secretary_bap - 秘书老板关注配置（Boss Attention Profile）
--
-- BAP 是秘书专属的上下文存储，记录老板的数据偏好，
-- 区别于 CEO Agent 的 PCP（项目上下文协议）。
-- ============================================================

-- 老板关注配置表
CREATE TABLE IF NOT EXISTS secretary_bap (
    id TEXT PRIMARY KEY,
    profile_type TEXT NOT NULL,   -- 'kpi_preference', 'time_routine', 'alert_threshold', 'focus_area', 'custom_rule'
    key TEXT NOT NULL,
    value JSON NOT NULL,
    confidence REAL DEFAULT 0.5,  -- 置信度（0-1），越高表示越确定这是老板的稳定偏好
    source TEXT DEFAULT 'observed',  -- 'observed'(观察习得) / 'explicit'(老板明确设置) / 'inferred'(推理)
    last_matched_at INTEGER,
    created_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER),
    updated_at INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
);

-- 复合索引：加速按类型和来源的查询
CREATE INDEX IF NOT EXISTS idx_secretary_bap_profile_type ON secretary_bap(profile_type);
CREATE INDEX IF NOT EXISTS idx_secretary_bap_source ON secretary_bap(source);
CREATE INDEX IF NOT EXISTS idx_secretary_bap_updated ON secretary_bap(updated_at);
