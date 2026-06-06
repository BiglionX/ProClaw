-- ============================================================
-- 汽车配件行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   ap_vehicle_models    - 车型库
--   ap_oe_numbers         - OE号库
--   ap_part_categories    - 配件品牌分类
-- ============================================================

-- 车型库
CREATE TABLE IF NOT EXISTS ap_vehicle_models (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    series TEXT,
    year_range TEXT,
    displacement TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- OE号库
CREATE TABLE IF NOT EXISTS ap_oe_numbers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    oe_number TEXT NOT NULL,
    vehicle_model_id TEXT,
    part_category TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 配件品牌分类（原厂件/品牌件/副厂件/拆车件）
CREATE TABLE IF NOT EXISTS ap_part_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT CHECK (grade IN ('OEM','brand','aftermarket','used')),
    sort_order INT DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ap_vehicle_models_brand ON ap_vehicle_models(brand);
CREATE INDEX IF NOT EXISTS idx_ap_oe_numbers_oe ON ap_oe_numbers(oe_number);
CREATE INDEX IF NOT EXISTS idx_ap_oe_numbers_product_id ON ap_oe_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_ap_oe_numbers_vehicle_model ON ap_oe_numbers(vehicle_model_id);
