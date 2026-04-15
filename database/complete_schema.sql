-- ProClaw 完整数据库 Schema
-- 合并了主应用和营销网站的表结构
-- Version: 2.0.0
-- Created: 2026-04-14

-- ============================================
-- 第一部分：营销网站用户系统
-- ============================================

-- 1. Profiles 表（扩展 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有需要的表创建/更新触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- Profiles
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- API Keys
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_keys') THEN
        DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
        CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Token Balances
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'token_balances') THEN
        DROP TRIGGER IF EXISTS update_token_balances_updated_at ON token_balances;
        CREATE TRIGGER update_token_balances_updated_at BEFORE UPDATE ON token_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- External Integrations
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'external_integrations') THEN
        DROP TRIGGER IF EXISTS update_external_integrations_updated_at ON external_integrations;
        CREATE TRIGGER update_external_integrations_updated_at BEFORE UPDATE ON external_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Token Packages
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'token_packages') THEN
        DROP TRIGGER IF EXISTS update_token_packages_updated_at ON token_packages;
        CREATE TRIGGER update_token_packages_updated_at BEFORE UPDATE ON token_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- System Settings
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_settings') THEN
        DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
        CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    RAISE NOTICE 'All triggers created/updated successfully';
END $$;

-- 2. API Keys 表（大模型接口配置）
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'azure', 'google', 'ollama', 'custom')),
    key_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    base_url TEXT,
    model_list TEXT[], -- JSON array of models
    is_active BOOLEAN DEFAULT TRUE,
    usage_limit INTEGER, -- 可选用量限制
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- 3. Token 销售记录表
CREATE TABLE IF NOT EXISTS token_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0), -- Token 数量
    price DECIMAL(10, 2) NOT NULL CHECK(price >= 0), -- 价格
    currency TEXT DEFAULT 'CNY',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'refunded', 'failed')),
    payment_method TEXT CHECK(payment_method IN ('alipay', 'wechat', 'stripe', 'paypal')),
    transaction_id TEXT UNIQUE, -- 第三方支付交易ID
    metadata JSONB, -- 额外元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_token_sales_user_id ON token_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_token_sales_status ON token_sales(status);
CREATE INDEX IF NOT EXISTS idx_token_sales_created_at ON token_sales(created_at);

-- 4. Token 余额表
CREATE TABLE IF NOT EXISTS token_balances (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    balance INTEGER DEFAULT 0 CHECK(balance >= 0),
    total_purchased INTEGER DEFAULT 0 CHECK(total_purchased >= 0),
    total_used INTEGER DEFAULT 0 CHECK(total_used >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS update_token_balances_updated_at ON token_balances;
CREATE TRIGGER update_token_balances_updated_at
    BEFORE UPDATE ON token_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 外部项目接口表
CREATE TABLE IF NOT EXISTS external_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('webhook', 'api_endpoint', 'oauth')),
    endpoint_url TEXT NOT NULL,
    auth_type TEXT CHECK(auth_type IN ('bearer', 'api_key', 'oauth2', 'none')),
    credentials TEXT, -- 加密存储
    headers JSONB, -- JSON headers
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE, -- Admin 审核状态
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status TEXT CHECK(test_status IN ('success', 'failed', 'pending', 'never')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_integrations_user_id ON external_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_external_integrations_type ON external_integrations(type);
CREATE INDEX IF NOT EXISTS idx_external_integrations_is_approved ON external_integrations(is_approved);

-- 6. API 使用日志表
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    endpoint TEXT,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10, 4) DEFAULT 0,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);

