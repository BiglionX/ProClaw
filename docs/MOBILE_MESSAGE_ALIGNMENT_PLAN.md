# 手机端消息链路对齐 — 开发计划

> **关联 PRD**：`docs/prd/需求文档：ProClaw 手机端消息链路对齐补充需求（PRD v11.2）.md`  
> **创建日期**：2026-06-07  
> **预估工期**：3 个工作日（21h）  
> **基准分支**：`main`

---

## Phase 1：P0 阻塞项（1 天，7h）

> **目标**：打通消息核心链路，消除阻塞性断点

### Task 1.1 — 统一消息表 + 纳入 SchemaManager（4h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `SchemaManager.ts`、`ChatService.ts`、`MessageService.ts`、`OrderCardMessage.tsx` |
| **前置** | 无 |

**子任务**：

1. **`SchemaManager.ts`** — 新增 `chat_sessions` 和 `chat_messages` 建表语句到 `createV1Tables`
   - 含新字段 `sync_status TEXT DEFAULT 'local'`
   - 版本号升级为 `SCHEMA_VERSION = 2`，新增 `v1→v2` 迁移逻辑
   - 身份切换时两张表跟随 drop/recreate

2. **`ChatService.ts`** — 改造 `ensureTables()`
   - 移除独立的建表逻辑（交给 SchemaManager）
   - 保留 `ensureTables()` 为空操作或别名，保证向后兼容
   - 新增 `sync_status = 'local'` 写入

3. **数据迁移脚本** — `ChatService.ts` 新增 `migrateFromOldMessages()`
   - 检测旧 `messages` 表是否存在
   - 存在则转换数据写入 `chat_messages`/`chat_sessions`
   - 迁移完成后 `DROP TABLE messages`
   - 幂等：已迁移则跳过

4. **`MessageService.ts`** — 清理或重构
   - 将 `Message` 接口改为 `ChatMessage` 的别名导出（兼容 `OrderCardMessage`）
   - 标注 `@deprecated`，指向新类型

5. **`OrderCardMessage.tsx`** — 适配新类型
   - import 从 `MessageService` 切换为 `ChatService` 的 `ChatMessage`

**验收**：
- [ ] SchemaManager v2 迁移在首次启动时正确执行
- [ ] 旧 messages 表数据自动迁移，迁移后旧表被删除
- [ ] 身份切换后两张表正确 drop/recreate
- [ ] OrderCardMessage 编译通过、渲染正常

---

### Task 1.2 — AgentView WebView sendMessage 桥接（2h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `AgentRuntimeBridge.ts`、`AgentView.tsx`、`ChatService.ts` |
| **前置** | Task 1.1 |

**子任务**：

1. **`AgentRuntimeBridge.ts`** — 新增 `sendMessage` handler
   ```typescript
   'sendMessage': async (agentId, params) => {
     const { to, content } = params;
     const session = await ChatService.createOrGetSession(
       to, to, 'personal', ''
     );
     return await ChatService.sendMessage(session.id, content, 'other');
   }
   ```

2. **`AgentView.tsx`** — 确认 `onMessage` 中 `proclaw.sendMessage` 的 payload 透传正确

3. **错误处理** — handler 内 try/catch 返回 `{ error: string }`，WebView 侧可感知失败

**验收**：
- [ ] Agent WebView 内调用 sendMessage → 消息出现在 chat_messages 表中
- [ ] 消息在 ChatDetail 中可见
- [ ] DB 未就绪时返回明确错误而非超时

---

### Task 1.3 — 个人联系人 → 聊天跳转（1h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `ContactsTab.tsx` |
| **前置** | Task 1.1 |

**子任务**：

1. 修改 `handlePersonalPress`（行 298-301）：
   ```typescript
   const handlePersonalPress = async (contact: Contact) => {
     const session = await ChatService.createOrGetSession(
       contact.id, contact.name, 'personal', contact.avatar || ''
     );
     navigation.navigate('ChatDetail', {
       sessionId: session.id,
       targetId: contact.id,
       targetName: contact.name,
       targetType: 'personal',
       targetIcon: contact.avatar || '',
     });
   };
   ```

2. 移除注释 `// 后续 Task 3 将实现...`

