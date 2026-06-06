-- ============================================================
-- 食材配送行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   ff_recurring_order_templates - 周期订单模板
--   ff_delivery_routes           - 配送路线
--   ff_freshness_tracking        - 新鲜度跟踪
-- ============================================================

-- 周期订单模板
CREATE TABLE IF NOT EXISTS ff_recurring_order_templates (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    items JSONB NOT NULL,
    schedule_type TEXT CHECK (schedule_type IN ('daily','weekly','custom')),
    week_days TEXT,
    is_active BOOLEAN DEFAULT true,
    next_generate_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 配送路线
CREATE TABLE IF NOT EXISTS ff_delivery_routes (
    id TEXT PRIMARY KEY,
    route_date TEXT NOT NULL,
    driver_name TEXT,
    stops JSONB,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 新鲜度跟踪（类似便利店保质期管理，但针对食材特性）
CREATE TABLE IF NOT EXISTS ff_freshness_tracking (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    batch_no TEXT,
    received_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity REAL,
    alert_sent BOOLEAN DEFAULT false,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ff_recurring_templates_customer ON ff_recurring_order_templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_ff_recurring_templates_active ON ff_recurring_order_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_ff_delivery_routes_date ON ff_delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_ff_delivery_routes_status ON ff_delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_ff_freshness_product_id ON ff_freshness_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_ff_freshness_expiry_date ON ff_freshness_tracking(expiry_date);
