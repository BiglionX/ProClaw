-- ProClaw Desktop Database Schema
-- Version: 0.1.0
-- Created: 2026-04-11

-- ============================================
-- 用户表 (PRD 6.1 用户与角色)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    user_type TEXT CHECK(user_type IN ('internal','external')) DEFAULT 'internal',
    external_type TEXT CHECK(external_type IN ('customer','supplier','both')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    password_hash TEXT,  -- 内部用户密码哈希
    plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'basic', 'professional', 'enterprise')) -- Phase 7: 订阅套餐
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan_type);

-- ============================================
-- 产品库 - 分类表
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================
-- 产品库 - 品牌表
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================
-- 产品库 - 产品表
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES product_categories(id),
    brand_id TEXT REFERENCES brands(id),
    unit TEXT DEFAULT '件',
    cost_price REAL DEFAULT 0,
    sell_price REAL DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    image_url TEXT,
    barcode TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata TEXT, -- JSON 字符串
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================
-- 进销存 - 库存交易表
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    reference_no TEXT, -- 参考单号
    reason TEXT,
    performed_by TEXT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP
);

-- ============================================
-- 离线操作队列表
-- ============================================
CREATE TABLE IF NOT EXISTS offline_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload TEXT NOT NULL, -- JSON 字符串
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    backup_status TEXT DEFAULT 'pending' CHECK(backup_status IN ('pending', 'processing', 'completed', 'failed')),
    backup_error TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- ============================================
-- 同步日志表
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('upload', 'download', 'full')),
    status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_priority ON offline_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- ============================================
-- 触发器 - 自动更新 updated_at
-- ============================================
-- SQLite 触发器语法

-- 创建触发器: users
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 创建触发器: products
CREATE TRIGGER IF NOT EXISTS update_products_updated_at
    AFTER UPDATE ON products
    FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 创建触发器: product_categories
CREATE TRIGGER IF NOT EXISTS update_categories_updated_at
    AFTER UPDATE ON product_categories
    FOR EACH ROW
BEGIN
    UPDATE product_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- 供应商表
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- 供应商编码
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    payment_terms TEXT, -- 付款条件 (e.g., "Net 30", "COD")
    tax_number TEXT, -- 税号
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);

-- ============================================
-- 采购订单表
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL, -- 采购单号 (e.g., PO-2024-001)
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected', 'confirmed', 'shipped', 'received', 'cancelled')),
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);

-- ============================================
-- 采购订单明细表
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, -- 单价
    total_price REAL NOT NULL, -- 总价 = quantity * unit_price
    received_quantity INTEGER DEFAULT 0, -- 已收货数量
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchase_order_items(product_id);

-- ============================================
-- 客户表
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- 客户编码
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    customer_type TEXT DEFAULT 'individual' CHECK(customer_type IN ('individual', 'company')),
    tax_number TEXT, -- 税号
    credit_limit REAL DEFAULT 0, -- 信用额度
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);

-- ============================================
-- 销售订单表
-- ============================================
CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    so_number TEXT UNIQUE NOT NULL, -- 销售单号 (e.g., SO-2024-001)
    customer_id TEXT NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
    shipping_address TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_so_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_date ON sales_orders(order_date);

-- ============================================
-- 销售订单明细表
-- ============================================
CREATE TABLE IF NOT EXISTS sales_order_items (
    id TEXT PRIMARY KEY,
    sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, -- 单价
    total_price REAL NOT NULL, -- 总价 = quantity * unit_price
    shipped_quantity INTEGER DEFAULT 0, -- 已发货数量
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_soi_so ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soi_product ON sales_order_items(product_id);

-- ============================================
-- 会计科目表
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- 科目编码 (e.g., 1001, 5001)
    name TEXT NOT NULL, -- 科目名称
    type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id TEXT REFERENCES accounts(id), -- 父科目(用于层级结构)
    balance REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

-- ============================================
-- 财务交易记录表
-- ============================================
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense', 'transfer')),
    amount REAL NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    reference_type TEXT, -- 关联类型 (e.g., 'sales_order', 'purchase_order')
    reference_id TEXT, -- 关联ID
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ft_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ft_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ft_account ON financial_transactions(account_id);

-- ============================================
-- AI 团队管理表 (支持完整 AiTeam 生命周期)
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    config_json TEXT NOT NULL DEFAULT '{}',
    source TEXT DEFAULT 'local',
    -- AiTeam 扩展字段 (v2.0)
    version TEXT DEFAULT '1.0.0',
    publish_status TEXT DEFAULT 'private' CHECK(publish_status IN ('draft', 'published', 'private')),
    tags TEXT DEFAULT '[]',
    members_json TEXT DEFAULT '[]',
    workflow_json TEXT DEFAULT '{}',
    triggers_json TEXT DEFAULT '{}',
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_source ON teams(source);
CREATE INDEX IF NOT EXISTS idx_teams_publish_status ON teams(publish_status);
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category);