**验收**：
- [ ] 点击任何个人联系人 → 进入聊天页面
- [ ] 已有历史消息时正确展示

---

## Phase 2：P1 重要功能（1 天，6h）

> **目标**：建立消息状态管理层，补齐未读计数

### Task 2.1 — 创建 ChatStore（4h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `stores/ChatStore.tsx`（新）、`ChatDetailScreen.tsx`、`MessagesTab.tsx`、`App.tsx` |
| **前置** | Task 1.1 |

**子任务**：

1. **新建 `mobile/src/stores/ChatStore.tsx`**
   - Context + useReducer 模式
   - State：
     ```typescript
     {
       sessions: ChatSession[],
       messages: Record<string, ChatMessage[]>,  // key = sessionId
       activeSessionId: string | null,
       aiThinking: boolean,
     }
     ```
   - Actions（dispatch）：
     ```
     LOAD_SESSIONS, SET_SESSIONS
     LOAD_MESSAGES, ADD_MESSAGE, UPDATE_LAST_MESSAGE
     SET_ACTIVE_SESSION, SET_AI_THINKING
     UPDATE_SESSION (lastMessage/time, unread)
     ```

2. **Provider 放置** — `App.tsx` 或 `navigation` 层级包裹 ChatStore.Provider

3. **重构 `MessagesTab.tsx`**
   - 从 ChatStore 消费 `sessions`
   - `loadSessions` 触发 `dispatch(LOAD_SESSIONS)` 统一更新
   - 删除本地 `useState(sessions)`

4. **重构 `ChatDetailScreen.tsx`**
   - 从 ChatStore 消费 `messages[sessionId]`
   - `sendMessage` 成功后 `dispatch(ADD_MESSAGE)` 而非 `setMessages(prev => ...)`
   - `useFocusEffect` 设置 `activeSessionId` 激活通知 → 离开时清除
   - `scrollToBottom` 保持本地逻辑

**验收**：
- [ ] 发消息后返回列表，last_message 即时更新
- [ ] 两个 Tab 共享同一份会话列表数据
- [ ] 组件卸载/重载不丢失当前会话的消息

---

### Task 2.2 — 未读计数递增逻辑（2h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `ChatService.ts`、`ChatStore.tsx`、`ChatDetailScreen.tsx`、`MessagesTab.tsx` |
| **前置** | Task 2.1 |

**子任务**：

1. **`ChatService.sendMessage()`** — 新增 `skipUnread?: boolean` 参数
   - 非 self 发送 && 非激活会话 → 由调用方标记 `needsUnread: true`
   - 或者通过 ChatStore 的 `activeSessionId` 判断

2. **ChatStore** — `sendMessage` action 逻辑：
   ```
   调用 ChatService.sendMessage(...)
   若 senderType !== 'self' && sessionId !== activeSessionId:
     → UPDATE chat_sessions SET unread_count = unread_count + 1
   ```

3. **`ChatDetailScreen`** — `useFocusEffect` 中：
   ```typescript
   markRead(sessionId);
   dispatch({ type: 'RESET_UNREAD', sessionId });
   ```

4. **`MessagesTab`** — 未读徽章绑定：
   ```tsx
   {item.unread_count > 0 && <Badge>{item.unread_count}</Badge>}
   ```

**验收**：
- [ ] 非活跃会话收到新消息 → 列表项出现数字角标
- [ ] 进入会话 → 角标消失
- [ ] 自己发的消息不触发自己未读

---

## Phase 3：P2 体验增强（1 天，7h）

> **目标**：AI 对话体验对齐桌面端

### Task 3.1 — AI 多供应商回退（3h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `config/ai.ts`、`services/AIService.ts` |
| **前置** | Task 1.1 |

**子任务**：

1. **`config/ai.ts`** — 扩展配置字段：
   ```typescript
   interface AIConfig {
     apiBase: string;          // DeepSeek
     apiKey: string;
     model: string;
     openAiKey?: string;       // OpenAI 回退
     openAiBase?: string;
     openAiModel?: string;
   }
   ```

