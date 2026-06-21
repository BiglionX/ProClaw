# 需求文档：ProClaw 营销网站用户中心（PRD v7.1）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../../RELEASE_NOTES_v1.0.0.md) §"云托管商城增强"（用户中心关联云数据管理） |
| **覆盖率** | ~85%（个人资料/安全/订阅/API Keys/Token/云数据 6 Tab 全部落地；细分子页面部分含 P1 占位） |
| **代码入口** | `marketing-site/src/pages/UserCenterPage.tsx`、`marketing-site/src/lib/authStore.ts` |
| **数据库依赖** | `marketing-site/database/schema.sql`（profiles/api_keys/token_*/user_subscriptions 等表） |
| **测试覆盖** | `marketing-site/src/lib/authStore.test.ts` |
| **差异与遗留** | 用户中心 6 Tab 已上线；登录历史/订阅事件等表已建好（详见 PRD §5.2） |
| **后续动作** | 维持现状；按需补齐 P1 优先级子页面 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，营销网站用户中心 6 Tab 上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> **版本**: v7.1  
> **更新日期**: 2026-05-29  
> **状态**: 草案  
> **关联 PRD**: v5.0（云托管商城）、v5.1（桌面端用户中心）、v7.0（营销网站品牌定位）

---

## 1. 背景与现状

### 1.1 营销网站当前用户功能

ProClaw 营销网站 (`marketing-site/`) 目前已有基础的登录/注册和简单的用户仪表板，但与桌面端相比，用户自助管理能力严重不足：

| 功能模块 | 现状 | 问题 |
|---------|------|------|
| **登录/注册** | `LoginPage.tsx` / `RegisterPage.tsx` | 正常可用 |
| **用户仪表板** | `UserDashboard.tsx`（概览页面） | 仅有统计卡片和功能菜单入口，各子页面均未实现 |
| **个人资料编辑** | `authStore.ts` 有 `updateProfile` 方法 | 前端无编辑界面 |
| **密码修改** | 无 | 缺失 |
| **套餐订阅** | `PricingPage.tsx` 仅展示 | 无用户订阅管理界面 |
| **API 密钥管理** | 数据库 `api_keys` 表已存在 | 前端无管理界面 |
| **Token 管理** | 数据库 `token_balances/sales` 表已存在 | 前端余额充值/查看界面缺失 |
| **外部集成** | 数据库 `external_integrations` 表已存在 | 前端管理界面缺失 |
| **云商城管理** | `cloud-store/` 独立 Next.js 项目 | 用户无统一查看入口 |

### 1.2 存在的问题

1. **仪表板名不副实** — `/dashboard` 仅有概览，实际功能菜单全部导向未实现的子页面
2. **功能缺失严重** — 个人资料、密码修改、订阅管理、API 密钥等核心自助功能均无 UI
3. **云数据无入口** — 用户开通云商城后，无法在营销网站查看商城状态、同步情况、订单数据
4. **用户体验断裂** — Token 余额只能看不能操作，套餐只能看不能管理

---

## 2. 目标

### 2.1 产品目标

构建营销网站的**统一用户中心**，将个人资料、账号安全、套餐订阅、API 密钥管理、Token 管理、云数据管理等功能整合到单一入口，为云平台用户提供完整的自助服务体验。

### 2.2 设计原则

- **统一入口** — 网站导航栏增加用户中心入口，登录后自动跳转
- **渐进式整合** — 先补齐核心缺失功能（资料、密码、订阅），后完善数据管理
- **复用数据库** — 对接已有 `profiles`、`api_keys`、`token_*`、`external_integrations` 等表
- **营销风格** — 保持 Tailwind CSS 风格，与现有营销网站视觉统一

---

## 3. 功能需求

### 3.1 个人资料（Profile）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **基本信息展示** | 显示头像、昵称、邮箱、角色、注册时间 | P0 |
| **编辑昵称** | 修改显示名称 | P0 |
| **编辑邮箱** | 修改绑定邮箱（需验证） | P1 |
| **更换头像** | 支持上传头像图片 | P1 |
| **手机号绑定** | 绑定/修改手机号 | P2 |

