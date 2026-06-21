# ProClaw 演示账号（Demo Account）完整需求规范

> **版本**: v1.0  
> **更新日期**: 2026-06-15  
> **状态**: 已确认  
> **关联 PRD**: v6.4（AI Team Token）、v5.1（桌面端用户中心）、v7.1（营销网站用户中心）

---

## 1. 概述

ProClaw 演示账号是面向新用户和销售展示场景设计的"零配置快速体验"机制。用户通过预置的账号凭据登录后，系统自动注入一套完整的业务数据包（产品、云商城、AI 团队、插件），使用户无需任何配置即可体验 ProClaw 的全部核心功能。

**设计目标**：
- 零配置门槛，一键进入完整功能体验
- 幂等的数据注入，支持反复重置
- 演示数据与真实数据结构一致，便于后续升级转化

---

## 2. 账号定义与识别

### 2.1 账号凭据

| 属性 | 值 |
|------|-----|
| 用户名 | `boss` |
| 密码 | `IamBigBoss`（由环境变量 `VITE_MOCK_PASSWORD` 配置） |
| 邮箱 | `boss@proclaw.demo` |
| 用户 ID | `mock-boss-001` |
| 角色 | `admin` |
| 用户类型 | 内部用户 |

### 2.2 账号识别方式

系统中有两种识别方式，确保在不同上下文中均可检测：

1. **Zustand Store 方式**（`src/lib/aiTeamTokenService.ts`）：
   ```typescript
   useAuthStore.getState().user?.email === 'boss@proclaw.demo'
   ```

2. **localStorage 方式**（`src/lib/demoFlag.ts`）：
   ```typescript
   JSON.parse(localStorage.getItem('proclaw_user')).email === 'boss@proclaw.demo'
   ```

### 2.3 Mock 账号注册表

定义在 `src/lib/authStore.ts` 的 `MOCK_ACCOUNTS` 数组中，包含完整的 `User` 和 `Session` 对象模拟，含 `access_token`（`mock-access-token-boss`）、`refresh_token`（`mock-refresh-token-boss`）等占位值。会话过期时间设置为当前时间 + 3600 秒。

---

## 3. 演示数据包内容

### 3.1 预置内容清单

| 数据项 | 数量 | 来源 | 展示位置 |
|--------|------|------|----------|
| 产品 SPU | 20 个 | Tauri `seed_demo_products` 命令 / 本地 mock 兜底 | 「商品库」页 |
| 云商城 | 1 个 | `createCloudStore('free', 'demo')` | 「云商城 → 仪表盘」 |
| AI 团队 | 3 个 | Nvwax 下载 → `localTeamSkillMap` 回退 | 「AI 团队」页 |
| 行业插件 | 1 个 | `ma_foreign_counter` 内置 manifest | 「插件商店」+「外贸柜台」页 |

### 3.2 产品详情

- **品类**：iPhone 电池（覆盖 iPhone 6 ~ iPhone 15 全系列）
- **每个 SPU**：含 1~3 个 SKU（容量/包装变体）
- **价格档位**：¥79 ~ ¥259
- **库存**：随机分布 50~500
- **存储**：同时写入简单模式 `products` 表与电商模式 `product_spus` / `product_skus` 表

### 3.3 AI 团队

| Skill ID | 展示名称 | 角色定位 |
|----------|---------|---------|
| `team-skill-biz-ops-001` | AI 经营团队 | CEO 经营决策 / 财务分析 / 供应链调度 |
| `team-skill-social-cn-001` | 国内社媒运营 Team | 抖音 / 小红书 / 视频号 |
| `team-skill-social-us-eu-001` | 欧美社媒运营 Team | Facebook / Instagram / Twitter |

**团队安装流程**：
1. 调用 Nvwax API 下载团队 Skill
2. 失败时回退到 `localTeamSkillMap` 本地模板
3. 调用 `AgentMarketService.installTeamSkill()` 安装 Agent
4. 调用 `create_team` 命令在后端 teams 表中创建记录

**团队分类映射**：

| 原始 category | 展示分类 |
|---------------|---------|
| `business_operations` | 通用经营 |
| `social_media_cn` / `cn_market` | 国内社媒 |
| `social_media_us` / `us_eu_market` | 海外社媒 |
| `website_operations` | 网站运营 |

### 3.4 云商城

