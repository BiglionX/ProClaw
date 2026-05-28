-- ProClaw 财务管理 Agent 数据表 (PRD v6.0)
-- 使用 agent_finance_ 前缀遵循 PRD 数据隔离规范

-- ============================================
-- 收支分类表
-- ============================================
CREATE TABLE IF NOT EXISTS agent_finance_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- 分类名称（如餐饮、交通、办公等）
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),  -- 收支类型
    icon TEXT,                                   -- 图标
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO agent_finance_categories (id, name, type, icon, sort_order) VALUES
    ('fc_salary', '薪资', 'expense', 'work', 1),
    ('fc_food', '餐饮', 'expense', 'restaurant', 2),
    ('fc_transport', '交通', 'expense', 'directions_car', 3),
    ('fc_office', '办公', 'expense', 'business', 4),
    ('fc_rent', '房租', 'expense', 'home', 5),
    ('fc_utility', '水电', 'expense', 'bolt', 6),
    ('fc_travel', '差旅', 'expense', 'flight', 7),
    ('fc_marketing', '营销', 'expense', 'campaign', 8),
    ('fc_other_expense', '其他支出', 'expense', 'more_horiz', 99),
    ('fc_sales_income', '销售收入', 'income', 'sell', 1),
    ('fc_service_income', '服务收入', 'income', 'support', 2),
    ('fc_investment', '投资收益', 'income', 'trending_up', 3),
    ('fc_other_income', '其他收入', 'income', 'more_horiz', 99);

-- ============================================
-- 账户表
-- ============================================
CREATE TABLE IF NOT EXISTS agent_finance_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- 账户名称
    type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'alipay', 'wechat', 'other')),  -- 账户类型
    balance REAL DEFAULT 0,                      -- 当前余额
    currency TEXT DEFAULT 'CNY',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 交易记录表
-- ============================================
CREATE TABLE IF NOT EXISTS agent_finance_transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES agent_finance_accounts(id),
    category_id TEXT REFERENCES agent_finance_categories(id),
    amount REAL NOT NULL,                        -- 金额（正数为收入，负数为支出）
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
    transaction_date DATE NOT NULL,
    note TEXT,                                   -- 备注
    attachment_id TEXT REFERENCES files(id),     -- 附件（发票图片等）
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_af_transactions_account ON agent_finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_af_transactions_date ON agent_finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_af_transactions_category ON agent_finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_af_transactions_type ON agent_finance_transactions(type);

-- ============================================
-- 预算表
-- ============================================
CREATE TABLE IF NOT EXISTS agent_finance_budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES agent_finance_categories(id),
    month TEXT NOT NULL,                          -- 预算月份 (YYYY-MM)
    limit_amount REAL NOT NULL,                   -- 预算限额
    actual_amount REAL DEFAULT 0,                 -- 实际支出（可自动计算，也可手动调整）
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_af_budgets_month ON agent_finance_budgets(month);

-- ============================================
-- 发票表
-- ============================================
CREATE TABLE IF NOT EXISTS agent_finance_invoices (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('input', 'output')),     -- 进项/销项发票
    invoice_code TEXT,                           -- 发票代码
    invoice_number TEXT,                         -- 发票号码
    amount REAL NOT NULL,                        -- 发票金额
    tax_amount REAL DEFAULT 0,                   -- 税额
    tax_rate REAL DEFAULT 0,                     -- 税率
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'paid', 'cancelled')),
    issue_date DATE,                             -- 开票日期
    counterparty_name TEXT,                      -- 对方名称
    counterparty_tax_id TEXT,                    -- 对方税号
    file_id TEXT REFERENCES files(id),           -- 发票文件/图片
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_af_invoices_type ON agent_finance_invoices(type);
CREATE INDEX IF NOT EXISTS idx_af_invoices_status ON agent_finance_invoices(status);
CREATE INDEX IF NOT EXISTS idx_af_invoices_date ON agent_finance_invoices(issue_date);