-- ============================================
-- 角色表
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT,  -- JSON 字符串存储权限列表
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认角色
INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES
    (1, 'boss', '老板', '["*"]'),  -- 所有权限
    (2, 'finance', '财务', '["view_finance","manage_finance"]'),
    (3, 'purchase', '采购', '["view_purchase","manage_purchase"]'),
    (4, 'warehouse', '仓库', '["view_inventory","manage_inventory"]'),
    (5, 'sales', '销售', '["view_sales","create_sales_order"]'),
    (6, 'customer', '客户', '["view_own_orders","view_own_products"]'),
    (7, 'supplier', '供应商', '["view_own_products"]');

-- ============================================
-- 用户角色关联表
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- ============================================
-- 设备授权表 (PRD 6.5 设备授权)
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK(device_type IN ('desktop','mobile')),
    access_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    token_expires_at INTEGER NOT NULL,  -- Unix 时间戳
    last_active_at INTEGER,  -- Unix 时间戳
    is_revoked BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(access_token);
CREATE INDEX IF NOT EXISTS idx_devices_refresh ON devices(refresh_token);

-- ============================================
-- 配对码表 (用于设备配对)
-- ============================================
CREATE TABLE IF NOT EXISTS pairing_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,  -- 6位数字配对码
    created_by TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL,  -- Unix 时间戳
    is_used BOOLEAN DEFAULT 0,
    used_by_device_id TEXT REFERENCES devices(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);

