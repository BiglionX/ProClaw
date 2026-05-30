-- Migration 024: 现有用户 Token 余额迁移
-- 对应 PRD v8.0 第 5.5 节「迁移方案」
-- 为在 auto_create_token_config 触发器创建之前已注册的用户补充 Token 余额

-- ============================================
-- 1. 批量初始化现有用户 Token 余额
-- ============================================

CREATE OR REPLACE FUNCTION migrate_existing_users()
RETURNS TABLE(
    user_id UUID,
    action TEXT,
    balance INTEGER,
    message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_has_balance BOOLEAN;
    v_has_config BOOLEAN;
BEGIN
    -- 遍历所有 profiles 中的用户
    FOR v_user IN
        SELECT id FROM profiles
        ORDER BY created_at ASC
    LOOP
        -- 检查是否已有 token_balances 记录
        SELECT EXISTS(
            SELECT 1 FROM token_balances WHERE user_id = v_user.id
        ) INTO v_has_balance;

        -- 检查是否已有 user_token_config 记录
        SELECT EXISTS(
            SELECT 1 FROM user_token_config WHERE user_id = v_user.id
        ) INTO v_has_config;

        IF NOT v_has_balance THEN
            -- 新用户赠送 50000 PT
            INSERT INTO token_balances (user_id, balance, total_purchased, total_used)
            VALUES (v_user.id, 50000, 50000, 0);

            -- 记录迁移
            INSERT INTO api_usage_logs (
                user_id, resource_type, tokens_used, endpoint, metadata
            ) VALUES (
                v_user.id,
                'other',
                50000,
                'migration_free_allowance',
                jsonb_build_object(
                    'migration_version', '024',
                    'granted_at', NOW(),
                    'reason', 'existing_user_migration',
                    'amount', 50000
                )
            );

            user_id := v_user.id;
            action := 'granted_free_allowance';
            balance := 50000;
            message := '已赠送 50000 PT 免费额度';
            RETURN NEXT;
        ELSE
            user_id := v_user.id;
            action := 'skipped_exists';
            balance := (SELECT balance FROM token_balances WHERE user_id = v_user.id);
            message := '已有 Token 余额，跳过';
            RETURN NEXT;
        END IF;

        IF NOT v_has_config THEN
            -- 创建默认 Token 配置
            INSERT INTO user_token_config (user_id)
            VALUES (v_user.id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 查询用户迁移状态
-- ============================================

CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE(
    total_users INTEGER,
    migrated_users INTEGER,
    pending_users INTEGER,
    total_pt_granted BIGINT
) AS $$
DECLARE
    v_total INTEGER;
    v_migrated INTEGER;
    v_pending INTEGER;
    v_total_pt BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM profiles;

    SELECT COUNT(*) INTO v_migrated
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM token_balances tb WHERE tb.user_id = p.id);

    SELECT COUNT(*) INTO v_pending
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM token_balances tb WHERE tb.user_id = p.id);

    SELECT COALESCE(SUM(balance), 0)::BIGINT INTO v_total_pt
    FROM token_balances;

    total_users := v_total;
    migrated_users := v_migrated;
    pending_users := v_pending;
    total_pt_granted := v_total_pt;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. 执行迁移（生产环境需手动调用 migrate_existing_users()）
-- ============================================
-- 注意：以下脚本仅作为参考，生产环境应手动执行：
-- SELECT * FROM migrate_existing_users();
