# ProClaw 新数据库配置指南

## 📋 概述

本指南将帮助你为 ProClaw 项目创建和配置全新的 Supabase 数据库。该数据库包含两个部分：

1. **营销网站用户系统** - 用户管理、API Key 管理、Token 销售
2. **主应用进销存系统** - 产品管理、采购、销售、库存、财务

## 🚀 快速开始

### 步骤 1：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 **"Start your project"**
3. 使用 GitHub 账号登录
4. 点击 **"New Project"**
5. 填写项目信息：
   - **Name**: `proclaw-production` (或你喜欢的名称)
   - **Database Password**: ⚠️ **请妥善保管此密码**
   - **Region**: 选择离你最近的区域（推荐：Asia Pacific）
6. 点击 **"Create new project"**
7. 等待项目创建完成（约 2-3 分钟）

### 步骤 2：获取项目凭证

项目创建完成后：

1. 进入 **Settings** → **API**
2. 复制以下信息：
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGc...
   service_role key: eyJhbGc... (仅用于服务器端，不要暴露在前端)
   ```

### 步骤 3：配置环境变量

在项目根目录创建或更新 `.env.local` 文件：

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# 演示模式 (设置为 false 以使用真实数据库)
VITE_DEMO_MODE=false

# Application Configuration
VITE_APP_NAME=ProClaw
VITE_APP_VERSION=0.1.0
```

**注意**：将 `your-project.supabase.co` 和 `your-anon-key-here` 替换为你实际的值。

### 步骤 4：执行数据库 Schema

#### 方法 A：通过 Supabase Dashboard（推荐）

1. 进入 Supabase Dashboard → **SQL Editor**
2. 点击 **"New Query"**
3. 打开项目中的 `database/complete_schema.sql` 文件
4. 复制全部内容并粘贴到 SQL Editor
5. 点击 **"Run"** 按钮执行
6. 等待执行完成，你应该看到提示：`ProClaw complete database schema created successfully!`

#### 方法 B：通过 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接到你的项目
supabase link --project-ref your-project-ref

# 执行迁移
supabase db push
```

### 步骤 5：启用 Email 认证

1. 进入 **Authentication** → **Providers**
2. 确保 **Email** 已启用
3. 可选配置：
   - 禁用 "Confirm email" 以便快速测试
   - 配置自定义邮件模板

### 步骤 6：验证数据库

执行以下 SQL 查询来验证表是否创建成功：

```sql
-- 查看所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 应该看到以下表：
-- accounts, api_keys, api_usage_logs, brands, customers,
-- external_integrations, financial_transactions, inventory_transactions,
-- product_categories, products, profiles, purchase_order_items,
-- purchase_orders, sales_order_items, sales_orders, suppliers,
-- system_settings, token_balances, token_packages, token_sales
```

### 步骤 7：创建管理员账户

1. 在应用中注册第一个用户
2. 进入 Supabase Dashboard → **Authentication** → **Users**
3. 找到你的用户，复制 UUID
4. 执行以下 SQL 将该用户设为管理员：

```sql
-- 将指定用户设为管理员
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-uuid-here';
```

## 🔧 高级配置

### 配置 Realtime 功能

对于需要实时同步的表，启用 Realtime：

```sql
-- 为关键表启用 Realtime
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE product_categories REPLICA IDENTITY FULL;
ALTER TABLE brands REPLICA IDENTITY FULL;
ALTER TABLE inventory_transactions REPLICA IDENTITY FULL;
ALTER TABLE purchase_orders REPLICA IDENTITY FULL;
ALTER TABLE sales_orders REPLICA IDENTITY FULL;
```

然后在 Supabase Dashboard 中：
1. 进入 **Database** → **Replication**
2. 启用上述表的 Realtime

### 配置存储桶（用于图片上传）

1. 进入 **Storage** → **New Bucket**
2. 创建以下存储桶：
   - `product-images` - 产品图片
   - `brand-logos` - 品牌 Logo
   - `user-avatars` - 用户头像

3. 设置公开访问策略：

```sql
-- 允许公开读取产品图片
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 允许认证用户上传
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');
```

### 配置数据库备份

1. 进入 **Settings** → **Database**
2. 启用 **Point-in-time Recovery**
3. 配置自动备份策略

## 🧪 测试数据库连接

### 测试 1：检查 Supabase 客户端

启动开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000，检查浏览器控制台是否有错误。

### 测试 2：注册用户

1. 访问注册页面
2. 创建新用户
3. 检查 Supabase Dashboard → **Authentication** → **Users** 中是否出现新用户
4. 检查 `profiles` 表中是否自动创建了记录

### 测试 3：插入测试数据

```sql
-- 插入测试分类
INSERT INTO product_categories (id, name, description) VALUES
('cat-1', '电子产品', '各类电子设备'),
('cat-2', '办公用品', '办公所需物品');

