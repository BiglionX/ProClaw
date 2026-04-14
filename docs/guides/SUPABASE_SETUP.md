# Supabase 配置指南

## 📋 Phase 0 Week 2 完成

Supabase 集成已完成,包括:

- ✅ Supabase 客户端配置
- ✅ 用户认证模块(登录/注册)
- ✅ 认证页面组件
- ✅ Realtime 功能测试

## 🔧 配置步骤

### 1. 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 账号登录
4. 点击 "New Project"
5. 填写项目信息:
   - **Name**: proclaw-desktop
   - **Database Password**: (记住这个密码)
   - **Region**: 选择离你最近的区域
6. 点击 "Create new project"

### 2. 获取项目凭证

项目创建完成后,在 Dashboard 中:

1. 进入 **Settings** → **API**
2. 复制以下信息:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`

### 3. 配置环境变量

编辑 `.env.local` 文件:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
VITE_APP_NAME=Proclaw
VITE_APP_VERSION=0.1.0
```

将上面复制的值替换进去。

### 4. 启用 Email 认证

1. 进入 **Authentication** → **Providers**
2. 确保 **Email** 已启用
3. 可选:禁用 "Confirm email" 以便快速测试

### 5. 测试认证功能

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
# 尝试注册新账号
# 然后登录
```

## 🧪 测试 Realtime 功能

### 方法 1: 通过 UI 测试

1. 登录后,Dashboard 页面会显示 Realtime 连接状态
2. 如果看到 "📡 Realtime 连接状态: 已连接",说明成功

### 方法 2: 通过 SQL 编辑器测试

1. 进入 Supabase Dashboard → **SQL Editor**
2. 创建测试表:

```sql
-- 创建测试表
CREATE TABLE IF NOT EXISTS test_table (
  id BIGSERIAL PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 Realtime
ALTER TABLE test_table REPLICA IDENTITY FULL;
```

3. 插入测试数据:

```sql
INSERT INTO test_table (message) VALUES ('Hello from Supabase!');
```

4. 观察应用中的 RealtimeTest 组件是否收到事件

## 🔒 安全配置

### Row Level Security (RLS)

为测试表启用 RLS:

```sql
-- 启用 RLS
ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;

-- 创建策略: 允许所有认证用户读取
CREATE POLICY "Allow authenticated users to read"
  ON test_table
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建策略: 允许所有认证用户插入
CREATE POLICY "Allow authenticated users to insert"
  ON test_table
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## 📊 数据库 Schema 设计

Phase 0 阶段我们只需要基本的认证功能。后续 Phase 将添加:

- 产品库表 (products, categories, etc.)
- 进销存表 (inventory, transactions, etc.)
- 技能商店表 (skills, installations, etc.)

## ⚠️ 常见问题

### Q: 注册后收不到确认邮件?

A: 在 Authentication → Providers → Email 中禁用 "Confirm email"

### Q: Realtime 连接失败?

A: 检查:

1. 项目 URL 和 Key 是否正确
2. 网络是否正常
3. 浏览器控制台是否有错误

### Q: 如何重置密码?

A: 使用 `supabase.auth.resetPasswordForEmail(email)` API

## 🎯 下一步

Phase 0 Week 3 将集成 SQLite 本地数据库,实现离线优先架构。

---

**当前进度**: Phase 0 Week 2 ✅
**下一阶段**: Phase 0 Week 3 - 本地数据库 (SQLite + SQLCipher)
