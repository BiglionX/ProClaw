# 需求文档：ProClaw 用户中心（PRD v5.1）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | ✅ 已实现 v1.0+ (2026-06-08) |
| **首次落地版本** | v1.0.0 (2026-06-08) |
| **关联发布** | [RELEASE_NOTES_v1.0.0.md](../../RELEASE_NOTES_v1.0.0.md) §"双模式架构" |
| **覆盖率** | ~90%（个人资料/安全/设备/订阅全 Tab 均落地；通知偏好 P2 留有简化） |
| **代码入口** | `src/pages/UserCenterPage.tsx`（811 行）、`src/pages/DevicePairingPage.tsx`、`src-tauri/src/user_commands.rs`、`src-tauri/src/commands/setup.rs` |
| **数据库依赖** | `database/complete_schema.sql`（users/login_logs/user_sessions） |
| **测试覆盖** | `e2e/invitation.spec.ts`、`src/lib/authStore.test.ts` |
| **差异与遗留** | 桌面端用户中心主要模块全部就位；移动端 `ProfileScreen.tsx` 采用独立实现但数据结构一致 |
| **后续动作** | 维持现状；通知偏好 Tab 可后续增强 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-08 | ✅ 已实现 v1.0+ | v1.0.0 发布，个人资料/安全/设备/订阅全 Tab 上线 |
| 2026-06-16 | ✅ 已实现 v1.0+ | 文档整理：添加实施状态区块 |

---

> **版本**: v5.1  
> **更新日期**: 2026-05-29  
> **状态**: 草案  
> **关联 PRD**: v4.0（核心系统）、v4.2（外部伙伴邀请）、v4.3（员工邀请）、v6.0（虚拟公司版）

---

## 1. 背景与现状

### 1.1 当前用户相关功能分布

ProClaw 经过多个迭代版本，用户相关功能已散布在系统的多个位置，缺乏统一入口和管理体验：

| 功能模块 | 位置 | 现状 |
|---------|------|------|
| **登录/注册** | `src/pages/LoginPage.tsx`, `RegisterPage.tsx` | 独立页面，支持模拟账号和 Supabase 认证 |
| **用户信息展示** | `TopBar.tsx` | 仅展示用户名首字母头像和邮箱前缀 |
| **套餐/订阅管理** | `UserCenterPage.tsx` | **误称为"用户中心"**，实际仅为套餐/Token/账单管理 |
| **用户管理（管理员）** | `UserManagementPage.tsx` | 使用模拟数据，未对接后端 |
| **设备配对** | `DevicePairingPage.tsx` | 独立页面，有二维码配对和设备列表管理 |
| **修改密码** | 后端 `user_commands.rs` 已实现 | **前端无对应 UI 入口** |
| **修改个人资料** | 后端 `update_user_cmd` 已实现 | **前端无对应 UI 入口** |

### 1.2 存在的问题

1. **入口分散** — 个人设置、设备管理、套餐订阅分布在各自页面，用户需在不同地方操作
2. **命名误导** — "用户中心"实际只是套餐管理，容易让用户困惑
3. **功能缺失** — 无个人资料编辑、无密码修改界面、无登录日志查看
4. **路径过深** — 当前用户中心藏在设置页的 Tab 中，侧边栏无直达入口
5. **用户体验割裂** — TopBar 显示用户信息但不可点击进入个人中心

---

## 2. 目标

### 2.1 产品目标

构建一个**统一的用户中心**，将个人资料管理、账号安全、设备管理、套餐订阅等模块集成到单一入口，提升用户自助管理能力。

### 2.2 设计原则

- **统一入口** — 侧边栏直达 + TopBar 用户头像可点击
- **渐进式整合** — 优先补齐核心缺失功能，后续逐步增强
- **接口复用** — 对接已有的后端命令，避免重复开发
- **离线友好** — 核心操作（改资料、修改密码）支持本地 SQLite 优先

---

## 3. 功能需求

