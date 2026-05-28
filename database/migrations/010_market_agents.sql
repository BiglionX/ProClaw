-- ProClaw Agent 市场数据表 (PRD v6.0)
-- 用于存储 Agent 市场中可安装的 Agent 信息

-- ============================================
-- 市场分类表
-- ============================================
CREATE TABLE IF NOT EXISTS market_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO market_categories (id, name, icon, sort_order) VALUES
    ('cat_collab', '协作', 'group', 1),
    ('cat_sales', '销售', 'sell', 2),
    ('cat_efficiency', '效率', 'timer', 3),
    ('cat_management', '管理', 'badge', 4);

-- ============================================
-- 市场 Agent 表
-- ============================================
CREATE TABLE IF NOT EXISTS market_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'ProClaw 官方',
    icon_url TEXT,                              -- 图标 URL 或图标名称
    permissions_json TEXT DEFAULT '[]',         -- JSON 数组：所需权限列表
    price INTEGER DEFAULT 0,                    -- 价格（分），0 为免费
    category_id TEXT REFERENCES market_categories(id),
    downloads INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    screenshots_json TEXT DEFAULT '[]',         -- JSON 数组：截图 URL
    manifest_json TEXT,                          -- 完整的 manifest.json 内容
    signature TEXT,                             -- manifest 签名（十六进制）
    checksum TEXT,                              -- 包完整性校验和（SHA-256）
    status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'review', 'published', 'archived')),
    download_url TEXT,                          -- Agent 包下载地址
    file_size INTEGER DEFAULT 0,                -- 文件大小（字节）
    homepage TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_agents_status ON market_agents(status);
CREATE INDEX IF NOT EXISTS idx_market_agents_category ON market_agents(category_id);
CREATE INDEX IF NOT EXISTS idx_market_agents_downloads ON market_agents(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_market_agents_name ON market_agents(name);

-- ============================================
-- 市场评价表
-- ============================================
CREATE TABLE IF NOT EXISTS market_reviews (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES market_agents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_market_reviews_agent ON market_reviews(agent_id);

-- ============================================
-- 预热数据：预置官方 Agent
-- ============================================
INSERT OR IGNORE INTO market_agents (id, name, version, description, author, icon_url, permissions_json, price, category_id, downloads, rating) VALUES
    ('ma_task', '任务管理 Agent', '1.0.0', '看板式任务管理，支持任务分配、进度跟踪、优先级排序，适用于项目制团队协作。', 'ProClaw 官方', 'assignment',
     '["read_user", "send_message", "show_notification"]', 0, 'cat_collab', 1280, 4.5),
    ('ma_crm', '客户关系 Agent', '1.0.0', '管理客户联系人、沟通记录、商机跟踪，支持自定义字段和标签分类。', 'ProClaw 官方', 'contacts',
     '["read_user", "read_contacts", "send_message"]', 0, 'cat_sales', 960, 4.3),
    ('ma_doc', '文档协作 Agent', '1.0.0', 'Markdown 编辑器，支持版本历史、实时协作、文档分类归档。', 'ProClaw 官方', 'description',
     '["read_user", "read_files", "write_files"]', 0, 'cat_collab', 750, 4.1),
    ('ma_time', '时间追踪 Agent', '0.9.0', '记录工作耗时，生成时间报表，帮助团队分析效率瓶颈。', '第三方开发者', 'timer',
     '["read_user", "show_notification"]', 1990, 'cat_efficiency', 320, 3.8),
    ('ma_hr', '人事管理 Agent', '1.0.0', '员工信息管理、考勤记录、请假审批、工资单生成。', 'ProClaw 官方', 'badge',
     '["read_user", "send_message"]', 0, 'cat_management', 540, 4.0);
