# 需求文档：ProClaw 桌面端离线优先模式与本地账号体系（PRD v13.0）

## 实施状态

| 字段 | 值 |
|---|---|
| **状态标签** | 🟡 草案（2026-06-26） |
| **首次落地版本** | v1.1.0（待排期，参见第 14 章开放问题） |
| **关联发布** | 暂无（草案阶段） |
| **覆盖率** | 0%（仅需求文档，不含代码） |
| **代码入口** | 草案：TBD（实施时落地到 `src/components/Auth/RequireUpgrade.tsx`、`src/components/Layout/AppLayout.tsx` 侧边栏底部账号区、`src/pages/SettingsPage.tsx` 新增「账号」Tab、`src/lib/authStore.ts` 会话存储升级为 Tauri Keyring） |
| **数据库依赖** | 草案 SQL：`database/migrations/00_add_owner_id_default_offline.sql`（v13.1 实施时落盘） |
| **测试覆盖** | 草案：`e2e/offline-mode.spec.ts`（v13.1 实施时新增） |
| **差异与遗留** | 本次仅完成需求文档；代码实施另起 v13.1 子任务 |
| **后续动作** | 评审通过后：① 拆解 v13.1 实施任务 ② 起草迁移 SQL 脚本 ③ 设计本地账号 Keyring 方案 |

### 状态变更日志

| 日期 | 状态 | 变更人/触发事件 |
|---|---|---|
| 2026-06-26 | 🟡 草案 | 首次创建；响应用户「无登录状态依旧可以使用，登录窗口改为收缩到设置」需求 |

---

## 1. 背景与目标

### 1.1 现状问题