### 3.1 个人资料（Profile）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **基本信息展示** | 显示用户头像、姓名、手机号、邮箱、用户类型、角色、注册时间 | P0 |
| **编辑姓名** | 修改用户显示名称 | P0 |
| **编辑手机号** | 修改绑定手机号 | P1 |
| **编辑邮箱** | 修改绑定邮箱 | P1 |
| **用户头像** | 支持上传/更换头像（本地存储或 Gravatar） | P2 |
| **角色/权限展示** | 只读展示当前用户角色及其权限列表 | P1 |

**后端接口**:
- `get_current_user_cmd` — 获取当前用户信息（已有）
- `update_user_cmd` — 更新用户资料（已有）

### 3.2 账号安全（Security）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **修改密码** | 输入旧密码 + 新密码 + 确认新密码，调用后端哈希存储 | P0 |
| **登录日志** | 查看最近登录记录（时间、IP、设备类型、地点） | P1 |
| **会话管理** | 查看当前活跃会话，支持远程注销其他会话 | P2 |

**后端接口**:
- `change_user_password_cmd` — 修改密码（已有）
- 需新增 `get_login_history_cmd` — 获取登录日志
- 需新增 `list_sessions_cmd` / `revoke_session_cmd` — 会话管理

### 3.3 设备管理（Devices）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **已授权设备列表** | 显示已配对设备（名称、类型、在线状态、最后活跃时间） | P0 |
| **踢除设备** | 解除指定设备的授权 | P0 |
| **生成配对码** | 生成二维码和配对码，供移动端连接 | P1 |
| **设备在线状态** | 实时或准实时显示设备在线/离线状态 | P1 |
| **设备重命名** | 允许用户自定义设备名称 | P2 |

> 注：此功能从现有 `DevicePairingPage` 迁移整合。

**后端接口**:
- `get_pairing_code_cmd` — 生成配对码（需新增）
- `list_devices_cmd` — 获取设备列表（需新增）
- `revoke_device_cmd` — 踢除设备（需新增）

### 3.4 套餐订阅（Subscription）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **当前套餐概览** | 显示套餐名称、到期时间、Token 配额/用量 | P0 |
| **Token 用量进度** | 可视化进度条，超 80% 告警 | P0 |
| **可选套餐列表** | 展示可升级套餐及价格（月付/年付） | P0 |
| **升级/降级套餐** | 订阅确认弹窗，模拟支付流程 | P0 |
| **取消订阅** | 当前周期结束后降级为免费版 | P1 |
| **用量明细** | Token 消耗记录列表（时间、类型、数量） | P0 |
| **账单记录** | 发票列表（金额、状态、支付方式） | P1 |

> 注：此模块即为当前 `UserCenterPage` 的全部功能，直接迁移保留。

**后端接口**:
- `get_plans_cmd`, `get_my_subscription_cmd`, `get_token_summary_cmd`（已有）
- `get_token_usage_cmd`, `get_invoices_cmd`（已有）
- `subscribe_plan_cmd`, `cancel_subscription_cmd`（已有）

### 3.5 通知偏好（Notifications）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **通知开关** | 开启/关闭系统通知、AI 提醒、更新通知等 | P2 |
| **通知方式** | 选择通知渠道：站内消息、邮件（需绑定邮箱）、桌面通知 | P2 |

**后端接口**:
- 需新增 `get_notification_prefs_cmd` / `update_notification_prefs_cmd`

---

## 4. 页面结构

### 4.1 导航入口

```
侧边栏          → 新增"用户中心"导航项（在 AI claw 下方）
TopBar 头像     → 点击弹出下拉菜单：进入用户中心 | 退出登录
设置页 Tab      → 移除原"用户中心"Tab，保留"AI 模型设置"等其他 Tab
```

### 4.2 用户中心页面布局

