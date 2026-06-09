-- ProClaw Cloud-Store - 租户元数据表
-- 存储所有租户的基本信息和配置
-- 实际数据存储在各租户的独立 Schema 中

-- 租户主表
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    subdomain VARCHAR(32) UNIQUE NOT NULL,  -- 唯一子域名，如 'myshop'
    name VARCHAR(100) NOT NULL,              -- 商户名称
    email VARCHAR(255) UNIQUE NOT NULL,      -- 登录邮箱
    phone VARCHAR(20),                       -- 联系电话
    
    -- Schema 信息
    schema_name VARCHAR(50) UNIQUE NOT NULL, -- 对应的数据库 Schema 名称
    
    -- 状态和套餐
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'expired', 'trial')),
    plan VARCHAR(20) DEFAULT 'trial' CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise')),
    
    -- Token 计费
    token_balance INTEGER DEFAULT 100,        -- Token 余额
    token_total_purchased INTEGER DEFAULT 0, -- 累计购买 Token
    token_used INTEGER DEFAULT 0,            -- 已使用 Token
    
    -- 主题配置 (JSONB)
    theme_config JSONB DEFAULT '{
        "primary_color": "#3B82F6",
        "secondary_color": "#60A5FA",
        "layout": "grid"
    }'::jsonb,
    
    -- Logo 和 Banner
    logo_url TEXT,
    banner_url TEXT,
    
    -- 联系方式
    contact_info JSONB DEFAULT '{}'::jsonb,
    
    -- 自定义域名
    custom_domain VARCHAR(255) UNIQUE,
    custom_domain_verified BOOLEAN DEFAULT FALSE,
    
    -- 元数据
    created_by UUID,                         -- 创建者用户 ID
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ                   -- 软删除
);

-- 扫码登录会话表
CREATE TABLE IF NOT EXISTS qr_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,        -- 登录码
    token VARCHAR(64) UNIQUE NOT NULL,       -- 会话 Token
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'cancelled')),
    
    -- 过期时间
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- 验证信息
    verified_at TIMESTAMPTZ,
    client_ip VARCHAR(45),
    client_user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_code ON qr_login_sessions(code);
CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_token ON qr_login_sessions(token);
CREATE INDEX IF NOT EXISTS idx_qr_login_sessions_tenant ON qr_login_sessions(tenant_id);

-- License 授权系统
CREATE TABLE IF NOT EXISTS license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(100) UNIQUE NOT NULL, -- 授权码
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- License 类型
    license_type VARCHAR(20) NOT NULL CHECK (license_type IN ('starter', 'pro', 'enterprise')),
    
    -- 权限
    max_products INTEGER DEFAULT 0,
    max_orders INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,          -- {ai_theme: true, ai_image_search: true}
    
    -- 有效期
    valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMPTZ,
    is_permanent BOOLEAN DEFAULT FALSE,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(license_key);
CREATE INDEX IF NOT EXISTS idx_license_keys_tenant ON license_keys(tenant_id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON tenants(schema_name);

-- Token 余额表 (简化版，主要用 tenants.token_balance)
-- 详细交易记录见 token_transactions 表

-- Token 交易记录表
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- 交易类型
    type VARCHAR(20) NOT NULL CHECK (type IN (
        'purchase',      -- 购买
        'grant',         -- 赠送
        'refund',        -- 退款
        'consume',       -- 消费
        'adjust',        -- 手动调整
        'expire'         -- 过期回收
    )),
    
    -- 金额
    amount INTEGER NOT NULL,                 -- 正数=增加，负数=减少
    balance_before INTEGER NOT NULL,         -- 交易前余额
    balance_after INTEGER NOT NULL,          -- 交易后余额
    
    -- 消费详情 (JSONB)
    details JSONB DEFAULT '{}'::jsonb,        -- {
                                               --   "consume_type": "product_sync",
                                               --   "product_id": "xxx",
                                               --   "ai_type": "theme_generation",
                                               --   ...
                                               -- }
    
    -- 关联订单 (购买时)
    order_id VARCHAR(100),
    payment_id VARCHAR(100),
    
    -- 备注
    note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_token_transactions_tenant ON token_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at DESC);

-- Token 套餐表
CREATE TABLE IF NOT EXISTS token_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(50) NOT NULL,              -- 套餐名称
    token_amount INTEGER NOT NULL,          -- Token 数量
    price DECIMAL(10, 2) NOT NULL,          -- 价格(元)
    
    -- 适用对象
    for_plan VARCHAR(20) DEFAULT 'any' CHECK (for_plan IN ('any', 'trial', 'basic', 'pro', 'enterprise', 'standalone')),
    
    -- 有效期
    validity_days INTEGER DEFAULT 30,        -- 有效期(天)
    
    -- 折扣
    discount_percent INTEGER DEFAULT 0,      -- 折扣百分比
    
    -- 状态
    active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认套餐