-- 7. Token 套餐配置表（Admin 管理）
CREATE TABLE IF NOT EXISTS token_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    token_amount INTEGER NOT NULL CHECK(token_amount > 0),
    price DECIMAL(10, 2) NOT NULL CHECK(price >= 0),
    currency TEXT DEFAULT 'CNY',
    discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK(discount_percentage >= 0 AND discount_percentage <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认套餐（如果不存在）
INSERT INTO token_packages (name, description, token_amount, price, discount_percentage, sort_order) VALUES
('入门套餐', '适合个人开发者试用', 100000, 50.00, 0, 1),
('标准套餐', '适合小型项目使用', 500000, 200.00, 10, 2),
('专业套餐', '适合中型团队', 2000000, 700.00, 15, 3),
('企业套餐', '适合大型企业，优先支持', 10000000, 3000.00, 20, 4)
ON CONFLICT DO NOTHING;

-- 8. 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认设置（如果不存在）
INSERT INTO system_settings (key, value, description) VALUES
('rate_limit_per_minute', '{"limit": 60}', '每分钟 API 调用次数限制'),
('rate_limit_per_day', '{"limit": 10000}', '每日 API 调用次数限制'),
('low_balance_threshold', '{"threshold": 10000}', 'Token 余额低阈值提醒'),
('maintenance_mode', '{"enabled": false}', '系统维护模式开关')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- 第二部分：主应用进销存系统
-- ============================================

-- 9. 产品分类
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 10. 品牌
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 11. 产品 SPU (标准产品单位)
CREATE TABLE IF NOT EXISTS product_spu (
    id TEXT PRIMARY KEY,
    spu_code TEXT UNIQUE NOT NULL, -- SPU编码
    name TEXT NOT NULL, -- 商品名称
    subtitle TEXT, -- 副标题/卖点
    description TEXT, -- 商品详情
    category_id TEXT REFERENCES product_categories(id),
    brand_id TEXT REFERENCES brands(id),
    
    -- 基础信息
    unit TEXT DEFAULT '件',
    weight DECIMAL(10, 3), -- 重量(kg)
    length DECIMAL(10, 2), -- 长度(cm)
    width DECIMAL(10, 2), -- 宽度(cm)
    height DECIMAL(10, 2), -- 高度(cm)
    
    -- SEO优化
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    
    -- 销售控制
    is_on_sale BOOLEAN DEFAULT TRUE, -- 是否上架
    is_featured BOOLEAN DEFAULT FALSE, -- 是否推荐
    sort_order INTEGER DEFAULT 0,
    
    -- 状态
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'on_sale', 'off_sale', 'deleted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_spu_code ON product_spu(spu_code);
CREATE INDEX IF NOT EXISTS idx_spu_category ON product_spu(category_id);
CREATE INDEX IF NOT EXISTS idx_spu_brand ON product_spu(brand_id);
CREATE INDEX IF NOT EXISTS idx_spu_status ON product_spu(status);

-- 12. 产品 SKU (库存量单位)
CREATE TABLE IF NOT EXISTS product_sku (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    sku_code TEXT UNIQUE NOT NULL, -- SKU编码
    
    -- 规格信息(JSON存储,如: {"颜色": "红色", "尺寸": "XL"})
    specifications JSONB,
    spec_text TEXT, -- 规格文本展示(如: "红色/XL")
    
    -- 价格库存
    cost_price DECIMAL(10, 2) DEFAULT 0,
    sell_price DECIMAL(10, 2) DEFAULT 0,
    market_price DECIMAL(10, 2), -- 市场价
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 999999,
    
    -- SKU级别的控制
    barcode TEXT, -- 条形码
    is_default BOOLEAN DEFAULT FALSE, -- 是否默认SKU
    
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sku_spu ON product_sku(spu_id);
CREATE INDEX IF NOT EXISTS idx_sku_code ON product_sku(sku_code);

-- 13. 商品图片
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'main' CHECK(image_type IN ('main', 'gallery')), -- 主图或轮播图
    sort_order INTEGER DEFAULT 0,
    alt_text TEXT, -- 图片描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_spu ON product_images(spu_id);

-- 14. 商品属性定义
CREATE TABLE IF NOT EXISTS product_attributes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- 属性名(如: 颜色、尺寸、材质)
    type TEXT DEFAULT 'select' CHECK(type IN ('text', 'select', 'number', 'boolean')),
    options TEXT[], -- 可选值数组(用于select类型)
    is_required BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. SPU属性值关联
CREATE TABLE IF NOT EXISTS product_spu_attributes (
    id TEXT PRIMARY KEY,
    spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
    attribute_id TEXT NOT NULL REFERENCES product_attributes(id),
    value_text TEXT, -- 文本值
    value_number DECIMAL(10, 2), -- 数值
    value_boolean BOOLEAN, -- 布尔值
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(spu_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_spu_attr_spu ON product_spu_attributes(spu_id);
CREATE INDEX IF NOT EXISTS idx_spu_attr_attribute ON product_spu_attributes(attribute_id);

-- 16. 库存交易
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES product_sku(id),
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    reference_no TEXT, -- 参考单号
    reason TEXT,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at);

-- 17. 供应商
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- 供应商编码
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    payment_terms TEXT, -- 付款条件
    tax_number TEXT, -- 税号
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);

-- 18. 采购订单
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL, -- 采购单号
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'shipped', 'received', 'cancelled')),
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);

-- 19. 采购订单明细
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product_sku(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchase_order_items(product_id);

-- 20. 客户
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);

-- 21. 销售订单
CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    so_number TEXT UNIQUE NOT NULL, -- 销售单号
    customer_id TEXT NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
    shipping_address TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_so_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_date ON sales_orders(order_date);

