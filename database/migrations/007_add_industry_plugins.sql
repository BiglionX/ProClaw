-- ============================================================
-- 行业插件系统数据库迁移
-- 插件化行业版架构升级 (v1.0)
-- 
-- 新增表：
--   industry_plugins - 行业插件定义
--   plugin_versions  - 插件版本历史
--   plugin_installs  - 安装统计
-- ============================================================

-- 行业插件主表
CREATE TABLE IF NOT EXISTS industry_plugins (
  id TEXT PRIMARY KEY,                 -- plugin id, 如 'catering'
  name TEXT NOT NULL,                  -- 显示名称, 如 '餐饮行业版'
  version TEXT NOT NULL,               -- 当前版本
  status TEXT DEFAULT 'draft',         -- draft / review / published / deprecated
  manifest_json TEXT NOT NULL,         -- 完整 manifest JSON
  package_url TEXT,                    -- 插件包下载地址
  package_hash TEXT,                   -- SHA256
  package_size INTEGER,                -- 字节数
  min_app_version TEXT,                -- 最低兼容桌面端版本
  icon TEXT,                           -- 图标 URL
  description TEXT,                    -- 行业描述
  downloads INTEGER DEFAULT 0,         -- 总下载量
  active_installs INTEGER DEFAULT 0,   -- 活跃安装数
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

-- 插件版本历史表
CREATE TABLE IF NOT EXISTS plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES industry_plugins(id),
  version TEXT NOT NULL,               -- 语义版本号
  changelog TEXT,                      -- 版本更新说明
  package_url TEXT NOT NULL,           -- 该版本的包下载地址
  package_hash TEXT NOT NULL,          -- SHA256
  package_size INTEGER NOT NULL,       -- 字节数
  min_app_version TEXT,                -- 最低兼容桌面端版本
  is_force_update BOOLEAN DEFAULT 0,   -- 是否为强制更新
  rollout_percentage INTEGER DEFAULT 100, -- 灰度发布比例
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(plugin_id, version)
);

-- 安装统计表
CREATE TABLE IF NOT EXISTS plugin_installs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,             -- 插件 ID
  version TEXT,                        -- 安装的版本
  app_version TEXT,                    -- 桌面端版本
  os TEXT,                             -- 操作系统
  install_id TEXT,                     -- 匿名安装 ID
  action TEXT,                         -- 'install' / 'update' / 'uninstall'
  created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installs_plugin_id ON plugin_installs(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_installs_action ON plugin_installs(action);
CREATE INDEX IF NOT EXISTS idx_plugin_installs_created_at ON plugin_installs(created_at);
CREATE INDEX IF NOT EXISTS idx_industry_plugins_status ON industry_plugins(status);
