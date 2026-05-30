-- Migration 023: 欠费保护系统
-- 对应 PRD v8.0 第 5.3 节「欠费保护」
-- 实现：欠费状态判断、日消耗上限检查、数据归档

-- ============================================
-- 1. 欠费状态定义与判断函数
-- ============================================

-- 欠费状态枚举说明（非正式 enum，用于逻辑判断）:
--   normal    - 正常状态，余额充足
--   warning   - 余额低于阈值，正常服务+多次提醒
--   readonly  - 余额耗尽第4~7天，仅读操作可用
--   suspended - 余额耗尽第8~30天，仅展示停服页面
--   archived  - 超30天，数据归档后清理

CREATE OR REPLACE FUNCTION get_user_debt_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_balance INTEGER;
    v_threshold INTEGER;
    v_last_deduction_time TIMESTAMP WITH TIME ZONE;
    v_days_overdue INTEGER;
    v_status TEXT;
    v_result JSONB;
BEGIN
    -- 获取当前余额
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM token_balances
    WHERE user_id = p_user_id;

    -- 获取用户配置的低余额阈值
    SELECT COALESCE(low_balance_threshold, 10000) INTO v_threshold
    FROM user_token_config
    WHERE user_id = p_user_id;

    -- 获取最近一次扣费失败时间（从 api_usage_logs 查找余额不足记录）
    SELECT MAX(created_at) INTO v_last_deduction_time
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND resource_type = 'other'
    AND endpoint = 'insufficient_balance';

    -- 计算逾期天数
    IF v_last_deduction_time IS NOT NULL THEN
        v_days_overdue := EXTRACT(DAY FROM NOW() - v_last_deduction_time);
    ELSE
        v_days_overdue := 0;
    END IF;

    -- 判断状态
    IF v_balance > v_threshold THEN
        v_status := 'normal';
    ELSIF v_balance > 0 THEN
        -- 余额 > 0 但低于阈值
        v_status := 'warning';
    ELSIF v_days_overdue <= 3 THEN
        -- 第1~3天：正常服务+多次提醒
        v_status := 'warning';
    ELSIF v_days_overdue <= 7 THEN
        -- 第4~7天：只读模式
        v_status := 'readonly';
    ELSIF v_days_overdue <= 30 THEN
        -- 第8~30天：停服
        v_status := 'suspended';
    ELSE
        -- 超30天：归档
        v_status := 'archived';
    END IF;

    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'status', v_status,
        'balance', v_balance,
        'threshold', v_threshold,
        'days_overdue', v_days_overdue,
        'last_deduction_fail', v_last_deduction_time
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 日消耗上限检查函数
-- ============================================

CREATE OR REPLACE FUNCTION check_daily_limit(p_user_id UUID, p_tokens INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_daily_limit INTEGER;
    v_today_used INTEGER;
    v_allowed BOOLEAN;
    v_result JSONB;
BEGIN
    -- 获取用户日消耗上限设置(0=不限)
    SELECT COALESCE(daily_limit, 0) INTO v_daily_limit
    FROM user_token_config
    WHERE user_id = p_user_id;

    -- 未设置上限，直接放行
    IF v_daily_limit = 0 THEN
        RETURN jsonb_build_object('allowed', true, 'daily_limit', 0, 'today_used', 0);
    END IF;

    -- 查询当日已消耗 Token
    SELECT COALESCE(SUM(tokens_used), 0) INTO v_today_used
    FROM api_usage_logs
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

    -- 检查本次操作后是否会超限
    v_allowed := (v_today_used + p_tokens) <= v_daily_limit;

    SELECT jsonb_build_object(
        'allowed', v_allowed,
        'daily_limit', v_daily_limit,
        'today_used', v_today_used,
        'request_tokens', p_tokens,
        'remaining', GREATEST(v_daily_limit - v_today_used, 0)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 记录余额不足事件
-- ============================================

CREATE OR REPLACE FUNCTION record_insufficient_balance(
    p_user_id UUID,
    p_requested_tokens INTEGER,
    p_resource_type TEXT DEFAULT 'other',
    p_endpoint TEXT DEFAULT 'insufficient_balance'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_usage_logs (
        user_id, resource_type, tokens_used, endpoint, metadata
    ) VALUES (
        p_user_id,
        p_resource_type,
        0,
        p_endpoint,
        jsonb_build_object(
            'requested_tokens', p_requested_tokens,
            'current_balance', (SELECT balance FROM token_balances WHERE user_id = p_user_id),
            'event', 'insufficient_balance',
            'recorded_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 用户云商城数据归档函数
-- ============================================

CREATE OR REPLACE FUNCTION archive_user_cloud_store(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_archived_count INTEGER := 0;
BEGIN
    -- 标记 token_balances 为已归档（将余额转入冻结状态）
    UPDATE token_balances
    SET balance = 0,
        metadata = jsonb_build_object(
            'archived_at', NOW(),
            'frozen_balance', balance,
            'reason', 'debt_over_30_days'
        )
    WHERE user_id = p_user_id;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- 记录归档事件
    INSERT INTO api_usage_logs (
        user_id, resource_type, tokens_used, endpoint, metadata
    ) VALUES (
        p_user_id,
        'other',
        0,
        'user_archived',
        jsonb_build_object(
            'archived_at', NOW(),
            'reason', 'debt_over_30_days',
            'note', '用户余额耗尽超30天，数据已归档'
        )
    );

    SELECT jsonb_build_object(
        'user_id', p_user_id,
        'archived', true,
        'archived_at', NOW(),
        'records_affected', v_archived_count
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 批量欠费用户查询函数（Admin 用）
-- ============================================

CREATE OR REPLACE FUNCTION get_debt_users()
RETURNS TABLE(
    user_id UUID,
    balance INTEGER,
    status TEXT,
    days_overdue INTEGER,
    last_active TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_user RECORD;
    v_status JSONB;
BEGIN
    FOR v_user IN
        SELECT tb.user_id, tb.balance
        FROM token_balances tb
        WHERE tb.balance <= 0
        ORDER BY tb.updated_at DESC
    LOOP
        v_status := get_user_debt_status(v_user.user_id);

        user_id := v_user.user_id;
        balance := v_user.balance;
        status := v_status->>'status';
        days_overdue := (v_status->>'days_overdue')::INTEGER;
        last_active := (v_status->>'last_deduction_fail')::TIMESTAMP WITH TIME ZONE;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
