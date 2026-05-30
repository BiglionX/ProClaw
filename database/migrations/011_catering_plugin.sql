-- ============================================================
-- 餐饮行业插件数据库迁移
-- 需求文档：行业插件功能实现（餐饮 / 美业 / 宠物 / Cloud）
-- 
-- 新增表：
--   pos_orders           - POS 点餐订单
--   pos_menu_items       - POS 菜品列表
--   pos_tables           - 桌台管理
--   catering_members     - 餐饮会员
--   catering_member_logs - 会员积分/消费流水
-- ============================================================

-- POS 点餐订单
CREATE TABLE IF NOT EXISTS pos_orders (
    id TEXT PRIMARY KEY,
    table_id TEXT,
    items JSONB,
    total_amount REAL,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    settled_at TEXT
);

-- POS 菜品列表
CREATE TABLE IF NOT EXISTS pos_menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT,
    price REAL,
    is_available BOOLEAN DEFAULT 1,
    sort_order INT DEFAULT 0
);

-- 桌台管理
CREATE TABLE IF NOT EXISTS pos_tables (
    id TEXT PRIMARY KEY,
    area TEXT,
    name TEXT,
    capacity INT,
    status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant','occupied','reserved','cleaning'))
);

-- 餐饮会员
CREATE TABLE IF NOT EXISTS catering_members (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    total_consumption REAL DEFAULT 0,
    points INT DEFAULT 0,
    visit_count INT DEFAULT 0,
    last_visit_at TEXT,
    created_at TEXT
);

-- 会员积分/消费流水
CREATE TABLE IF NOT EXISTS catering_member_logs (
    id TEXT PRIMARY KEY,
    member_id TEXT,
    type TEXT,
    amount REAL,
    points INT,
    description TEXT,
    created_at TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pos_orders_table_id ON pos_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_created_at ON pos_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_menu_items_category_id ON pos_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_status ON pos_tables(status);
CREATE INDEX IF NOT EXISTS idx_catering_members_phone ON catering_members(phone);
CREATE INDEX IF NOT EXISTS idx_catering_member_logs_member_id ON catering_member_logs(member_id);
