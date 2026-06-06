-- ============================================================
-- 手机配件批发行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   pa_device_models        - 兼容机型库
--   pa_product_model_map    - 商品-机型关联
--   pa_quotations           - 报价单
--   pa_price_history        - 价格历史
-- ============================================================

-- 兼容机型库
CREATE TABLE IF NOT EXISTS pa_device_models (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model_name TEXT NOT NULL,
    release_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 商品-机型关联
CREATE TABLE IF NOT EXISTS pa_product_model_map (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    device_model_id TEXT NOT NULL,
    UNIQUE(product_id, device_model_id)
);

-- 报价单
CREATE TABLE IF NOT EXISTS pa_quotations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount REAL,
    status TEXT DEFAULT 'draft',
    valid_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 价格历史（记录每个SKU的历史进价和批发价）
CREATE TABLE IF NOT EXISTS pa_price_history (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    purchase_price REAL,
    wholesale_price REAL,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pa_device_models_brand ON pa_device_models(brand);
CREATE INDEX IF NOT EXISTS idx_pa_device_models_active ON pa_device_models(is_active);
CREATE INDEX IF NOT EXISTS idx_pa_product_model_map_product ON pa_product_model_map(product_id);
CREATE INDEX IF NOT EXISTS idx_pa_product_model_map_device ON pa_product_model_map(device_model_id);
CREATE INDEX IF NOT EXISTS idx_pa_quotations_customer_id ON pa_quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_pa_quotations_status ON pa_quotations(status);
CREATE INDEX IF NOT EXISTS idx_pa_price_history_product_id ON pa_price_history(product_id);
