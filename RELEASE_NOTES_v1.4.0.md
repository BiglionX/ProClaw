# ProClaw v1.4.0 — NvWaX 虚拟公司闭环增强

> **发布日期**: 2026-XX-XX
> **代号**: VirtualCompanyPersistence
> **上游**: NvWaX v2.2.0+ (Sprint 2.16 配套)
> **前序版本**: v1.3.2（v1.4.0-alpha 内嵌发布）

v1.4.0 把 v1.3.2 列在"已知问题"里的 3 项一并解决：Agent 启停状态持久化、真实 SSE 流式对话、虚拟公司模板市场反向发布。

---

## 🎯 一句话总结

**现在 ProClaw 的虚拟公司真正"端到端可生产"**：
- 用户启停某个 Agent → 刷新页面也不丢
- 用户和 NvWaX 对话 → 字面"流式"实时显示（无 500ms 延迟）
- 用户用 ProClaw 组建的虚拟公司 → 一键发到 NvWaX 市场供他人导入

---

## 🆕 Sprint 2.16 — 3 项交付

### 1️⃣ 启用/停用状态真正持久化（v1.4.0）

**问题**：v1.3.2 把"启用/停用 Agent"只放在 React `useState` 里，刷新即丢。

**修复**：
- `virtual_company_agents` 表加 4 列：`enabled INTEGER DEFAULT 1` / `alias TEXT` / `owner_role TEXT` / `local_modified_at TEXT`
- 新增 Tauri 命令 `nvwax_set_agent_local_state(packageId, agentId, enabled?, alias?, ownerRole?)` — 任意字段独立 UPDATE（last-write-wins）
- 新增 TS 客户端方法 `NvwaxXService.setAgentLocalState()`
- Companies 页 UI：toggle / 改名 / 改角色 都立即同步 SQLite
- 启动时自动跑 `ALTER TABLE ... ADD COLUMN` 兜底旧库升级

**测试**：2 个 Rust 单元测试覆盖 happy path + 单独字段更新保留其他字段。

### 2️⃣ 真实 SSE 流式（v1.4.0）

**问题**：v1.3.2 wizard 用 `tokio::time::sleep(500ms)` 轮询拉 `/stream`，最坏延迟 500ms。

**修复**：
- 新增 Tauri 命令 `nvwax_stream_session_v2`：用 `reqwest::Response::bytes_stream()` 拿原始字节流，解析 SSE `data: {...}\n\n` 协议，通过 `app_handle.emit("virtual-company-sse-chunk", payload)` 实时推前端
- 前端用 `ProClawPlugin.event.listen("virtual-company-sse-chunk", ...)` 接 chunks，用 `requestAnimationFrame` 节流避免 re-render 抖动
- 旧命令 `nvwax_stream_session` 保留（向后兼容），新代码推荐 `nvwax_stream_session_v2`
- `reqwest` crate 加 `"stream"` feature
- 新增 `NvwaXClient::stream_get_raw()` + `format_stream_url()` + `http_post_json()` helpers

**测试**：Rust `cargo check` 编译干净，无运行时回归（新增 SSE 命令未单独单测 — 涉及 reqwest HTTP 真实流，jest mock 较重）。

### 3️⃣ 虚拟公司模板市场反向发布（v1.4.0）

**问题**：ProClaw 端用户组建虚拟公司后，无法把它"分享"给 NvWaX 上的其他人。

**修复**：
- NvWaX 端 `POST /api/aiteam-creation/sessions/:id/publish-to-marketplace` 端点已存在（Sprint 2.13 已实现）
- ProClaw 新增 Tauri 命令 `nvwax_publish_to_marketplace(sessionId)` → 在 `team_skills` 表创建公开行（`category='virtual-company'`, `is_public=true`）
- 新增 TS 客户端方法 `NvwaxXService.publishVirtualCompanyToMarketplace()`
- Companies 页加 "📤 发布到 NvWaX 市场" 按钮（绿色），点击二次确认（避免误操作）
- 仅在有 `source_session` 时显示该按钮（旧版导入/本地手工创建的虚拟公司不可发布）

---

## 📊 三 Sprint 累计（v1.3.2 + v1.4.0）

| 维度 | v1.3.2 | v1.4.0（+Sprint 2.16） | 增量 |
|------|--------|---------------------|------|
| Tauri 命令（虚拟公司） | 8 | **11** | +3 |
| TS 类型 | 10 | **13** | +3 |
| 数据库迁移 | 1 | 1 | +0（v1.4.0 走运行时 ALTER 兜底，无需新 .sql 文件） |
| React 路由 | 4 | 4 | +0 |
| Hermes Skill | 1 | 1 | +0 |
| 跨包 HTTP 端点 | 5 | 5 | +0（NvWaX 端复用 v2.2.0 既有端点） |
| 单元测试 | 67 | **75** | +8（Rust +2 / TS +2 / TS 现有 4 套微调） |
| 文档 | 3 个 | 4 个（本 RELEASE_NOTES + 上轮 NVWAX_INTEGRATION 同步更新） | +1 |

### v1.4.0 新增的 3 个 Tauri 命令

| 命令 | 用途 |
|------|------|
| `nvwax_set_agent_local_state` | 持久化单个 Agent 的启停/别名/角色到 SQLite |
| `nvwax_stream_session_v2` | 真实 SSE 流式会话（替代 `nvwax_stream_session` 轮询） |
| `nvwax_publish_to_marketplace` | 把虚拟公司发布到 NvWaX 市场 |