**已有接口**:
- `supabase.auth.updateUser()` — 更新邮箱
- `updateProfile()` — `authStore.ts:222` 已有方法
- 头像上传需 Supabase Storage

### 3.2 账号安全（Security）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **修改密码** | 输入旧密码 + 新密码 + 确认新密码 | P0 |
| **登录记录** | 查看最近登录时间、IP、设备 | P1 |

**已有接口**:
- `supabase.auth.updateUser({ password })` — 修改密码

### 3.3 套餐订阅（Subscription）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **当前套餐概览** | 显示套餐名称、到期时间、资源配额 | P0 |
| **套餐变更** | 升级/降级套餐（从 PricingPage 的 4 档中选择） | P0 |
| **续费管理** | 月付/年付切换，续费操作 | P1 |
| **订单历史** | 查看订阅变更记录 | P1 |

**套餐定义**（来自 `PricingPage.tsx`）：

| 套餐 | 月费 | 商品 | 月订单 | 域名 | AI主题 | 同步 |
|------|------|------|--------|------|--------|------|
| 免费版 | ¥0 | 20 个 | 10 单 | 子域名 | ❌ | 手动 |
| 基础版 | ¥29 | 200 个 | 100 单 | 自定义 | ✅ | 实时 |
| 专业版 | ¥99 | 2000 个 | 2000 单 | 自定义 | ✅ | 实时 |
| 企业版 | ¥299 | 不限 | 不限 | 自定义 | ✅ | 实时 |

### 3.4 API 密钥管理（API Keys）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **密钥列表** | 显示已配置的 AI 提供商密钥（名称、提供商、状态） | P0 |
| **新增密钥** | 选择提供商 + 填写密钥 + 设置名称 | P0 |
| **编辑密钥** | 修改密钥名称、更换密钥值 | P1 |
| **删除密钥** | 移除不再使用的密钥 | P0 |
| **用量统计** | 每个密钥的调用次数、Token 消耗 | P1 |

**数据表**: `api_keys`（已有 schema）

### 3.5 Token 管理（Token Management）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **余额展示** | 当前 Token 余额、累计购买、已用 | P0 |
| **套餐购买** | 展示可选 Token 套餐包，点击购买 | P0 |
| **消费明细** | 按时间查询 Token 消耗记录（api_usage_logs） | P1 |
| **充值记录** | 历史 Token 购买记录（token_sales） | P1 |

**数据表**: `token_balances`、`token_sales`、`token_packages`、`api_usage_logs`（均有 schema）

### 3.6 云数据管理（Cloud Data Management）

这是营销网站用户中心区别于桌面端的核心模块，整合云商城相关数据。

#### 3.6.1 云商城概览

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **商城状态** | 显示开通状态、子域名、套餐名称、到期时间 | P0 |
| **快速入口** | 一键跳转到商城首页、商城管理后台 | P0 |
| **域名信息** | 显示默认子域名 (`xxx.proclaw.cc`)、自定义域名配置提示 | P1 |

#### 3.6.2 商品数据同步

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **同步概览** | 已同步商品数、待同步商品数、同步状态 | P0 |
| **同步历史** | 同步时间、类型（全量/增量）、状态、消息 | P1 |
| **手动触发** | 点击触发全量/增量同步 | P1 |
| **同步日志** | 详细同步错误日志、失败原因 | P2 |

