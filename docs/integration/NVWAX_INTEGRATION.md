# NvWaX × ProClaw 集成开发者指南

> 版本：v1.4.1+ 配套（含 Sprint 2.13–2.17 全部交付）
> 最后更新：2026
> 受众：第三方插件作者、ProClaw 内部贡献者

本指南描述**如何让你的 ProClaw 插件（内置或第三方）使用 NvWaX 的云端能力**，以及
**ProClaw 桌面端如何加载、调用你的插件**。两个系统的整合遵循"本地壳 + 云端大脑"的
设计原则：本地 100% 数据自主，云端负责 AI 智能和工作流编排。

---

## 1. 概念模型

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  NvWaX Cloud (Web)        │  ←───── │  ProClaw Desktop (Tauri) │
│  · 对话式创建虚拟公司      │  HTTP   │  · 行业插件系统           │
│  · 模板市场                │         │  · ProClawPlugin API      │
│  · Agent / Skill 仓库     │         │  · Hermes Skills          │
│  · Token 计费              │         │  · CEO Agent             │
└──────────────────────────┘         └──────────────────────────┘
                                       │
                                       ↓ 调用 ProClawPlugin.invoke()
                                       ↓ 触发 Tauri IPC 命令
                                       ↓ 由 Rust 端 nvwaxClient 转发
                                       ↓ HTTP Bearer Auth + 计费