| 属性 | 值 |
|------|-----|
| 子域名 | `demo` |
| 访问 URL | `https://proclaw.cc/demo`（路径模式，非子域名模式） |
| 套餐类型 | `free` |
| 状态 | `active` |
| URL 设计原因 | 与 `cloud-store/src/middleware.ts` 的 `/shop/[store]` 路由对齐，避免 `demo.proclaw.cc` 被错误指向 |

### 3.5 外贸柜台插件

| 属性 | 值 |
|------|-----|
| 插件 ID | `ma_foreign_counter` |
| Manifest | `public/plugins/ma_foreign_counter/manifest.json` |
| 功能模块 | 多语言翻译 / 国际物流跟踪 / 海关申报 |
| UI 路由 | `/foreign-counter` |

---

## 4. Token 管理规则

### 4.1 赠送额度

| 规则 | 说明 |
|------|------|
| 赠送额度 | 演示账号首次使用自动获得 **10,000 PT**（ProClaw Token） |
| 扣减时机 | 每次 LLM 调用后按实际消耗扣减（输入 token + 输出 token） |
| 存储方式 | `localStorage` key `proclaw_ai_team_tokens`，刷新不丢失 |
| 余额不足 | 返回友好提示，不阻塞已生成的回复，输入框禁用 |
| 非演示账号 | 不做 Token 限制（返回 -1 表示无限制） |

### 4.2 Token 估算

复用 `src/lib/aiTools.ts` 的 `estimateTokens()` 函数进行 Token 消耗估算。

### 4.3 LLM API 依赖

| 配置项 | 值 |
|--------|-----|
| LLM 端点 | `https://ai.proclaw.cc/api/v1` |
| 模型 | `proclaw-gpt-4` |
| SDK | `@langchain/openai` 的 `ChatOpenAI` |
| API Key | `proclaw-internal`（占位值） |

### 4.4 UI 状态

| 场景 | UI 表现 |
|------|---------|
| 正常状态 | Header 绿色 Chip：`9,850 PT` |
| Token < 1000 | Chip 变黄色预警 |
| Token = 0 | Chip 变红色，输入框禁用，提示"Token 已用完" |
| AI 思考中 | 输入区橙色加载动画 + "CEO Agent 思考中..." |
| LLM 连接失败 | 错误提示"无法连接到 AI 服务" |

### 4.5 Token 服务接口

```typescript
/** 是否为演示账号 */
function isDemoAccount(): boolean;

/** 获取当前可用 Token 余额（首次自动初始化为 10000） */
function getTokenBalance(): number;

/** 扣减 Token，返回剩余余额。余额不足时抛出错误 */
function deductTokens(amount: number): number;

/** 重置演示账号 Token 为 10000（仅开发调试用） */
function resetDemoTokens(): void;
```

### 4.6 AI 群聊响应接口

```typescript
interface ChatHistoryItem {
  role: 'user' | 'ceo' | 'agent' | 'system';
  name: string;
  content: string;
}

interface GroupChatResponse {
  replyContent: string;
  tokensUsed: number;
  remainingTokens: number;
}

function generateGroupChatResponse(
  userMessage: string,
  chatHistory: ChatHistoryItem[],
  groupConfig: AITeamGroupConfig
): Promise<GroupChatResponse>;
```

### 4.7 CEO Agent System Prompt 设计

CEO Agent 的 System Prompt 包含以下上下文：
- **团队信息**：团队名称、描述、成员列表
- **角色定位**：Boss 和子 Agent 之间的桥梁，负责接收指令、分派任务、追踪进度、汇报结果
- **回复要求**：简短精炼（200 字以内），有可执行操作给出具体步骤，信息不足请 Boss 补充
- **聊天历史**：最近 10 条消息

---

## 5. 初始化流程与触发机制

### 5.1 触发入口

| 属性 | 值 |
|------|-----|
| 触发文件 | `src/components/Layout/AppLayout.tsx` |
| 触发方式 | `useEffect` 监听 `user.id` 和 `user.email` 变化 |
| 触发条件 | `user` 对象存在 **且** `isDemoAccount()` 返回 `true` |
| 调用方式 | `bootstrapDemoData({ silent: true })` |

### 5.2 完整流程

