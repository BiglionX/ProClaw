# ProClaw 数据库快速配置清单

## ⚡ 5 分钟快速配置

### ✅ 步骤检查清单

- [ ] **1. 创建 Supabase 项目**
  - 访问 https://supabase.com
  - 点击 "New Project"
  - 记录 Database Password

- [ ] **2. 获取 API 凭证**
  - Settings → API
  - 复制 Project URL
  - 复制 anon public key

- [ ] **3. 配置环境变量**
  ```bash
  # 编辑 .env.local
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  VITE_DEMO_MODE=false
  ```

- [ ] **4. 执行数据库 Schema**
  - SQL Editor → New Query
  - 粘贴 `database/complete_schema.sql` 内容
  - 点击 Run

- [ ] **5. 启用 Email 认证**
  - Authentication → Providers
  - 确保 Email 已启用
  - 可选：禁用 "Confirm email"

- [ ] **6. 创建管理员账户**
  ```sql
  UPDATE profiles 
  SET role = 'admin' 
  WHERE id = 'your-user-uuid';
  ```

- [ ] **7. 测试连接**
  ```bash
  npm run dev
  # 访问 http://localhost:3000
  # 尝试注册/登录
  ```

## 📋 数据库表概览

### 营销网站系统 (8 张表)
- ✅ `profiles` - 用户资料
- ✅ `api_keys` - API 密钥管理
- ✅ `token_sales` - Token 销售记录
- ✅ `token_balances` - Token 余额
- ✅ `external_integrations` - 外部集成
- ✅ `api_usage_logs` - API 使用日志
- ✅ `token_packages` - Token 套餐
- ✅ `system_settings` - 系统设置

### 主应用系统 (12 张表)
- ✅ `product_categories` - 产品分类
- ✅ `brands` - 品牌
- ✅ `products` - 产品
- ✅ `inventory_transactions` - 库存交易
- ✅ `suppliers` - 供应商
- ✅ `purchase_orders` - 采购订单
- ✅ `purchase_order_items` - 采购明细
- ✅ `customers` - 客户
- ✅ `sales_orders` - 销售订单
- ✅ `sales_order_items` - 销售明细
- ✅ `accounts` - 会计科目
- ✅ `financial_transactions` - 财务交易

**总计**: 20 张表 + RLS 策略 + RPC 函数

## 🔑 关键命令

### 验证表创建
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

### 查看用户列表
```sql
SELECT id, email, role, created_at FROM profiles;
```

### 插入测试数据
```sql
-- 测试分类
INSERT INTO product_categories (id, name) VALUES 
('test-1', '测试分类');

-- 测试产品
INSERT INTO products (id, sku, name, cost_price, sell_price) VALUES 
('test-prod-1', 'TEST-001', '测试产品', 100, 150);
```

### 检查 RLS 状态
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

## 🚨 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 注册收不到邮件 | 禁用 "Confirm email" |
| RLS 阻止访问 | 检查 pg_policies 表 |
| 连接失败 | 检查 .env.local 配置 |
| Token 不更新 | 检查触发器是否存在 |
| 图片上传失败 | 创建存储桶并设置策略 |

## 📞 紧急联系

- **Supabase 文档**: https://supabase.com/docs
- **项目文档**: `docs/guides/NEW_DATABASE_SETUP.md`
- **已知问题**: `docs/KNOWN_ISSUES.md`

---

**提示**: 详细配置请参考 `docs/guides/NEW_DATABASE_SETUP.md`
