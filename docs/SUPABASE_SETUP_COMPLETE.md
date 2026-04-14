# Supabase 配置完成 & 下一步指南

## ✅ 已完成配置

### 环境变量已设置

**营销网站** (`marketing-site/.env.local`):
```bash
VITE_SUPABASE_URL=https://ourolpgrntjrtapgaztt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC
VITE_ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

**桌面端应用** (`.env.local`):
```bash
VITE_SUPABASE_URL=https://ourolpgrntjrtapgaztt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC
```

### 数据库迁移状态

- ✅ Schema 已执行成功
- ✅ 20 个表已创建
- ✅ 所有索引已创建
- ✅ 所有触发器已创建
- ✅ RLS 策略已启用
- ✅ 默认数据已插入（4个套餐 + 4个系统设置）

## 🧪 测试配置

### 1. 验证 Supabase 连接

访问营销网站并打开浏览器控制台（F12），应该看到：
```javascript
// 不应该再有这些警告
// ❌ "⚠️  Supabase not configured. Using demo mode."

// 应该能正常连接
✅ Supabase client initialized
```

### 2. 测试管理员登录

**营销网站：**
1. 访问 http://localhost:3001/login
2. 使用超级管理员账户：
   - 邮箱：`1055603323@qq.com`
   - 密码：`12345678`
3. 应该成功登录并跳转到 `/dashboard`
4. 访问 http://localhost:3001/admin 应该能看到管理后台

**注意：** 由于现在是真实 Supabase 连接，您需要先在 Supabase 中创建这个管理员账户（见下方步骤）。

### 3. 检查数据库表

在 Supabase Dashboard → Table Editor 中确认以下表存在：

**营销网站表（8个）：**
- [x] profiles
- [x] api_keys
- [x] token_sales
- [x] token_balances
- [x] external_integrations
- [x] api_usage_logs
- [x] token_packages
- [x] system_settings

**主应用表（12个）：**
- [x] product_categories
- [x] brands
- [x] products
- [x] inventory_transactions
- [x] suppliers
- [x] purchase_orders
- [x] purchase_order_items
- [x] customers
- [x] sales_orders
- [x] sales_order_items
- [x] accounts
- [x] financial_transactions

## 🔧 下一步操作

### 步骤 1: 创建管理员账户（必须）

由于现在是真实的 Supabase，演示模式的硬编码账户不再有效。您需要：

#### 方式 A: 通过 Supabase Dashboard 创建（推荐）

1. **访问 Supabase Dashboard**
   ```
   https://app.supabase.com/project/ourolpgrntjrtapgaztt/auth/users
   ```

2. **添加用户**
   - 点击 "Add user"
   - Email: `1055603323@qq.com`
   - Password: `12345678`
   - ✅ 勾选 "Auto Confirm User"
   - 点击 "Create user"

3. **复制 User UUID**
   - 创建后会显示用户的 UUID
   - 类似：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`

4. **在 SQL Editor 中执行**
   ```sql
   -- 替换 <USER_UUID> 为实际的 UUID
   INSERT INTO profiles (id, username, role)
   VALUES ('<USER_UUID>', 'admin', 'admin');
   
   -- 初始化 Token 余额
   INSERT INTO token_balances (user_id, balance, total_purchased, total_used)
   VALUES ('<USER_UUID>', 100000, 100000, 0);
   ```

#### 方式 B: 通过注册页面创建

1. 访问 http://localhost:3001/register
2. 注册一个新账户
3. 然后在 SQL Editor 中手动修改角色为 admin：
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

### 步骤 2: 移除演示模式代码（可选但推荐）

当前 authStore 中仍有演示模式的回退逻辑。如果您想完全切换到真实认证：

**营销网站** (`marketing-site/src/lib/authStore.ts`):

删除或注释掉第 37-60 行的演示模式代码：
```typescript
// 删除这段代码
if (import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url_here' || 
    !import.meta.env.VITE_SUPABASE_URL?.startsWith('http')) {
  console.warn('⚠️  Demo mode: Simulating login');
  // ... 演示模式逻辑
}
```

**或者保留作为开发环境的降级方案。**

### 步骤 3: 测试真实功能

