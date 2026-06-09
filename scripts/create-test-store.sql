-- ============================================
-- 创建测试账号的云商城租户
-- subdomain: iphone-battery-pro
-- 测试账号: boss / IamBigBoss
-- ============================================

-- 1. 插入租户记录
INSERT INTO public.tenants (
    id,
    subdomain,
    name,
    email,
    schema_name,
    status,
    plan,
    theme_config
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'iphone-battery-pro',
    'iPhone电池专业店',
    'boss@proclaw.demo',
    'tenant_iphone_battery_pro',
    'active',
    'professional',
    '{"layout":"grid","primary_color":"#007AFF","secondary_color":"#F2F2F7"}'
) ON CONFLICT (id) DO UPDATE SET
    subdomain = EXCLUDED.subdomain,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    schema_name = EXCLUDED.schema_name;

-- 2. 创建租户 schema 和 products 表
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'tenant_iphone_battery_pro') THEN
        CREATE SCHEMA tenant_iphone_battery_pro;
        
        CREATE TABLE tenant_iphone_battery_pro.products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            local_id TEXT,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(12, 2) NOT NULL,
            stock INTEGER DEFAULT 0,
            category VARCHAR(100),
            images TEXT DEFAULT '[]'::jsonb,
            is_on_sale BOOLEAN DEFAULT true,
            sync_version INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE tenant_iphone_battery_pro.orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_no VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(100),
            customer_phone VARCHAR(20),
            customer_address TEXT,
            total_amount DECIMAL(12, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            payment_method VARCHAR(20),
            payment_id VARCHAR(100),
            items TEXT DEFAULT '[]'::jsonb,
            remark TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMPTZ
        );
        
        RAISE NOTICE 'Created tenant_iphone_battery_pro schema';
    ELSE
        RAISE NOTICE 'Schema tenant_iphone_battery_pro already exists';
    END IF;
END $$;

-- 3. 插入示例商品数据
INSERT INTO tenant_iphone_battery_pro.products (id, local_id, name, description, price, stock, category, is_on_sale) VALUES
    ('p0000001-0000-0000-0000-000000000001', 'spu001', 'iPhone 15 Pro Max 电池', '适用于 iPhone 15 Pro Max，高容量原装品质', 159.00, 50, 'iPhone 15 系列', true),
    ('p0000001-0000-0000-0000-000000000002', 'spu002', 'iPhone 15 Pro 电池', '适用于 iPhone 15 Pro，原装容量', 139.00, 60, 'iPhone 15 系列', true),
    ('p0000001-0000-0000-0000-000000000003', 'spu003', 'iPhone 15 电池', '适用于 iPhone 15，高品质替换电池', 129.00, 45, 'iPhone 15 系列', true),
    ('p0000001-0000-0000-0000-000000000004', 'spu004', 'iPhone 14 Pro Max 电池', '适用于 iPhone 14 Pro Max，原装品质', 149.00, 55, 'iPhone 14 系列', true),
    ('p0000001-0000-0000-0000-000000000005', 'spu005', 'iPhone 14 Pro 电池', '适用于 iPhone 14 Pro，高容量电池', 139.00, 65, 'iPhone 14 系列', true),
    ('p0000001-0000-0000-0000-000000000006', 'spu006', 'iPhone 14 电池', '适用于 iPhone 14，原装替换电池', 129.00, 40, 'iPhone 14 系列', true),
    ('p0000001-0000-0000-0000-000000000007', 'spu007', 'iPhone 13 Pro Max 电池', '适用于 iPhone 13 Pro Max', 139.00, 50, 'iPhone 13 系列', true),
    ('p0000001-0000-0000-0000-000000000008', 'spu008', 'iPhone 13 电池', '适用于 iPhone 13，高品质电池', 119.00, 70, 'iPhone 13 系列', true),
    ('p0000001-0000-0000-0000-000000000009', 'spu009', 'iPhone 12 Pro Max 电池', '适用于 iPhone 12 Pro Max', 129.00, 55, 'iPhone 12 系列', true),
    ('p0000001-0000-0000-0000-000000000010', 'spu010', 'iPhone 12 电池', '适用于 iPhone 12，原装品质替换', 109.00, 80, 'iPhone 12 系列', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock;

SELECT '测试租户 iphone-battery-pro 创建成功！' AS message;
SELECT '访问地址: https://proclaw.cc/shop/iphone-battery-pro' AS url;