-- 插入测试品牌
INSERT INTO brands (id, name, slug) VALUES
('brand-1', 'Apple', 'apple'),
('brand-2', 'Microsoft', 'microsoft');

-- 插入测试产品
INSERT INTO products (id, sku, name, category_id, brand_id, cost_price, sell_price, current_stock) VALUES
('prod-1', 'IPHONE-15', 'iPhone 15', 'cat-1', 'brand-1', 6000, 7999, 100),
('prod-2', 'SURFACE-PRO', 'Surface Pro', 'cat-1', 'brand-2', 5000, 6999, 50);

-- 验证数据
SELECT * FROM products;
```

## 🔒 安全最佳实践

### 1. 保护 Service Role Key

⚠️ **永远不要**在前端代码中使用 `service_role` key！

```env
# ✅ 正确 - 只在前端使用 anon key
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# ❌ 错误 - 不要这样做
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 2. 启用 RLS (Row Level Security)

所有表都已配置 RLS 策略。验证 RLS 是否启用：

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

所有表的 `rowsecurity` 应为 `true`。

### 3. 定期轮换密钥

建议每 90 天轮换一次 API 密钥：

1. 进入 **Settings** → **API**
2. 点击 **"Rotate Key"**
3. 更新 `.env.local` 文件
4. 重新部署应用

## 📊 监控和维护

### 查看数据库使用情况

```sql
-- 查看各表行数
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 查看最近的 API 调用
SELECT 
    user_id,
    endpoint,
    tokens_used,
    cost,
    created_at
FROM api_usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

### 清理旧数据

```sql
-- 删除 90 天前的 API 日志
DELETE FROM api_usage_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- 删除已取消的订单（可选）
DELETE FROM purchase_orders
WHERE status = 'cancelled' 
AND created_at < NOW() - INTERVAL '1 year';
```

## ⚠️ 常见问题

### Q1: 注册后收不到确认邮件？

**解决方案**：
1. 进入 **Authentication** → **Providers** → **Email**
2. 禁用 "Confirm email"
3. 或者配置 SMTP 设置

### Q2: RLS 策略阻止了数据访问？

**解决方案**：
```sql
-- 临时禁用 RLS 进行测试（不推荐生产环境）
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 检查当前策略
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### Q3: 如何重置数据库？

**警告**：这将删除所有数据！

```sql
-- 删除所有表（谨慎操作）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 然后重新执行 complete_schema.sql
```

### Q4: Token 余额不更新？

**解决方案**：
```sql
-- 检查触发器是否存在
SELECT * FROM pg_trigger WHERE tgname = 'update_token_balances_updated_at';

-- 手动更新测试
UPDATE token_balances 
SET balance = 100000 
WHERE user_id = 'your-user-id';
```

## 🎯 下一步

数据库配置完成后：

1. ✅ 测试用户注册和登录
2. ✅ 添加产品和分类
3. ✅ 创建采购和销售订单
4. ✅ 测试库存管理
5. ✅ 配置 AI API Keys
6. ✅ 测试 Token 购买流程

## 📞 获取帮助

如果遇到问题：

1. 查看 Supabase Dashboard → **Logs** → **Database Logs**
2. 检查浏览器控制台的错误信息
3. 查阅 [Supabase 文档](https://supabase.com/docs)
4. 查看项目的 `docs/KNOWN_ISSUES.md`

---

**最后更新**: 2026-04-14  
**Schema 版本**: 2.0.0