```
用户登录 boss / IamBigBoss
       │
       ▼
[LoginPage] login('boss', MOCK_PASSWORD) → authStore.login()
       │
       ▼
[AppLayout] useEffect 检测到 user 变化 → isDemoAccount() === true
       │
       ▼
[demoBootstrap.bootstrapDemoData({ silent: true })]
       │
       ├─ 1) 注册 ma_foreign_counter 插件 → manifestRegistry
       │
       ├─ 2) 注入 20 个产品 SPU
       │     ├─ Tauri 环境: invoke('seed_demo_products', { force })
       │     └─ 浏览器/失败回退: DEMO_PRODUCTS_FOR_BOOTSTRAP mock 兜底
       │
       ├─ 3) 创建/激活云商城
       │     ├─ 已有 active 商城 → markCloudStoreAsDemo(store)
       │     └─ 无商城 → createCloudStore('free', 'demo') → markCloudStoreAsDemo
       │
       ├─ 4) 安装 3 个 AI Team（逐个遍历 DEMO_TEAM_SKILL_IDS）
       │     ├─ 幂等检查：同名 Team 已存在则跳过
       │     ├─ AgentMarketService.installTeamSkill(skillId)
       │     │   ├─ Nvwax API 下载
       │     │   └─ 失败回退 → localTeamSkillMap 本地模板
       │     └─ create_team 命令 → 后端 teams 表写入记录
       │
       └─ 5) 标记为演示数据
             └─ markAsDemoData({ version, productsCount, cloudStoreSubdomain, teamNames, pluginIds, initializedAt })
              │
              ▼
        写缓存 → localStorage 'proclaw_demo_bootstrap_v1'
              │
              ▼
        广播 CustomEvent 'proclaw:demo-bootstrapped'
        广播 CustomEvent 'proclaw:teams-changed'
        广播 CustomEvent 'proclaw:agents-changed'
              │
              ▼
        WelcomeTour 欢迎弹窗弹出
        TopBar 显示「🧪 演示数据」徽章
        各业务页面自动刷新
```

### 5.3 幂等性保障

| 层级 | 机制 |
|------|------|
| 全局层 | `isDemoDataInitialized()` 检查 `proclaw_demo_flag_v1` 是否存在 |
| 缓存层 | 已初始化且非 `force` 模式：直接返回 `readBootstrapCache()` 结果 |
| 产品层 | Tauri `seed_demo_products` 命令内部做 `ON CONFLICT DO NOTHING` |
| 商城层 | `getCloudStore()` 检查已有 `active` 商城则跳过创建 |
| 团队层 | `get_teams` 查询已有同名 Team 则跳过安装 |

### 5.4 首次设置入口（SetupPage）

`src/pages/SetupPage.tsx` 提供两个模式选择：

| 模式 | 说明 | 操作 |
|------|------|------|
| **演示模式**（推荐） | 无需配置，使用本地数据库，预置模拟账号 | 导航到 `/login` 使用 `boss / IamBigBoss` 登录 |
| **云端模式** | 需配置 Supabase 账号，支持多设备同步 | 跳转 Supabase 文档或导航到 `/login` |

页面底部始终显示演示账号凭据提示：`boss` / `IamBigBoss`

### 5.5 登录页快速体验

`src/pages/LoginPage.tsx` 提供：
- **快速体验账号提示**：Alert 框显示用户名 `boss` 和密码
- **一键体验按钮**：`⚡ 一键体验 (boss)` 直接调用 `login('boss', MOCK_PASSWORD)`

---

## 6. 重置功能与管理界面

### 6.1 管理入口

| 属性 | 值 |
|------|-----|
| 位置 | 设置页（`SettingsPage.tsx`）→ 🧪 数据管理 Tab |
| 可见性 | 仅 `isDemoAccountContext() === true` 时渲染该 Tab |
| Tab 索引 | 第 6 个 Tab（index=5） |
| 标签 | `🧪 数据管理` |

### 6.2 管理界面内容

#### 预置内容清单展示

| 展示项 | 数据来源 | 示例 |
|--------|---------|------|
| 产品数量 | `demoFlag.productsCount` | `20 个 iPhone 电池 SPU 产品` |
| 云商城 | `demoFlag.cloudStoreSubdomain` | `已开通云商城（proclaw.cc/demo）` |
| AI 团队 | `demoFlag.teamNames` | `3 个 AI 团队` + 名称列表 |
| 行业插件 | `demoFlag.pluginIds` | `1 个行业插件` + 外贸柜台运营助手 |
| 初始化时间 | `demoFlag.initializedAt` | `2026-06-15 10:30:00` |
| 重置历史 | `demoFlag.lastResetAt` + `demoFlag.resetCount` | `最近重置：... （3 次）` |

#### 重置操作区

