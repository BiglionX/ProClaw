-- ============================================================
-- 便利店行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   cv_expiry_tracking  - 保质期管理
--   cv_daily_settlement  - 日结记录
-- ============================================================

-- 保质期管理
CREATE TABLE IF NOT EXISTS cv_expiry_tracking (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    batch_no TEXT,
    production_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity INT DEFAULT 0,
    alert_sent BOOLEAN DEFAULT false,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 日结记录
CREATE TABLE IF NOT EXISTS cv_daily_settlement (
    id TEXT PRIMARY KEY,
    settlement_date TEXT NOT NULL,
    shift_start TEXT,
    shift_end TEXT,
    cash_amount REAL DEFAULT 0,
    wechat_amount REAL DEFAULT 0,
    alipay_amount REAL DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cv_expiry_tracking_product_id ON cv_expiry_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_cv_expiry_tracking_expiry_date ON cv_expiry_tracking(expiry_date);
CREATE INDEX IF NOT EXISTS idx_cv_expiry_tracking_alert_sent ON cv_expiry_tracking(alert_sent);
CREATE INDEX IF NOT EXISTS idx_cv_daily_settlement_date ON cv_daily_settlement(settlement_date);
