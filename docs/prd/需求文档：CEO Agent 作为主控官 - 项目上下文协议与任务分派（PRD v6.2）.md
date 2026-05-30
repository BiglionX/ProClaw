## 需求文档：CEO Agent 作为主控官 - 项目上下文协议与任务分派（PRD v6.2）

### 1. 背景与目标

#### 1.1 背景
- 在 PRD v6.1 中，CEO Agent 已作为安装向导引导用户完成初始化，并常驻聊天列表。
- 但当前 CEO Agent 仅具备普通对话能力，未能充分发挥“虚拟公司主控官”的价值。
- proclaw的核心差异在于：用户（Boss）不直接管理每个子 Agent，而是通过 CEO Agent 传达宏观意图，由 CEO Agent 分解任务、协调其他 Agent 执行并审查结果。

#### 1.2 目标
- **CEO Agent 升级为主控官**，自动建立 **项目上下文协议**（Project Context Protocol, PCP），用于捕获 Boss 的宏观决策、项目定位和核心思路。
- CEO Agent 能够根据上下文协议，主动分派任务给合适的子 Agent（如财务管理 Agent、任务管理 Agent、营销团队等），并对任务结果进行审查、汇总后向 Boss 汇报。
- Boss 可在聊天窗口中随时呼唤 CEO Agent，查询状态、调整方向或干预决策。

---

### 2. 用户故事

- **作为** Boss，我在聊天中对 CEO Agent 说：“我们下个季度要主攻海外市场。”CEO Agent 自动更新项目上下文协议，然后向营销 Agent 分派“制定海外推广计划”，向财务 Agent 询问“预算预留”，几天后向我汇报进展。
- **作为** Boss，我可以随时问 CEO Agent：“目前项目关键里程碑有哪些？”CEO Agent 根据上下文协议和子 Agent 的执行情况，给出清晰答案。
- **作为** 子 Agent（如任务管理 Agent），我收到来自 CEO Agent 的任务分派，附带清晰的指令和优先级，执行后自动反馈结果给 CEO Agent。

---

### 3. 项目上下文协议（Project Context Protocol, PCP）

#### 3.1 定义
- PCP 是一个 **结构化知识库**，存储于桌面端 SQLite 中，由 CEO Agent 维护。
- 它记录了 Boss 对虚拟公司的 **宏观意图、业务方向、项目定位、关键约束、成功标准** 等信息。
- 所有子 Agent 可以**只读**访问 PCP（通过 API），以便在执行任务时保持与 Boss 意图一致。

#### 3.2 PCP 数据结构

```sql
CREATE TABLE project_context (
  id TEXT PRIMARY KEY,
  context_type TEXT NOT NULL,   -- 'vision', 'goal', 'constraint', 'milestone', 'decision'
  title TEXT,
  description TEXT,
  priority INTEGER,              -- 1-5
  status TEXT,                   -- 'active', 'paused', 'archived'
  created_at INTEGER,
  updated_at INTEGER,
  created_by TEXT,               -- 'boss' or 'ceo_agent'
  metadata JSON                  -- 扩展字段，如关联的 agent_id
);
```

**示例条目**：
- `vision`: “成为本地最受欢迎的虚拟公司服务商”
- `goal`: “Q3 完成 100 个付费用户”
- `constraint`: “总预算不超过 5 万元”
- `milestone`: “6 月 30 日前上线海外版”
- `decision`: “采用 DeepSeek 作为大模型提供商”

#### 3.3 上下文自动捕获
- CEO Agent 监听聊天中 Boss 的消息，使用大模型判断是否包含宏观决策或项目方向更新，若是则自动生成或更新 PCP 条目（需 Boss 确认，可通过“确认更新”按钮）。
- 支持显式命令：`/context add goal: "Q3 完成 100 个付费用户" priority:1`。

---

### 4. CEO Agent 职责

| 职责 | 说明 |
|------|------|
| **理解 Boss 意图** | 解析自然语言对话，提取宏观决策，更新 PCP。 |
| **任务分派** | 根据 PCP 中的目标和里程碑，主动或被动地向合适的子 Agent 分派任务。任务格式为结构化 JSON，包含目标、可接受结果、截止时间、优先级。 |
| **任务审查** | 接收子 Agent 的完成反馈，对比预期结果，判断是否合格。若不合格，可要求重做或调整。 |
| **进度汇报** | 定期（如每日一次）或在 Boss 询问时，生成项目进展摘要，突出关键里程碑、风险和待办。 |
| **冲突协调** | 当多个子 Agent 的需求冲突（如财务 Agent 预算不足 vs 营销 Agent 需要更多预算），CEO Agent 提出解决方案供 Boss 决策。 |
| **Agent 团队管理** | 知道市场中有哪些已安装的 Agent 及其能力（通过 Agent 注册表），并能调用它们。 |

---

### 5. 任务分派与执行协议

#### 5.1 分派流程
1. CEO Agent 根据 PCP 或 Boss 的直接指令，生成一个 `Task` 对象。
2. 通过主框架的 `proclaw.dispatchTask(agentId, task)` API 将任务发送给目标子 Agent。
3. 子 Agent 执行任务（可能需要调用其他 API 或与用户交互）。
4. 子 Agent 完成任务后，调用 `proclaw.completeTask(taskId, result)` 将结果返回给 CEO Agent。
5. CEO Agent 审查结果，更新任务状态，并可能向 Boss 汇报或派发后续任务。