- 重置说明文字（包含影响范围和不可恢复警告）
- `重置为演示数据` 按钮（warning 样式，支持 loading 状态）
- 二次确认弹窗（Dialog），列出重置影响清单：
  - 清空当前所有业务数据
  - 重新注入 20 个产品 SPU
  - 重新开通演示云商城
  - 重新下载 3 个 AI 团队
- 操作结果反馈（Alert）：
  - 成功：显示产品数、云商城状态、团队数、插件数
  - 失败：显示错误信息

### 6.3 重置流程

```
用户点击「重置为演示数据」按钮
       │
       ▼
  弹出二次确认 Dialog
       │ 用户点击「确认重置」
       ▼
  SettingsPage.handleResetDemoData()
       │
       ├─ setResetting(true)
       │
       ├─ import('demoBootstrap').resetDemoData()
       │     │
       │     ├─ isDemoAccount() 校验（非演示账号抛错）
       │     ├─ clearDemoData()              → 移除 'proclaw_demo_flag_v1'
       │     ├─ removeItem(cache_key)        → 移除 'proclaw_demo_bootstrap_v1'
       │     ├─ removeItem(cloud_store_key)  → 移除 'proclaw_demo_cloud_store_id'
       │     └─ bootstrapDemoData({ force: true, silent: true })
       │           └─ 重新执行完整引导流程（5 步）
       │
       ├─ recordDemoReset()                  → 更新 resetCount + lastResetAt
       │
       ├─ dispatchEvent('proclaw:demo-bootstrapped', { reset: true })
       │
       └─ 设置 resetResult → 显示操作结果 Alert
```

### 6.4 重置次数追踪

| 属性 | 说明 |
|------|------|
| 存储位置 | `proclaw_demo_flag_v1.resetCount` |
| 更新时机 | 每次 `recordDemoReset()` 调用时 +1 |
| 展示位置 | 设置页 → 数据管理 Tab → 预置内容清单底部 |

---

## 7. 数据结构

### 7.1 localStorage 键值表

| Key | 类型 | 用途 | 写入者 |
|-----|------|------|--------|
| `proclaw_user` | JSON | 当前用户信息，用于识别演示账号 | `authStore.ts` |
| `proclaw_demo_flag_v1` | JSON (`DemoFlagPayload`) | 演示数据版本 + 数量 + 资源 ID + 重置历史 | `demoFlag.ts` |
| `proclaw_demo_bootstrap_v1` | JSON (`BootstrapCacheShape`) | 引导缓存，避免重复扫描 | `demoBootstrap.ts` |
| `proclaw_demo_cloud_store_id` | JSON (string[]) | 演示云商城 ID 列表，便于重置清除 | `demoBootstrap.ts` |
| `proclaw_ai_team_tokens` | string (number) | AI Team Token 余额 | `aiTeamTokenService.ts` |
| `proclaw_demo_tour_dismissed_v1` | - | 欢迎引导弹窗已关闭标记 | `WelcomeTour.tsx` |

### 7.2 DemoFlagPayload 接口

```typescript
interface DemoFlagPayload {
  /** 演示数据版本号（结构调整时递增） */
  version: string;
  /** 注入的产品数量 */
  productsCount: number;
  /** 演示云商城子域名 */
  cloudStoreSubdomain: string;
  /** 已安装 AI Team 名称列表 */
  teamNames: string[];
  /** 已注册插件 ID 列表 */
  pluginIds: string[];
  /** 首次初始化时间（ISO 8601） */
  initializedAt: string;
  /** 最近一次重置时间（ISO 8601，可选） */
  lastResetAt?: string;
  /** 重置次数 */
  resetCount?: number;
}
```

### 7.3 DemoBootstrapResult 接口

```typescript
interface DemoBootstrapResult {
  /** 注入的产品数量 */
  products: number;
  /** 是否成功激活云商城 */
  cloudStore: boolean;
  /** 已安装的 AI Team 名称列表 */
  teams: string[];
  /** 已注册的插件 ID 列表 */
  plugins: string[];
  /** 整体耗时（毫秒） */
  durationMs: number;
  /** 详细步骤日志 */
  steps: DemoBootstrapStep[];
  /** 是否发生任何错误 */
  hasError: boolean;
}

interface DemoBootstrapStep {
  name: string;
  success: boolean;
  message: string;
  durationMs: number;
}
```

### 7.4 demoBootstrap 常量