```

**核心契约**：

| 元素 | 含义 |
|------|------|
| **API Key** | ProClaw 用户在「设置 → NvWaX 集成」生成的 `nvwax_*` token，由 Rust 端 `Aes256GcmCipher` 加密存储 |
| **VirtualCompanyPackage** | 跨端数据交换格式，详见 [virtual-company-package.schema.json](./virtual-company-package.schema.json)（schemaVersion 1.0.0） |
| **ProClawPlugin** | 前端插件运行时 API（详见 `src/lib/pluginApi.ts`） |
| **pluginFrontend** | 启动时通过 `import.meta.glob` 加载的插件 frontend 脚本（IIFE） |

---

## 2. 快速上手：让你的插件调用 NvWaX

### 2.1 前端：调 Tauri IPC 命令

```javascript
// 在你的 plugin/frontend/index.js 里
async function searchAgents(keyword) {
  // ProClawPlugin.invoke 是统一入口，底层走 Rust NvwaXClient
  const resp = await ProClawPlugin.invoke('nvwax_search_agents', {
    q: keyword,
    category: null,
    tags: null,
    page: 1,
    limit: 20,
  });
  // resp: { success: true, data: { agents: [...], pagination: {...} } }
  return resp.data.agents;
}
```

### 2.2 前端：导入虚拟公司（一次性闭环）

```javascript
async function importVirtualCompany(downloadUrl) {
  // 1. 确保本地 SQLite 表已存在（幂等）
  await ProClawPlugin.invoke('bootstrap_virtual_company_tables');

  // 2. 拉取 .nvwax-vc.json 并写入本地
  const result = await ProClawPlugin.invoke('nvwax_import_virtual_company_from_url', {
    downloadUrl, // 形如 https://nvwax.proclaw.cc/api/aiteam-creation/packages/<uuid>/download
  });

  // 3. 后续查询（从本地 SQLite 读）
  const companies = await ProClawPlugin.db.query(
    'SELECT * FROM virtual_companies ORDER BY imported_at DESC LIMIT 20'
  );

  return result; // { package_id, team_id, team_name, agents_imported, ... }
}
```

### 2.3 后端：在你的 Rust 命令里调用 NvWaX

```rust
use crate::services::nvwax_client::NvwaXClient;
// 在你的 Tauri command 中：
#[tauri::command]
pub async fn my_plugin_call_nvwax(
    client: State<'_, Arc<NvwaXClient>>,
) -> Result<serde_json::Value, String> {
    let agents = client
        .search_agents(SearchParams { q: Some("foo".into()), ..Default::default() })
        .await
        .map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(agents).unwrap())
}
```

---

## 3. ProClawPlugin API 完整参考

详见 `src/lib/pluginApi.ts`。下表是 NvWaX 集成最常用的方法：

| 方法 | 用途 |
|------|------|
| `invoke(cmd, args)` | 调用任意 Tauri IPC 命令（包括 NvWaX 桥接命令） |
| `db.query(sql, params?)` | SELECT 查询本地 SQLite（仅 SELECT/WITH） |
| `db.execute(sql, params?)` | 写本地 SQLite（INSERT/UPDATE/DELETE/CREATE TABLE） |
| `getAgentContext()` | 获取已安装的 AI Team 列表 |
| `sendToAgent(agentId, msg)` | 向 AI Team 发送消息 |
| `notify(level, msg)` | 推送 UI toast |

---

## 4. 完整 NvWaX Tauri 命令清单

由 `src-tauri/src/services/nvwax_commands.rs` 注册；前端通过 `invoke()` 调用。

### 4.1 Marketplace（浏览市场）

| 命令 | 用途 |
|------|------|
| `nvwax_search_agents` | 搜索 Agent 市场 |
| `nvwax_get_agent_detail` | 获取 Agent 详情 |
| `nvwax_get_categories` | 分类列表 |
| `nvwax_search_aiteams` | 搜索 AiTeam |
| `nvwax_get_aiteam_detail` | 获取 AiTeam 详情 |
| `nvwax_get_industries` | 行业列表 |
| `nvwax_get_plugin_detail` | 插件详情 |
| **`nvwax_search_vc_templates`** | **浏览虚拟公司模板** |

### 4.2 CRUD

| 命令 | 用途 |
|------|------|
| `nvwax_create_agent` | 创建 Agent |
| `nvwax_get_agents` | 获取自己的 Agent 列表 |
| `nvwax_get_my_agent_detail` | 获取 Agent 详情 |
| `nvwax_update_agent` | 更新 Agent |
| `nvwax_delete_agent` | 删除 Agent |
| `nvwax_publish_agent` | 发布 Agent |
| `nvwax_unpublish_agent` | 取消发布 Agent |
| `nvwax_create_aiteam` | 创建 AiTeam |
| `nvwax_get_aiteams` | 获取自己的 AiTeam 列表 |
| `nvwax_get_my_aiteam_detail` | 获取 AiTeam 详情 |
| `nvwax_update_aiteam` | 更新 AiTeam |
| `nvwax_delete_aiteam` | 删除 AiTeam |
| `nvwax_publish_aiteam` | 发布 AiTeam |
| `nvwax_unpublish_aiteam` | 取消发布 AiTeam |

### 4.3 Search / Export

| 命令 | 用途 |
|------|------|
| `nvwax_search_agents_global` | 跨平台搜索 Agent |
| `nvwax_search_skills` | 搜索技能 |
| `nvwax_unified_search` | 统一搜索（Agent + Skill） |
| `nvwax_export_agent` | 导出 Agent |
| `nvwax_export_aiteam` | 导出 AiTeam |
| `nvwax_batch_export` | 批量导出 |
| `nvwax_get_export_history` | 导出历史 |

### 4.4 Usage & Billing

| 命令 | 用途 |
|------|------|
| `nvwax_get_usage_stats` | 消耗统计 |
| `nvwax_get_token_balance` | Token 余额 |
| `nvwax_record_consumption` | 手动记录消耗 |
| `nvwax_sync_usage` | 对账同步 |

### 4.5 API Key 管理

| 命令 | 用途 |
|------|------|
| `get_nvwax_api_key` | 获取解密后的 API Key |
| `save_nvwax_api_key` | 保存（自动加密） |
| `clear_nvwax_api_key` | 清除 |
| `test_nvwax_connection` | 测试连接 |

### 4.6 虚拟公司（官方桥接）

| 命令 | 用途 |
|------|------|
| **`nvwax_search_vc_templates`** | 浏览 NvWaX 虚拟公司模板 |
| **`nvwax_import_virtual_company_from_url`** | 拉取 `.nvwax-vc.json` 并导入本地 SQLite |
| **`bootstrap_virtual_company_tables`** | 创建虚拟公司本地表（幂等，v1.4.0 启动时 ALTER TABLE 补齐 4 列） |
| **`open_virtual_company_page`** | 触发前端跳转到 /vc/wizard 等 |
| **`nvwax_push_virtual_company_state`** | 把本地状态变更回写到 NvWaX 云端 |
| **`nvwax_stream_session`** | 通过 SSE 流与 NvWaX 虚拟公司会话交互（Sprint 2.14，500ms 轮询版，保留兼容） |
| **`nvwax_stream_session_v2`** | **真实 SSE 流式**（v1.4.0 引入 + v1.4.1/Sprint 2.17 支持 6 种 `event:` 类型） |
| **`nvwax_set_agent_local_state`** | **把单个 Agent 的启停/别名/角色持久化到 SQLite**（v1.4.0，刷新不丢） |
| **`nvwax_fetch_local_state`** | 拉取单个 session 的最新 `local_state`（Sprint 2.15 多设备同步） |
| **`nvwax_list_sessions_with_state`** | 列出用户最近的虚拟公司会话（含 `local_state`）（Sprint 2.15） |
| **`nvwax_publish_to_marketplace`** | **把虚拟公司发布到 NvWaX 市场**（v1.4.0，team_skills is_public=true） |

> **跨版本对照**（确保文档与代码 1:1）：
> - Sprint 2.13（v1.3.0 引入，最小闭环）：3 个命令（`nvwax_search_vc_templates` / `nvwax_import_virtual_company_from_url` / `bootstrap_virtual_company_tables`）
> - Sprint 2.14（v1.3.1 引入，4 项增强）：3 个命令（`open_virtual_company_page` / `nvwax_push_virtual_company_state` / `nvwax_stream_session`）
> - **v1.4.0 / Sprint 2.16**：3 个命令（`nvwax_stream_session_v2` / `nvwax_set_agent_local_state` / `nvwax_publish_to_marketplace`）
> - **v1.4.1 / Sprint 2.17**：NvWaX 后端 `streamProgress` 端点升级为真 SSE（6 种 `event:` 类型），需 NvWaX v2.2.1+；`nvwax_stream_session_v2` Rust 解析端同步支持
> - Sprint 2.15（v1.3.2 引入，多设备同步）：2 个命令（`nvwax_fetch_local_state` / `nvwax_list_sessions_with_state`）

### 4.5.2 SSE 事件类型路由（Sprint 2.17 / NvWaX v2.2.1+）

`nvwax_stream_session_v2` 解析 NvWaX 后端发送的 SSE 事件，按 `event:` 字段路由到 `payload`：

| NvWaX 事件名 | 触发场景 | ProClaw 端 payload 字段 |
|--------------|----------|-------------------------|
| `progress` | 当前进度快照 | `{ content, progress, done }`（来自 `data.progress`） |
| `agent_message` | **CEO Agent 回复** | `content`（来自 `data.message`）— wizard 真正流式显示的关键 |
| `step` | 单个 step 完成 | `progress`（来自 `data.progress`） |
| `status` | 会话状态变化 | `progress`（来自 `data.progress`） |
| `complete` | 终态（completed / failed / cancelled） | `done = true`，携带 `finalTeamSkillId`（来自 `data.finalTeamSkillId`） |
| `error` | 错误事件 | `done = true`，同时把 `data.errorMessage` 写到 Rust `eprintln!` |

前端 wizard 用 `ProClawPlugin.event.listen('virtual-company-sse-chunk', ...)` 接收，
rAF 节流合并多次 emit；最终响应来自 `invokeTauri` 的 `Promise<data>` 结果。

> **NvWaX 端代码位置**：`packages/nvwax-server/src/services/sse-progress.service.ts` —
> `broadcastAgentMessage()` / `broadcastComplete()` / `sendEvent()` 三方法；`sendMessage` /
> `confirmAndSaveTeam` controller 中调用。完整测试见
> `packages/nvwax-server/src/services/sse-progress.service.test.ts`（7 个用例）。
>
> **TS 类型对应**（`src/types/nvwax.ts`，Rust 端在 `src-tauri/src/services/nvwax_client.rs`）：
> - `VirtualCompanyPackage` / `VirtualCompanyTemplateSummary` / `VirtualCompanyImportResult`（2.13）
> - `VirtualCompanyAgentState` / `VirtualCompanyLocalStatePayload` / `VirtualCompanyLocalStatePushResult` / `StreamSessionResponse`（2.14）
> - `VirtualCompanyLocalStateResponse` / `VirtualCompanySessionWithState` / `VirtualCompanySessionListResponse`（2.15）
> - **`SetAgentLocalStateParams` / `SetAgentLocalStateResult` / `PublishMarketplaceResult`（v1.4.0 Sprint 2.16 新增，详见下方 §4.5.1）**

### 4.5.1 新 TS / Rust 类型签名（v1.4.0 / Sprint 2.16）

下表列出 v1.4.0 新增的 TS 客户端方法及其对应 Rust Serde 类型。所有字段命名遵循 camelCase（Tauri invoke 桥接自动转换）。

```ts
// 启用/停用状态持久化（Sprint 2.16 修复 v1.3.2 刷新丢状态 bug）
const result = await NvwaXService.setAgentLocalState({
  packageId: 'pkg-1',
  agentId: 'agent-1',
  enabled: false,           // 可选：省略则不改此字段
  alias: '咖啡师小绿',         // 可选
  ownerRole: 'owner',       // 可选
});
// result.lastModifiedAt: ISO 8601 UTC 字符串