2. **`AIService.ts`** — 提取 `ProviderCaller` 抽象：
   ```typescript
   const providers = [
     { name: 'deepseek', base, key, model, enabled: !!key },
     { name: 'openai',  base, key, model, enabled: !!key },
   ];
   for (const p of providers.filter(p => p.enabled)) {
     try { return await callProvider(p, messages); }
     catch (e) { lastError = e; continue; }
   }
   throw lastError;
   ```

3. **`SecureConfig.ts`** — 支持 `secureSet('ai_openai_key', key)` 的新 key

**验收**：
- [ ] 仅 DeepSeek → 走 DeepSeek
- [ ] DeepSeek 失败 → 自动回退 OpenAI
- [ ] 全部不可用 → 返回提示消息，不崩溃

---

### Task 3.2 — AI 流式响应（3h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `services/AIService.ts`、`ChatDetailScreen.tsx`、`ChatStore.tsx` |
| **前置** | Task 2.1 |

**子任务**：

1. **`AIService.ts`** — 新增 `chatWithAgentStream()`：
   ```typescript
   async function* chatWithAgentStream(req: AgentChatRequest): AsyncGenerator<string> {
     const config = await getAIConfig();
     const response = await fetch(url, { ..., body: { stream: true } });
     const reader = response.body.getReader();
     const decoder = new TextDecoder();
     let buffer = '';
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       buffer += decoder.decode(value, { stream: true });
       // SSE 解析: data: {...}
       const lines = buffer.split('\n');
       buffer = lines.pop() || '';
       for (const line of lines) {
         if (line.startsWith('data: ')) {
           const json = JSON.parse(line.slice(6));
           const delta = json.choices?.[0]?.delta?.content;
           if (delta) yield delta;
         }
       }
     }
   }
   ```

2. **`ChatDetailScreen`** — 流式消费：
   ```typescript
   // 先插入空占位消息
   const placeholderId = await sendMessage(sessionId, '', 'other');
   dispatch(ADD_MESSAGE, { ...placeholder, content: '' });
   // 逐块更新
   let fullContent = '';
   for await (const chunk of chatWithAgentStream(req)) {
     fullContent += chunk;
     dispatch(UPDATE_LAST_MESSAGE, { sessionId, content: fullContent });
   }
   // 最终写入 DB
   await updateMessageContent(placeholderId, fullContent);
   ```

3. **回退机制** — `chatWithAgentStream` 捕获 `ReadableStream` 不可用 → 降级 `chatWithAgent`

**验收**：
- [ ] AI 回复逐词出现在界面中
- [ ] 流式过程中有"正在输入..."指示器
- [ ] 异常时退回非流式模式

---

### Task 3.3 — AI 历史消息格式标准化（1h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `services/AIService.ts` |
| **前置** | Task 1.1 |

**子任务**：

1. 新增 `normalizeHistory(messages: ChatMessage[]): { role: string; content: string }[]`
   ```typescript
   function normalizeHistory(messages: ChatMessage[]) {
     return messages
       .filter(m => m.sender_type !== 'system')
       .map(m => ({
         role: m.sender_type === 'self' ? 'user' : 'assistant',
         content: m.content,
       }));
   }
   ```

2. `chatWithAgent` 和 `chatWithAgentStream` 中调用此函数

3. **闭包修复**：`handleSend` 中 `messages.slice(-20)` 改为使用 `useRef` 保存最新消息引用

**验收**：
- [ ] API 请求体中 `messages` 数组为标准 `role/content` 格式
- [ ] 快速连续发送时 AI 能感知上一轮消息

---

## Phase 4：P3 收尾（0.5 天，1h）

> **目标**：清理遗留项

### Task 4.1 — 浮动秘书未读 badge（0.5h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `FloatingSecretaryButton.tsx` |
| **前置** | Task 2.1、2.2 |

- 从 ChatStore 获取秘书会话的 `unread_count`
- 在已有 badge 结构中渲染数字

---

### Task 4.2 — 订单卡片类型清理（0.5h）

| 项 | 内容 |
|----|------|
| **涉及文件** | `MessageService.ts`、`OrderCardMessage.tsx` |
| **前置** | Task 1.1 |

- `MessageService.ts` 中的 `Message` 改为 `ChatService.ChatMessage` 别名，标记 `@deprecated`
- `OrderCardMessage.tsx` 改为直接 import `ChatMessage`

---

## 实施顺序总结

