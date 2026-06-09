-- ============================================
-- 创建测试云商城数据
-- ============================================
-- 执行方式: Supabase Dashboard -> SQL Editor -> 粘贴执行
-- URL: https://supabase.com/dashboard/project/ourolpgrntjrtapgaztt/sql/new

-- 1. 获取一个测试用户ID (如果有的话)
-- 注意: 如果 auth.users 为空，需要先通过应用注册用户

-- 2. 创建测试云商城 (使用固定 UUID 作为占位)
-- 实际使用时替换为真实用户 ID

-- 获取第一个用户的 ID (如果存在)
DO $$
DECLARE
    test_user_id UUID;
    demo_store_id UUID;
BEGIN
    -- 尝试从 profiles 获取用户
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    -- 如果没有用户，创建一个演示用的 UUID
    IF test_user_id IS NULL THEN
        -- 使用一个固定 UUID 作为测试
        test_user_id := '00000000-0000-0000-0000-000000000001';
        
        -- 在 profiles 中创建测试用户
        INSERT INTO profiles (id, username, role)
        VALUES (test_user_id, 'demo_user', 'admin')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Using user ID: %', test_user_id;
END $$;

-- 3. 创建演示云商城
INSERT INTO public.cloud_stores (
    id,
    user_id,
    subdomain,
    api_key,
    status,
    plan_type,
    expires_at
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'demo',
    'demo-api-key-12345',
    'active',
    'free',
    NOW() + INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- 4. 创建商城主题
INSERT INTO public.cloud_store_themes (
    store_id,
    primary_color,
    secondary_color,
    layout_style,
    font_family
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '#3B82F6',
    '#EFF6FF',
    'card',
    'PingFang SC, Microsoft YaHei, sans-serif'
) ON CONFLICT (store_id) DO NOTHING;

-- 5. 创建示例商品
INSERT INTO public.cloud_product_sync (
    id,
    store_id,
    local_spu_id,
    name,
    price,
    stock,
    images,
    category,
    is_on_sale,
    sync_status,
    sync_version
) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'spu_001', '示例商品 A', 99.00, 100, '[]', '数码', true, 'success', 1),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'spu_002', '示例商品 B', 199.00, 50, '[]', '服饰', true, 'success', 1),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'spu_003', '示例商品 C', 299.00, 30, '[]', '食品', true, 'success', 1)
ON CONFLICT DO NOTHING;

-- 6. 创建示例订单
INSERT INTO public.cloud_orders (
    id,
    store_id,
    order_no,
    customer_name,
    customer_phone,
    customer_address,
    total_amount,
    status,
    items
) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ORD-2024-001', '张三', '13800138000', '北京市朝阳区xxx', 298.00, 'paid', '[{"product_id":"p001","name":"示例商品 A","price":99,"quantity":1},{"product_id":"p002","name":"示例商品 B","price":199,"quantity":1}]'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ORD-2024-002', '李四', '13900139000', '上海市浦东新区xxx', 99.00, 'pending', '[{"product_id":"p001","name":"示例商品 A","price":99,"quantity":1}]')
ON CONFLICT (id) DO NOTHING;

-- 7. 创建客服设置
INSERT INTO public.customer_service_settings (
    tenant_id,
    is_enabled,
    auto_greeting,
    agent_name
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    true,
    '您好，欢迎光临我们的商城！有什么可以帮您的吗？',
    '智能客服'
) ON CONFLICT (tenant_id) DO NOTHING;

-- 8. 创建测试租户
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
) ON CONFLICT (id) DO NOTHING;

SELECT '测试数据创建完成！' AS message;
SELECT '访问地址: https://proclaw.cc/shop/demo' AS url;
