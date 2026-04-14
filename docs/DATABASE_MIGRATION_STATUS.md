# 用户数据表迁移状态报告

## 📊 当前状态总结

### ✅ Schema 文件已准备就绪

**已完成：**
- ✅ `database/complete_schema.sql` - 完整的合并 schema（693行）
- ✅ `marketing-site/database/schema.sql` - 营销网站专用 schema（439行）
- ✅ `src/db/schema.sql` - 桌面端应用 schema
- ✅ **已修复触发器重复创建问题**（添加 DROP TRIGGER IF EXISTS）

**Schema 包含的表：**

#### 营销网站用户系统（8个表）
1. ✅ `profiles` - 用户资料表
2. ✅ `api_keys` - API 密钥管理
3. ✅ `token_sales` - Token 销售记录
4. ✅ `token_balances` - Token 余额
5. ✅ `external_integrations` - 外部集成
6. ✅ `api_usage_logs` - API 使用日志
7. ✅ `token_packages` - Token 套餐配置
8. ✅ `system_settings` - 系统设置

#### 主应用进销存系统（12个表）
9. ✅ `product_categories` - 产品分类
10. ✅ `brands` - 品牌
11. ✅ `products` - 产品
12. ✅ `inventory_transactions` - 库存交易
13. ✅ `suppliers` - 供应商
14. ✅ `purchase_orders` - 采购订单
15. ✅ `purchase_order_items` - 采购订单明细
16. ✅ `customers` - 客户
17. ✅ `sales_orders` - 销售订单
18. ✅ `sales_order_items` - 销售订单明细
19. ✅ `accounts` - 会计科目
20. ✅ `financial_transactions` - 财务交易

### ⚠️ 数据库尚未实际创建

**当前状态：**
- ❌ Supabase 项目未配置
- ❌ 环境变量未设置（仍为占位符）
- ❌ SQL 脚本未在数据库中执行
- ✅ 当前使用演示模式（Mock 数据）

## 🔧 需要执行的步骤

### 步骤 1: 配置 Supabase 项目

1. **访问 Supabase**
   ```
   https://supabase.com
   ```

2. **创建新项目**
   - 点击 "New Project"
   - 填写项目名称（如：proclaw-platform）
   - 选择数据库密码（请妥善保存）
   - 选择区域（推荐：Asia Pacific - Singapore）

3. **获取项目凭证**
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbG...`（以 eyJ 开头的长字符串）

### 步骤 2: 配置环境变量

**营销网站** (`marketing-site/.env.local`):
```bash
# 替换为真实的 Supabase 凭证
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ENCRYPTION_KEY=generate-a-random-32-char-key
```

**桌面端应用** (`.env.local`):
```bash
# 同样的配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 步骤 3: 执行数据库迁移

#### 方式 A: 通过 Supabase Dashboard（推荐）

1. 登录 Supabase Dashboard
2. 进入项目 → SQL Editor
3. 复制 `database/complete_schema.sql` 的全部内容
4. 粘贴到 SQL Editor
5. 点击 "Run" 执行
6. 确认成功消息：`ProClaw complete database schema created successfully!`

#### 方式 B: 通过 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 执行迁移
supabase db push
```

#### 方式 C: 通过 psql 命令行

```bash
# 连接到 Supabase 数据库
psql -h db.xxxxx.supabase.co -p 5432 -U postgres -d postgres

# 执行 SQL 文件
\i path/to/complete_schema.sql
```

### 步骤 4: 验证迁移结果

在 Supabase Dashboard → Table Editor 中检查以下表是否存在：

**营销网站表：**
- [ ] profiles
- [ ] api_keys
- [ ] token_sales
- [ ] token_balances
- [ ] external_integrations
- [ ] api_usage_logs
- [ ] token_packages
- [ ] system_settings

**主应用表：**
- [ ] product_categories
- [ ] brands
- [ ] products
- [ ] inventory_transactions
- [ ] suppliers
- [ ] purchase_orders
- [ ] purchase_order_items
- [ ] customers
- [ ] sales_orders
- [ ] sales_order_items
- [ ] accounts
- [ ] financial_transactions

### 步骤 5: 创建管理员账户

在 Supabase Dashboard → Authentication → Users：

1. 点击 "Add user"
2. 填写信息：
   - Email: `1055603323@qq.com`
   - Password: `12345678`
   - Auto Confirm User: ✅ 勾选
3. 点击 "Create user"
4. 复制生成的 User UUID

然后在 SQL Editor 中执行：

```sql
-- 将 <USER_UUID> 替换为实际的 UUID
INSERT INTO profiles (id, username, role)
VALUES ('<USER_UUID>', 'admin', 'admin');

