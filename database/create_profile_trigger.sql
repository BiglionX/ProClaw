-- ============================================
-- 自动创建 Profile 触发器
-- ============================================
-- 功能：当新用户注册时，自动创建 profile 记录并初始化 Token 余额
-- 执行位置：Supabase SQL Editor
-- ============================================

-- 1. 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建 profile 记录
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    -- 优先使用 metadata 中的 username，否则从邮箱提取
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    'user' -- 默认角色为普通用户
  );
  
  -- 初始化 Token 余额
  INSERT INTO public.token_balances (user_id, balance, total_purchased, total_used)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 验证触发器是否创建成功
-- ============================================

-- 查看触发器信息
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- 测试触发器（可选）
-- ============================================

-- 方式 1: 通过 Supabase Dashboard 注册一个新用户
-- 访问: https://app.supabase.com/project/ourolpgrntjrtapgaztt/auth/users
-- 点击 "Add user" 创建一个测试账户
-- 然后检查 profiles 表是否自动创建了记录

-- 方式 2: 通过注册页面测试
-- 访问: http://localhost:3001/register
-- 填写注册表单
-- 注册成功后检查数据库

-- 验证查询：
-- SELECT p.id, p.username, p.role, tb.balance
-- FROM profiles p
-- LEFT JOIN token_balances tb ON p.id = tb.user_id
-- ORDER BY p.created_at DESC
-- LIMIT 5;

-- ============================================
-- 注意事项
-- ============================================
-- 1. 这个触发器会在每次新用户注册时自动执行
-- 2. 如果注册失败，profile 也不会创建（事务回滚）
-- 3. 如果需要为特定用户设置 admin 角色，需要手动更新：
--    UPDATE profiles SET role = 'admin' WHERE email = 'xxx@example.com';
-- 4. SECURITY DEFINER 确保函数以定义者权限执行，可以访问 auth schema