```typescript
/** 演示数据版本号 */
const DEMO_DATA_VERSION = '1.0.0';

/** 3 个预置 AI Team 的 Skill ID */
const DEMO_TEAM_SKILL_IDS = [
  'team-skill-biz-ops-001',
  'team-skill-social-cn-001',
  'team-skill-social-us-eu-001',
] as const;

/** 演示云商城子域名 */
const DEMO_CLOUD_STORE_SUBDOMAIN = 'demo';

/** 演示云商城访问 URL */
const DEMO_CLOUD_STORE_URL = 'https://proclaw.cc/demo';

/** 演示云商城套餐 */
const DEMO_CLOUD_STORE_PLAN: PlanType = 'free';

/** Token 初始额度 */
const DEMO_TOKEN_BALANCE = 10000;
```

---

## 8. 功能限制与特殊行为

### 8.1 演示账号限制

| 限制项 | 说明 |
|--------|------|
| Token 上限 | 固定 10,000 PT，不可充值 |
| 数据持久性 | 仅本地 localStorage，不保证跨设备同步 |
| 重置权限 | 仅 `boss@proclaw.demo` 可见数据管理 Tab |
| 云商城套餐 | 固定 `free` 套餐，不可升级 |
| 数据可恢复性 | 重置不可恢复，清空后重新注入 |
| Token 扣减 | 余额不足时抛出错误，不阻塞已生成的回复 |

### 8.2 特殊行为

| 行为 | 说明 |
|------|------|
| **TopBar 徽章** | 演示账号在 TopBar 显示「🧪 演示数据」标识 |
| **WelcomeTour 弹窗** | 首次登录/重置后弹出一次性欢迎引导，列出预置内容清单，可通过 `proclaw_demo_tour_dismissed_v1` 控制不再弹出 |
| **LLM 调用限制** | 演示账号的 AI Team 群聊消息受 Token 余额限制；非演示账号不做限制 |
| **云商城 URL 模式** | 使用路径模式（`proclaw.cc/demo`）而非子域名模式（`demo.proclaw.cc`） |
| **事件驱动刷新** | 引导完成/重置完成后广播事件，各业务页面监听后自动刷新数据 |
| **引导失败容错** | 各步骤独立 try-catch，单步失败不影响其他步骤，`hasError` 标记任何失败 |

---

## 9. 与其他系统模块的交互关系

### 9.1 模块交互矩阵

| 模块 | 源文件 | 交互方式 | 说明 |
|------|--------|---------|------|
| **认证系统** | `authStore.ts` | 读取 `user.email` | 判断是否为演示账号（`MOCK_ACCOUNTS` 定义） |
| **AppLayout** | `AppLayout.tsx` | `useEffect` 监听 `user.id`/`user.email` | 登录状态变化时触发数据引导 |
| **云商城服务** | `cloudStoreService.ts` | `createCloudStore` / `getCloudStore` | 创建/查询演示云商城；`getDemoCloudStoreUrl()` 生成路径模式 URL |
| **Agent 市场** | `agentMarketService.ts` | `installTeamSkill` + `localTeamSkillMap` | 安装 AI Team，Nvwax 下载失败时回退到本地模板 |
| **Manifest 注册表** | `manifestRegistry.ts` | `registerForeignCounterPlugin` | 注册外贸柜台插件到全局注册表 |
| **Token 服务** | `aiTeamTokenService.ts` | `isDemoAccount` + Token 管理函数 | LLM 调用额度控制 |
| **AI Chat 服务** | `aiTeamChatService.ts` | 调用前校验 Token + 调用后扣减 | Token 校验、扣减、生成回复 |
| **设置页** | `SettingsPage.tsx` | `isDemoAccountContext()` 条件渲染 | 数据管理 Tab 仅演示账号可见 |
| **TopBar** | `TopBar.tsx` | 条件渲染 | 演示数据徽章 |
| **WelcomeTour** | `WelcomeTour.tsx` | 监听 `proclaw:demo-bootstrapped` 事件 | 首次登录/重置后弹出欢迎引导 |
| **后端产品命令** | `product_commands.rs` | Tauri `invoke` | `seed_demo_products` / `mark_store_as_demo` |
| **登录页** | `LoginPage.tsx` | 显示凭据 + 一键登录 | 快速体验入口 |
| **设置向导** | `SetupPage.tsx` | 模式选择 | 演示模式 / 云端模式 |

### 9.2 事件广播机制