**示意图**：
```
┌─────────────────────────────────────────────┐
│  云数据管理                                  │
│                                              │
│  ┌─── 云商城概览 ────────────────────────┐   │
│  │  状态: 已开通  │  套餐: 专业版        │   │
│  │  域名: mypro.proclaw.cc               │   │
│  │  [访问商城]  [管理后台]  [升级套餐]    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─── 数据同步 ─────────────────────────┐   │
│  │  已同步: 156 个商品                    │   │
│  │  待同步: 3 个商品    [立即同步]       │   │
│  │                                        │   │
│  │  同步历史:                             │   │
│  │  05-29 10:30  增量同步  ✅ 成功       │   │
│  │  05-29 08:15  全量同步  ✅ 成功       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─── 订单数据 ─────────────────────────┐   │
│  │  本月新订单: 23 单   总订单: 156 单   │   │
│  │                                        │   │
│  │  最近订单:                             │   │
│  │  #20260529-001  张三  ¥299  待发货    │   │
│  │  #20260528-015  李四  ¥159  已发货    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─── 外部集成 ─────────────────────────┐   │
│  │  Webhook URL: https://...           │   │
│  │  API Key: sk-xxxxxxxxxxxx           │   │
│  │  回调状态: 正常                       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### 3.6.3 订单数据

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **订单列表** | 按时间倒序展示商城订单（客户视角和管理视角） | P0 |
| **订单统计** | 本月订单数、总销售额、待处理订单数 | P1 |
| **订单详情** | 查看订单商品、金额、客户信息、物流状态 | P1 |

#### 3.6.4 外部集成

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **Webhook 管理** | 查看/配置回调 URL、API Key | P1 |
| **集成状态** | 显示 Webhook 测试状态、最近回调记录 | P2 |

**数据表**: `external_integrations`（已有 schema）、`merchants`、`products_snapshot`、`orders`（云商城 schema）

---

## 4. 页面结构

### 4.1 导航入口

```
全局导航栏（所有页面可见）
  └─ 未登录: 显示 [登录] [注册] 按钮
  └─ 已登录: 显示 用户头像 + 昵称 + 下拉菜单
       ├─ 用户中心
       ├─ 我的商城 (如有云商城)
       └─ 退出登录
```

### 4.2 用户中心布局

```
/user (或 /user/dashboard)
  ┌────────────────────────────────────────────────────┐
  │  用户中心                                           │
  ├────────────────────────────────────────────────────┤
  │  ┌────────────────────────────────────────────────┐│
  │  │  头像  昵称 / 邮箱                             ││
  │  │        角色: 用户  |  注册时间: 2026-01-15     ││
  │  └────────────────────────────────────────────────┘│
  ├────────────────────────────────────────────────────┤
  │  [个人资料] [安全] [套餐] [API密钥] [Token] [云数据] │ ← Tabs
  ├────────────────────────────────────────────────────┤
  │                                                      │
  │  Tab 内容（每个 Tab 对应一个模块）                    │
  │                                                      │
  │  Tab 0: 个人资料                                     │
  │   昵称 [_________] [保存]                            │
  │   邮箱 [_________] [保存] (需验证)                    │
  │   手机 [_________] [保存]                            │
  │                                                      │
  │  Tab 1: 账号安全                                     │
  │   修改密码 [旧密码] [新密码] [确认密码] [提交]       │
  │   最近登录：2026-05-29 10:30 (桌面端)                │
  │                                                      │
  │  Tab 2: 套餐订阅                                     │
  │   当前套餐: 专业版  ¥99/月  到期: 2026-12-31        │
  │   [升级/降级] [续费]                                 │
  │   订单历史: ...                                      │
  │                                                      │
  │  Tab 3: API 密钥管理                                 │
  │   密钥列表 + [新增密钥]                              │
  │                                                      │
  │  Tab 4: Token 管理                                   │
  │   余额展示 + 套餐购买 + 消费/充值记录                │
  │                                                      │
  │  Tab 5: 云数据管理                                   │
  │   商城概览 + 数据同步 + 订单数据 + 外部集成          │
  └────────────────────────────────────────────────────┘