// 对应 Rust 类型（src-tauri/src/services/nvwax_client.rs）
// pub struct SetAgentLocalStateInner { last_modified_at: String }

// 发布到 NvWaX 市场（Sprint 2.16）
const result = await NvwaXService.publishVirtualCompanyToMarketplace('session-1');
// result.teamSkillId:   公开的 team_skills.id，可被其他用户搜索
// result.teamName:      团队名
// result.message?:      NvWaX 返回的成功提示

// 对应 Rust 类型（src-tauri/src/services/nvwax_client.rs）
// pub struct PublishMarketplaceResult {
//     team_skill_id: String,  // #[serde(rename = "teamSkillId")]
//     team_name: String,      // #[serde(rename = "teamName")]
//     message: Option<String>,
// }
```

**TS 端到 Rust 端的参数序列化规则**：

| TS 类型 | Rust 参数 | 序列化 |
|---------|---------|--------|
| `enabled: true` | `Some(true)` | Tauri 自动转 i64 (1) |
| `enabled: false` | `Some(false)` | Tauri 自动转 i64 (0) |
| `enabled: undefined`（字段省略） | `null` | Rust `Option::None`，跳过该字段 UPDATE |
| `alias: "咖啡师"` | `Some("咖啡师")` | 直接传 String |
| `alias: ""` | `Some("")` | 更新为空字符串（注意与 null 区别） |
| `alias: undefined` | `null` | Rust `Option::None`，跳过 |

`setAgentLocalState` 的关键设计：**每个字段独立 UPDATE**，只动用户显式传的那些字段，未传的字段保留旧值（last-write-wins by 字段）。

> **v1.4.0 修复 S1 重要变更**：`setAgentLocalState` 的返回值从 `Promise<string>` 旧版本调整为 `Promise<SetAgentLocalStateResult>`（与所有其他 nvwax_* 命令一致）。TS 客户端调用 `await NvwaXService.setAgentLocalState(...)` 现在返回 `{ lastModifiedAt: "..." }`，旧代码若依赖字符串返回值需调整（详见 v1.4.0 RELEASE_NOTES）。

---

### 4.6 虚拟公司数据合并引擎（v1.3.2+）

`src/lib/virtualCompanySync.ts` 提供三个纯函数，单测覆盖 14 个场景：

```ts
import {
  mergeAgentState,       // 字段级 last-write-wins 合并单个 Agent
  reconcileSync,         // 全量对账：merged / cloudOnly / localOnly
  startBackgroundSync,   // App 启动 5 秒后后台静默同步
} from './lib/virtualCompanySync';

