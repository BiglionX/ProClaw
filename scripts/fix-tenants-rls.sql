-- ============================================
-- 修复 tenants 表 RLS 策略并插入测试数据
-- ============================================
-- 执行方式: Supabase Dashboard -> SQL Editor -> 粘贴执行

-- 1. 确保 tenants 表启用 RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能存在的冲突策略
DROP POLICY IF EXISTS "Allow public read access" ON public.tenants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.tenants;
DROP POLICY IF EXISTS "Allow owner update" ON public.tenants;

-- 3. 创建 RLS 策略（允许公开读取）
CREATE POLICY "Allow public read access" ON public.tenants
    FOR SELECT USING (true);

-- 4. 创建插入策略（允许插入）
CREATE POLICY "Allow public insert" ON public.tenants
    FOR INSERT WITH CHECK (true);

-- 5. 确保 schema 存在
DO $$
BEGIN
    -- 创建 tenant_demo schema
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'tenant_demo') THEN
        CREATE SCHEMA tenant_demo;
        
        -- 创建 products 表
        CREATE TABLE tenant_demo.products (
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
        
        -- 创建 orders 表
        CREATE TABLE tenant_demo.orders (
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
        
        RAISE NOTICE 'Created tenant_demo schema with products and orders tables';
    ELSE
        RAISE NOTICE 'tenant_demo schema already exists';
    END IF;
END $$;

-- 6. 插入测试租户数据
INSERT INTO public.tenants (
    id,
    subdomain,
    name,
    email,
    schema_name,
    status,
    plan
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'demo',
    '演示商城',
    'demo@example.com',
    'tenant_demo',
    'active',
    'trial'
) ON CONFLICT (id) DO UPDATE SET
    subdomain = EXCLUDED.subdomain,
    name = EXCLUDED.name,
    status = EXCLUDED.status;

-- 7. 插入示例商品数据
INSERT INTO tenant_demo.products (
    id,
    local_id,
    name,
    description,
    price,
    stock,
    category,
    images,
    is_on_sale
) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'spu_001', '示例商品 A', '这是一款优质的数码产品', 99.00, 100, '数码', '[]', true),
    ('b0000000-0000-0000-0000-000000000002', 'spu_002', '示例商品 B', '时尚服饰，舒适面料', 199.00, 50, '服饰', '[]', true),
    ('b0000000-0000-0000-0000-000000000003', 'spu_003', '示例商品 C', '新鲜食品，品质保证', 299.00, 30, '食品', '[]', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price;

SELECT 'tenant_demo schema and test data created successfully!' AS message;
SELECT 'Access: https://proclaw.cc/shop/demo' AS url;