```
Phase 1（P0，Day 1）           Phase 2（P1，Day 1-2）       Phase 3（P2，Day 2-3）      Phase 4（P3，Day 3）
┌─────────────────────┐       ┌─────────────────────┐     ┌───────────────────────┐   ┌──────────────────┐
│ Task 1.1 统一表 (4h) │──┬──→│ Task 2.1 ChatStore   │────→│ Task 3.1 多供应商 (3h) │   │ Task 4.1 Badge    │
└─────────────────────┘  │   │        (4h)           │  ┌─→│ Task 3.2 流式    (3h) │──→│        (0.5h)     │
                         ├──→│ Task 2.2 未读计数 (2h) │  │  │ Task 3.3 格式    (1h) │   │ Task 4.2 类型     │
┌─────────────────────┐  │   └─────────────────────┘  │  └───────────────────────┘   │        (0.5h)     │
│ Task 1.2 桥接   (2h) │──┤                            │                             └──────────────────┘
└─────────────────────┘  │                            │
┌─────────────────────┐  │                            │
│ Task 1.3 联系人 (1h) │──┘                            │
└─────────────────────┘                               │
                                                      快速回退
```

**关键依赖链**：
```
Task 1.1（统一表）是几乎所有后续 Task 的前置
Task 2.1（ChatStore）是 Task 2.2（未读）、Task 3.2（流式）、Task 4.1（badge）的前置
Task 1.2（桥接）、Task 1.3（联系人）相对独立，可在 1.1 完成后并行
Task 3.1、3.2、3.3 可在 2.1 完成后并行
```

---

## 文件改动汇总

| 文件 | Task | 改动类型 |
|------|------|----------|
| `mobile/src/services/SchemaManager.ts` | 1.1 | 修改 — 加表、升版本 |
| `mobile/src/services/ChatService.ts` | 1.1, 1.3, 2.2 | 修改 — 移建表、加迁移、加未读 |
| `mobile/src/services/MessageService.ts` | 1.1, 4.2 | 修改 — 类型别名、deprecated |
| `mobile/src/components/OrderCardMessage.tsx` | 1.1, 4.2 | 修改 — 类型适配 |
| `mobile/src/services/AgentRuntimeBridge.ts` | 1.2 | 修改 — 新增 handler |
| `mobile/src/components/AgentView.tsx` | 1.2 | 检查 — 确认 payload |
| `mobile/src/screens/ContactsTab.tsx` | 1.3 | 修改 — 跳转逻辑 |
| `mobile/src/stores/ChatStore.tsx` | 2.1 | **新建** |
| `mobile/App.tsx` | 2.1 | 修改 — 包裹 Provider |
| `mobile/src/screens/ChatDetailScreen.tsx` | 2.1, 2.2, 3.2, 3.3 | 修改 — 接入 Store、流式 |
| `mobile/src/screens/MessagesTab.tsx` | 2.1, 2.2 | 修改 — 接入 Store |
| `mobile/src/config/ai.ts` | 3.1 | 修改 — 扩展多 Key |
| `mobile/src/services/AIService.ts` | 3.1, 3.2, 3.3 | 修改 — 多供应商、流式、格式化 |
| `mobile/src/services/SecureConfig.ts` | 3.1 | 修改 — 新增 key |
| `mobile/src/components/FloatingSecretaryButton.tsx` | 4.1 | 修改 — badge 渲染 |

> **新建 1 个文件，修改 14 个文件**

---

## 风险与注意事项

1. **SchemaManager 版本升级**：`SCHEMA_VERSION` 从 1 升到 2，需确保所有开发者数据库跟随迁移，避免版本不一致
2. **旧 messages 表数据迁移**：应打印迁移日志，迁移完成后 DROP 而非 RENAME，避免残留
3. **ChatStore 闭包陷阱**：useReducer 的 dispatch 在 useCallback 内引用稳定，但 `state.messages` 在异步回调中可能过期 — 考虑用 `useRef` 或 `getState()` 模式
4. **流式 SSE 解析**：Android/iOS 的 `fetch` + `ReadableStream` 实现可能有差异（React Native 环境），需在真机验证
5. **回退测试**：Task 3.1 需要有模拟 API 失败的方式验证回退链
