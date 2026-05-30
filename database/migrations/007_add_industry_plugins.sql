-- ============================================================
-- 行业插件系统数据库迁移 (PostgreSQL)
-- 插件化行业版架构升级 (v1.0)
-- 
-- 新增表：
--   industry_plugins - 行业插件定义
--   plugin_versions  - 插件版本历史
--   plugin_installs  - 安装统计
-- ============================================================

-- 行业插件主表
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

CREATE INDEX IF NOT EXISTS idx_industry_plugins_status ON industry_plugins(status);
CREATE INDEX IF NOT EXISTS idx_industry_plugins_published_at ON industry_plugins(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_industry_plugins_downloads ON industry_plugins(downloads DESC);

-- 插件版本历史表
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id, created_at DESC);

-- 安装统计表
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

-- RLS 策略
ALTER TABLE industry_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published plugins"
    ON industry_plugins FOR SELECT
    USING (status = 'published');

CREATE POLICY "Admins can manage plugins"
    ON industry_plugins FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Anyone can view published versions"
    ON plugin_versions FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage versions"
    ON plugin_versions FOR ALL
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Anyone can insert installs"
    ON plugin_installs FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Admins can view installs"
    ON plugin_installs FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
