-- Migration 022: 存量月结计费引擎
-- 每月1日凌晨自动统计各用户上月存量，按定价规则扣除 Token
-- 对应 PRD v8.0 第 5.3 节

-- ============================================
-- 1. 月度存量统计函数
-- ============================================

-- 统计单个用户的月度存量消耗
CREATE OR REPLACE FUNCTION calculate_monthly_storage_cost(p_user_id UUID, p_billing_month DATE)
RETURNS JSONB AS $$
DECLARE
    v_product_count INTEGER;
    v_image_size_mb NUMERIC;
    v_order_count INTEGER;
    v_total_cost INTEGER := 0;
    v_details JSONB[];
BEGIN
    -- 统计商品数（假设有 products 表记录商品）
    -- 注意：此处需要根据实际云商城数据表调整
    -- 如果云商城使用 api_usage_logs 的 resource_type='product_sync' 统计
    SELECT COALESCE(COUNT(*), 0) INTO v_product_count
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND resource_type = 'product_sync'
    AND created_at < (p_billing_month + INTERVAL '1 month')::DATE;

    -- 商品托管费用：2 PT/个/月
    v_total_cost := v_total_cost + (v_product_count * 2);

    -- 图片存储费用（估算）：假设通过 api_usage_logs 统计
    -- 实际生产中应从图片存储服务获取实际用量
    SELECT COALESCE(
        CEIL(SUM(COALESCE((metadata->>'file_size_bytes')::NUMERIC, 0)) / (1024 * 1024)),
        0
    ) INTO v_image_size_mb
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND resource_type = 'cdn_storage'
    AND created_at >= p_billing_month
    AND created_at < (p_billing_month + INTERVAL '1 month')::DATE;

    v_total_cost := v_total_cost + (COALESCE(v_image_size_mb, 0)::INTEGER * 1);

    -- 统计订单数
    SELECT COALESCE(COUNT(*), 0) INTO v_order_count
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND resource_type = 'order_process'
    AND created_at >= p_billing_month
    AND created_at < (p_billing_month + INTERVAL '1 month')::DATE;

    -- 订单数据留存费用：超 1000 单部分每百单 1 PT
    IF v_order_count > 1000 THEN
        v_total_cost := v_total_cost + CEIL((v_order_count - 1000) / 100.0)::INTEGER;
    END IF;

    -- 商城页面托管：500 PT/月（固定）
    v_total_cost := v_total_cost + 500;

    -- 生成明细
    v_details := ARRAY[
        jsonb_build_object('item', '商品托管', 'count', v_product_count, 'rate', 2, 'cost', v_product_count * 2),
        jsonb_build_object('item', '图片存储', 'size_mb', COALESCE(v_image_size_mb, 0), 'rate', 1, 'cost', COALESCE(v_image_size_mb, 0)::INTEGER * 1),
        jsonb_build_object('item', '订单留存', 'count', GREATEST(v_order_count - 1000, 0), 'rate', 1, 'cost', GREATEST(CEIL(GREATEST(v_order_count - 1000, 0) / 100.0)::INTEGER, 0)),
        jsonb_build_object('item', '页面托管', 'count', 1, 'rate', 500, 'cost', 500)
    ];

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'billing_month', p_billing_month,
        'total_cost', v_total_cost,
        'details', jsonb_build_array(v_details)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 月度扣费执行函数
-- ============================================

CREATE OR REPLACE FUNCTION execute_monthly_billing(p_billing_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE - INTERVAL '1 day')
RETURNS TABLE(
    user_id UUID,
    total_cost INTEGER,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_cost JSONB;
    v_total_cost INTEGER;
BEGIN
    -- 遍历所有有活跃云商城的用户
    FOR v_user IN
        SELECT DISTINCT user_id
        FROM api_usage_logs
        WHERE created_at >= p_billing_month
        AND created_at < (p_billing_month + INTERVAL '1 month')
        AND resource_type IS NOT NULL
    LOOP
        -- 计算费用
        v_cost := calculate_monthly_storage_cost(v_user.user_id, p_billing_month);
        v_total_cost := (v_cost->>'total_cost')::INTEGER;

        -- 尝试扣费
        BEGIN
            PERFORM deduct_tokens(v_user.user_id, v_total_cost);

            -- 记录月度账单
            INSERT INTO billing_invoices (
                id, user_id, invoice_number, amount, status, payment_method,
                billing_period_start, billing_period_end, metadata, paid_at
            ) VALUES (
                gen_random_uuid(),
                v_user.user_id,
                'MBILL-' || to_char(p_billing_month, 'YYYYMM') || '-' || upper(substr(gen_random_uuid()::TEXT, 1, 8)),
                v_total_cost * 0.001, -- 转换为元
                'paid',
                'token_deduction',
                p_billing_month,
                (p_billing_month + INTERVAL '1 month')::DATE,
                v_cost,
                NOW()
            );

            user_id := v_user.user_id;
            total_cost := v_total_cost;
            status := 'paid';
            error_message := NULL;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            -- 扣费失败（余额不足等）
            user_id := v_user.user_id;
            total_cost := v_total_cost;
            status := 'failed';
            error_message := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 余额不足提醒触发函数
-- ============================================

CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS TRIGGER AS $$
BEGIN
    -- 当余额低于用户配置的阈值时，记录告警
    -- 实际的邮件/微信通知由外部服务处理
    IF NEW.balance < (
        SELECT COALESCE(low_balance_threshold, 10000)
        FROM user_token_config
        WHERE user_id = NEW.user_id
    ) THEN
        -- 记录低余额事件到日志
        INSERT INTO api_usage_logs (
            user_id, resource_type, tokens_used, endpoint, metadata
        ) VALUES (
            NEW.user_id,
            'other',
            0,
            'low_balance_alert',
            jsonb_build_object(
                'current_balance', NEW.balance,
                'threshold', (SELECT low_balance_threshold FROM user_token_config WHERE user_id = NEW.user_id),
                'alert_time', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_check_low_balance ON token_balances;
CREATE TRIGGER trg_check_low_balance
    AFTER UPDATE OF balance ON token_balances
    FOR EACH ROW
    WHEN (NEW.balance < OLD.balance)
    EXECUTE FUNCTION check_low_balance_and_notify();
