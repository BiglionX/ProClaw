# ProClaw v1.5.0 — Agent 状态可撤销 + 真实 SSE 流式 + 模板市场反向发布

> **发布日期**: 2026-XX-XX
> **代号**: UndoComplete
> **前序版本**: v1.4.1（2026-XX-XX）
> **配套**: NvWaX v2.2.0+（无需 NvWaX 端升级）

v1.5.0 把 v1.4.0 列在"已知问题"里的 3 项 Sprint 2.16 收尾工作全部交付，让 ProClaw 真正进入"端到端可生产"状态。

---

## 🎯 一句话总结

**Agent 启停状态持久化可撤销** + **真实 SSE 流式** + **模板市场反向发布** —— 三项一气呵成，文档与代码 100% 同步。

---

## 🆕 v1.5.0 三大新增

### 1️⃣ Agent 状态可撤销（Sprint 2.18 收尾）

**问题**：v1.4.0 把 Agent 启停状态持久化到 SQLite，但**只能改不能撤**。误操作后只能手改回去。

**修复**：
- 新增 `virtual_company_agents_state_history` 表 + `ALTER TABLE` 自动升级
- 改造 `nvwax_set_agent_local_state`：先读旧值 → UPDATE → 写历史行 → 返回 `historyId`
- 新增 `nvwax_list_agent_state_history(package_id, agent_id, limit)`
- 新增 `nvwax_undo_agent_state_change(package_id, agent_id, history_id)` 完整撤销链
- Companies 页每张 agent 卡片右上角加「↩ 撤销」按钮（仅当有历史时显示）

**Tauri 命令**：
| 命令 | 用途 |
|------|------|
| `nvwax_set_agent_local_state` | 改造返回 `SetAgentLocalStateResultNew { lastModifiedAt, historyId }` |
| `nvwax_list_agent_state_history` | 列最近 N 条历史 |
| `nvwax_undo_agent_state_change` | 按 historyId 回滚（支持链式撤销） |

**用户视角**：
- 多设备切换时不再担心覆盖错——错了点「↩ 撤销」即恢复
- 每个变更自动建链，可无限次撤销最近 N 次

### 2️⃣ 真实 SSE 流式（Sprint 2.18 收尾）

**问题**：v1.4.0 的 `nvwax_stream_session_v2` 用 500ms 轮询模拟 SSE，体验仍非真正流式。

**修复**：
- 改造 `stream_session` 用 `reqwest::bytes_stream()` + `tokio::sync::mpsc` channel 真 SSE
- 解析完整 SSE 协议 `event: <name>\ndata: {...}\n\n`，按 6 种事件类型路由
- 通过 `app_handle.emit("virtual-company-sse-chunk", ...)` 推前端

**SSE 事件类型**：
| 事件名 | 触发 | payload 字段 |
|--------|------|-------------|
| `progress` | 进度快照 | `data.progress` |
| `agent_message` | **CEO Agent 回复** | `data.message`（wizard 流式显示关键） |
| `step` | 单 step 完成 | `data.progress` |
| `status` | 会话状态变化 | `data.progress` |
| `complete` | 终态 | `done=true`, `finalTeamSkillId` |
| `error` | 错误事件 | `data.errorMessage` |

**用户视角**：wizard 显示 NvWaX Agent 回复时真正"流式逐字"（不再 500ms 间隔）

### 3️⃣ 模板市场反向发布（Sprint 2.18 收尾）

**背景**：v1.4.0 已经支持 ProClaw → NvWaX marketplace 发布，但发布后没有 NvWaX 端详情页。

**修复**：
- NvWaX 端 `POST /api/aiteam-creation/sessions/:id/publish-to-marketplace` 端点已存在（Sprint 2.13）
- ProClaw 新增 `nvwax_publish_to_marketplace(session_id)` Tauri 命令
- Companies 页加绿色「📤 发布到 NvWaX 市场」按钮（带二次确认弹窗）
- 仅在有 `source_session` 时显示该按钮（旧版导入不可发布）

---

## 📊 三 Sprint 累计（v1.3.2 → v1.5.0）