| 事件名 | 触发时机 | 触发者 | 监听者 |
|--------|---------|--------|--------|
| `proclaw:demo-bootstrapped` | 引导完成 / 重置完成 | `demoBootstrap.ts` / `SettingsPage.tsx` | `SettingsPage`, `WelcomeTour`, 各业务页面 |
| `proclaw:teams-changed` | AI Team 安装完成 | `AppLayout.tsx` | `TeamsPage` |
| `proclaw:agents-changed` | Agent 安装完成 | `AppLayout.tsx` | `AgentsPage` |

### 9.3 LLM 调用完整链路

```
Boss 在群聊发送消息
  → contactService.sendMessage()          // 存储并显示用户消息
  → aiTeamChatService.generateGroupChatResponse()
      ├─ 构建 System Prompt               // CEO Agent 角色 + 群组上下文
      ├─ 构建聊天历史                      // 最近 10 条消息
      ├─ isDemoAccount() 校验              // 演示账号需检查 Token
      ├─ getTokenBalance() 检查余额        // 余额为 0 时抛出错误
      ├─ ChatOpenAI.invoke()               // 调用 proclaw-gpt-4
      ├─ estimateTokens() 估算消耗         // 输入 token + 输出 token
      ├─ deductTokens(estimated) 扣减      // 更新 localStorage
      └─ 返回 { replyContent, tokensUsed, remainingTokens }
  → 将 AI 回复以 ceo-agent 身份写入群聊
  → 更新 Header Token Chip 余额显示
```

---

## 10. 关键源文件索引

### 10.1 前端核心

| 文件路径 | 职责 |
|----------|------|
| `src/lib/authStore.ts` | Mock 账号定义（`MOCK_ACCOUNTS`）+ 认证状态管理（Zustand） |
| `src/lib/demoBootstrap.ts` | 主引导服务（幂等注入 / 缓存管理 / 重置逻辑） |
| `src/lib/demoFlag.ts` | localStorage flag 工具（读写 / 标记 / 清除 / 资源判断） |
| `src/lib/aiTeamTokenService.ts` | Token 余额管理 + 演示账号检测 |
| `src/lib/aiTeamChatService.ts` | LLM 调用封装 + System Prompt + Token 扣减 |
| `src/lib/cloudStoreService.ts` | 云商城创建 / 查询 + 演示 URL 模板 |
| `src/lib/agentMarketService.ts` | AI Team 安装 + `localTeamSkillMap` 回退 |
| `src/lib/manifestRegistry.ts` | 插件注册表 |

### 10.2 前端 UI

| 文件路径 | 职责 |
|----------|------|
| `src/components/Layout/AppLayout.tsx` | 演示数据引导触发入口（`useEffect`） |
| `src/components/Layout/TopBar.tsx` | 演示数据徽章 |
| `src/components/Demo/WelcomeTour.tsx` | 首次登录欢迎引导弹窗 |
| `src/pages/SettingsPage.tsx` | 数据管理 Tab + 重置按钮 + 预置清单展示 |
| `src/pages/SetupPage.tsx` | 首次设置向导（演示模式 / 云端模式） |
| `src/pages/LoginPage.tsx` | 登录页（快速体验账号提示 + 一键体验按钮） |
| `src/pages/ChatPage.tsx` | Token Chip 显示 + AI 思考中/用完状态 UI |

### 10.3 后端

| 文件路径 | 职责 |
|----------|------|
| `src-tauri/src/product_commands.rs` | `seed_demo_products` 命令（批量写入 20 个 iPhone 电池 SPU/SKU） |

### 10.4 文档

| 文件路径 | 职责 |
|----------|------|
| `docs/features/demo-data.md` | 演示数据包功能文档 |
| `docs/prd/需求文档：AI Team 群聊 LLM 接入与演示账号 Token（PRD v6.4）.md` | Token 管理 PRD |
| `docs/prd/marketing/需求文档：ProClaw 用户中心（PRD v5.1）.md` | 桌面端用户中心 PRD |
| `docs/prd/需求文档：ProClaw 营销网站用户中心（PRD v7.1）.md` | 营销网站用户中心 PRD |

### 10.5 测试

| 文件路径 | 职责 |
|----------|------|
| `src/lib/demoFlag.test.ts` | demoFlag 工具单元测试（21 个用例） |
| `src/lib/authStore.test.ts` | 认证状态测试（含 boss@proclaw.demo 验证） |
| `src/lib/cloudStoreService.test.ts` | 云商城测试（含演示账号 URL 路径模式验证） |
| `e2e/login.spec.ts` | 登录端到端测试 |