INSERT INTO token_packages (name, token_amount, price) VALUES
    ('试用套餐', 100, 0),
    ('标准版', 5000, 9.9),
    ('专业版', 20000, 39)
ON CONFLICT DO NOTHING;

-- Token 消费规则表
CREATE TABLE IF NOT EXISTS token_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    action VARCHAR(50) NOT NULL UNIQUE,     -- 操作类型，如 'product_sync', 'ai_theme', 'ai_image_search'
    name VARCHAR(100) NOT NULL,             -- 规则名称
    description TEXT,                        -- 规则描述
    
    -- 消耗设置
    token_cost INTEGER NOT NULL,             -- 每次消耗 Token 数量
    cost_type VARCHAR(20) DEFAULT 'fixed' CHECK (cost_type IN ('fixed', 'per_unit', 'tiered')),
    
    -- 限额设置
    daily_limit INTEGER,                     -- 每日限额
    monthly_limit INTEGER,                   -- 每月限额
    
    active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认消费规则
INSERT INTO token_rules (action, name, description, token_cost, cost_type, daily_limit) VALUES
    ('product_sync', '商品同步', '商品上下架同步', 1, 'per_unit', 100),
    ('ai_theme', 'AI 主题生成', 'AI 生成商城主题', 10, 'fixed', 5),
    ('ai_image_search', 'AI 智能找图', 'AI 搜索商品图片', 10, 'per_unit', 20),
    ('order_create', '订单创建', '客户下单', 5, 'fixed', NULL),
    ('order_update', '订单状态更新', '订单状态变更', 1, 'fixed', NULL),
    ('storage_100mb', '存储 100MB', '图片/附件存储(每100MB)', 1, 'per_unit', NULL),
    ('visit_100', '访问 100 次', '客户访问(每100次)', 1, 'per_unit', NULL)
ON CONFLICT (action) DO NOTHING;

-- 自定义域名申请表
CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    domain VARCHAR(255) NOT NULL,           -- 自定义域名
    cname_target VARCHAR(255),              -- CNAME 目标地址
    verification_token VARCHAR(100),         -- 验证 Token
    
    -- 验证状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'failed')),
    verified_at TIMESTAMPTZ,
    
    -- SSL 证书
    ssl_enabled BOOLEAN DEFAULT TRUE,
    ssl_cert_id VARCHAR(100),
    ssl_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, domain)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant ON custom_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);

-- 更新触发器函数
CREATE OR REPLACE FUNCTION update_tenants_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建更新触发器
DROP TRIGGER IF EXISTS update_tenants_trigger ON tenants;
CREATE TRIGGER update_tenants_trigger
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_timestamp();

-- 创建租户 Schema 的函数
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_schema VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    -- 检查 Schema 是否已存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = tenant_schema) THEN
        EXECUTE format('CREATE SCHEMA %I', tenant_schema);
        
        -- 在新 Schema 中创建基本表
        EXECUTE format('
            CREATE TABLE %I.products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                local_id TEXT,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                stock INTEGER DEFAULT 0,
                category VARCHAR(100),
                images JSONB DEFAULT ''[]''::jsonb,
                is_on_sale BOOLEAN DEFAULT TRUE,
                sync_version INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )', tenant_schema);
            
        EXECUTE format('
            CREATE TABLE %I.orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_no VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(100),
                customer_phone VARCHAR(20),
                customer_address TEXT,
                total_amount DECIMAL(12, 2) NOT NULL,
                status VARCHAR(20) DEFAULT ''pending'',
                payment_method VARCHAR(20),
                payment_id VARCHAR(100),
                items JSONB DEFAULT ''[]''::jsonb,
                remark TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMPTZ
            )', tenant_schema);
            
        EXECUTE format('
            CREATE TABLE %I.cart_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_id VARCHAR(100) NOT NULL,
                product_id UUID NOT NULL,
                quantity INTEGER DEFAULT 1,
                status VARCHAR(20) DEFAULT ''active'',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )', tenant_schema);
            
        -- 索引
        EXECUTE format('CREATE INDEX %I_cart_device ON %I.cart_items(device_id)', tenant_schema, tenant_schema);
        EXECUTE format('CREATE INDEX %I_orders_status ON %I.orders(status)', tenant_schema, tenant_schema);
            
        -- RLS 策略
        EXECUTE format('ALTER TABLE %I.products ENABLE ROW LEVEL SECURITY', tenant_schema);
        EXECUTE format('ALTER TABLE %I.orders ENABLE ROW LEVEL SECURITY', tenant_schema);
        EXECUTE format('ALTER TABLE %I.cart_items ENABLE ROW LEVEL SECURITY', tenant_schema);
        
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 删除租户 Schema 的函数
CREATE OR REPLACE FUNCTION delete_tenant_schema(tenant_schema VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = tenant_schema) THEN
        EXECUTE format('DROP SCHEMA %I CASCADE', tenant_schema);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 授予权限 (如果使用特定用户)
-- GRANT USAGE ON SCHEMA tenant_myshop TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenant_myshop TO your_app_user;
