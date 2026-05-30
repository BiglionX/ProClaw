-- Migration 020: Token 定价规则表 & 用户 Token 配置表
-- 对应 PRD v8.0 第 6.2 节

-- ============================================
-- 1. Token 消耗定额配置表（Admin 可动态调整定价）
-- ============================================
CREATE TABLE IF NOT EXISTS token_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL,
    action_name TEXT NOT NULL,
    description TEXT,
    pt_cost INTEGER NOT NULL,
    unit TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource_type)
);

CREATE INDEX IF NOT EXISTS idx_token_pricing_rules_active ON token_pricing_rules(is_active);

-- 插入默认定价规则（与 PRD v8.0 4.1 节一致）
INSERT INTO token_pricing_rules (resource_type, action_name, description, pt_cost, unit, sort_order) VALUES
('product_sync', '商品同步', '单个商品从桌面端同步到云端（含首次+更新）', 50, 'per_item', 1),
('ai_theme', 'AI主题生成', 'AI生成完整商城主题和样式', 5000, 'per_request', 2),
('ai_theme_tweak', 'AI主题微调', '对已有主题的单项调整', 1000, 'per_request', 3),
('order_process', '订单处理', '每笔商城订单的创建和处理', 10, 'per_item', 4),
('api_write', 'API写操作', '外部API写操作(创建/更新/删除)', 5, 'per_request', 5),
('api_read', 'API读操作', '外部API查询操作', 1, 'per_request', 6),
('custom_domain', '自定义域名', '绑定自定义域名的月租', 2000, 'per_month', 7),
('ssl_cert', 'SSL证书', '自动SSL证书管理', 1000, 'per_month', 8),
('cdn_storage', '静态资源托管', '商品图片等资源CDN托管', 1, 'per_mb_month', 9),
('realtime_sync', '实时同步保活', '桌面端实时同步通道', 500, 'per_day', 10),
('seo_report', 'SEO优化报告', 'AI生成SEO优化建议', 3000, 'per_request', 11),
('data_export', '数据导出', '导出商品/订单数据', 100, 'per_request', 12),
('product_hosting', '商品数据托管', '商品信息、规格、属性的数据库存储（按月底存量扣费）', 2, 'per_item_month', 13),
('image_storage', '图片/CDN存储', '商品主图+轮播图的存储和CDN分发（按月底实际占用空间扣费）', 1, 'per_mb_month', 14),
('order_retention', '订单数据留存', '订单历史数据归档存储，超1000单部分计费', 1, 'per_hundred_month', 15),
('page_hosting', '商城页面托管', '商城首页+商品页+购物车+结算页的基础托管', 500, 'per_month', 16)
ON CONFLICT (resource_type) DO NOTHING;

