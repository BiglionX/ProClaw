## 需求文档：AI Team 群聊 LLM 接入 + 演示账号 Token（PRD v6.4）

### 1. 背景与目标

#### 1.1 背景
- AI Team 群聊（PRD v6.2/v6.3）已实现动态群组生成，Boss 可在消息页与各 AI 团队进行群聊对话。
- 但当前群聊未接入大模型，Boss 发送消息后无 AI 响应，群聊仅是"消息展示框"而非真正的 AI 协作空间。
- 用户期望在群聊中 @CEO Agent 或直接发号施令后，AI 能理解上下文并给出合理回复。
- 演示账号（`boss@proclaw.demo`）需提供免费 Token 额度供用户测试 AI 对话能力。

#### 1.2 目标
- 为 AI Team 群聊接入平台 LLM（ProClaw GPT-4），CEO Agent 自动响应 Boss 的群聊消息。
- 演示账号登录后赠送 **10,000 PT** 免费 Token，每次 LLM 调用按实际消耗扣减。
- Token 余额实时显示在群聊界面，余额不足时友情提示。

---

### 2. 用户故事

- **作为** 演示账号用户（Boss），我登录 ProClaw 后在 AI Team 群聊中发送"帮我看看库存情况"，CEO Agent 应该自动调用 LLM 理解我的意图并回复，同时我能在页面上看到剩余 Token 数。
- **作为** 正式用户，我在群聊中发送消息后，CEO Agent 不做 Token 限制，正常响应。
- **作为** 开发者，我可以通过 `localStorage` 重置演示 Token，方便反复测试。

---

### 3. 功能设计

#### 3.1 群聊 LLM 接入流程

```
Boss 在群聊发送消息
  → contactService.sendMessage 存储并显示用户消息
  → aiTeamChatService.generateGroupChatResponse()
      ├─ 构建 System Prompt（CEO Agent 角色 + 群组上下文）
      ├─ 构建聊天历史（最近 10 条消息）
      ├─ ChatOpenAI.invoke() → proclaw-gpt-4
      ├─ 扣减 Token（演示账号）
      └─ 返回 { replyContent, remainingTokens }
  → 将 AI 回复以 ceo-agent 身份写入群聊
  → 更新 Token 余额显示
```

#### 3.2 System Prompt 设计

CEO Agent 的 System Prompt 包含以下上下文：

- **团队信息**：团队名称、描述、成员列表
- **角色定位**：Boss 和子 Agent 之间的桥梁，负责接收指令、分派任务、追踪进度、汇报结果
- **回复要求**：简短精炼（200 字以内），有可执行操作给出具体步骤，信息不足请 Boss 补充

#### 3.3 Token 管理规则

| 规则 | 说明 |
|------|------|
| 赠送额度 | 演示账号首次使用自动获得 **10,000 PT** |
| 扣减时机 | 每次 LLM 调用后按实际消耗扣减（输入 token + 输出 token） |
| 存储方式 | `localStorage` 持久化，刷新不丢失 |
| 余额不足 | 返回友好提示，不阻塞已生成的回复 |
| 非演示账号 | 不做 Token 限制（返回 -1） |

#### 3.4 UI 交互设计

| 场景 | UI 表现 |
|------|---------|
| 正常状态 | Header 显示绿色 Chip：`9,850 PT` |
| Token < 1000 | Chip 变黄色预警 |
| Token = 0 | Chip 变红色，输入框禁用，提示"Token 已用完" |
| AI 思考中 | 输入区显示橙色加载动画 + "CEO Agent 思考中..." |
| LLM 连接失败 | 返回错误提示"无法连接到 AI 服务" |

---

### 4. 技术架构

#### 4.1 新增文件

| 文件 | 职责 |
|------|------|
| `src/lib/aiTeamTokenService.ts` | Token 余额管理、演示账号检测 |
| `src/lib/aiTeamChatService.ts` | LLM 调用封装、System Prompt 构建、聊天历史管理 |

#### 4.2 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/pages/ChatPage.tsx` | `handleSend` 追加 LLM 回调；Header 显示 Token Chip；AI 思考中/Token 用完状态 UI |

#### 4.3 API 依赖

- **LLM 端点**：`https://ai.proclaw.cc/api/v1`
- **模型**：`proclaw-gpt-4`
- **SDK**：`@langchain/openai` 的 `ChatOpenAI`（需传 `apiKey: 'proclaw-internal'` 占位值）
- **Token 估算**：复用 `src/lib/aiTools.ts` 的 `estimateTokens()` 函数

#### 4.4 演示账号定义

- 账号：`boss@proclaw.demo`（定义于 `src/lib/authStore.ts`）
- 角色：`admin`
- 检测方式：`useAuthStore.getState().user?.email === 'boss@proclaw.demo'`

#### 4.5 Token 存储键

```
localStorage key: 'proclaw_ai_team_tokens'
```

---

### 5. 接口定义

#### 5.1 aiTeamTokenService

```typescript
// 检测是否为演示账号
function isDemoAccount(): boolean;

// 获取当前 Token 余额（首次自动初始化为 10000）
function getTokenBalance(): number;

// 扣减 Token，返回剩余余额。余额不足抛错
function deductTokens(amount: number): number;

// 重置为 10000 PT（仅开发调试）
function resetDemoTokens(): void;
```

#### 5.2 aiTeamChatService

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

// 调用 LLM 生成群聊回复
function generateGroupChatResponse(
  userMessage: string,
  chatHistory: ChatHistoryItem[],
  groupConfig: AITeamGroupConfig
): Promise<GroupChatResponse>;
```

---

### 6. 验收标准

- [x] 演示账号登录后，Header 显示 Token Chip，初始值为 `10,000 PT`
- [x] Boss 在 AI Team 群聊发送消息后，CEO Agent 自动回复（LLM 生成）
- [x] 每次 LLM 调用后 Token 余额扣减，页面即时刷新
- [x] Token < 1000 时 Chip 变黄，Token = 0 时变红 + 禁用输入
- [x] AI 思考中显示"CEO Agent 思考中..."加载态
- [x] LLM 调用失败时返回友好错误提示（不阻塞界面）
- [x] 非演示账号不做 Token 限制
- [x] TypeScript 编译零错误
