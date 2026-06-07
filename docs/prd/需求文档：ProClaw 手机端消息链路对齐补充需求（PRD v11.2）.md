# 需求文档：ProClaw 手机端消息链路对齐补充需求（PRD v11.2）

> 版本：v11.2  
> 状态：待评审  
> 创建日期：2026-06-07  
> 关联文档：[产品需求文档：ProClaw 手机独立版（PRD v11.0）](./产品需求文档：ProClaw 手机独立版（PRD v11.0）.md)

---

## 1. 背景与目标

### 1.1 背景

经过对移动端消息链路的全面审查，对比桌面端（Tauri/Rust）消息体系的成熟度，发现移动端存在以下结构性问题：

- 数据库表体系存在双轨制（旧 `messages` 表 vs 新 `chat_messages`/`chat_sessions`），身份切换时数据生命周期不一致
- 未读计数链路断裂（字段存在但从不递增）
- 个人联系人无法直接发起聊天（跳转链断裂）
- Agent WebView 内 `proclaw.sendMessage` 桥接未接通
- AI 回复单一供应商依赖（仅 DeepSeek），桌面端有多供应商回退
- 无可复用的消息状态管理层

### 1.2 目标

使移动端消息体系与桌面端功能对齐，同时尊重移动端的交互特征（更轻量、更精简），确保核心消息链路的完整性和健壮性。

---

## 2. 需求清单

### 【P0 阻塞级】需求 1：统一消息数据库表体系

#### 问题描述

| 表 | 创建者 | 生命周期管理 | sync_status | 实际使用 |
|----|--------|-------------|-------------|---------|
| `messages`（旧版） | `SchemaManager.ts` 全局迁移 | 身份切换时 drop/recreate | ✅ 有 | 仅 OrderCardMessage 用其类型 |
| `chat_messages`/`chat_sessions`（新版） | `ChatService.ts` 懒初始化 | 不在 SchemaManager 范围内 | ❌ 无 | 所有实际读写 |

**核心矛盾**：实际读写的表不在 SchemaManager 管辖下，身份切换时旧表被 drop 但新表残留；新表又缺少 `sync_status` 字段，未来无法支持云端同步。

#### 需求内容

1. **统一为单套消息表**：保留 `chat_messages` + `chat_sessions` 作为移动端唯一消息存储
2. **纳入 SchemaManager 生命周期管理**：
   - 在 `SchemaManager.ts` 中添加 `chat_messages` 和 `chat_sessions` 的建表/删表语句
   - 身份切换时与其他表一样执行 drop/recreate，保证数据隔离
3. **增加关键字段**：
   ```sql
   ALTER TABLE chat_messages ADD COLUMN sync_status TEXT DEFAULT 'local';
   ALTER TABLE chat_sessions ADD COLUMN sync_status TEXT DEFAULT 'local';
   ```
4. **清理旧代码**：
   - 移除 `MessageService.ts` 或将其类型定义统一为新版结构
   - 修改 `OrderCardMessage.tsx` 适配新版 `ChatMessage` 类型
5. **数据迁移**：首次启动时检测旧 `messages` 表数据，自动迁移到 `chat_messages`

#### 验收标准

- [ ] 身份切换后，切换前后的聊天记录互不可见
- [ ] `chat_messages` 和 `chat_sessions` 表包含 `sync_status` 字段
- [ ] 旧版 `messages` 表不再被创建或引用
- [ ] `OrderCardMessage` 使用新版类型正常工作

---

### 【P0 阻塞级】需求 2：AgentView WebView sendMessage 桥接修复

#### 问题描述

`AgentView.tsx` 中 WebView 内 JS 调用 `proclaw.sendMessage(to, content)`，经过 `agentRuntimeBridge.request(agent.id, 'sendMessage', to, content)` 转发，但 `AgentRuntimeBridge.ts` 中没有 `sendMessage` 的 handler，导致 WebView 内 Agent 无法发送消息。

#### 需求内容

1. 在 `AgentRuntimeBridge.ts` 中新增 `sendMessage` handler：
   ```
   入参: { to: string, content: string }
   行为: 调用 ChatService.sendMessage() 写入 chat_messages 表
   返回: 消息对象 { id, session_id, content, sender_type, created_at }
   ```
2. handler 需处理：
   - 自动创建或获取对应的 `chat_session`
   - sender_type 设为 `'other'`（Agent 发出的消息）
   - 更新 `chat_sessions` 的 `last_message` 和 `last_message_time`
3. 失败时返回结构化错误，避免 WebView 侧长时间等待

#### 验收标准

- [ ] WebView 内 Agent 调用 `proclaw.sendMessage` 后，消息正确写入 `chat_messages`
- [ ] ChatDetail 中能看到 Agent 通过 WebView 发送的消息
- [ ] 失败时 WebView 收到可读的错误信息

---

### 【P0 阻塞级】需求 3：个人联系人 → 聊天跳转实现

#### 问题描述

`ContactsTab.tsx` 中 `handlePersonalPress` 目前只导航到 `MessagesTab`，注释写着"后续 Task 3 将实现"。点击个人联系人无法直接进入聊天页面。