```
┌─────────────────────────────────────────────────────┐
│  ← 用户中心                              [刷新]     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────────┐│
│  │     用户头像        │ │  用户名 / 邮箱 / 角色     ││
│  │     [更换头像]      │ │  注册时间 / 用户类型      ││
│  └─────────────────────┘ └─────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  [个人资料] [账号安全] [设备管理] [套餐订阅] [通知]   │  ← Tabs
├─────────────────────────────────────────────────────┤
│                                                       │
│  每个 Tab 对应一个子模块内容                           │
│                                                       │
│  Tab 0: 个人资料                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  姓名: [________]  [保存]                      │ │
│  │  手机: [________]  [保存]                      │ │
│  │  邮箱: [________]  [保存]                      │ │
│  │  角色: 管理员                                  │ │
│  │  权限: [采购管理] [销售管理] [库存管理] [...]   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Tab 1: 账号安全                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  修改密码: [旧密码] [新密码] [确认密码] [修改] │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  登录日志:                                      │ │
│  │  [2026-05-29 10:30] [桌面端] [192.168.1.2] ✓   │ │
│  │  [2026-05-28 22:15] [移动端] [10.0.0.5]   ✓   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Tab 2: 设备管理                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [生成配对码]  [刷新]                           │ │
│  │  二维码区域 + 配对码 + 剩余时间 + 网络信息      │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  已授权设备:                                    │ │
│  │  [我的iPhone] [移动端] [在线] [最后活跃...] [踢除]│ │
│  │  [办公室电脑] [桌面端] [离线] [最后活跃...] [踢除]│ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Tab 3: 套餐订阅                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [当前套餐] [Token用量] [配额] [本月已用]        │ │
│  │  用量进度条 (80% 警告)                          │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  可选套餐卡片 [升级]                            │ │
│  │  用量明细 Tab / 账单 Tab                        │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 4.3 路由设计

```
/ucenter              → 用户中心（默认 Tab 0: 个人资料）
/ucenter/profile      → 个人资料
/ucenter/security     → 账号安全
/ucenter/devices      → 设备管理
/ucenter/subscription → 套餐订阅
/ucenter/notifications → 通知偏好
```

---

## 5. 数据模型

### 5.1 新增数据库表（SQLite）

```sql
-- 登录日志表
CREATE TABLE login_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    login_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    device_type TEXT,           -- 'desktop' | 'mobile' | 'web'
    user_agent TEXT,
    location TEXT,
    success INTEGER NOT NULL DEFAULT 1  -- 0: 失败, 1: 成功
);

-- 用户会话表
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_revoked INTEGER NOT NULL DEFAULT 0
);

