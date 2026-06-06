-- ============================================================
-- 酒水批发行业插件数据库迁移
-- 需求文档：行业插件补充——八大行业插件发布至插件商店
-- 
-- 新增表：
--   lw_credit_accounts      - 客户赊账账户
--   lw_credit_transactions   - 赊账交易流水
--   lw_batches              - 批次管理
-- ============================================================

-- 客户赊账账户
CREATE TABLE IF NOT EXISTS lw_credit_accounts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    last_settlement_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 赊账交易流水
CREATE TABLE IF NOT EXISTS lw_credit_transactions (
    id TEXT PRIMARY KEY,
    credit_account_id TEXT NOT NULL,
    order_id TEXT,
    type TEXT CHECK (type IN ('debit','credit','settlement')),
    amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 批次管理
CREATE TABLE IF NOT EXISTS lw_batches (
    id TEXT PRIMARY KEY,
    batch_no TEXT NOT NULL,
    product_id TEXT NOT NULL,
    production_date TEXT,
    expiry_date TEXT,
    purchase_quantity INT DEFAULT 0,
    remain_quantity INT DEFAULT 0,
    supplier_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 多级定价（扩展现有products表逻辑，独立存储价格分层）
CREATE TABLE IF NOT EXISTS lw_price_tiers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    price REAL NOT NULL,
    min_quantity INT DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_lw_credit_accounts_customer_id ON lw_credit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_lw_credit_transactions_account_id ON lw_credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_lw_credit_transactions_created_at ON lw_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_lw_batches_batch_no ON lw_batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_lw_batches_product_id ON lw_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_lw_price_tiers_product_id ON lw_price_tiers(product_id);