#### 5.2 任务数据结构（JSON）

```json
{
  "taskId": "uuid",
  "type": "create_report",
  "priority": 2,
  "description": "生成上月财务收支报表，按类别汇总",
  "expected_output": "CSV 文件或表格数据",
  "deadline": "2026-06-01T00:00:00Z",
  "context_snapshot": "参考 PCP 中预算约束",
  "assigned_to": "finance_agent"
}
```

#### 5.3 子 Agent 需遵守的规范
- 子 Agent 的 manifest 中必须声明其能力（如 `capabilities: ["financial_report", "expense_analysis"]`）。
- 子 Agent 必须实现 `onTask(task)` 入口函数，并返回 Promise。

---

### 6. 技术实现

#### 6.1 CEO Agent 内部架构
- 作为特权 Agent，运行在同一运行时容器中，但拥有额外的系统 API 权限（如读写 PCP、调用其他 Agent）。
- 内置一个 **决策引擎**（基于 LangChain 的 ReAct Agent），大模型负责解析 Boss 意图、规划任务、审查结果。

#### 6.2 新增主框架 API（暴露给 CEO Agent）

```ts
// 项目上下文操作
proclaw.context.add(entry);
proclaw.context.update(id, entry);
proclaw.context.query(filter);

// 任务分派与跟踪
proclaw.tasks.dispatch(agentId, task);
proclaw.tasks.getStatus(taskId);
proclaw.tasks.cancel(taskId);

// 子 Agent 发现
proclaw.agents.list();   // 返回所有已安装且有能力的 Agent
proclaw.agents.getCapabilities(agentId);
```

#### 6.3 子 Agent 任务接收接口
- 子 Agent 需暴露一个全局函数 `onTask`，由主框架在接收到任务时调用。
- 函数签名：`async function onTask(task: Task): Promise<TaskResult>`

#### 6.4 聊天界面集成
- Boss 可以在与 CEO Agent 的对话中发送自然语言指令，如“把海外推广任务优先级调到最高”。
- CEO Agent 支持快捷命令：`/task list`、`/context show`、`/report daily` 等。
- 任务分派和审查的结果以**结构化消息卡片**形式展示（含进度条、审批按钮）。

---

### 7. 数据模型补充（SQLite）

```sql
-- 任务表
CREATE TABLE ceo_tasks (
  id TEXT PRIMARY KEY,
  task_id TEXT UNIQUE NOT NULL,
  assigned_agent_id TEXT NOT NULL,
  type TEXT,
  description TEXT,
  expected_output TEXT,
  priority INTEGER,
  status TEXT,   -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
  result JSON,
  created_at INTEGER,
  deadline INTEGER,
  completed_at INTEGER
);
```

---

### 8. 用户界面补充

- **CEO Agent 聊天窗口**：在输入框上方增加一个上下文指示器，显示当前活跃的项目目标（可切换）。
- **项目仪表板**：主界面增加一个“项目概览”视图，显示 PCP 中的关键目标、里程碑进度、最近任务活动。此视图可由 CEO Agent 动态生成。
- **任务卡片**：当 CEO Agent 分派任务时，Boss 可见卡片，并可以点击“查看详情”或“干预”。

---

### 9. 实施步骤（新增）

| 步骤 | 任务 |
|------|------|
| 1 | 实现 PCP 数据表和 CRUD API（Rust 后端 + 主框架桥接）。 |
| 2 | 扩展 CEO Agent，集成 LangChain 决策引擎，实现意图解析和任务规划。 |
| 3 | 实现主框架的任务分派 API 和子 Agent 的 `onTask` 调用机制。 |
| 4 | 修改子 Agent 模板，要求实现任务处理函数。 |
| 5 | 在 CEO Agent 聊天界面增加快捷命令和上下文指示器。 |
| 6 | 开发项目仪表板组件（可选，可放在第二阶段）。 |
| 7 | 测试端到端流程：Boss 下达宏观目标 → CEO Agent 更新 PCP → 分派给财务 Agent → 财务 Agent 返回报表 → CEO Agent 审查并汇报。 |

---

### 10. 风险与备选

- **大模型幻觉**：CEO Agent 可能错误解析 Boss 意图或生成不合理的任务。应对：所有重要决策（更新 PCP、分派任务）都生成确认卡片，Boss 可点击“确认”或“拒绝”。
- **子 Agent 未及时响应**：主框架设置任务超时（如 30 分钟），超时后 CEO Agent 提醒 Boss 或尝试其他 Agent。
- **任务依赖**：初期只支持简单独立任务。未来可扩展为 DAG 工作流。

---

**文档版本**：v1.0 (PRD v6.2 补充)  
**预计开发工时**：后端 5 人天 + 前端（CEO Agent 交互）3 人天 + 决策引擎集成 2 人天  
**依赖**：已完成 PRD v6.0/v6.1 的基础 Agent 框架

---