#### 测试用户注册
1. 访问 http://localhost:3001/register
2. 填写注册表单
3. 应该能在 Supabase Auth → Users 中看到新用户
4. 应该在 `profiles` 表中看到对应的记录（需要配置触发器）

#### 测试用户登录
1. 使用刚注册的账户登录
2. 应该能成功进入用户中心
3. 查看浏览器控制台的 Network 标签，应该看到真实的 Supabase API 调用

#### 测试管理员功能
1. 使用管理员账户登录
2. 访问 /admin
3. 应该能看到真实的统计数据（目前可能为空）
4. 访问 /admin/users 应该能看到用户列表

### 步骤 4: 配置 Profile 自动创建触发器

为了让新用户注册时自动创建 profile，需要在 Supabase SQL Editor 中执行：

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user'
  );
  
  -- 初始化 Token 余额
  INSERT INTO public.token_balances (user_id, balance, total_purchased, total_used)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 步骤 5: 配置 RLS 策略测试

测试 RLS 是否正确工作：

```sql
-- 以匿名用户身份查询（应该被拒绝）
SELECT * FROM profiles; -- 应该返回空或错误

-- 以认证用户身份查询（应该只看到自己的）
-- 在应用中登录后测试
```

## 📊 项目架构概览

### 当前状态

```
┌─────────────────────────────────────┐
│     营销网站 (localhost:3001)        │
│  - React + Vite + Tailwind CSS      │
│  - 已连接真实 Supabase              │
│  - 完整的用户中心和管理后台          │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   Supabase Backend                  │
│  - PostgreSQL 数据库（20个表）       │
│  - Auth 认证系统                    │
│  - RLS 安全策略                     │
│  - Realtime 实时订阅                │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   桌面端应用 (Tauri)                 │
│  - React + Vite + Material-UI       │
│  - 本地 SQLite 数据库               │
│  - 可选的云端同步                   │
└─────────────────────────────────────┘
```

## 🎯 近期目标建议

### Phase 1: 基础功能完善（1-2天）
- [ ] 创建管理员账户
- [ ] 配置 Profile 自动创建触发器
- [ ] 测试完整的注册→登录→用户中心流程
- [ ] 验证 RLS 策略正常工作

### Phase 2: 核心功能开发（3-5天）
- [ ] 实现 API 密钥管理的 CRUD
- [ ] 实现 Token 购买流程（集成支付）
- [ ] 实现外部集成的审核流程
- [ ] 添加使用统计图表

### Phase 3: 高级功能（5-7天）
- [ ] 实现桌面端与云端的同步
- [ ] 添加实时通知功能
- [ ] 实现数据分析仪表板
- [ ] 优化性能和用户体验

## ⚠️ 注意事项

### 安全提醒
1. **不要提交 `.env.local` 到 Git**
   - 确认 `.gitignore` 包含 `.env.local`
   - 使用 `.env.example` 作为模板

2. **保护好 Anon Key**
   - 虽然叫 "public"，但仍应谨慎分享
   - 不要在客户端暴露 Service Role Key

3. **定期备份数据库**
   - Supabase 提供自动备份
   - 也可以手动导出 SQL

### 开发建议
1. **使用 Supabase Studio**
   - 可视化查看和编辑数据
   - 执行 SQL 查询
   - 监控 API 使用情况

2. **启用日志记录**
   - 在开发时打开浏览器控制台
   - 监控 Supabase 的 Logs 页面

3. **测试不同角色**
   - 创建多个测试账户
   - 验证权限隔离是否正确

## 📞 需要帮助？

如果遇到问题：

1. **检查 Supabase Logs**
   ```
   Dashboard → Logs → Database / Auth / Edge Functions
   ```

2. **验证环境变量**
   ```bash
   # 在浏览器控制台检查
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```

3. **测试数据库连接**
   ```javascript
   // 在浏览器控制台
   const { data, error } = await supabase.from('profiles').select('*').limit(1)
   console.log(data, error)
   ```

4. **查看文档**
   - [Supabase Docs](https://supabase.com/docs)
   - [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**配置完成时间**: 2026-04-14  
**Supabase Project**: ourolpgrntjrtapgaztt  
**Region**: Asia (Singapore)  
**Status**: ✅ Ready for Development