```

### 4.3 路由设计

```
/user                  → 用户中心（重定向到 /user/dashboard）
/user/dashboard        → 用户仪表板（原有 UserDashboard 改造）
/user/profile          → 个人资料
/user/security         → 账号安全
/user/subscription     → 套餐订阅
/user/api-keys         → API 密钥管理
/user/tokens           → Token 管理
/user/cloud            → 云数据管理（商城概览 + 同步 + 订单 + 集成）
/user/cloud/orders     → 云商城订单管理
/user/cloud/sync       → 数据同步管理
/user/cloud/settings   → 商城配置
```

---

## 5. 数据模型

### 5.1 已有数据表（直接复用）

| 表名 | 来源文件 | 用途 |
|------|---------|------|
| `profiles` | `marketing-site/database/schema.sql:9` | 用户资料（id, username, full_name, avatar_url, role） |
| `api_keys` | `marketing-site/database/schema.sql:67` | API 密钥管理 |
| `token_sales` | `marketing-site/database/schema.sql:95` | Token 销售记录 |
| `token_balances` | `marketing-site/database/schema.sql:117` | Token 余额 |
| `external_integrations` | `marketing-site/database/schema.sql:128` | 外部集成配置 |
| `api_usage_logs` | `marketing-site/database/schema.sql:153` | API 使用日志 |
| `token_packages` | `marketing-site/database/schema.sql:175` | Token 套餐配置 |
| `merchants` | `docs/需求文档：ProClaw 云托管商城（PRD v5.0）.md:199` | 云商城商户 |
| `products_snapshot` | PRD v5.0:210 | 商品快照 |
| `orders` | PRD v5.0:227 | 商城订单 |
| `store_config` | PRD v5.0:244 | 商城配置 |
| `sync_logs` | PRD v5.0:255 | 同步日志 |

### 5.2 需新增的字段/表

```sql
-- profiles 表增加字段（已有 schema 可扩展）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- 登录日志表（新建）
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,           -- 'desktop', 'mobile', 'web'
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);

-- 用户订阅表（新建，管理用户与云商城套餐的关系）
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('free', 'basic', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'canceled', 'expired', 'suspended')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- 订阅变更记录表
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK(event_type IN ('created', 'upgraded', 'downgraded', 'renewed', 'canceled', 'expired')),
    from_plan TEXT,
    to_plan TEXT,
    price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. 接口清单

### 6.1 已有接口/方法

| 接口 | 位置 | 用途 |
|------|------|------|
| `supabase.auth.updateUser()` | Supabase SDK | 修改邮箱/密码 |
| `updateProfile()` | `authStore.ts:222` | 更新用户资料 |
| `supabase.from('profiles').select/update` | PostgREST | 资料 CRUD |
| `supabase.from('api_keys').select/insert/update/delete` | PostgREST | API 密钥管理 |
| `supabase.from('token_balances').select` | PostgREST | Token 余额查询 |
| `supabase.from('token_sales').select/insert` | PostgREST | Token 购买 |
| `supabase.from('token_packages').select` | PostgREST | Token 套餐列表 |
| `supabase.from('api_usage_logs').select` | PostgREST | 用量查询 |
| `supabase.from('external_integrations').select/insert/update/delete` | PostgREST | 集成管理 |
| `supabase.storage.from('avatars').upload` | Supabase Storage | 头像上传 |

### 6.2 需新增接口

| 接口 | 用途 | 优先级 |
|------|------|--------|
| `supabase.from('user_subscriptions').select/insert/update` | 订阅 CRUD | P0 |
| `supabase.from('subscription_events').select` | 订阅变更记录 | P1 |
| `supabase.from('login_history').select` | 登录历史查询 | P1 |
| `supabase.from('merchants').select/update` | 云商城状态查询 | P0 |
| `supabase.from('sync_logs').select` | 同步日志查询 | P1 |
| `supabase.from('orders').select` | 订单列表查询 | P0 |
| `supabase.rpc('get_user_stats')` | 用户统计（已有 RPC） | P1 |

---

## 7. 非功能需求

### 7.1 安全

- 修改密码需提供旧密码验证
- API 密钥在数据库中加密存储（已有 `encrypted_key` 字段）
- 个人资料修改仅本人或管理员可操作
- 头像上传限制文件类型（jpg/png/webp）和大小（≤2MB）

### 7.2 性能

- 用户中心各 Tab 数据按需加载（延迟加载非当前 Tab）
- Token 余额和用量数据缓存 60 秒
- 同步日志仅加载最近 50 条

### 7.3 兼容性

- 桌面端 `UserCenterPage` 与营销网站 `UserCenterPage` 功能对齐但独立实现
- 云数据管理模块的数据来源与 `cloud-store/`（Next.js）项目共享同一数据库
- 移动端可通过浏览器直接访问 `/user` 使用所有功能