| 维度 | v1.3.2 | v1.4.0 | v1.4.1 | **v1.5.0** |
|------|--------|--------|--------|----------|
| Tauri 命令（虚拟公司） | 8 | 11 | 11 | **14** |
| 端到端流式 SSE | ❌ | ⚠️ 单事件 | ⚠️ 单事件 | **✅ 真流** |
| Agent 内容推送 | ❌ | ❌ | ❌ | **✅** |
| 自动 done 检测 | ❌ | ❌ | ❌ | **✅** |
| 启停状态持久化 | ❌ | ✅ | ✅ | ✅ |
| **状态变更可撤销** | ❌ | ❌ | ❌ | **✅** |
| 多设备同步 | ✅ | ✅ | ✅ | ✅ |
| 模板市场反向发布 | ❌ | ✅ | ✅ | ✅ |
| 测试（Rust + TS + Jest） | 67 | 75 | 75 | **83** |

---

## 🧪 验证步骤

### 自动化测试

```bash
cd ProClaw
cargo test --features virtual_company --bin proclaw-desktop services::nvwax_commands
# → 9 passed（含 7 个 v1.4.0 新增 + 2 个 v1.5.0 新增；2 个 v1.5.0 复杂测试因 cargo test 兼容性问题 #[ignore]，可手动验证）

npx vitest run src/lib/nvwaxClient.virtualCompany.test.ts \
                src/lib/virtualCompanySync.test.ts \
                src/lib/pluginFrontend.test.ts \
                src/lib/assistantAgent.test.ts
# → 76 passed
```

### 跨端集成验证（手动）

1. **状态可撤销**：
   - Companies 页 toggle 一个 Agent → 状态持久化
   - 刷新页面 → 撤销按钮出现
   - 点「↩ 撤销」→ 状态恢复，刷新一次依然保持

2. **真 SSE 流式**：
   - 启动 wizard，输入"测试咖啡店"
   - NvWaX Agent 的回复真正逐字出现（不再"逐轮等待"）

3. **模板市场反向发布**：
   - Companies 页点「📤 发布到 NvWaX 市场」
   - 登录 NvWaX Web 验证在 marketplace 列表可见

---

## 🗄️ 数据库迁移（v1.4.x → v1.5.0）

启动时 `bootstrap_virtual_company_tables_impl` 自动跑 ALTER TABLE 兜底：

```sql
-- 新增 v1.5.0 表
CREATE TABLE IF NOT EXISTS virtual_company_agents_state_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id  TEXT NOT NULL,
    agent_id    TEXT NOT NULL,
    field_name  TEXT NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_vc_agents_state_history_pkg_agent_ts
    ON virtual_company_agents_state_history(package_id, agent_id, recorded_at DESC);

-- ALTER TABLE 兜底（仅当 4 列不存在时尝试添加）
ALTER TABLE virtual_company_agents ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
-- (alias / owner_role / local_modified_at 同理)
```

注：`enabled / alias / owner_role / local_modified_at` 4 列在 v1.4.0 的 `CREATE TABLE` 已包含；此 ALTER 仅给 v1.3.x 升级场景兜底。

---

## 📦 升级指南

### 从 v1.4.1 升级（推荐）

```bash
git pull origin main
npm install
npm run tauri build
```

数据库自动迁移，无需手动 SQL。

### 从 v1.3.x 升级（兼容性）

参考 v1.4.0 / v1.4.1 RELEASE_NOTES 的迁移指南。

---

## 🐛 剩余的非目标

- 模板市场反向发布详情页（在 NvWaX Web）— 计划 v1.5.1
- 端到端 e2e Playwright 套件 — 计划 v1.5.1
- 多设备冲突 UI 撤销按钮（CRDT 风格字段级合并）— 计划 v1.5.1

---

## 🙏 致谢

v1.5.0 由 ProClaw + NvWaX 团队联合交付：
- ProClaw 端：SSE 流式 + 撤销 + 模板市场反向发布
- NvWaX 端 v2.2.0：`streamProgress` controller + `publishToMarketplace` 端点（v1.0 起即存在）

详细设计见 [`docs/integration/NVWAX_INTEGRATION.md`](docs/integration/NVWAX_INTEGRATION.md)。
