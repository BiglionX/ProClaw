# ProClaw 认证系统配置指南

## 📋 概述

ProClaw 使用 Supabase Authentication 进行用户管理，包括：
- 用户注册
- 用户登录
- 会话管理
- 自动创建用户资料 (profiles)

## ⚠️ 重要：必须先执行此步骤

### 在 Supabase 中创建触发器

**这是最关键的一步！** 如果不执行，注册功能将无法正常工作。

在 Supabase Dashboard → SQL Editor 中执行以下 SQL：

```sql
-- ============================================
-- 1. 创建触发器函数：自动为新用户创建 profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 创建触发器
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. 验证触发器是否创建成功
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 应该看到一行记录
```

执行成功后，你会看到提示，并且查询结果显示触发器已创建。

## 🔧 启用 Email 认证

### 步骤 1：进入认证设置

1. 访问 Supabase Dashboard
2. 进入 **Authentication** → **Providers**
3. 找到 **Email** provider

### 步骤 2：配置 Email 设置

1. 确保 **Enabled** 开关已打开
2. **重要**：关闭 "Confirm email" 选项（用于测试）
   - 这样可以立即登录，无需验证邮箱
   - 生产环境建议开启邮箱验证
3. 点击 **Save**

### 步骤 3：配置密码策略（可选）

在 **Authentication** → **Policies** 中：
- 最小密码长度：6 位（已在代码中验证）
- 可以自定义其他策略

## 🧪 测试认证功能

### 测试 1：使用模拟账号登录

1. 启动应用：`npm run dev`
2. 访问 http://localhost:3000/login
3. 点击 "⚡ 一键体验 (boss)" 按钮
4. 或使用凭据：
   - 用户名：`boss`
   - 密码：`IamBigBoss`

应该能成功登录并跳转到首页。

### 测试 2：注册新用户

1. 访问 http://localhost:3000/register
2. 填写表单：
   - 邮箱：test@example.com
   - 密码：test123456
   - 确认密码：test123456
3. 点击注册

**预期结果**：
- 显示 "注册成功！请登录" 提示
- 自动跳转到登录页面
- 在 Supabase Dashboard → Authentication → Users 中看到新用户
- 在 `profiles` 表中看到对应的记录

### 测试 3：使用新注册的账号登录

1. 使用刚才注册的邮箱和密码登录
2. 应该能成功登录

## 🔍 验证数据库

### 检查 users 表

```sql
-- 查看最近注册的用户
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

### 检查 profiles 表

```sql
-- 查看 profiles 记录
SELECT 
  id,
  username,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

**重要**：每个 `auth.users` 中的用户都应该在 `profiles` 表中有对应的记录。

### 如果 profiles 表没有记录

说明触发器没有正确执行，请：

1. 重新执行上面的触发器 SQL
2. 检查触发器是否存在：
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```
3. 手动创建缺失的 profile：
   ```sql
   -- 替换 your-user-id 为实际的用户 ID
   INSERT INTO profiles (id, username, role)
   VALUES ('your-user-id', 'testuser', 'user');
   ```

## 🐛 常见问题排查

### 问题 1：注册后无法登录

**症状**：注册成功，但登录时提示 "Invalid login credentials"

**原因**：Email 确认未禁用

**解决**：
1. Authentication → Providers → Email
2. 关闭 "Confirm email"
3. Save
4. 重新注册测试

### 问题 2：登录后立即被踢出

**症状**：登录成功，但刷新页面后又回到登录页

**原因**：`checkAuth` 失败或 session 未正确保存

**解决**：
1. 打开浏览器控制台 (F12)
2. 查看是否有错误信息
3. 检查 Network 标签中的请求
4. 清除浏览器缓存和 LocalStorage 后重试

### 问题 3：RLS 策略阻止访问

**症状**：登录后访问页面提示 "authorization check" 错误

**原因**：RLS 策略配置不正确或 profiles 记录不存在

**解决**：
1. 确认 profiles 表中有该用户的记录
2. 临时禁用 RLS 测试：
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```
3. 如果问题解决，重新启用并检查 RLS 策略

### 问题 4：环境变量未生效

**症状**：仍然连接到旧的 Supabase 项目

**解决**：
1. 完全停止开发服务器 (Ctrl+C)
2. 删除 `.next` 或 `dist` 文件夹（如果有）
3. 重新启动：`npm run dev`
4. 硬刷新浏览器 (Ctrl+Shift+R)

## 🔒 安全建议

### 生产环境配置

1. **启用 Email 验证**
   - Authentication → Providers → Email
   - 开启 "Confirm email"

2. **配置自定义邮件模板**
   - Authentication → Email Templates
   - 自定义确认邮件、重置密码邮件等

3. **强化密码策略**
   - 最小长度：8 位
   - 要求大小写字母、数字、特殊字符

4. **启用 MFA（多因素认证）**
   - Authentication → MFA
   - 为管理员账户启用

5. **配置 Rate Limiting**
   - 防止暴力破解

## 📊 监控和日志

### 查看认证日志

在 Supabase Dashboard → **Logs** → **Auth Logs** 中可以查看：
- 登录尝试
- 注册事件
- 错误信息

### 查看用户统计

```sql
-- 用户总数
SELECT COUNT(*) as total_users FROM auth.users;

-- 今日新增用户
SELECT COUNT(*) as new_users_today 
FROM auth.users 
WHERE created_at >= NOW() - INTERVAL '1 day';

-- 活跃用户（最近7天登录过）
SELECT COUNT(*) as active_users 
FROM auth.users 
WHERE last_sign_in_at >= NOW() - INTERVAL '7 days';
```

## 🎯 下一步

认证系统配置完成后，你可以：

1. ✅ 测试用户注册和登录
2. ✅ 实现用户资料编辑功能
3. ✅ 添加密码重置功能
4. ✅ 实现角色权限管理（admin/user）
5. ✅ 集成 Token 管理系统

## 📞 获取帮助

如果遇到问题：

1. 检查浏览器控制台错误
2. 查看 Supabase Auth Logs
3. 查阅 [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
4. 查看项目的 `docs/KNOWN_ISSUES.md`

---

**最后更新**: 2026-04-14  
**版本**: 1.0.0