---

## 8. 实施路线

| 阶段 | 内容 | 交付件 | 估算 |
|------|------|--------|------|
| **Phase 1** | 导航改造 + 页面框架：全局导航栏添加用户状态、下拉菜单；创建用户中心 Tab 布局框架 | `Navbar.tsx` 修改 + 新建 `UserCenterPage.tsx` | 1天 |
| **Phase 2** | 个人资料 + 账号安全：编辑姓名/邮箱、更换头像、修改密码 | `ProfileTab.tsx` + `SecurityTab.tsx` | 1天 |
| **Phase 3** | 套餐订阅 + Token 管理：展示/升级套餐、余额查询、Token 购买 | `SubscriptionTab.tsx` + `TokenTab.tsx` | 1-2天 |
| **Phase 4** | API 密钥管理：列表/新增/编辑/删除密钥 | `ApiKeysTab.tsx` | 1天 |
| **Phase 5** | 云数据管理：商城概览、同步状态、订单数据、外部集成 | `CloudDataTab.tsx` + 子页面 | 2天 |
| **Phase 6** | 测试与上线：E2E 测试、数据验证、性能优化 | 测试用例 + 修复 | 1天 |

---

## 9. 相关文件索引

### 当前文件（需修改）

| 文件 | 修改内容 |
|------|---------|
| `marketing-site/src/App.tsx` | 新增 `/user/*` 路由组 |
| `marketing-site/src/pages/UserDashboard.tsx` | 改造为用户中心首页/仪表板 |
| `marketing-site/src/lib/authStore.ts` | 新增 `userSubscriptions` 等状态（可选） |

### 新增文件

| 文件 | 说明 |
|------|------|
| `marketing-site/src/pages/UserCenterPage.tsx` | 用户中心主页面（Tabs 框架） |
| `marketing-site/src/pages/user/ProfileTab.tsx` | 个人资料 |
| `marketing-site/src/pages/user/SecurityTab.tsx` | 账号安全 |
| `marketing-site/src/pages/user/SubscriptionTab.tsx` | 套餐订阅 |
| `marketing-site/src/pages/user/ApiKeysTab.tsx` | API 密钥管理 |
| `marketing-site/src/pages/user/TokenTab.tsx` | Token 管理 |
| `marketing-site/src/pages/user/CloudDataTab.tsx` | 云数据管理 |
| `marketing-site/src/pages/user/CloudOrders.tsx` | 云商城订单管理 |
| `marketing-site/src/pages/user/CloudSync.tsx` | 数据同步管理 |

### 依赖的数据库

| 文件 | 说明 |
|------|------|
| `marketing-site/database/schema.sql` | 基础用户表（profiles, api_keys, token_* 等） |
| `database/complete_schema.sql` | 完整 schema（含云商城表） |
| `docs/需求文档：ProClaw 云托管商城（PRD v5.0）.md` | 云商城数据模型和 API 设计 |

---

## 10. 与桌面端用户中心的关系

| 维度 | 桌面端用户中心 (PRD v5.1) | 营销网站用户中心 (本 PRD) |
|------|--------------------------|--------------------------|
| **技术栈** | React + MUI + Tauri invoke | React + Tailwind CSS + Supabase |
| **用户类型** | 桌面端商户（进销存使用者） | 云平台用户（API/Token/商城使用者） |
| **认证方式** | 本地 SQLite + 模拟账号 | Supabase Auth |
| **个人资料** | 对接本地 `user_commands.rs` | 对接 Supabase `profiles` 表 |
| **套餐订阅** | 桌面端产品套餐 | 云商城套餐（4 档） |
| **设备管理** | 桌面端设备配对 | ❌ 不需要 |
| **云数据管理** | ❌ 不需要 | ✅ 核心差异模块 |
| **API 密钥管理** | ❌ 不需要 | ✅ 云平台特有 |
| **Token 管理** | 本地 Token 用量 | 云平台 Token 余额+购买 |

> 两个用户中心**数据独立、功能互补**，共同构成 ProClaw 完整的用户自助服务体系。