#### 需求内容

1. `handlePersonalPress` 改为：
   ```
   调用 ChatService.createOrGetSession(targetId, targetName, 'personal', targetIcon)
   → 导航到 ChatDetail({ sessionId, targetId, targetName, targetType: 'personal', targetIcon })
   ```
2. 参照 Agent/Team 联系人的现有跳转逻辑（第 322-329 行），保持参数一致

#### 验收标准

- [ ] 点击联系人列表中的个人联系人，直接进入聊天页面
- [ ] 若已有会话历史，展示历史消息
- [ ] 若无历史会话，展示空白聊天界面

---

### 【P1 重要】需求 4：未读计数递增逻辑

#### 问题描述

- `ChatService.sendMessage()` 只更新 `last_message` 和 `last_message_time`，不递增 `unread_count`
- `markRead()` 将 `unread_count` 设为 0，但因从未递增，始终为 0
- MessagesTab 的未读徽章永远不会显示

#### 需求内容

1. **非当前会话的消息计入未读**：
   - 在 `sendMessage` 中判断：若消息的 `sender_type !== 'self'` 且发送的目标会话不是当前活跃会话，则 `UPDATE chat_sessions SET unread_count = unread_count + 1`
2. **当前活跃会话不递增未读**：通过 Context/Store 传递 `activeSessionId`
3. **进入会话时清零**：ChatDetailScreen 的 `useFocusEffect` 中调用 `markRead(sessionId)`
4. MessagesTab 的未读徽章绑定 `unread_count > 0` 显示

#### 验收标准

- [ ] 在会话 A 中收到 Agent 回复时，切换到会话 B 后会话 A 显示未读徽章
- [ ] 进入会话后未读徽章消失
- [ ] 自己发的消息不增加对自己的未读计数

---

### 【P1 重要】需求 5：引入消息状态管理层（Store/Context）

#### 问题描述

消息状态完全由各组件本地 `useState` 管理，MessagesTab 和 ChatDetailScreen 之间数据不同步。在 ChatDetail 发完消息回到 MessagesTab 时，列表依赖 `useFocusEffect` 全量重载，效率低且可能有闪烁。

#### 需求内容

1. 创建 `ChatStore`（使用 React Context + useReducer），管理：
   - `sessions: ChatSession[]` — 所有会话列表
   - `messages: Record<string, ChatMessage[]>` — 按 sessionId 索引的消息映射
   - `activeSessionId: string | null` — 当前活跃会话
   - `aiThinking: boolean` — AI 是否正在思考
2. 提供 actions：
   - `loadSessions()` / `createOrGetSession()`
   - `loadMessages(sessionId)` / `sendMessage(sessionId, content, senderType)`
   - `markRead(sessionId)` / `togglePin(sessionId)`
   - `addMessage(sessionId, message)` / `setActiveSession(sessionId)`
3. MessagesTab 和 ChatDetailScreen 统一从 ChatStore 消费状态
4. 发送消息后无需全量重载 — Store 内部自动更新 sessions 列表

#### 验收标准

- [ ] 在 ChatDetail 发消息后返回 MessagesTab，列表即时更新（无 loading 闪烁）
- [ ] 两个组件间共享同一份消息数据，不会因切换页面而丢失
- [ ] AI 思考状态可在多处同步显示

---

### 【P2 体验】需求 6：AI 多供应商回退支持

#### 问题描述

桌面端通过 `LLMProviderManager` 支持 DeepSeek → OpenAI → Anthropic → Ollama 回退链。移动端仅硬编码 DeepSeek，供应商标的不可用时 Agent 对话完全挂掉。

#### 需求内容

1. 提取 `LLMProvider` 接口抽象（参考桌面端 `src/lib/llmProvider.ts`）
2. 实现优先级回退链：
   ```
   DeepSeek (config.ai.apiKey) → OpenAI (config.ai.openAiKey) → 兜底提示
   ```
3. `config/ai.ts` 扩展支持多 Key：
   ```
   EXPO_PUBLIC_AI_API_KEY          → DeepSeek
   EXPO_PUBLIC_AI_OPENAI_API_KEY   → OpenAI (回退)
   EXPO_PUBLIC_AI_OPENAI_BASE      → OpenAI Base URL
   ```
4. 调用失败时自动尝试下一个供应商，不阻断用户体验

#### 验收标准

- [ ] DeepSeek Key 未配置但 OpenAI Key 已配置 → 自动使用 OpenAI
- [ ] 当前供应商报错 → 自动降级到下一供应商
- [ ] 全部不可用 → 返回结构化提示"AI 服务暂不可用"

---

### 【P2 体验】需求 7：AI 流式响应支持

#### 问题描述

当前 `AIService.callDeepSeek()` 使用 `stream: false`，用户需等待完整回复（可能 5-15 秒）才能看到内容。桌面端已支持流式逐字输出。

#### 需求内容

1. `AIService` 新增 `chatWithAgentStream()` 方法：
   ```
   参数同 chatWithAgent，但返回 AsyncIterable<string>
   使用 fetch + ReadableStream + SSE 解析逐行 yield
   ```