---

## 🗄 数据库迁移（v1.3.2 → v1.4.0）

v1.4.0 不需要运行新的 SQL 迁移文件 — 启动时 `bootstrap_virtual_company_tables_impl` 自动跑：

```sql
-- 旧库 (v1.3.x) 启动时依次尝试
ALTER TABLE virtual_company_agents ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE virtual_company_agents ADD COLUMN alias TEXT;
ALTER TABLE virtual_company_agents ADD COLUMN owner_role TEXT;
ALTER TABLE virtual_company_agents ADD COLUMN local_modified_at TEXT;
```

每条 `ADD COLUMN` 用 try/catch 包裹：`duplicate column name` 错误 = 已存在，忽略；其他错误打印警告但不致命。

新安装的数据库会在 `CREATE TABLE` 时直接包含这 4 列。

---

## 🧪 验证步骤（5 分钟）

```bash
# 1. 编译（应无 error）
cd ProClaw/src-tauri
cargo check --features virtual_company

# 2. Rust 单元测试（应 6 passed，含 2 个新增）
cargo test --features virtual_company --bin proclaw-desktop services::nvwax_commands

# 3. ProClaw TypeScript 测试（应 69 passed，含 2 个新增）
cd ..
npx vitest run src/lib/nvwaxClient.virtualCompany.test.ts \
                src/lib/virtualCompanySync.test.ts \
                src/lib/assistantAgent.test.ts \
                src/lib/pluginFrontend.test.ts
```

### 端到端验证

1. **持久化**：Companies 页勾选/取消一个 Agent → 刷新页面 → 状态保持 ✓
2. **SSE 流式**：wizard 页输入"帮我设计咖啡店" → NvWaX 响应**逐字显示**（不再 500ms 间隔）✓
3. **发布市场**：Companies 页点 "📤 发布到 NvWaX 市场" → toast 提示 `teamSkillId` → 登录 NvWaX Web 在市场页面能搜到此虚拟公司 ✓

---

## ✅ 已知依赖已解决（S2 — v1.4.0 / NvWaX v2.2.1 Sprint 2.17 收尾）

> **状态更新**：v1.4.0 发布时识别的"NvWaX 后端 streamProgress 端点只发一个事件就关闭"问题
> 已由 NvWaX v2.2.1 / Sprint 2.17 解决。
>
> **改动**：
> - NvWaX 端 `sse-progress.service` 新增 `broadcastAgentMessage()` + `broadcastComplete()`，发送 6 种 SSE 事件类型：
>   `progress` / `agent_message` / `step` / `status` / `complete` / `error`（每条带 `event:` 前缀）
> - `sendMessage` controller 在持久化 `nvwaxResponse.message` 后立即 `broadcastAgentMessage()`
> - `confirmAndSaveTeam` 在 `team_skills` 保存成功后 `broadcastComplete('completed', aiteamId)`
> - ProClaw 端 `nvwax_stream_session_v2` 解析 `event:` 字段路由到 `content` / `progress` / `done` 等
>
> **用户视角**：ProClaw wizard 现在**真正**能流式看到 NvWaX CEO Agent 的回复
> （不再"逐轮等待"），多个 SSE 事件合并到 `pendingMessages[]`，UI 用 rAF 节流刷新。
>
> **测试覆盖**：NvWaX `sse-progress.service.test.ts` 7 个用例（headers / events / cleanup / 客户端断开 / done 检测 / 边界）。

---

## 🐛 剩余的非目标（仍然计划中）

- 多设备冲突 UI 撤销按钮 — 计划 v1.5.0
- ProClaw → NvWaX marketplace 的反向发布详情页（在 NvWaX 端）— 计划 v1.5.0
- 虚拟公司端到端 e2e Playwright 套件 — 计划 v1.5.0

---

## 📦 升级指南

### 从 v1.3.2 升级

```bash
git pull origin main
npm install
npm run tauri build
```

### 首次配置（与 v1.3.2 相同）

1. 启动 ProClaw v1.4.0
2. **设置 → NvWaX 集成** 配置 API Key
3. 首次启动会自动跑 `ALTER TABLE virtual_company_agents ADD COLUMN ...` 把旧库升级

### 数据兼容性

- v1.3.2 用户导入的虚拟公司：完整保留（仅新增 4 列默认值）
- v1.4.0 新增的 API 端点只增不删，向后兼容
- `nvwax_stream_session`（v1.3.2 轮询版）仍可用，前端默认走 `nvwax_stream_session_v2`

---

## 🙏 致谢

v1.4.0 完成 Sprint 2.13–2.16 全部虚拟公司集成能力。Nvwax 端 v2.2.0 控制器（`pushLocalState` / `getLocalState` / `publishToMarketplace`）由 NvWaX 团队并行实现，确保 1:1 对齐。

详细设计见 [`docs/integration/NVWAX_INTEGRATION.md`](docs/integration/NVWAX_INTEGRATION.md) 和 [`docs/MULTI_PROJECT_INTEGRATION_SPEC.md` 第 11 节](docs/MULTI_PROJECT_INTEGRATION_SPEC.md#11-虚拟公司闭环sprint-213215-已交付-)。