// 字段合并策略：
// - 比较 local.last_modified_at 与 remote.lastRunAt
// - 时间更新的字段胜出
// - tie 场景：云端优先
// - 首次同步（无时间戳）：云端优先
// - 本地独有（孤儿）：保留，不上传不删除
```

合并策略详见 [`MULTI_PROJECT_INTEGRATION_SPEC.md` 第 11.4 节](../MULTI_PROJECT_INTEGRATION_SPEC.md#114-字段级-last-write-wins-合并)。

### 4.7 跨包数据契约

- **JSON Schema**：`docs/integration/virtual-company-package.schema.json`（v1.0.0，ProClaw ↔ NvWaX 双端镜像）
- **必填字段**：`schemaVersion` / `packageId` / `exportedAt` / `source.platform === "nvwax"` / `team.id` `team.name` / `agents[]`
- **可选字段**：`checksum`（SHA-256）· `skills[]` · `metadata`
- **主版本一致性检查**：ProClaw `parseVirtualCompanyPackage()` 拒绝主版本不一致的包；minor 版本差异自动 forward-compat

### 4.8 NvWaX HTTP 端点（v1.3.2 新增）

ProClaw Tauri 命令背后调用的 NvWaX HTTP 端点（已在 NvWaX 服务端实现）：

| Method | Path | 用途 | Sprint |
|--------|------|------|--------|
| POST | `/api/aiteam-creation/sessions/:id/integrate-proclaw` | 生成 `.nvwax-vc.json` 包 | 2.13 |
| GET  | `/api/aiteam-creation/packages/:packageId/download` | 下载导出包 | 2.13 |
| PUT  | `/api/aiteam-creation/sessions/:id/local-state` | 接收本地状态回写 | 2.14 |
| GET  | `/api/aiteam-creation/sessions/:id/local-state` | 拉取最新 local_state | 2.15 |
| GET  | `/api/aiteam-creation/sessions` | 列表（含 local_state） | 2.15 |

---

## 5. 计费模型

---

## 5. 计费模型

ProClaw 桌面端调用任何 NvWaX API 前会自动检查 Token 余额。余额不足（< 10,000）会
触发 `nvwax:balance_low` 自定义事件，由 UI 捕获后弹出充值提醒。

```typescript
// 监听余额告警
window.addEventListener('nvwax:balance_low', (event) => {
  const detail = (event as CustomEvent).detail;
  console.warn(`Token 余额不足：${detail.balance}，请充值`);
});
```

---

## 7. 错误处理

Rust 端 `NvwaXError` 分类：

```rust
pub enum NvwaXError {
    Network(String),         // 网络错误（超时、连接失败）
    Auth(String),            // 401/403 鉴权失败
    NotFound(String),        // 404 资源不存在
    Validation(String),      // 400 参数错误
    RateLimited { retry_after: u64 }, // 429 限流
    Internal(String),        // 5xx 服务器错误
}
```

前端通过 `invoke` 返回的 `{ success: false, error: "..." }` 获取。建议处理逻辑：

```javascript
async function safeInvokeNvwaX(cmd, args) {
  try {
    const resp = await ProClawPlugin.invoke(cmd, args);
    if (!resp.success) {
      throw new Error(resp.error || 'Unknown NvWaX error');
    }
    return resp.data;
  } catch (e) {
    // invoke 抛错（IPC 失败）或 resp.success=false 都会到这里
    ProClawPlugin.notify('error', `${cmd} 失败：${e.message}`);
    throw e;
  }
}
```

---

## 8. 扩展点：开发你的虚拟公司插件

参考 `src/plugins/virtual-company/` 的实现（参考官方虚拟公司插件）。

### 8.1 Manifest 结构

```json
{
  "id": "your-plugin-id",
  "name": "你的插件",
  "version": "1.0.0",
  "description": "...",
  "icon": "🚀",
  "category": "official" | "builtin" | "third-party",
  "entryPoints": { "frontend": "frontend/index.js" },
  "permissions": [
    "database:create_table",
    "nvwax:invoke:nvwax_search_vc_templates"
  ],
  "dataModels": {
    "tables": [
      "CREATE TABLE IF NOT EXISTS your_table (...)"
    ]
  }
}
```

### 8.2 Frontend 入口

`frontend/index.js` 必须是 IIFE，调用 `ProClawPlugin.registerRoute` 注册 React 路由：

```javascript
(function () {
  'use strict';

  function MyPage() {
    return React.createElement('div', null, 'Hello from MyPage');
  }

  ProClawPlugin.registerRoute('/my-plugin/page', MyPage);
})();
```

### 8.3 内置注册

要随 ProClaw 主程序一起打包（无需下载），把 manifest 加到 `manifestRegistry.ts`：

```typescript
import myPluginManifest from '../plugins/my-plugin/manifest.json';
const BUILTIN_MANIFESTS = [
  myPluginManifest as PluginManifest,
];
```

启动时 `main.tsx` 的 `loadBuiltinPluginFrontends()` 会自动加载你的 `frontend/index.js`。

---

## 9. 版本兼容性

| ProClaw | NvWaX schemaVersion | 说明 |
|---------|---------------------|------|
| ≥ 1.3.1 | 1.0.0 | 当前闭环版本 |

未来 schema 升级时，ProClaw 端 `parseVirtualCompanyPackage` 会拒绝低版本（`schemaVersion` 主版本不一致即拒绝导入）。

---

## 10. 常见问题

**Q: 用户的 ProClaw 没配置 NvWaX API Key，会发生什么？**
A: `invoke('nvwax_*')` 调用会返回 `{ success: false, error: 'NvwaX API Key 未配置' }`。
UI 层应捕获并引导用户去「设置 → NvWaX 集成」配置。

**Q: 虚拟公司导出包可以离线分发吗？**
A: 可以。把 `.nvwax-vc.json` 文件复制到 U 盘 / 邮件 / IM，对方用 ProClaw「导入团队 → 选择本地文件」即可。

**Q: 用户能改虚拟公司里的 Agent 配置吗？**
A: 当前版本（1.0.0 schema）只支持导入，不支持双向同步。Agent 启用/停用状态通过
`nvwax_push_virtual_company_state` 回写到 NvWaX（详见 docs/integration）。

**Q: 多个 ProClaw 桌面端能共享同一个 NvWaX 账户吗？**
A: 可以。所有调用走同一个 API Key，Token 余额和消耗在 NvWaX 端统一计费。

---

## 11. 测试

### 11.1 前端单元测试（vitest）

```bash
cd ProClaw
npm run test:run -- nvwaxClient.virtualCompany
```

### 11.2 Rust 单元测试（cargo）

```bash
cd ProClaw/src-tauri
cargo test --features 'virtual_company' --bin proclaw-desktop services::nvwax_commands
```

### 11.3 NvWaX 端（jest）

```bash
cd NvwaX/packages/nvwax-server
NODE_OPTIONS=--experimental-vm-modules npx jest proclaw.service
```

---

## 12. 反馈与贡献

- ProClaw 仓库：见项目根目录 README
- NvWaX 仓库：见 nvwax-server 包 README
- 集成问题：在两仓库的 GitHub Issues 中以 `[cross-repo]` 前缀提交