2. `ChatDetailScreen` 中使用流式方法：
   - 先 `sendMessage(sessionId, '', 'other')` 创建空消息占位
   - 逐 chunk 更新消息内容 `setMessages(prev => updateLastMessage(prev, chunk))`
   - 流结束后将最终内容写回 DB
3. 保留非流式方法作为回退（SSE 解析失败时）

#### 验收标准

- [ ] Agent 回复逐字/逐词出现在聊天界面中
- [ ] 流式过程中显示闪烁光标指示"正在生成"
- [ ] 网络中断时已显示的部分内容保留

---

### 【P2 体验】需求 8：AI 历史消息格式标准化

#### 问题描述

传给 AI 的 `conversationHistory` 使用 `{ sender_type, content }` 原始字段，未转为标准 `{ role: 'user' | 'assistant' }` 格式，可能影响 LLM 对上下文的理解。

#### 需求内容

1. 在 `AIService.ts` 中添加标准化转换：
   ```
   sender_type === 'self' → { role: 'user', content }
   sender_type === 'other' → { role: 'assistant', content }
   sender_type === 'system' → 跳过（不传给 LLM）
   ```
2. 转换逻辑应用于 `chatWithAgent` 和 `chatWithAgentStream` 的 history 参数
3. 确保 `role: 'system'` 的使用不与转换后的历史冲突

#### 验收标准

- [ ] 传给 DeepSeek API 的消息数组格式为 `[{ role, content }, ...]`
- [ ] system 类型消息不出现在对话历史中
- [ ] `conversationHistory` 闭包问题同步解决（使用 ref 保存最新值）

---

### 【P3 优化】需求 9：浮动秘书未读 badge 实现

#### 问题描述

`FloatingSecretaryButton.tsx` 中存在 badge UI 结构但内部为空 Fragment，未读计数从未渲染。

#### 需求内容

1. 从 `ChatStore` 读取秘书 Agent 会话的 `unread_count`
2. `unread_count > 0` 时 badge 显示数字（如需求 4 未读计数逻辑已就绪）
3. 点击浮动按钮进入聊天后自动清零

#### 验收标准

- [ ] 有未读秘书消息时，浮动按钮显示红色数字角标
- [ ] 点击进入聊天后 badge 消失

---

### 【P3 优化】需求 10：订单卡片消息类型统一

#### 问题描述

`OrderCardMessage.tsx` 使用旧版 `Message` 接口（`MessageService.ts` 定义），与新版 `ChatMessage` 不一致。

#### 需求内容

1. 删除 `MessageService.ts` 或将其类型作为 `ChatMessage` 的别名导出
2. 修改 `OrderCardMessage.tsx` 适配 `ChatMessage` 类型

#### 验收标准

- [ ] `OrderCardMessage` 编译无类型错误
- [ ] 订单卡片消息渲染正常

---

## 3. 验收总览

| 需求 | 优先级 | 预估工时 | 依赖 |
|------|--------|---------|------|
| 需求 1：统一消息表 | P0 | 4h | - |
| 需求 2：AgentView 桥接 | P0 | 2h | 需求 1 |
| 需求 3：个人联系人→聊天 | P0 | 1h | 需求 1 |
| 需求 4：未读计数 | P1 | 2h | 需求 5 |
| 需求 5：消息 Store | P1 | 4h | 需求 1 |
| 需求 6：多供应商回退 | P2 | 3h | 需求 1 |
| 需求 7：AI 流式响应 | P2 | 3h | 需求 1 |
| 需求 8：历史格式标准化 | P2 | 1h | 需求 1 |
| 需求 9：浮动秘书 badge | P3 | 0.5h | 需求 4、5 |
| 需求 10：订单卡片类型统一 | P3 | 0.5h | 需求 1 |

> **总预估工时**：21h（约 3 个工作日）

---

## 4. 风险与约束

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 现有用户数据迁移 | 升级后聊天记录丢失 | 首次启动检测旧表 → 自动迁移 → 删除旧表 |
| SchemaManager 改动面大 | 可能影响其他模块的表管理 | 仅新增 chat_* 表语句，不修改现有逻辑 |
| 流式 SSE 解析兼容性 | Android/iOS 行为差异 | 保留非流式回退，检测 ReadableStream API 可用性 |
| AgentView sendMessage 桥接时机 | WebView 就绪前调用可能失败 | handler 中检查 DB 状态，就绪前消息排队 |

---

## 5. 关联文档

- [ProClaw 手机独立版 PRD v11.0](./产品需求文档：ProClaw 手机独立版（PRD v11.0）.md)
- [ProClaw 手机端底部导航重构 v11.1](./产品需求文档：ProClaw 手机端底部导航重构（v11.1）.md)
- [AI Team 群聊 LLM 接入与演示账号 Token PRD v6.4](./需求文档：AI Team 群聊 LLM 接入与演示账号 Token（PRD v6.4）.md)
- [内置商务秘书 Agent PRD v8.5](./需求文档：ProClaw 内置商务秘书 Agent（PRD v8.5）.md)
- [桌面端 UI 全面升级 PRD v11.0](./需求文档：ProClaw 桌面端 UI 全面升级（PRD v11.0）.md)
