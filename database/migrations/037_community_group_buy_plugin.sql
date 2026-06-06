-- ============================================================
-- 社区团购行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   gb_groups              - 团期管理
--   gb_group_products      - 团购商品
--   gb_orders              - 接龙订单
--   gb_jielong_parse_logs  - 接龙文本解析日志
-- ============================================================

-- 团期管理
CREATE TABLE IF NOT EXISTS gb_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    min_participants INT DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','open','closed','procurement','distributing','completed')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 团购商品
CREATE TABLE IF NOT EXISTS gb_group_products (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    group_price REAL NOT NULL,
    min_order_qty INT DEFAULT 1,
    max_order_qty INT,
    total_ordered_qty INT DEFAULT 0,
    UNIQUE(group_id, product_id)
);

-- 接龙订单（来自微信群接龙的客户订单）
CREATE TABLE IF NOT EXISTS gb_orders (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount REAL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','arrived','picked_up','cancelled')),
    pickup_code TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 接龙文本解析日志（记录AI解析微信群接龙文本的结果）
CREATE TABLE IF NOT EXISTS gb_jielong_parse_logs (
    id TEXT PRIMARY KEY,
    raw_text TEXT NOT NULL,
    parsed_items JSONB,
    success BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_gb_groups_status ON gb_groups(status);
CREATE INDEX IF NOT EXISTS idx_gb_group_products_group ON gb_group_products(group_id);
CREATE INDEX IF NOT EXISTS idx_gb_orders_group_id ON gb_orders(group_id);
CREATE INDEX IF NOT EXISTS idx_gb_orders_status ON gb_orders(status);
CREATE INDEX IF NOT EXISTS idx_gb_orders_pickup_code ON gb_orders(pickup_code);
