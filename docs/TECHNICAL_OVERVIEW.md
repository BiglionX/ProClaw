# ProClaw 技术架构概览

## 📋 项目定位

ProClaw 是一个**开源的AI驱动商户经营操作系统**，采用桌面应用架构（Tauri），为中小商户提供智能化的业务管理解决方案。

**核心功能重点**：
1. **用户管理** - 注册、登录、权限控制、多租户支持
2. **大模型调用** - AI智能体、自然语言交互、Dify集成
3. **Token管理** - API密钥管理、用量统计、成本控制
4. **外部资源桥接** - 连接各种API、Webhook、第三方服务
5. **技能生态** - 可扩展的插件系统

**部署模式**：
- **本地优先（默认）**：数据存储在本地SQLite，完全自主可控，免费开源
- **云托管（可选）**：服务端提供数据存储和同步，付费订阅

## 系统架构

ProClaw 采用现代化的桌面应用架构,结合 Tauri 2.0 的轻量级特性和 React 的灵活性。

### 架构图

`\n\n   经营智能体 (Operating Agent)       \n\n   内置模块                           \n   - 产品库                          \n   - 进销存 AI                       \n   - 技能商店                        \n\n   Tauri Core (Rust)                 \n\n         ↕ WebSocket / HTTPS\n\n   Supabase Backend                  \n\n`

## 技术选型理由

### 为什么选择 Tauri?

- **轻量级**: 安装包仅 5-10MB (vs Electron 150MB+)
- **低内存**: 运行时约 50-100MB (vs Electron 200-400MB)
- **安全性**: Rust 后端提供内存安全保证
- **性能**: 原生系统调用,无 Chromium 开销

### 为什么选择 Supabase?

- **开源**: 完全开源,可自托管
- **全功能**: Auth + Database + Realtime + Storage
- **RLS**: 行级安全策略,多租户隔离
- **实时同步**: WebSocket 实时数据更新

## 数据流

1. 用户操作  React 组件
2. Zustand Store 管理状态
3. Service Layer 处理业务逻辑
4. 离线时写入 SQLite
5. 在线时同步到 Supabase

## 核心模块

- **src/lib/**: 服务层(Supabase、AI、同步等)
- **src/pages/**: 页面组件
- **src/components/**: 可复用 UI 组件
- **src-tauri/**: Rust 后端代码

## 🌐 NvWaX 跨包集成架构（v1.3.2+）

自 v1.3.2 起，ProClaw 桌面端是 [NvWaX](https://nvwax.proclaw.cc) 云端的**官方推荐本地壳**。两端通过标准化协议协作，不合并代码。

### 三层协议栈

```
┌──────────────────────────────────────────────────────────────────┐
│  NvWaX Cloud  ──── HTTP + JSON ──────►  ProClaw Desktop (Tauri)  │
│  (对话式 AI 虚拟公司设计)                  (本地运行 / 多设备同步)    │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1: VirtualCompanyPackage JSON Schema (schemaVersion 1.0.0) │
│           docs/integration/virtual-company-package.schema.json    │
│  Layer 2: Tauri IPC commands (40+ 个 nvwax_* 命令)               │
│  Layer 3: Rust NvwaXClient + AES-256-GCM 加密 API Key            │
└──────────────────────────────────────────────────────────────────┘
```

### 数据流（典型"创建虚拟公司"路径）

```
[NvWaX Web UI]
   ↓ 用户与 AI 助手对话 5-10 分钟
   ↓ POST /sessions/:id/nvwax-match → 自动匹配 Agent
   ↓ POST /sessions/:id/confirm → 保存团队设计
   ↓
[ProClaw 端]
   ↓ CEO Agent 识别"创建虚拟公司"意图
   ↓ ProClawPlugin.invoke('open_virtual_company_page')
   ↓ 跳转到 /vc/wizard
   ↓ invokeTauri('nvwax_stream_session')
   ↓ NvWaX SSE 流回写到 wizard UI
   ↓ NvWaX 生成 VirtualCompanyPackage JSON
   ↓ invokeTauri('nvwax_import_virtual_company_from_url')
   ↓ 写入本地 SQLite 表 virtual_companies + virtual_company_agents
   ↓
[多设备同步]
   ↓ 5 秒后 App 启动后台同步
   ↓ invokeTauri('nvwax_list_sessions_with_state')
   ↓ 字段级 LWW 合并（mergeAgentState + reconcileSync）
   ↓ 同步报告 → UI 卡片
```

### 关键代码组织

- **Rust IPC 桥接**：`src-tauri/src/services/nvwax_client.rs`（HTTP client）+ `src-tauri/src/services/nvwax_commands.rs`（Tauri 命令）
- **TS 服务层**：`src/lib/nvwaxClient.ts` + `src/types/nvwax.ts`（类型）
- **插件 runtime**：`src/lib/pluginApi.ts` + `src/lib/pluginFrontend.ts`（插件 frontend 自动加载）
- **虚拟公司插件**：`src/plugins/virtual-company/`（manifest + frontend/index.js）
- **合并引擎**：`src/lib/virtualCompanySync.ts`（纯函数，便于单测）
- **Schema**：`docs/integration/virtual-company-package.schema.json` + `NvwaX/packages/nvwax-server/src/schemas/virtual-company-package.schema.json`（双端镜像）

### 8 个虚拟公司专用 Tauri 命令（Sprint 2.13–2.15）

详见 [`docs/integration/NVWAX_INTEGRATION.md`](integration/NVWAX_INTEGRATION.md#4-完整-nvwax-命令清单)：

| 命令 | 用途 | 引入版本 |
|------|------|----------|
| `nvwax_search_vc_templates` | 浏览 NvWaX 虚拟公司模板 | 2.13 |
| `nvwax_import_virtual_company_from_url` | 拉取 `.nvwax-vc.json` 并导入本地 SQLite | 2.13 |
| `bootstrap_virtual_company_tables` | 首次加载时建表（幂等） | 2.13 |
| `open_virtual_company_page` | 触发前端跳转到 `/vc/{wizard,import,companies}` | 2.14 |
| `nvwax_push_virtual_company_state` | 把本地状态变更回写到 NvWaX | 2.14 |
| `nvwax_stream_session` | 通过 SSE 流与 NvWaX 虚拟公司会话交互 | 2.14 |
| `nvwax_fetch_local_state` | 拉取单个 session 的最新 `local_state`（多设备同步） | 2.15 |
| `nvwax_list_sessions_with_state` | 列出用户最近的虚拟公司会话（含 `local_state`） | 2.15 |

### 合并策略（字段级 Last-Write-Wins）

多设备同步的核心是冲突解决：

- 同一虚拟公司（以 `importedPackageId` 为键）的每个 Agent 字段（`enabled` / `alias` / `ownerRole`）独立比较时间戳
- 时间更新的字段胜出（last-write-wins）
- tie 场景：云端优先
- 首次同步（无时间戳）：云端优先
- 本地独有（孤儿）：保留，不上传不删除

实现见 `src/lib/virtualCompanySync.ts::mergeAgentState`。

### 跨包 Schema 演进

- 当前：`VirtualCompanyPackage` v1.0.0
- 未来主版本升级（2.0.0+）：走 ADR 流程，确保 ProClaw 与 NvWaX 同步发布
- 兼容策略：ProClaw 端 `parseVirtualCompanyPackage` 拒绝主版本不一致的包
