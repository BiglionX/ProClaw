# ProClaw v1.4.1 — NvWaX 真实 SSE 流式收尾

> **发布日期**: 2026-XX-XX
> **代号**: SSEComplete
> **前序版本**: v1.4.0（2026-XX-XX）
> **配套**: NvWaX v2.2.1+（Sprint 2.17）

v1.4.1 是一个**Sprint 2.17 收尾版**——把 v1.4.0 列为"已知依赖"的 NvWaX 端真 SSE 流式实现正式交付完成。

---

## 🎯 一句话总结

**ProClaw wizard 现在真正能流式看到 NvWaX CEO Agent 的回复**——不再"逐轮等待"，LLM 每推进一次就立即推一条 SSE 事件，前端用 rAF 节流合并到 streamText。

---

## 🆕 v1.4.0 → v1.4.1 变更

### ✅ 完成

| 变更 | 来源 | 影响 |
|------|------|------|
| ProClaw `nvwax_stream_session_v2` 解析 `event:` 字段路由 6 种 SSE 事件 | 本轮（Sprint 2.17） | wizard UI 真正流式 |
| NvWaX 后端 `sse-progress.service` 新增 `broadcastAgentMessage()` + `broadcastComplete()` | 配套 NvWaX v2.2.1 | 端到端打通 |
| NvWaX `sendMessage` controller 调用 `broadcastAgentMessage(...)` | 配套 NvWaX v2.2.1 | agent 回复立即推送 |
| NvWaX `confirmAndSaveTeam` 调用 `broadcastComplete('completed', aiteamId)` | 配套 NvWaX v2.2.1 | 终态显式通知 |
| NvWaX 修 `forEach` 突变 bug（`broadcastComplete` 用 `clientsSnapshot`） | 配套 NvWaX v2.2.1 | 避免跳过元素 |
| NvWaX SSE service 单测 7 个（headers / events / cleanup / done / 客户端断开） | 配套 NvWaX v2.2.1 | 回归保护 |
| 文档同步：README / CHANGELOG / REQUIREMENTS / PROJECT_POSITIONING / NVWAX_INTEGRATION / v1.4.0 RELEASE_NOTES 全部标注 Sprint 2.17 收尾 | 本轮 | 1:1 一致 |
| 版本号 bump 1.4.0 → 1.4.1（4 个文件）| 本轮 | 反映 Sprint 2.17 收尾 |

### 🔧 ProClaw 端 Rust 改动（`nvwax_stream_session_v2`）

```rust
// v1.4.0：只读 data: {...} 整体
// v1.4.1：分 event + data 行路由

while let Some(idx) = buffer.find("\n\n") {
    let raw_event = buffer[..idx].to_string();
    buffer = buffer[idx + 2..].to_string();
    let mut current_event = String::from("message"); // 默认
    let mut data_line: Option<String> = None;
    for line in raw_event.lines() {
        if let Some(rest) = line.strip_prefix("event: ") {
            current_event = rest.to_string();  // 缓存 event 名
        }
        if let Some(rest) = line.strip_prefix("data: ") {
            data_line = Some(rest.to_string());
        }
    }
    let Some(json_str) = data_line else { continue };
    let Ok(parsed) = serde_json::from_str::<Value>(&json_str) else { continue };
    match current_event.as_str() {
        "agent_message" => /* data.message -> accumulator */
        "complete"      => { done = true; }
        "error"         => { eprintln!("NvWaX error"); done = true; }
        _               => /* 旧版兼容 */ }
}
```

### 🔧 NvWaX 端改动（`sse-progress.service.ts`，独立 PR）

```ts
// 新增 broadcastAgentMessage（agent_message 事件）
broadcastAgentMessage(sessionId, message, phase?, progress?, confidence?, nextStep?) {
  // 遍历所有 client，event: agent_message\ndata: {...}\n\n
}

// 新增 broadcastComplete（complete 事件 + 断开）
broadcastComplete(sessionId, finalStatus, finalTeamSkillId?) {
  // 完整生命周期：push complete event → res.end() → disconnect 清理
  // 修复 forEach 期间 splice 同一数组的 bug
}

// 升级 sendEvent 写 SSE event: 前缀
sendEvent(client, event) {
  const eventName = event.type
    .replace('_update', '')
    .replace('session_status_changed', 'status')
    .replace('step_completed', 'step');
  client.res.write(`event: ${eventName}\ndata: ${data}\n\n`);
}
```