-- 通知偏好表
CREATE TABLE notification_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    system_notifications INTEGER NOT NULL DEFAULT 1,
    ai_reminders INTEGER NOT NULL DEFAULT 1,
    update_notifications INTEGER NOT NULL DEFAULT 1,
    email_notifications INTEGER NOT NULL DEFAULT 0,
    desktop_notifications INTEGER NOT NULL DEFAULT 1
);
```

### 5.2 用户表现有字段（供参考）

来自 `users` 表现有字段：
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | UUID 主键 |
| name | TEXT | 用户姓名 |
| phone | TEXT | 手机号 |
| email | TEXT | 邮箱 |
| user_type | TEXT | 'internal' / 'external' |
| external_type | TEXT | 'customer' / 'supplier' / 'both' |
| password_hash | TEXT | Argon2 哈希密码 |
| is_active | INTEGER | 是否激活 |
| created_at | TEXT | 创建时间 |
| last_login_at | TEXT | 最后登录时间 |
| updated_at | TEXT | 更新时间 |

---

## 6. 接口清单

### 6.1 已有接口（直接复用）

| 命令 | 位置 | 用途 |
|------|------|------|
| `get_current_user_cmd` | user_commands.rs:288 | 获取当前用户信息 |
| `update_user_cmd` | user_commands.rs:152 | 更新用户资料 |
| `change_user_password_cmd` | user_commands.rs:243 | 修改密码 |
| `get_plans_cmd` | 订阅相关 | 获取套餐列表 |
| `get_my_subscription_cmd` | 订阅相关 | 获取当前订阅 |
| `get_token_summary_cmd` | 订阅相关 | 获取 Token 摘要 |
| `get_token_usage_cmd` | 订阅相关 | 获取用量记录 |
| `get_invoices_cmd` | 订阅相关 | 获取账单 |
| `subscribe_plan_cmd` | 订阅相关 | 订阅套餐 |
| `cancel_subscription_cmd` | 订阅相关 | 取消订阅 |

### 6.2 需新增接口

| 命令 | 位置 | 用途 | 优先级 |
|------|------|------|--------|
| `get_login_history_cmd` | user_commands.rs | 获取登录日志 | P1 |
| `list_devices_cmd` | 设备管理 | 获取已授权设备列表 | P0 |
| `revoke_device_cmd` | 设备管理 | 踢除设备 | P0 |
| `get_pairing_code_cmd` | 设备管理 | 生成配对码 | P1 |
| `rename_device_cmd` | 设备管理 | 重命名设备 | P2 |
| `get_notification_prefs_cmd` | 通知设置 | 获取通知偏好 | P2 |
| `update_notification_prefs_cmd` | 通知设置 | 更新通知偏好 | P2 |

---

## 7. 非功能需求

### 7.1 安全

- 修改密码需验证旧密码（后端已有 Argon2 哈希验证）
- 用户资料修改需鉴权，仅本人或管理员可操作
- 登录日志记录登录尝试（包括失败尝试）
- 会话管理支持强制注销其他设备

### 7.2 性能

- 用户中心各 Tab 数据按需加载，互不阻塞
- 设备配对码自动 5 分钟过期，过期自动刷新
- Token 用量数据缓存 60 秒，避免频繁查询

### 7.3 离线支持

- 个人资料编辑优先写入本地 SQLite，云端同步为可选
- 修改密码完全本地操作
- 设备管理依赖局域网通信，云端同步为非必需

### 7.4 兼容性

- 桌面端（Tauri）首次加载用户中心时，若后端无用户数据则自动初始化 boss 账号
- 营销网站用户中心与桌面端用户中心数据结构保持一致
- 移动端 `ProfileScreen.tsx` 后续可复用同一数据模型

---

## 8. 实施路线

| 阶段 | 内容 | 交付件 | 估算 |
|------|------|--------|------|
| **Phase 1** | 重构导航结构：新增侧边栏"用户中心"入口、TopBar 头像下拉菜单；搭建页面框架（Tabs 布局） | `Sidebar.tsx`修改 + `TopBar.tsx`修改 + 新建 `UserCenterPage.tsx`（替换原文件） | 1-2天 |
| **Phase 2** | 实现个人资料展示与编辑、修改密码功能 | 前端表单 + 对接后端命令 | 1天 |
| **Phase 3** | 实现设备管理模块集成（从 `DevicePairingPage` 迁移） | 前端组件迁移 + 新增后端接口 | 1天 |
| **Phase 4** | 实现登录日志与会话管理 | 新增前端 + 后端 | 1-2天 |
| **Phase 5** | 将现有套餐/订阅模块迁移到 Tab 3 | 内容迁移 + 样式统一 | 0.5天 |
| **Phase 6** | 通知偏好、头像上传等增强功能 | 低优先级，按需排期 | 2天 |

---

## 9. 相关文件索引

### 前端
- `src/pages/UserCenterPage.tsx` — 用户中心页面（当前为套餐管理，需重写）
- `src/pages/DevicePairingPage.tsx` — 设备配对页面（需迁移整合）
- `src/pages/SettingsPage.tsx` — 设置页面（需移除用户中心 Tab）
- `src/components/Layout/Sidebar.tsx` — 侧边栏（需新增用户中心入口）
- `src/components/Layout/TopBar.tsx` — 顶部栏（头像需改为可点击）
- `src/lib/authStore.ts` — 认证状态管理
- `src/components/Settings/*` — 设置相关组件

### 后端
- `src-tauri/src/user_commands.rs` — 用户管理命令（已有完整 CRUD）
- `src-tauri/src/database.rs` — 数据库初始化
- `src-tauri/src/api/auth.rs` — 认证 API（登录/注册/密码哈希）
- `src-tauri/src/api/websocket.rs` — WebSocket 连接管理

### 配置
- `src/config/appMode.ts` — 功能开关
- `database/complete_schema.sql` — 数据库完整 schema

### 测试
- `src/lib/authStore.test.ts` — 认证状态测试
- `e2e/login.spec.ts` — 登录端到端测试
- `e2e/invitation.spec.ts` — 邀请功能测试
