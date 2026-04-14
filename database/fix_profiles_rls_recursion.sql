-- ============================================
-- 修复 Profiles RLS 无限递归问题
-- ============================================
-- 问题：Admins can view all profiles 策略中查询 profiles 表导致无限递归
-- 解决：使用 SECURITY DEFINER 函数来检查管理员权限
-- ============================================

-- 1. 创建 is_admin() 函数（SECURITY DEFINER 避免递归）
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

-- 2. 删除旧的策略
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 3. 创建新的策略（使用 is_admin() 函数）
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- ============================================
-- 验证
-- ============================================

-- 查看策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 测试 is_admin() 函数
-- 以管理员身份登录后执行：
-- SELECT is_admin(); -- 应该返回 true