-- 初始化 Token 余额
INSERT INTO token_balances (user_id, balance, total_purchased, total_used)
VALUES ('<USER_UUID>', 100000, 100000, 0);
```

## 📝 默认数据

执行 schema 后会自动插入以下数据：

### Token 套餐（4个）
```sql
- 入门套餐: 100,000 Tokens / ¥50
- 标准套餐: 500,000 Tokens / ¥200 (10% 折扣)
- 专业套餐: 2,000,000 Tokens / ¥700 (15% 折扣)
- 企业套餐: 10,000,000 Tokens / ¥3,000 (20% 折扣)
```

### 系统设置（4个）
```sql
- rate_limit_per_minute: 60 次/分钟
- rate_limit_per_day: 10,000 次/天
- low_balance_threshold: 10,000 Tokens
- maintenance_mode: false
```

## 🔒 安全配置

### RLS (Row Level Security) 策略

Schema 已包含完整的 RLS 策略：

**用户数据隔离：**
- ✅ 用户只能查看自己的 profile
- ✅ 用户只能管理自己的 API keys
- ✅ 用户只能查看自己的 token sales
- ✅ 用户只能查看自己的 usage logs

**管理员权限：**
- ✅ Admin 可以查看所有 profiles
- ✅ Admin 可以管理所有 token packages
- ✅ Admin 可以查看 platform stats
- ✅ Admin 可以审核 external integrations

**公开访问：**
- ✅ 任何人都可以查看活跃的 token packages
- ✅ 认证用户可以访问主应用的所有业务数据

## 🎯 当前演示模式说明

由于尚未配置 Supabase，当前系统运行在**演示模式**：

### 营销网站
- ✅ 登录：任意邮箱/密码都可以登录
- ✅ 特殊管理员：`1055603323@qq.com` / `12345678` 获得 admin 角色
- ✅ 其他账户：获得 user 角色
- ✅ 所有数据都是内存中的 Mock 数据
- ❌ 刷新页面后数据丢失
- ❌ 无法持久化存储

### 桌面端
- ✅ 模拟账户：`boss` / `IamBigBoss` (admin 角色)
- ✅ 本地 SQLite 数据库（已有完整数据）
- ✅ 数据持久化在本地
- ❌ 未与云端同步

## 🚀 迁移后的变化

配置真实 Supabase 后：

| 特性 | 演示模式 | 生产模式 |
|------|---------|---------|
| 数据存储 | 内存（临时） | Supabase PostgreSQL |
| 用户认证 | Mock | Supabase Auth |
| 数据持久化 | ❌ | ✅ |
| 多设备同步 | ❌ | ✅ |
| RLS 安全策略 | ❌ | ✅ |
| 实时订阅 | ❌ | ✅ |
| 备份恢复 | ❌ | ✅（Supabase 自动） |

## 📋 检查清单

### 迁移前
- [ ] 已创建 Supabase 项目
- [ ] 已获取 Project URL 和 Anon Key
- [ ] 已备份重要数据（如果有）
- [ ] 已阅读 complete_schema.sql

### 迁移中
- [ ] 已更新 .env.local 文件
- [ ] 已在 Supabase Dashboard 执行 SQL
- [ ] 已确认所有表创建成功
- [ ] 已确认 RLS 策略启用
- [ ] 已确认触发器和函数创建成功

### 迁移后
- [ ] 已创建管理员账户
- [ ] 已验证管理员可以登录
- [ ] 已验证普通用户可以注册
- [ ] 已验证数据持久化
- [ ] 已测试 RLS 权限隔离
- [ ] 已移除演示模式的硬编码账户

## ⚠️ 注意事项

1. **不要在生产环境使用演示账户**
   - 迁移后立即移除 `authStore.ts` 中的硬编码逻辑
   - 使用真实的 Supabase Auth

2. **保护好环境变量**
   - 不要将 `.env.local` 提交到 Git
   - 使用 `.gitignore` 排除敏感文件

3. **定期备份**
   - Supabase 提供自动备份
   - 也可以手动导出数据库

4. **监控使用情况**
   - 关注 Supabase 的使用配额
   - 设置用量告警

## 📞 需要帮助？

如果迁移过程中遇到问题：

1. **查看 Supabase 文档**
   - https://supabase.com/docs

2. **检查 SQL 错误**
   - 在 Supabase Dashboard → Logs 查看详细错误

3. **验证表结构**
   - 在 Table Editor 中检查每个表的列是否正确

4. **测试 RLS 策略**
   - 使用不同角色登录测试权限隔离

---

**报告生成时间**: 2026-04-14  
**Schema 版本**: v2.0.0  
**总表数量**: 20 个  
**状态**: Schema 就绪，等待执行迁移