-- ============================================
-- 2. 用户 Token 配置表
-- ============================================
CREATE TABLE IF NOT EXISTS user_token_config (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    low_balance_threshold INTEGER DEFAULT 10000,
    daily_limit INTEGER DEFAULT 0,
    auto_recharge_package_id UUID REFERENCES token_packages(id),
    auto_recharge_enabled BOOLEAN DEFAULT FALSE,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_wechat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME STAMP DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. 更新 Token 套餐种子数据（PRD v8.0 4.3 节新定价）
-- ============================================
-- 先清除旧套餐数据（如果有冲突则更新）
INSERT INTO token_packages (name, description, token_amount, price, discount_percentage, sort_order) VALUES
('体验包', '适合初次体验云商城功能', 10000, 10.00, 0, 1),
('入门包', '适合轻度使用商户', 55000, 50.00, 9.09, 2),
('标准包', '适合常规用量商户', 240000, 200.00, 16.67, 3),
('专业包', '适合高用量商户', 910000, 700.00, 23.08, 4),
('企业包', '适合大规模商户', 4500000, 3000.00, 33.33, 5)
ON CONFLICT (id) DO NOTHING;

-- 如果套餐已存在则更新价格
UPDATE token_packages SET
    price = 10.00, token_amount = 10000, discount_percentage = 0, description = '适合初次体验云商城功能', updated_at = NOW()
WHERE name = '体验包' AND price <> 10.00;

UPDATE token_packages SET
    price = 50.00, token_amount = 55000, discount_percentage = 9.09, description = '适合轻度使用商户', updated_at = NOW()
WHERE name = '入门包' AND price <> 50.00;

UPDATE token_packages SET
    price = 200.00, token_amount = 240000, discount_percentage = 16.67, description = '适合常规用量商户', updated_at = NOW()
WHERE name = '标准包' AND price <> 200.00;

UPDATE token_packages SET
    price = 700.00, token_amount = 910000, discount_percentage = 23.08, description = '适合高用量商户', updated_at = NOW()
WHERE name = '专业包' AND price <> 700.00;

UPDATE token_packages SET
    price = 3000.00, token_amount = 4500000, discount_percentage = 33.33, description = '适合大规模商户', updated_at = NOW()
WHERE name = '企业包' AND price <> 3000.00;

-- ============================================
-- 4. 新 RPC：查询 Token 定价规则
-- ============================================
CREATE OR REPLACE FUNCTION get_token_pricing_rules()
RETURNS SETOF token_pricing_rules AS $$
BEGIN
    RETURN QUERY SELECT * FROM token_pricing_rules WHERE is_active = TRUE ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 新 RPC：获取用户余额摘要
-- ============================================
CREATE OR REPLACE FUNCTION get_token_balance_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_balance INTEGER;
    v_today_used INTEGER;
    v_monthly_avg INTEGER;
    v_estimated_days INTEGER;
    v_result JSONB;
BEGIN
    -- 当前余额
    SELECT COALESCE(balance, 0) INTO v_balance FROM token_balances WHERE user_id = p_user_id;

    -- 今日消耗
    SELECT COALESCE(SUM(tokens_used), 0) INTO v_today_used
    FROM api_usage_logs
    WHERE user_id = p_user_id AND created_at >= CURRENT_DATE;

    -- 近30天日均消耗
    SELECT COALESCE(ROUND(AVG(daily.total)::numeric, 0), 0)::integer INTO v_monthly_avg
    FROM (
        SELECT SUM(tokens_used) as total
        FROM api_usage_logs
        WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
    ) daily;

    -- 预估可用天数
    IF v_monthly_avg > 0 THEN
        v_estimated_days := v_balance / v_monthly_avg;
    ELSE
        v_estimated_days := 30;
    END IF;

    SELECT jsonb_build_object(
        'balance', v_balance,
        'today_used', v_today_used,
        'daily_avg_30d', v_monthly_avg,
        'estimated_days', v_estimated_days
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 新 RPC：获取用户消费明细（分页）
-- ============================================
CREATE OR REPLACE FUNCTION get_token_consumption(
    p_user_id UUID,
    p_resource_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_items JSONB;
BEGIN
    -- 总记录数
    SELECT COUNT(*) INTO v_total
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND (p_resource_type IS NULL OR resource_type = p_resource_type);

    -- 分页数据
    SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO v_items
    FROM (
        SELECT jsonb_build_object(
            'id', id,
            'resource_type', resource_type,
            'tokens_used', tokens_used,
            'endpoint', endpoint,
            'created_at', created_at
        ) as item
        FROM api_usage_logs
        WHERE user_id = p_user_id
        AND (p_resource_type IS NULL OR resource_type = p_resource_type)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) sub;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 触发器：自动创建默认 user_token_config（新用户注册时）
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_token_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO token_balances (user_id, balance, total_purchased, total_used)
    VALUES (NEW.id, 50000, 50000, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO user_token_config (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除已存在的触发器
DROP TRIGGER IF EXISTS trg_auto_create_token_config ON profiles;

CREATE TRIGGER trg_auto_create_token_config
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_token_config();