当前 ProClaw 桌面端所有受保护路由（`PROTECTED_ROUTES` 列表，约 50 项）均被 `ProtectedRoute` 包裹，未登录时执行如下流程（[src/config/routes.tsx](file:///d:/BigLionX/ProClaw/src/config/routes.tsx#L21-L41)）：

```ts
React.useEffect(() => {
  if (!user) {
    const timer = setTimeout(() => openLoginDialog(), 100);
    return () => clearTimeout(timer);
  }
}, [user, openLoginDialog]);
```

`openLoginDialog()` 触发 [LoginDialog](file:///d:/BigLionX/ProClaw/src/components/Auth/LoginDialog.tsx) 全屏对话框弹出，用户必须先完成邮箱密码登录或 OIDC 跳转才能进入主界面。这带来三个问题：

1. **获客损耗**：小微商户首次安装看到登录弹窗，常误判为「需要注册才能用」而放弃。
2. **离线能力浪费**：项目本身已基于 Tauri 2 + 本地 SQLite，所有核心数据均离线可写，登录仅是云端能力凭证，不应成为使用门槛。
3. **会话脆弱**：当前用 `sessionStorage` 持久化（[src/lib/authStore.ts](file:///d:/BigLionX/ProClaw/src/lib/authStore.ts#L37-L53)），关窗即丢，体验差。

### 1.2 目标

把桌面端改造为 **「离线优先 + 登录可选增值」**：

- **G1**：用户下载安装后，首次启动直接进入主界面，零登录门槛。
- **G2**：所有原本在登录态可用的本地数据功能（商品/销售/库存/客户/媒体库/AI 助手本地回退），离线访客身份即可完整使用。
- **G3**：登录入口从首屏强弹窗收缩到「侧边栏底部账号区 + 设置中心账号 Tab」。
- **G4**：登录后 = 增值能力（云备份、AI Team 群聊、Token 计费、营销站绑定、多端同步），不改变离线已能用的功能。
- **G5**：明确功能限制矩阵，对受限于云端能力的功能给中性引导文案而非错误提示。

### 1.3 非目标

- 不替代现有 Light/Plus 双模式架构。
- 不修改云端订阅、Token 计费、OIDC 业务逻辑。
- 不引入新的前端框架或重写路由。
- 不在本次实现代码（仅写需求文档）。

---

## 2. 术语与角色定义

| 术语 | 定义 | 数据归属 |
|---|---|---|
| **离线访客（Offline Guest）** | 首次启动、从未登录过的默认身份 | 本地 SQLite，`owner_id = 'offline-guest'` |
| **本地账号（Local Account）** | 桌面端独占的本地凭证（用户名+bcrypt密码），不依赖云端 | 本地 SQLite `local_accounts` 表，token 存 Tauri Keyring |
| **增值账号（Premium Account）** | 通过 OIDC/Supabase 登录的云端账号 | 本地数据 + 云端数据（云端走 `cloud_id` 隔离） |
| **演示账号（Demo Account）** | 现有 `boss` / `IamBigBoss` 演示入口 | 演示数据 + 自动注入 |

**关键区分**：
- 本地账号 ≠ 增值账号。本地账号是单台电脑上的「数据隔离单元」；增值账号是云端订阅凭证。
- 一个用户可以同时拥有「本地账号」和「增值账号」：先用本地账号在本地写数据，再升级为增值账号解锁云端能力。

---

## 3. 核心原则

| # | 原则 | 落地约束 |
|---|---|---|
| **P1** | 离线 = 一等公民 | `ProtectedRoute` 改造为 `OfflineAllowedRoute`；首次启动零弹窗 |
| **P2** | 登录不刷新状态 | 登录成功仅更新 `useAuthStore.user`；不卸载/重载任何页面；数据视图无需重新拉取 |
| **P3** | 能力透明 | 离线访客在「增值能力」入口看到的是「升级」按钮 + 中性引导文案，非错误/禁用 |
| **P4** | 数据零丢失 | 登录/退出/切换本地账号均不删除任何本地数据；最坏情况是归档为 `archive-{timestamp}.db` |
| **P5** | 演示账号保留 | 现有 `boss` / `IamBigBoss` 路径不变，作为「离线 → 演示数据」快捷入口 |
| **P6** | 渐进式升级 | 离线 → 本地账号 → 增值账号 是单向引导链；不允许反向降级（即增值账号不能「退出登录到离线访客」并保留云端数据） |

---

## 4. 功能矩阵

按 8 大类、约 60 个功能点逐项标注。「可用」= 完整功能；「仅本地」= 不可云同步；「拦截」= 点击触发 `RequireUpgrade` 引导登录；「灰显」= 入口可见但功能禁用。

### 4.1 进销存核心（6 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 商品 CRUD（名称/价格/库存/图片/分类） | ✅ | ✅ | ✅ | ✅ |
| SPU/SKU 电商模式 | ✅ | ✅ | ✅ | ✅ |
| 销售单 CRUD | ✅ | ✅ | ✅ | ✅ |
| 库存流水查询 | ✅ | ✅ | ✅ | ✅ |
| 库存预警（阈值标红） | ✅ | ✅ | ✅ | ✅ |
| 扫码枪添加商品 | ✅ | ✅ | ✅ | ✅ |

### 4.2 客户与销售（4 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 客户管理（合并多平台订单） | ✅ | ✅ | ✅ | ✅ |
| 联系人/消息/聊天 | ✅（仅本地） | ✅（仅本地） | ✅（+云端同步） | ✅ |
| 语音播报（新订单朗读） | ✅ | ✅ | ✅ | ✅ |
| 热敏小票打印 | ✅ | ✅ | ✅ | ✅ |

### 4.3 财务与报表（5 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 收入/支出记录 | ✅ | ✅ | ✅ | ✅ |
| 应付/应收台账 | ✅ | ✅ | ✅ | ✅ |
| 完整财务报表 | ✅ | ✅ | ✅ | ✅ |
| 跨店数据汇总 | ❌ 灰显 | ❌ 灰显 | ✅ | ❌ |
| 集团多店视图 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |

### 4.4 媒体与 AI（8 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 媒体库（图片/视频上传） | ✅（仅本地） | ✅（仅本地） | ✅（+云端同步） | ✅ |
| 媒体库分类/标签 | ✅ | ✅ | ✅ | ✅ |
| 问答库 CRUD | ✅ | ✅ | ✅ | ✅ |
| 资料库（PDF/Word/Excel） | ✅ | ✅ | ✅ | ✅ |
| AI 助手（悬浮球） | ✅（本地规则回退） | ✅（本地规则回退） | ✅（云端 LLM） | ✅（演示 token） |
| AI Team 群聊 | ❌ 拦截 | ❌ 拦截 | ✅ | ✅（演示） |
| 数据导入（xlsx/csv/json） | ✅（仅本地） | ✅（仅本地） | ✅ | ✅ |
| 数据导出/备份（本地） | ✅ | ✅ | ✅ | ✅ |

### 4.5 云端增值（4 项，必须登录）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 云备份（Supabase Storage） | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| 多端同步（多电脑/移动端） | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| Token 计费 / 充值 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| 营销站 / 用户中心（proclaw.cc） | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |

### 4.6 协作与权限（5 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 单机使用（当前电脑） | ✅ | ✅ | ✅ | ✅ |
| 本地多账号切换 | ❌ | ✅ | ✅ | ❌ |
| 员工邀请 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| 外部伙伴邀请 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| 5 角色权限矩阵 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |

### 4.7 行业插件（3 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| 4 大已上线行业（餐饮/美业/宠物/Cloud） | ✅ | ✅ | ✅ | ✅ |
| 8 大行业插件商店 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |
| FlowHub 第三方插件 | ❌ 拦截 | ❌ 拦截 | ✅ | ❌ |

### 4.8 系统设置（5 项）

| 功能模块 | 离线访客 | 本地账号 | 增值账号 | 演示账号 |
|---|---|---|---|---|
| AI 模型设置 | ✅ | ✅ | ✅ | ✅ |
| 数据库设置 | ✅ | ✅ | ✅ | ✅ |
| 自动更新 | ✅ | ✅ | ✅ | ✅ |
| 通知中心 | ✅ | ✅ | ✅ | ✅ |
| **设置中心「账号」Tab** | ✅ | ✅ | ✅ | ✅ |

---

## 5. 入口与导航改造

### 5.1 侧边栏底部账号区（新增）

**位置**：[src/components/Layout/AppLayout.tsx](file:///d:/BigLionX/ProClaw/src/components/Layout/AppLayout.tsx) 侧边栏 `<Sidebar>` 组件最底部，永远可见，不随路由切换消失。

**三态视觉**（PRD 中以文字描述，v13.1 实施时附视觉稿）：

| 状态 | 视觉元素 | 点击行为 |
|---|---|---|
| **离线访客** | 灰色默认头像 + 文字「未登录」+ 🔓 图标 | 跳 `/settings?tab=account` 并自动滚动到登录框 |
| **本地账号** | 彩色头像（取用户名 hash 颜色）+ 用户名 + ⚙️ 齿轮图标 | 展开下拉菜单：账号设置 / 切换账号 / 退出本地账号 |
| **增值账号** | 彩色头像 + 彩色徽章「云」+ 用户名 + ⚙️ 齿轮 | 展开下拉菜单：账号设置 / 切换账号 / 退出增值 / 管理云端订阅 |

**状态判定逻辑**（草案）：

```ts
type IdentityState = 'offline' | 'local' | 'premium';
function resolveIdentity(user: User | null, localAccount: LocalAccount | null): IdentityState {
  if (user && isPremiumUser(user)) return 'premium';
  if (localAccount) return 'local';
  return 'offline';
}
```

### 5.2 设置中心「账号」Tab（新增）

**位置**：在 [src/pages/SettingsPage.tsx](file:///d:/BigLionX/ProClaw/src/pages/SettingsPage.tsx#L166-L183) 现有 7 个 Tab 之后追加，索引为 7。Tabs 数组片段（草案）：

```tsx
<Tab label="👤 账号" {...a11yProps(7)} />
```

**6 个子区**（垂直排布，PRD 第 8 章「UI/UX 详细规范」详述）：

1. **当前身份卡片**（顶置）：头像 / 用户名 / 角色 / 状态徽章（离线访客/本地账号/增值账号/演示账号）。
2. **登录框**：
   - 邮箱密码（Supabase 模式）
   - OIDC 跳转按钮（保留现有流程）
   - 本地账号登录切换按钮（展开/折叠子表单）
3. **本地账号管理**：创建新本地账号 / 切换已有本地账号 / 删除本地账号（删除前需输入密码二次确认）。
4. **数据归属迁移**：仅在「离线访客 → 增值账号」首次升级时显示，详见第 7 章。
5. **会话设置**：「记住登录 7 天」开关（默认开）/「退出时清除本地演示数据」开关。
6. **关于离线模式**：一段约 200 字的说明 + 指向官方文档 `docs/features/offline-mode.md`（v13.1 新建）的链接。

### 5.3 顶栏「解锁云端能力」胶囊按钮（条件渲染）

**触发条件**（同时满足）：
- `identityState === 'offline'`
- 当前路由属于「云端增值」类（云备份、AI Team 群聊、Token 计费、营销站入口、多端同步入口）

**视觉**：灰底 + 黄色文字 + 右上角小角标 `Beta`（仅 v13.1 标记，下个版本移除）。

**点击行为**：弹拦截对话框 `RequireUpgrade`（见第 6 章），「立即升级」按钮跳 `/settings?tab=account`。

**实现位置**：[src/components/Layout/AppLayout.tsx](file:///d:/BigLionX/ProClaw/src/components/Layout/AppLayout.tsx) 顶栏 `TopBar` 组件右侧 actions 槽位。

---

## 6. 增值能力拦截组件

### 6.1 新增组件

**路径**：`src/components/Auth/RequireUpgrade.tsx`（v13.1 实施时创建）

**Props**：

```ts
interface RequireUpgradeProps {
  feature: 'cloud-backup' | 'ai-team' | 'token' | 'marketing' | 'sync' | 'invitation' | 'plugin-store';
  children: React.ReactNode;          // 受保护内容
  fallbackVariant?: 'dialog' | 'inline' | 'redirect';  // 默认 'dialog'
}
```

### 6.2 拦截文案（每个 feature 独立，避免「禁止」措辞）

| feature | 标题 | 副标题 | 升级按钮文案 |
|---|---|---|---|
| `cloud-backup` | 解锁云端备份 | 把本地数据安全同步到云端，电脑损坏也不怕丢失 | 立即升级 |
| `ai-team` | 解锁 AI Team 群聊 | 与多个 AI Agent 协作，自动运营你的生意 | 立即升级 |
| `token` | 解锁 Token 计费 | 充值 Token，按量使用高级 AI 能力 | 立即升级 |
| `marketing` | 同步到营销网站 | 把商品/活动一键发布到 proclaw.cc 个人主页 | 立即升级 |
| `sync` | 开启多端同步 | 手机/平板/电脑共享数据，随时随地办公 | 立即升级 |
| `invitation` | 邀请员工/伙伴 | 给团队成员开通账号，分配权限 | 立即升级 |
| `plugin-store` | 浏览插件商店 | 8 大行业插件 + 第三方 FlowHub 插件 | 立即升级 |

**通用说明**（对话框底部固定文字）：

> 升级后所有现有数据 100% 保留，你可以随时退出增值账号回到本地使用。

### 6.3 行为规范

- `fallbackVariant='dialog'`：弹模态对话框（默认）。
- `fallbackVariant='inline'`：在受保护位置上方渲染横幅提示，保留 children 但置灰（用于「部分功能仍可用」场景，如 AI Team 群聊入口可看列表但不能发消息）。
- `fallbackVariant='redirect'`：直接 `navigate('/settings?tab=account')`，不弹任何 UI（用于「硬拦截」场景）。

---

## 7. 离线访客的数据归属

### 7.1 数据隔离机制

**所有本地 SQLite 表**（参考 [database/complete_schema.sql](file:///d:/BigLionX/ProClaw/database/complete_schema.sql)）增加 `owner_id` 列，草案迁移脚本（v13.1 实施时落盘到 `database/migrations/00_add_owner_id_default_offline.sql`）：

```sql
-- 草案：v13.1 实施时执行
-- 1. 给所有业务表添加 owner_id 列（默认值 'offline-guest'）
ALTER TABLE products ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE sales_orders ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE customers ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
ALTER TABLE media_assets ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'offline-guest';
-- ... 其余表同理
-- 2. 创建 owner_id 索引
CREATE INDEX idx_products_owner ON products(owner_id);
CREATE INDEX idx_sales_orders_owner ON sales_orders(owner_id);
-- ... 其余表同理
```

**Store 层封装**：所有查询在 store 层自动注入 `WHERE owner_id = ?`，业务代码不感知。封装点位于 [src/lib/authStore.ts](file:///d:/BigLionX/ProClaw/src/lib/authStore.ts) 新增的 `getCurrentOwnerId()` 方法（v13.1 新增）。

**关键约束**：

- 离线访客登录为增值账号时，`owner_id` **不自动改为 `{user.id}`**（避免与云端 `cloud_id` 冲突）。云端数据走另一套 `cloud_id` 隔离，本地数据保留 `owner_id = 'offline-guest'`，与云端数据互不可见。
- 「数据归属迁移」（第 8 章）是一次性可选操作，用户主动触发后才将本地数据上传到云端。

### 7.2 多本地账号切换的数据隔离

**场景**：在同一台电脑上，老板和员工用不同本地账号登录，期望数据完全隔离。

**方案**（v13.1 实施）：

- 新增 `local_accounts` 表：`id`、`username`、`password_hash`、`display_name`、`created_at`、`last_active_at`。
- `owner_id` 改为 `{local_account_id}` 而非 `'offline-guest'`（仅本地账号登录后生效）。
- 离线访客身份的 `owner_id` 仍为 `'offline-guest'`，与本地账号数据完全隔离。
- 切换本地账号 = `owner_id` 切换 = 数据视图切换，无须重新加载页面（store 层响应式）。

**不在本次实现**：文件级 SQLite 隔离（每个账号一个 .db 文件），v13.x 后续评估。

---

## 8. 数据迁移与首次升级

### 8.1 触发条件

仅当以下条件同时满足时触发「数据归属迁移」对话框：

- 用户身份从 `offline` 升级为 `premium`（首次登录 OIDC/Supabase 成功）。
- 本地数据库非空（`products` 或 `sales_orders` 或 `customers` 表至少 1 条记录）。

### 8.2 三个选项

| 选项 | 行为 | 可逆性 |
|---|---|---|
| **保留本地数据并绑定云端** | 1. 本地数据 `owner_id` 改为 `{user.id}`<br>2. 触发云备份流程（[云备份 PRD v8.0](file:///d:/BigLionX/ProClaw/docs/prd/cloud-store/需求文档：ProClaw%20云托管商城%20Token%20计费模式改造（PRD%20v8.0）.md)）<br>3. 上传完成后显示「云端已有 X 条商品、Y 条订单」 | 不可逆（云端数据创建后需走「删除云端数据」流程） |
| **全新云端数据** | 1. 本地数据库备份为 `archive-{timestamp}.db` 存到 `%APPDATA%/ProClaw/archive/`<br>2. 本地数据库清空<br>3. 云端拉取空白 | 可逆（从 archive 恢复） |
| **稍后再说** | 1. 保留 `offline` 身份<br>2. 72h 后再次触发对话框（最多提醒 3 次） | 完全可逆 |

### 8.3 进度与回滚

- 进度条分 4 步：① 备份本地 → ② 上传到云端 → ③ 校验数据完整性 → ④ 切换 owner_id。
- 任意一步失败：回滚到 `offline` 身份，弹错误对话框 + 错误报告下载按钮（沿用 [v1.0 导入功能错误报告规范](file:///d:/BigLionX/ProClaw/docs/prd/plugins-supply-chain/DATA_IMPORT_PRD_v1.0.md)）。
- 上传过程中断网：保留本地数据 `owner_id = 'offline-guest'`，下次联网时重试。

---

## 9. 登录态/离线态切换状态机

```
            ┌──────────────┐
            │ offline      │ ← 首次启动
            │ (默认)       │
            └──────┬───────┘
                   │ 登录 OIDC/Supabase
                   │ + (可选) 数据迁移
                   ▼
            ┌──────────────┐
            │ premium      │ → 解锁云端增值能力
            │ (增值账号)   │
            └──────┬───────┘
                   │ 退出登录
                   │ (保留 owner_id='offline-guest' 数据)
                   ▼
            ┌──────────────┐
            │ offline      │
            └──────────────┘

     旁路：本地账号（与上述正交）
     ┌──────────────┐  切换本地账号   ┌──────────────┐
     │ local A      │ ──────────────→ │ local B      │
     └──────────────┘                 └──────────────┘
```

**中间态**：

- `upgrading`：正在登录/迁移数据，显示全屏遮罩 + 进度条，禁止路由切换。
- `syncing`：云备份进行中，顶栏显示「云端同步中」胶囊。
- `error`：登录失败/迁移失败，弹错误对话框，状态回到 `offline`。

---

## 10. 本地账号体系

### 10.1 数据模型

```sql
-- 草案：v13.1 实施时落盘
CREATE TABLE local_accounts (
  id TEXT PRIMARY KEY,                  -- UUID v4
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- bcrypt cost=12
  display_name TEXT,
  created_at TEXT NOT NULL,
  last_active_at TEXT
);
CREATE TABLE local_sessions (
  token TEXT PRIMARY KEY,               -- 32-byte 随机
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,             -- 7 天后
  FOREIGN KEY (account_id) REFERENCES local_accounts(id)
);
```

### 10.2 凭证存储

- **密码哈希**：bcrypt cost=12 存 `local_accounts.password_hash`。
- **会话 token**：32-byte 加密随机串存 `local_sessions.token`。
- **加密密钥**：token 在落盘前用 Tauri Keyring API（`@tauri-apps/plugin-stronghold` 或 OS Keychain）加密。

### 10.3 7 天免登录

- 默认开启「记住登录 7 天」，可在设置中心关闭。
- 关闭时：会话 token 不写入持久层，进程退出即失效（保留现有 sessionStorage 行为作为兜底）。
- 开启时：会话 token 通过 Tauri Keyring 加密落盘，7 天内启动自动恢复。

### 10.4 密码忘记恢复

- 提供「重置本地数据」入口：删除当前 `local_accounts` 表 + 关联数据，**仅影响本地账号数据，不影响 `owner_id='offline-guest'` 的离线访客数据**。
- 重置前需输入「我已知晓将删除以下账号的所有数据」二次确认。

### 10.5 不依赖云端

- 本地账号体系与 Supabase/OIDC 完全独立。
- 同一台电脑可创建任意数量的本地账号；同一本地账号可在不同电脑创建（互不感知，仅本地数据隔离）。

---

## 11. UI/UX 详细规范

### 11.1 侧边栏底部账号区

| 状态 | 高度 | 头像 | 文字 | 角标 | 点击行为 |
|---|---|---|---|---|---|
| 离线访客 | 56px | 灰色默认（首字母 G） | 「未登录」+ 🔓 | — | 跳 `/settings?tab=account` |
| 本地账号 | 56px | 彩色（hash） | 用户名 | ⚙️ 齿轮 | 下拉菜单 |
| 增值账号 | 56px | 彩色（hash） | 用户名 | 彩色「云」徽章 | 下拉菜单 |
| 演示账号 | 56px | 紫红 | 「演示」+ 用户名 | 🧪 烧杯 | 下拉菜单（含「退出演示」按钮） |

**下拉菜单**（本地账号/增值账号）：

```
┌────────────────────────┐
│ 头像 + 用户名 + 角色    │
├────────────────────────┤
│ 账号设置               │ → 跳 /settings?tab=account
│ 切换账号               │ → 弹出本地账号列表
│ 退出账号               │
│ (增值) 管理云端订阅    │ → 跳营销站 proclaw.cc
└────────────────────────┘
```

### 11.2 设置中心「账号」Tab 子区视觉

**子区 1：当前身份卡片**（高 120px，圆角 12，背景色根据状态变化）：

| 状态 | 背景色 | 内容 |
|---|---|---|
| 离线访客 | 浅灰 | 灰色头像 + 「当前身份：离线访客」+ 「升级解锁云端能力」按钮 |
| 本地账号 | 浅蓝 | 彩色头像 + 「当前身份：本地账号」+ 用户名 + 创建时间 |
| 增值账号 | 浅金 | 彩色头像 + 「当前身份：增值账号」+ 用户名 + 订阅到期时间 |
| 演示账号 | 浅紫 | 紫红头像 + 「当前身份：演示账号」+ 「注入数据」按钮（仅 demo 可见） |

**子区 2：登录框**（高 280px）：

```
┌──────────────────────────────┐
│ 📧 邮箱  [_______________]   │
│ 🔒 密码  [_______________]   │
│              [   登录   ]    │
│           ─── 或 ───         │
│       [ 🔑 OIDC 统一登录 ]   │
│           ─── 或 ───         │
│       [ 👤 本地账号登录 ]    │ ← 点击展开子表单
└──────────────────────────────┘
```

**子区 3-6**：常规列表式布局，沿用现有设置中心视觉规范。

### 11.3 状态指示器颜色规范

| 状态 | 主色 | 辅助色 | 用途 |
|---|---|---|---|
| 离线访客 | #9E9E9E 灰 | #F5F5F5 浅灰 | 默认身份 |
| 本地账号 | #2196F3 蓝 | #E3F2FD 浅蓝 | 本地数据隔离 |
| 增值账号 | #FF9800 橙 | #FFF3E0 浅橙 | 云端能力 |
| 演示账号 | #9C27B0 紫 | #F3E5F5 浅紫 | 演示数据 |
| 拦截提示 | #FFC107 黄 | #FFF8E1 浅黄 | RequireUpgrade |
| 错误提示 | #F44336 红 | #FFEBEE 浅红 | 登录失败/迁移失败 |

---

## 12. 验收清单

12 条可勾选条目，v13.1 实施完成后逐条验证：

| # | 验收点 | 验证方式 | 预期 |
|---|---|---|---|
| 1 | 冷启动无需登录 | 全新安装 → 启动 → 5s 内进入主界面 | 零弹窗、零登录跳转 |
| 2 | 设置中心登录成功 | 离线访客 → 设置 → 账号 → 邮箱密码登录 | 侧边栏底部账号区状态变更为「增值账号」 |
| 3 | 退出登录保留本地数据 | 增值账号 → 退出 → 检查 products 表 | 数据完整，无任何删除 |
| 4 | 增值能力拦截并引导登录 | 离线访客 → 点击 AI Team 群聊 | 弹 RequireUpgrade 对话框，关闭后无副作用 |
| 5 | 数据迁移对话框 | 离线访客 + 本地有 5 条商品 → 登录增值账号 | 弹「数据归属迁移」对话框 |
| 6 | 本地账号创建/切换 | 设置 → 账号 → 创建本地账号 A → 写入数据 → 切换到 B → 写数据 → 切回 A | A 账号数据完整，与 B 隔离 |
| 7 | Keyring 加密 | 本地账号登录 → 关闭应用 → 7 天内重启 | 自动恢复登录态；进程外无法读 token |
| 8 | 会话 7 天免登录 | 本地账号登录后第 8 天启动 | 要求重新登录 |
| 9 | 媒体库离线写入 | 离线访客 → 上传 10 张图片 → 重启应用 | 10 张图片均可正常显示 |
| 10 | AI 助手本地回退 | 离线访客 → 打开悬浮球 → 输入「上个月销售额」 | 返回基于本地 SQLite 的查询结果，不报错 |
| 11 | E2E 测试覆盖 | 运行 `npx playwright test e2e/offline-mode.spec.ts` | 全部用例通过 |
| 12 | 构建包大小变化 | 对比 v1.0.7 与 v1.1.0 安装包 | 增量 < 200KB |

---

## 13. 风险与开放问题

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 本地账号密码忘记 | 用户无法登录本地账号，所有数据看似「丢失」 | 提供「重置本地数据」机制（第 10.4 节） |
| 多人在同一电脑用不同本地账号 | 数据隔离仅依赖 `owner_id`，误操作可能跨账号看到数据 | store 层强制注入 `WHERE owner_id = ?`；v13.x 评估文件级隔离 |
| 离线访客购买的 Token 怎么办 | 离线模式下无法充值，Token 计费功能被拦截 | 引导文案明示「Token 必须登录后才能使用」 |
| 数据迁移中断网 | 上传过程中断网，状态卡在 `upgrading` | 保留 `owner_id='offline-guest'`，下次联网重试 |
| 演示账号与本地账号冲突 | 同时存在演示账号和本地账号时优先级混乱 | 明确：演示账号是「身份类型」不是「账号」，与本地账号正交 |
| Supabase 配置缺失 | 没配 Supabase 时 `isSupabaseConfigured()=false` | 离线模式 + 本地账号 + 演示账号三个路径独立工作，不依赖 Supabase |

---

## 14. 与既有 PRD 的关系

- **不替代**：[ProClaw-Light 桌面端需求（PRD v1.0）](file:///d:/BigLionX/ProClaw/docs/prd/architecture/需求文档：ProClaw-Light%20桌面端需求.md) — Light/Plus 双模式架构不变。
- **依赖**：[ProClaw AI 网关统购分销与多模型路由（PRD v9.0）](file:///d:/BigLionX/ProClaw/docs/prd/plugins-supply-chain/需求文档：ProClaw%20AI%20网关统购分销与多模型路由（PRD%20v9.0）.md) — Token 计费/云端能力作为拦截点。
- **影响**：[ProClaw 桌面端 UI 全面升级（PRD v11.0）](file:///d:/BigLionX/ProClaw/docs/prd/plugins-supply-chain/需求文档：ProClaw%20桌面端%20UI%20全面升级（PRD%20v11.0）.md) — 侧边栏底部账号区是该 PRD 的新增区块；不在本次实现。
- **关联**：[ProClaw 用户中心（PRD v5.1）](file:///d:/BigLionX/ProClaw/docs/prd/marketing/需求文档：ProClaw%20用户中心（PRD%20v5.1）.md) — 营销站用户中心作为「增值账号」能力的云端承载。
- **关联**：[ProClaw 云托管商城 Token 计费模式改造（PRD v8.0）](file:///d:/BigLionX/ProClaw/docs/prd/cloud-store/需求文档：ProClaw%20云托管商城%20Token%20计费模式改造（PRD%20v8.0）.md) — Token 计费模式。
- **后续**：本次仅写需求文档。代码实施另起 v13.1 子任务（约 6-8 周工作量）。

---

*文档创建日期: 2026-06-26 · 维护人: 文档 Owner · 下次复核: 待 v13.1 启动前*
