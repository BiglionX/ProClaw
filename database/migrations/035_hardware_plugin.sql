-- ============================================================
-- 五金行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   hw_unit_conversions   - 单位转换
--   hw_spec_templates     - 规格矩阵模板
--   hw_cutting_plans      - 板材切割计算
--   hw_credit_accounts    - 挂账账户
--   hw_credit_transactions - 挂账流水
-- ============================================================

-- 单位转换
CREATE TABLE IF NOT EXISTS hw_unit_conversions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    base_unit TEXT NOT NULL,
    target_unit TEXT NOT NULL,
    conversion_factor REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 规格矩阵模板（如螺丝：直径M3/M4/M5 × 长度10mm/12mm/16mm × 材质不锈钢/碳钢）
CREATE TABLE IF NOT EXISTS hw_spec_templates (
    id TEXT PRIMARY KEY,
    product_spu_id TEXT NOT NULL,
    spec_type TEXT NOT NULL,
    spec_values JSONB NOT NULL,
    sort_order INT DEFAULT 0
);

-- 板材切割计算
CREATE TABLE IF NOT EXISTS hw_cutting_plans (
    id TEXT PRIMARY KEY,
    material_name TEXT NOT NULL,
    sheet_width REAL,
    sheet_height REAL,
    pieces JSONB NOT NULL,
    utilization_rate REAL,
    layout_json JSONB,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 挂账账户（复用酒水批发的赊账模式）
CREATE TABLE IF NOT EXISTS hw_credit_accounts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    last_settlement_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 挂账流水
CREATE TABLE IF NOT EXISTS hw_credit_transactions (
    id TEXT PRIMARY KEY,
    credit_account_id TEXT NOT NULL,
    order_id TEXT,
    type TEXT CHECK (type IN ('debit','credit','settlement')),
    amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_hw_unit_conversions_product ON hw_unit_conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_hw_spec_templates_spu ON hw_spec_templates(product_spu_id);
CREATE INDEX IF NOT EXISTS idx_hw_credit_accounts_customer ON hw_credit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_hw_credit_transactions_account ON hw_credit_transactions(credit_account_id);