### 📋 6 种 SSE 事件路由表

| NvWaX event 名 | 触发场景 | ProClaw `payload.content` 来源 |
|--------------|----------|------------------------------|
| `progress` | 当前进度快照 | `data.progress` |
| `agent_message` | **CEO Agent 回复** | `data.message`（wizard 流式显示） |
| `step` | 单 step 完成 | `data.progress` |
| `status` | 会话状态变化 | `data.progress` |
| `complete` | 终态（completed / failed / cancelled） | `done = true`，携带 `finalTeamSkillId` |
| `error` | 错误事件 | `done = true`，错误信息写 Rust `eprintln!` |

**向后兼容**：旧版（无 `event:` 前缀）客户端 fallback 到 `progress_update` 行为，ProClaw v1.4.0 的解析逻辑不会破坏。

---

## 📊 v1.4.0 + v1.4.1 累计（Sprint 2.13–2.17）

| 维度 | v1.3.2 | v1.4.0 | **v1.4.1** |
|------|--------|--------|----------|
| Tauri 命令（虚拟公司） | 8 | 11 | 11 |
| 端到端流式 SSE | ❌ | ⚠️ 单事件 | **✅ 真流** |
| Agent 内容推送 | ❌ | ❌ | **✅** |
| 自动 done 检测 | ❌ | ❌ | **✅** |
| 启停状态持久化 | ❌ | ✅ | ✅ |
| 多设备同步 | ✅ | ✅ | ✅ |
| 模板市场反向发布 | ❌ | ✅ | ✅ |
| 测试（Rust + TS + Jest） | 67 | 75 | 82 |

---

## 🧪 验证步骤

### 跨端集成验证（手动）

1. 启动 ProClaw v1.4.1 + NvWaX v2.2.1
2. ProClaw wizard 输入 "帮我设计咖啡店"
3. **预期**：wizard 实时显示 NvWaX CEO Agent 回复（逐字 / 逐句累加），不再"逐轮等待"
4. 等 NvWaX 流程跑完 → wizard 自动结束，显示团队 ID

### 自动化测试

```bash
# ProClaw
cd ProClaw
cargo test --features virtual_company --bin proclaw-desktop services::nvwax_commands
# → 8 passed, 0 failed

npx vitest run src/lib/nvwaxClient.virtualCompany.test.ts \
                src/lib/virtualCompanySync.test.ts \
                src/lib/pluginFrontend.test.ts \
                src/lib/assistantAgent.test.ts
# → 73 passed, 0 failed

# NvWaX
cd NvwaX/packages/nvwax-server
NODE_OPTIONS=--experimental-vm-modules npx jest --testPathPatterns=sse-progress.service
# → 7 passed, 0 failed
```

---

## 📦 升级指南

### 从 v1.4.0 升级

```bash
git pull origin main
npm install
npm run tauri build
```

代码 / 数据库 schema 100% 向后兼容——v1.4.0 升级只是 Rust 解析逻辑增强（旧版 NvWaX 仍可工作）。

### 从更早版本升级

参考 [v1.4.0 RELEASE_NOTES](RELEASE_NOTES_v1.4.0.md) 和 [v1.3.2 RELEASE_NOTES](RELEASE_NOTES_v1.3.2.md) 的迁移指南。

---

## 🐛 剩余的非目标

- ProClaw → NvWaX marketplace 的反向发布详情页 — 计划 v1.5.0
- 多设备冲突 UI 撤销按钮 — 计划 v1.5.0
- 虚拟公司端到端 e2e Playwright 套件 — 计划 v1.5.0
- Postgres LISTEN/NOTIFY 替代 push 模式（性能优化方向，用户视角无感）

---

## 🙏 致谢

v1.4.1 的 1.4.0 已知依赖 (S2) 收尾由 NvWaX 团队 Sprint 2.17 端实现完成：
- 新增 6 种 SSE 事件类型 + `broadcastAgentMessage()` / `broadcastComplete()` 方法
- 单测 7 个用例覆盖

跨端协作让 ProClaw wizard 真正能流式显示 NvWaX Agent 回复。

详细设计见 [`docs/integration/NVWAX_INTEGRATION.md` §4.5.2](docs/integration/NVWAX_INTEGRATION.md#452-sse-事件类型路由sprint-217--nvwax-v221)。