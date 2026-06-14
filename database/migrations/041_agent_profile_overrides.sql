-- ============================================================
-- ProClaw Agent 个性化配置覆盖（昵称/头像）数据库迁移
-- 计划文档：联系人体验优化 / Agent 介绍页
--
-- 新增表：
--   agent_profile_overrides - Agent 个性化定制
--
-- 用于持久化老板在 Agent 介绍页修改的昵称、头像，
-- 内置 8 个 Agent + 用户安装的插件 Agent 均可定制。
-- ============================================================

-- Agent 个性化覆盖表
CREATE TABLE IF NOT EXISTS agent_profile_overrides (
    agent_id           TEXT PRIMARY KEY,   -- Agent ID（与 agentManagerStore.manifest.id 一致）
    display_name       TEXT,               -- 用户自定义昵称（NULL 表示未修改）
    avatar_key         TEXT,               -- AGENT_AVATAR_PRESETS 中的 key，如 'agent_05'
    custom_avatar_path TEXT,               -- 用户上传头像的相对路径（相对 app_data_dir）
    updated_at         TEXT NOT NULL       -- ISO 8601 时间戳
);

-- 查询最近更新的索引（用于 LRU 缓存失效判断）
CREATE INDEX IF NOT EXISTS idx_agent_profile_overrides_updated
    ON agent_profile_overrides(updated_at);
