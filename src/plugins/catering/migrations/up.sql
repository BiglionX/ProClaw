-- ============================================
-- 餐厅插件数据库迁移 — up
-- 创建 POS 订单、菜品菜单、桌台管理等表
-- ============================================

-- 菜品分类表
CREATE TABLE IF NOT EXISTS catering_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    sort_order INTEGER DEFAULT 0,
    icon TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES catering_categories(id)
);

-- 菜品表
CREATE TABLE IF NOT EXISTS catering_menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    unit TEXT DEFAULT '份',
    image_url TEXT,
    description TEXT,
    spicy_level INTEGER DEFAULT 0,
    is_recommended INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES catering_categories(id)
);

-- 桌台表
CREATE TABLE IF NOT EXISTS catering_tables (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'available' 
        CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    area TEXT DEFAULT '大厅',
    qr_code_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- POS 订单表
CREATE TABLE IF NOT EXISTS catering_orders (
    id TEXT PRIMARY KEY,
    table_id TEXT,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'preparing', 'served', 'settled', 'cancelled')),
    total_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    final_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT,
    guest_count INTEGER DEFAULT 1,
    remark TEXT,
    operator_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    settled_at TEXT,
    FOREIGN KEY (table_id) REFERENCES catering_tables(id)
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS catering_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    menu_item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'preparing', 'done', 'cancelled')),
    remark TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES catering_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES catering_menu_items(id)
);

-- 后厨显示（KDS）队列
CREATE TABLE IF NOT EXISTS catering_kds_queue (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    table_number TEXT,
    item_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'preparing', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (order_id) REFERENCES catering_orders(id) ON DELETE CASCADE
);

-- 会员表
CREATE TABLE IF NOT EXISTS catering_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit_at TEXT,
    level TEXT DEFAULT 'regular'
        CHECK (level IN ('regular', 'silver', 'gold', 'diamond')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_catering_menu_category ON catering_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_catering_orders_table ON catering_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_catering_orders_status ON catering_orders(status);
CREATE INDEX IF NOT EXISTS idx_catering_orders_created ON catering_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_catering_order_items_order ON catering_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_catering_kds_status ON catering_kds_queue(status);
CREATE INDEX IF NOT EXISTS idx_catering_members_phone ON catering_members(phone);
