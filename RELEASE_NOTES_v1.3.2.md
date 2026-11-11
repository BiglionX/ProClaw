# ProClaw v1.3.2 — NvWaX 虚拟公司闭环

> **发布日期**: 2026-XX-XX
> **代号**: VirtualCompanyLoop
> **上游**: NvWaX v2.2.0+ (Sprint 2.13–2.15 配套)

v1.3.2 是 ProClaw 与 NvWaX 双向集成的里程碑版本。三个 Sprint 累计 **8 个新 Tauri 命令 / 10 个 TS 类型 / 1 套 JSON Schema / 2 套纯函数合并引擎 / 4 个 React 路由 / 67 个测试**，从「能跑」升级到「体验优秀」。

---

## 🎯 一句话总结

**现在 ProClaw 是 NvWaX 官方推荐的"本地壳"**。在 NvWaX 云端用对话式 AI 5-10 分钟设计好虚拟公司，一键导出 `.nvwax-vc.json`，回到 ProClaw 桌面端本地运行整个 AI 团队。多设备之间自动同步 Agent 启停状态。

---

## 🆕 Sprint 2.13 — 最小闭环

让"云端创建 → 本地运行"跑通。

### 跨包数据契约
- 新增 `docs/integration/virtual-company-package.schema.json`（JSON Schema v1.0.0）
  - 必填：`schemaVersion` / `packageId` / `exportedAt` / `source.platform === "nvwax"` / `team.id` / `team.name` / `agents[]`
  - 可选：`checksum`（SHA-256）· `skills[]` · `metadata`
  - 镜像：[`NvwaX/packages/nvwax-server/src/schemas/virtual-company-package.schema.json`](https://github.com/BiglionX/NvwaX)
  - 主版本不一致即拒绝导入（schemaVersion 1.x → 2.x 走 ADR 流程）

### NvWaX 服务端
- `POST /api/aiteam-creation/sessions/:id/integrate-proclaw` 真正实现：把 `team_design` / `ceo_config` / `agent_matches` / `skill_matches` 组装成 `VirtualCompanyPackage`，写入 `os.tmpdir()/nvwax-vc-packages/{uuid}.nvwax-vc.json`，返回 `{packageId, downloadUrl, checksum, teamName, agentsCount}`
- `GET /api/aiteam-creation/packages/:packageId/download` 端点（128-bit UUID 不可枚举）
- 数据库迁移：`migrations/012_virtual_company_local_state.sql`（新增 `aiteam_creation_sessions.local_state` JSONB 列）

### ProClaw Rust IPC 桥接
- `nvwax_search_vc_templates`（带计费点 `virtual_company/search_templates`）
- `nvwax_import_virtual_company_from_url`（拉取 URL → 校验 → 写入 SQLite）
- `bootstrap_virtual_company_tables`（首次加载时建表，幂等）
- `open_virtual_company_page`（参数 `target`：`wizard` | `import` | `companies`）

### ProClaw 前端
- 内置 `virtual-company` 插件（重写，4 个 React 路由）：
  - `/vc/templates` — 浏览 NvWaX 模板（搜索框 + 卡片网格 + 「导入」按钮）
  - `/vc/wizard` — 创建向导（带本地草稿区）
  - `/vc/import` — 粘贴 NvWaX 下载链接，一键导入
  - `/vc/companies` — 我的团队列表 + 详情 + 本地状态管理
- **修复了 v1.3.0 plugin frontend 不加载的 bug**：`src/lib/pluginFrontend.ts` 用 `import.meta.glob` 自动加载所有 `src/plugins/*\/frontend/index.js`，并在 `main.tsx` 启动时调用

---

## 🚀 Sprint 2.14 — 4 项增强

让"本地壳"用起来体验一流。

### 1. CEO Agent Skill 集成（只跳转）
- 新增 Hermes Skill `sk_preset_open_virtual_company_wizard`（16 条 trigger phrases 覆盖中文/英文）
- `assistantAgent.ts` 新增意图类型 `virtual_company`，含 target: `'wizard' | 'import' | 'companies'`
- 用户输入"帮我开一家咖啡店的虚拟公司" → 自动跳转 `/vc/wizard`

### 2. 开发者文档 `NVWAX_INTEGRATION.md`（220+ 行）
- 概念模型 + 完整 Tauri 命令清单（40+ 个）+ ProClawPlugin API 参考
- 五个详细章节：快速上手 / 完整命令 / 计费模型 / 错误处理 / 扩展点 / 版本兼容性 / 常见问题 / 测试

### 3. 本地→云回写 API
- NvWaX：`PUT /api/aiteam-creation/sessions/:id/local-state`（接收 Agent 启用/停用 + 别名 + 负责人角色）
- ProClaw：`nvwax_push_virtual_company_state`（带计费点 `virtual_company/push_local_state`）
- Companies 页加"☁️ 同步状态到 NvWaX"按钮 + 实时推送

### 4. 本地 SSE 流式创建
- ProClaw：`nvwax_stream_session`（POST message + 轮询 `/sessions/:id/stream`，60s 上限）
- wizard 页完整重写：消息列表 + 输入框 + 流式显示 + API Key 缺失降级提示
- 用户不再需要跳转到 Web，整个虚拟公司创建流程在 ProClaw 内完成

---

## 🔄 Sprint 2.15 — 多设备同步

让"MacBook 上启用的 Agent 自动同步到 Windows 桌面端"。

### 拉取 API（NvWaX）
- `GET /api/aiteam-creation/sessions/:id/local-state`（单个 session 的完整 `local_state`）
- `GET /api/aiteam-creation/sessions` 列表响应增加 `local_state` + `localStateLastSyncedAt` 字段

### ProClaw 合并引擎
- **`mergeAgentState(local, remote)`**：字段级 last-write-wins
  - 三个字段（enabled / alias / ownerRole）独立比较时间戳
  - tie 场景：云端优先
  - 首次同步（无时间戳）：云端优先
- **`reconcileSync(cloudSessions, localCompanies)`**：全量对账，返回 `{merged, cloudOnly, localOnly, meta}`
- **`startBackgroundSync()`**：App 启动 5 秒后，若 API Key 已配置则后台静默同步（不弹 toast）

### Companies 页 UI
- 新增"🔄 立即同步（从 NvWaX 拉取最新）"按钮（橙色，区别于紫色的"同步到 NvWaX"）
- 新增"🔄 上次同步报告"卡片，显示：
  - ✅ 已合并 N 个（merge 后字段来源：local/remote/tie）
  - ☁️ 云端独有 N 个（需导入）
  - 📦 本地独有 N 个（孤儿，保留）

### ProClaw 新 Tauri 命令
- `nvwax_fetch_local_state(session_id)`
- `nvwax_list_sessions_with_state(limit, offset)`

---

## 📊 三 Sprint 累计

| 维度 | 数据 |
|------|------|
| 新增 Tauri 命令 | 8 个（虚拟公司专用） |
| 新增 TS 类型 | 10 个（`VirtualCompanyPackage` 全家桶） |
| 新增 Rust 类型 | 8 个（Serde struct） |
| 新增 HTTP 端点 | 3 个（integrate-proclaw POST, local-state PUT/GET, packages download） |
| 新增数据库迁移 | 1 个（NvWaX `012_virtual_company_local_state.sql`） |
| 新增 React 路由 | 4 个（`/vc/{templates,wizard,import,companies}`） |
| 新增 Hermes Skill | 1 个（`sk_preset_open_virtual_company_wizard`） |
| 新增测试 | 67 ProClaw TS + 4 Rust + 4 NvWaX Jest = **75 个** |
| 新增文档 | 3 个（schema.json + NVWAX_INTEGRATION.md + 本 RELEASE_NOTES） |

---

## 📦 升级指南

### 从 v1.3.0 / v1.3.1 升级

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖（无新增，但确保 package-lock.json 同步）
npm install

# 3. 构建
npm run tauri build
```

### 首次配置 NvWaX 集成

1. 启动 ProClaw v1.3.2
2. 进入 **设置 → NvWaX 集成**
3. 登录 https://nvwax.proclaw.cc 获取 API Key（格式 `nvwax_*`），粘贴进去保存
4. 看到 toast「已加载 X 个虚拟公司插件」即表示集成成功

### 首次体验虚拟公司闭环

1. 在 CEO Agent 对话中输入：「帮我开一家咖啡店的虚拟公司」
2. 自动跳转到 `/vc/wizard` 创建向导（或点开"虚拟公司"侧边栏）
3. 与 NvWaX SSE 流对话（5-10 分钟）→ NvWaX 生成虚拟公司
4. 一键下载 `.nvwax-vc.json` → ProClaw 自动导入
5. 在「我的团队」里启用/停用 Agent → 点"☁️ 同步到 NvWaX" → MacBook 上的 ProClaw 下次启动时会自动拉取最新

---

## 🧪 验证步骤

### 1. 编译验证（5 分钟）

```bash
# ProClaw Rust
cd ProClaw/src-tauri
cargo check --features virtual_company          # 应 Finished, 0 error
cargo test --features virtual_company --bin proclaw-desktop services::nvwax_commands  # 应 4 passed

# ProClaw TypeScript
cd ProClaw
npx tsc --noEmit -p tsconfig.json                 # 0 error in 我改动的文件
npx vitest run src/lib/nvwaxClient.virtualCompany.test.ts \
                 src/lib/pluginFrontend.test.ts \
                 src/lib/assistantAgent.test.ts \
                 src/lib/virtualCompanySync.test.ts  # 67 passed

# NvWaX TypeScript
cd NvwaX/packages/nvwax-server
NODE_OPTIONS=--experimental-vm-modules npx jest --testPathPatterns=proclaw  # 4 passed
```

### 2. 端到端验证（10 分钟）

1. 配置 NvWaX API Key
2. 进入 `/vc/templates`，看到至少 1 个 NvWaX 模板
3. 进入 `/vc/wizard`，与 NvWaX 助手对话 3-5 轮
4. NvWaX 完成 → 看到 toast「团队已生成 ProClaw 导出包」 + 自动下载 .nvwax-vc.json
5. 进入 `/vc/import`，粘贴下载链接 → 看到「已导入 X 个 Agent」
6. 进入 `/vc/companies`，启用/停用某个 Agent → 点"☁️ 同步到 NvWaX"
7. App 退出 → 重新启动 → 5 秒后日志看到「virtualCompanySync 后台同步」
8. 重新进入 `/vc/companies` → Agent 启停状态与上次保持一致

---

## 🐛 已知问题 / 非目标

> ⚠️ **更新**：以下 3 项已在 v1.4.0 解决：
>
> - ✅ **真实 SSE 流式**（替代 500ms 轮询）— ProClaw + NvWaX 双端已完成，详见 [RELEASE_NOTES_v1.4.0.md §"已知依赖已解决"](RELEASE_NOTES_v1.4.0.md) (v1.4.0 / NvWaX v2.2.1 Sprint 2.17 收尾)
> - ✅ **启用/停用状态真正持久化**到 `virtual_company_agents.enabled/alias/owner_role` 列 — 见 v1.4.0
> - ✅ **虚拟公司模板市场反向发布**（ProClaw → NvWaX marketplace）— 见 v1.4.0
>
> 剩余仍待 v1.5.0：
>
> - 多设备冲突 UI 撤销按钮（CRDT 风格字段级合并）

---

## 🙏 致谢

本版本由 [ProClaw](https://github.com/BiglionX/ProClaw) + [NvWaX](https://github.com/BiglionX/NvwaX) 团队联合交付。
特别感谢 NvWaX 团队在 Sprint 2.13 阶段同步补齐了 aiteam_creation 控制器 + 模板数据库，让两端可以 1:1 对接。