-- 22. 销售订单明细
CREATE TABLE IF NOT EXISTS sales_order_items (
    id TEXT PRIMARY KEY,
    sales_order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES product_sku(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    shipped_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soi_so ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soi_product ON sales_order_items(product_id);

-- 23. 会计科目
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- 科目编码
    name TEXT NOT NULL, -- 科目名称
    type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id TEXT REFERENCES accounts(id), -- 父科目
    balance REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

-- 24. 财务交易记录
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense', 'transfer')),
    amount REAL NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    reference_type TEXT, -- 关联类型
    reference_id TEXT, -- 关联ID
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ft_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ft_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ft_account ON financial_transactions(account_id);

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 主应用表也启用 RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_spu ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_spu_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles 策略
-- 用户可以查看自己的 profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- 用户可以更新自己的 profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 管理员可以查看所有 profiles（使用 SECURITY DEFINER 函数避免递归）
DROP FUNCTION IF EXISTS is_admin() CASCADE;
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- API Keys 策略
DROP POLICY IF EXISTS "Users can manage own API keys" ON api_keys;
CREATE POLICY "Users can manage own API keys"
    ON api_keys FOR ALL
    USING (auth.uid() = user_id);

-- Token Sales 策略
DROP POLICY IF EXISTS "Users can view own token sales" ON token_sales;
CREATE POLICY "Users can view own token sales"
    ON token_sales FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create token sales" ON token_sales;
CREATE POLICY "Users can create token sales"
    ON token_sales FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Token Balances 策略
DROP POLICY IF EXISTS "Users can view own token balance" ON token_balances;
CREATE POLICY "Users can view own token balance"
    ON token_balances FOR SELECT
    USING (auth.uid() = user_id);

-- External Integrations 策略
DROP POLICY IF EXISTS "Users can manage own integrations" ON external_integrations;
CREATE POLICY "Users can manage own integrations"
    ON external_integrations FOR ALL
    USING (auth.uid() = user_id);

-- API Usage Logs 策略
DROP POLICY IF EXISTS "Users can view own usage logs" ON api_usage_logs;
CREATE POLICY "Users can view own usage logs"
    ON api_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create usage logs" ON api_usage_logs;
CREATE POLICY "Users can create usage logs"
    ON api_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Token Packages 策略
DROP POLICY IF EXISTS "Anyone can view active packages" ON token_packages;
CREATE POLICY "Anyone can view active packages"
    ON token_packages FOR SELECT
    USING (is_active = TRUE);

-- System Settings 策略
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings"
    ON system_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 主应用表策略 - 允许认证用户访问
DROP POLICY IF EXISTS "Authenticated users can access product spu" ON product_spu;
CREATE POLICY "Authenticated users can access product spu"
    ON product_spu FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access product sku" ON product_sku;
CREATE POLICY "Authenticated users can access product sku"
    ON product_sku FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access product images" ON product_images;
CREATE POLICY "Authenticated users can access product images"
    ON product_images FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access product attributes" ON product_attributes;
CREATE POLICY "Authenticated users can access product attributes"
    ON product_attributes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access spu attributes" ON product_spu_attributes;
CREATE POLICY "Authenticated users can access spu attributes"
    ON product_spu_attributes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access categories" ON product_categories;
CREATE POLICY "Authenticated users can access categories"
    ON product_categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access brands" ON brands;
CREATE POLICY "Authenticated users can access brands"
    ON brands FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access inventory" ON inventory_transactions;
CREATE POLICY "Authenticated users can access inventory"
    ON inventory_transactions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access suppliers" ON suppliers;
CREATE POLICY "Authenticated users can access suppliers"
    ON suppliers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access purchase orders" ON purchase_orders;
CREATE POLICY "Authenticated users can access purchase orders"
    ON purchase_orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access customers" ON customers;
CREATE POLICY "Authenticated users can access customers"
    ON customers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access sales orders" ON sales_orders;
CREATE POLICY "Authenticated users can access sales orders"
    ON sales_orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access accounts" ON accounts;
CREATE POLICY "Authenticated users can access accounts"
    ON accounts FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can access financial transactions" ON financial_transactions;
CREATE POLICY "Authenticated users can access financial transactions"
    ON financial_transactions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- RPC Functions
-- ============================================

-- 扣除 Token 余额
CREATE OR REPLACE FUNCTION deduct_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE token_balances
    SET 
        balance = balance - p_tokens,
        total_used = total_used + p_tokens,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND balance >= p_tokens;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient token balance';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加 Token 余额（支付成功后调用）
CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_tokens INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO token_balances (user_id, balance, total_purchased)
    VALUES (p_user_id, p_tokens, p_tokens)
    ON CONFLICT (user_id) DO UPDATE
    SET 
        balance = token_balances.balance + p_tokens,
        total_purchased = token_balances.total_purchased + p_tokens,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户统计信息
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_api_calls', COUNT(*),
        'total_tokens_used', COALESCE(SUM(tokens_used), 0),
        'total_cost', COALESCE(SUM(cost), 0),
        'active_api_keys', (SELECT COUNT(*) FROM api_keys WHERE user_id = p_user_id AND is_active = TRUE),
        'token_balance', (SELECT balance FROM token_balances WHERE user_id = p_user_id)
    ) INTO v_stats
    FROM api_usage_logs
    WHERE user_id = p_user_id;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取平台统计信息（Admin）
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'total_admins', (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
        'total_api_calls', (SELECT COUNT(*) FROM api_usage_logs),
        'total_tokens_sold', (SELECT COALESCE(SUM(amount), 0) FROM token_sales WHERE status = 'completed'),
        'total_revenue', (SELECT COALESCE(SUM(price), 0) FROM token_sales WHERE status = 'completed'),
        'active_api_keys', (SELECT COUNT(*) FROM api_keys WHERE is_active = TRUE),
        'today_new_users', (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '1 day'),
        'today_api_calls', (SELECT COUNT(*) FROM api_usage_logs WHERE created_at >= NOW() - INTERVAL '1 day')
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'ProClaw complete database schema created successfully!';
END $$;