-- ============================================
-- 订单草稿表 (PRD 6.4 AI 订单识别)
-- ============================================
CREATE TABLE IF NOT EXISTS order_drafts (
    id TEXT PRIMARY KEY,
    sales_id TEXT REFERENCES users(id),  -- 销售员ID
    customer_id TEXT REFERENCES customers(id),
    items_json TEXT NOT NULL,  -- JSON 字符串存储订单项
    original_image_url TEXT,  -- 原始图片URL
    ai_raw_response TEXT,  -- AI 原始响应
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','validated','submitted','cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_drafts_sales ON order_drafts(sales_id);
CREATE INDEX IF NOT EXISTS idx_order_drafts_customer ON order_drafts(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_drafts_status ON order_drafts(status);

-- ============================================
-- AI 识别日志表 (PRD 6.4)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_recognition_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    image_size INTEGER,
    model_name TEXT,
    confidence REAL,
    tokens_used INTEGER,
    cost REAL,
    status TEXT DEFAULT 'success' CHECK(status IN ('success','failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_recognition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_recognition_logs(created_at DESC);

-- ============================================
-- 聊天消息表 (PRD 6.3 聊天与消息)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL REFERENCES users(id),
    to_user TEXT REFERENCES users(id),  -- 单聊时为对方ID，群聊时为NULL
    group_id TEXT,  -- 群聊ID（未来扩展）
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK(content_type IN ('text','image','file','order_card')),
    is_offline BOOLEAN DEFAULT 0,
    is_read BOOLEAN DEFAULT 0,
    created_at INTEGER NOT NULL,  -- Unix 时间戳（毫秒）
    updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================
-- 离线消息表
-- ============================================
CREATE TABLE IF NOT EXISTS offline_messages (
    id TEXT PRIMARY KEY,
    target_user TEXT NOT NULL REFERENCES users(id),
    message_id TEXT NOT NULL REFERENCES messages(id),
    is_sent BOOLEAN DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    last_retry_at INTEGER,  -- Unix 时间戳（毫秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offline_messages_target ON offline_messages(target_user);
CREATE INDEX IF NOT EXISTS idx_offline_messages_sent ON offline_messages(is_sent);

-- ============================================
-- 文件管理表
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    thumbnail_path TEXT,  -- 缩略图路径（图片类型）
    uploaded_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC);

-- ============================================
-- 云中继消息表 (Phase 5)
-- ============================================
CREATE TABLE IF NOT EXISTS relay_messages (
    id TEXT PRIMARY KEY,
    receiver_id TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'chat' CHECK(message_type IN ('chat','order','sync','command')),
    content TEXT NOT NULL,         -- JSON 字符串消息内容
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','delivered','failed','synced')),
    direction TEXT DEFAULT 'outgoing' CHECK(direction IN ('outgoing','incoming')),
    relay_id TEXT,                -- Supabase 上的中继消息 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_relay_messages_receiver ON relay_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_relay_messages_status ON relay_messages(status, direction);
CREATE INDEX IF NOT EXISTS idx_relay_messages_created ON relay_messages(created_at DESC);

-- ============================================
-- 审批工作流表 (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL CHECK(target_type IN ('purchase_order', 'sales_order')),
    target_id TEXT NOT NULL,
    requested_by TEXT REFERENCES users(id),
    approved_by TEXT REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_target ON approvals(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);

-- ============================================
-- 付款记录表 (Phase 6)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_type TEXT NOT NULL CHECK(order_type IN ('purchase_order', 'sales_order')),
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank_transfer', 'alipay', 'wechat', 'other')),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_type, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- 订阅套餐表 (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    plan_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    monthly_price REAL NOT NULL,
    yearly_price REAL NOT NULL,
    token_quota INTEGER NOT NULL,
    max_devices INTEGER DEFAULT 3,
    features TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO subscription_plans (id, plan_key, name, description, monthly_price, yearly_price, token_quota, max_devices, features, sort_order) VALUES
('plan_free', 'free', '免费版', '基础进销存功能，适合个人试用', 0, 0, 1000, 1, '["product_management","inventory_basic","sales_basic","purchase_basic","chat_basic"]', 0),
('plan_basic', 'basic', '基础版', '完整进销存 + 移动端，适合小团队', 9.9, 99, 10000, 3, '["product_management","full_inventory","full_sales","full_purchase","mobile_app","chat","webhook","cloud_backup"]', 1),
('plan_professional', 'professional', '专业版', 'AI 订单识别 + 审批流程，适合中型企业', 39.9, 399, 100000, 5, '["everything_basic","ai_recognition","approval_workflow","analytics","priority_support","api_access"]', 2),
('plan_enterprise', 'enterprise', '企业版', '无限配额 + 私有部署，适合大型组织', 99, 999, 1000000, 10, '["everything_professional","unlimited_quota","custom_branding","dedicated_support","sla_guarantee","on_premise_deploy"]', 3);

-- ============================================
-- 用户订阅表 (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled', 'trial')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_subs_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subs_expires ON user_subscriptions(expires_at);

-- ============================================
-- Token 用量记录表 (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS token_usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    tokens_consumed INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    resource_path TEXT,
    request_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_type ON token_usage_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage_logs(created_at DESC);

-- ============================================
-- 账单/发票表 (Phase 7)
-- ============================================
CREATE TABLE IF NOT EXISTS billing_invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    subscription_id TEXT REFERENCES user_subscriptions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled', 'refunded')),
    payment_method TEXT DEFAULT 'mock',
    billing_period_start DATE,
    billing_period_end DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON billing_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON billing_invoices(created_at DESC);

-- ============================================
-- 通话记录表 (v4.1 音视频通话)
-- ============================================
CREATE TABLE IF NOT EXISTS call_records (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,      -- WebRTC session id
    caller_id TEXT NOT NULL REFERENCES users(id),
    callee_id TEXT NOT NULL REFERENCES users(id),
    call_type TEXT NOT NULL CHECK(call_type IN ('audio', 'video')),
    direction TEXT NOT NULL DEFAULT 'outgoing' CHECK(direction IN ('outgoing', 'incoming')),
    status TEXT NOT NULL DEFAULT 'missed' CHECK(status IN ('ringing', 'answered', 'missed', 'rejected', 'busy', 'ended')),
    duration_seconds INTEGER DEFAULT 0,   -- 通话时长（秒）
    started_at INTEGER,                   -- 开始时间（Unix毫秒）
    ended_at INTEGER,                     -- 结束时间（Unix毫秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_records_caller ON call_records(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_records_callee ON call_records(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_records_session ON call_records(session_id);
CREATE INDEX IF NOT EXISTS idx_call_records_created ON call_records(created_at DESC);

-- ============================================
-- 触发器 - 自动更新 updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_devices_updated_at
    AFTER UPDATE ON devices
    FOR EACH ROW
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_order_drafts_updated_at
    AFTER UPDATE ON order_drafts
    FOR EACH ROW
BEGIN
    UPDATE order_drafts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- 邀请表 (PRD v4.2 外部伙伴邀请)
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    inviter_id TEXT NOT NULL,
    target_phone TEXT,
    type TEXT NOT NULL CHECK(type IN ('order_share', 'price_update')),
    business_ref_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'revoked')),
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    used_at INTEGER,
    used_by TEXT,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code_status ON invitations(invite_code, status);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_status ON invitations(inviter_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- ============================================
-- 用户联系人关系表 (PRD v4.2)
-- ============================================
CREATE TABLE IF NOT EXISTS user_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    contact_type TEXT NOT NULL CHECK(contact_type IN ('supplier', 'customer', 'colleague')),
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, contact_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON user_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_type ON user_contacts(user_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user ON user_contacts(contact_id, user_id);

-- ============================================
-- Agent 注册表 (PRD v6.0 Agent 化架构)
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest TEXT NOT NULL,           -- JSON: 入口文件、权限声明、图标、描述、作者等
    enabled BOOLEAN DEFAULT 1,
    is_builtin BOOLEAN DEFAULT 0,     -- 是否内置（如财务管理 Agent，不可卸载）
    installed_at INTEGER,
    last_updated INTEGER,
    data_dir TEXT                     -- Agent 专属数据目录
);

CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled);
CREATE INDEX IF NOT EXISTS idx_agents_builtin ON agents(is_builtin);

-- ============================================
-- Agent 权限声明表 (PRD v6.0)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_permissions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,          -- 权限名称
    granted_by TEXT REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_agent_permissions_agent ON agent_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_permissions_name ON agent_permissions(permission);
