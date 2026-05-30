-- ProClaw 插件化行业版 - 插件系统数据库迁移
-- Version: 1.0.0
-- Description: 行业插件目录、版本管理、安装统计表

-- ============================================
-- 1. industry_plugins 表
-- ============================================
CREATE TABLE IF NOT EXISTS industry_plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'deprecated')),
    manifest_json TEXT NOT NULL,
    package_url TEXT,
    package_hash TEXT,
    package_size BIGINT,
    min_app_version TEXT,
    icon TEXT,
    description TEXT,
    downloads BIGINT DEFAULT 0,
    active_installs BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 为已发布插件创建索引（供公开 API 快速查询）
CREATE INDEX IF NOT EXISTS idx_industry_plugins_status ON industry_plugins(status);
CREATE INDEX IF NOT EXISTS idx_industry_plugins_published_at ON industry_plugins(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_industry_plugins_downloads ON industry_plugins(downloads DESC);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_industry_plugins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_industry_plugins_updated_at ON industry_plugins;
CREATE TRIGGER trigger_industry_plugins_updated_at
    BEFORE UPDATE ON industry_plugins
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_plugins_updated_at();

-- ============================================
-- 2. plugin_versions 表
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_versions (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL REFERENCES industry_plugins(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    changelog TEXT,
    package_url TEXT NOT NULL,
    package_hash TEXT NOT NULL,
    package_size BIGINT NOT NULL,
    min_app_version TEXT,
    is_force_update BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id, created_at DESC);

-- ============================================
-- 3. plugin_installs 表
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_installs (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    version TEXT,
    app_version TEXT,
    os TEXT,
    install_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('install', 'update', 'uninstall')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_installs_plugin_id ON plugin_installs(plugin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_installs_install_id ON plugin_installs(install_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installs_created_at ON plugin_installs(created_at);

-- ============================================
-- 4. 存储过程：增加插件下载量
-- ============================================
CREATE OR REPLACE FUNCTION increment_plugin_downloads(p_plugin_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE industry_plugins
    SET downloads = downloads + 1
    WHERE id = p_plugin_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. RLS 策略
-- ============================================
ALTER TABLE industry_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_installs ENABLE ROW LEVEL SECURITY;

-- 公开可见已发布的插件
CREATE POLICY "Anyone can view published plugins"
    ON industry_plugins
    FOR SELECT
    USING (status = 'published');

-- 仅 Admin 可以管理插件
CREATE POLICY "Admins can manage plugins"
    ON industry_plugins
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 公开可见版本信息
CREATE POLICY "Anyone can view published versions"
    ON plugin_versions
    FOR SELECT
    USING (TRUE);

-- Admin 管理版本
CREATE POLICY "Admins can manage versions"
    ON plugin_versions
    FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 公开可插入安装记录（匿名下载统计）
CREATE POLICY "Anyone can insert installs"
    ON plugin_installs
    FOR INSERT
    WITH CHECK (TRUE);

-- Admin 查看安装统计
CREATE POLICY "Admins can view installs"
    ON plugin_installs
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
