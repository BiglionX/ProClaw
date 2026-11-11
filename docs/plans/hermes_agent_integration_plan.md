# ProClaw AI 助理 Hermes-Agent 化升级方案

> **ADR 性质文档** · 记录"为何升级"和"如何升级"两个核心决策,作为后续协作的基线。
> 创建日期:2026-07-06 · 状态:**Draft(待评审)**

---

## 0. TL;DR

在 ProClaw 现有 LangChain Agent 体系之上,**叠加一层 Hermes 风格的中间件**(代号 `hermes-core`),把当前"静态 Tool + 直连 LLM"的 AI 助理升级为:

- 🧠 **Skills 自进化**:Agent 使用过程中自动生成/合并/优化技能,沉淀业务专用知识
- 🤝 **MoA 模型委员会**:多 LLM 并行提议 + 裁判聚合,提升复杂任务质量
- 🛠️ **工具自愈**:Tool 调用出错时自动重试 / 降级 / Schema 修复
- 🏠 **本地私有化**:完全跑在内网 Ollama / 内网 LLM 网关上,数据不出域

**关键判断**:不引入新框架(不引入 Hermes Agent 原项目),而是在 ProClaw 已有 LangChain + 多 LLM Provider + Tauri + SQLCipher 的基础上**新增 `src/lib/hermes/` 中间件层**,渐进式接入,做到"已有 Agent 零迁移成本"。

---

## 1. 背景与动机

### 1.1 ProClaw AI 助理现状

| 维度 | 现状(基于 `package.json` 与 `src/lib/` 实际代码) |
|---|---|
| 框架 | LangChain 1.3 + `@langchain/openai/anthropic/ollama` |
| LLM 路由 | `src/lib/llmProvider.ts` 支持 OpenAI/DeepSeek/Anthropic/Ollama 4 家 |
| Agent 体系 | `src/lib/agents/`:BaseAgent + CEOAgent + SalesForecaster + InventoryOptimizer + BusinessAnalyst + DecisionAdvisor |
| Tool 体系 | 继承 `@langchain/core/tools` 的 `Tool` 基类,手写 `_call()` |
| 技能 / Skills | 仅 `src/agents/bundles/*/manifest.json` 静态描述,Agent 运行时**不感知、不检索** |
| 记忆 | 进程内 20 轮滚动窗口(见 `BaseAgent.addToMemory`) |
| 多 Agent 协作 | CEO 派发,串行执行,**无并联 / 委员会机制** |
| 本地部署 | Tauri 桌面 + SQLCipher + Ollama,**已具备本地化能力** |
| MCP | `mcp.json` 已配置 filesystem/git/browser |

### 1.2 现存痛点

1. **业务知识无法沉淀**:每开一个对话窗口,Agent 都从零开始;商户特有的 SOP(如"美业门店的预约改期流程")无法被 Agent 自动学会。
2. **失败要用户兜底**:CEOAgent 调用 `proclawContext.add`、`proclawTasks.dispatch` 时,数据库锁、网络抖动、超时这类错误会**直接抛给用户**,无自动重试/降级。
3. **复杂任务质量不稳**:复杂分析任务(如"对比上季度 5 个门店的毛利")单模型容易出幻觉,缺多模型互校。
4. **Token 计费不透明**:多模型并行提议会带来多次调用,需要明确告诉商户「为什么这次调用了 3 次」。

### 1.3 机会窗口

- ProClaw 1.3.1 已经有完整的 LangChain + 多 LLM + Ollama 基础设施,**不需要造轮子**,只需叠加 Hermes 风格的上层编排。
- NousResearch 的 Hermes Agent([GitHub](https://github.com/NousResearch/hermes-agent)) 的 Skills 自进化、MoA、Self-Healing 三大特性正好对应上述痛点。
- "一行命令部署 + 自我进化"已成为 2026 年 Agent 框架的事实标准卖点,ProClaw 需要跟上([行业观察](https://eu.36kr.com/zh/p/3760771429958403))。

---

## 2. 目标与衡量指标

### 2.1 业务目标

- **G1**:让 ProClaw 的 AI 经营团队具备"越用越聪明"的能力,商户第 30 天的任务完成率比第 1 天高 ≥ 20%。
- **G2**:Tool 调用失败导致的用户报错次数下降 ≥ 70%。
- **G3**:复杂分析类任务(对比 / 总结 / 趋势)用户满意度 ≥ 4.5/5。

### 2.2 技术目标

- **T1**:`BaseAgent` 子类**零修改**(或最小改动)即可接入 Skills/MoA/Healing。
- **T2**:Skills 检索 P95 延迟 ≤ 50ms(本地 SQLite + FTS5)。
- **T3**:MoA 增加的 Token 消耗不超过总量的 30%(通过智能触发条件控制)。
- **T4**:本地私有化部署 100% 内网完成,不依赖任何外网 LLM API。

---

## 3. 架构设计

### 3.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│  ProClaw UI (React)                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  HermesCore (新加中间件层,src/lib/hermes/)                    │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ SkillEvolver    │ │ MoAOrchestrator  │ │ SelfHealing… │  │
│  └─────────────────┘ └──────────────────┘ └──────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SkillStore (SQLite + FTS5) + SkillRetriever            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
   BaseAgent           CEOAgent            SalesForecasterAgent
   (现有,无改)         (现有,可选升级)      (现有,可选升级)
        │                     │                      │
        └─────────┬───────────┴──────────┬───────────┘
                  ▼                      ▼
        ┌──────────────────────────────────────┐
        │  LLMProviderManager (现有)           │
        │  + MoA 后端层 (Ollama/DeepSeek/...)  │
        └──────────────────────────────────────┘
```

### 3.2 核心模块

#### 3.2.1 SkillStore + SkillRetriever

- **存储**:SQLite `skills` 表 + FTS5 虚表(基于已有 `better-sqlite3` + SQLCipher)。
- **检索**:FTS5 关键词匹配 → top-K → 按 `success_count / usage_count` 加权排序。
- **演进**:后期可叠加本地 embedding(`transformers.js` + `all-MiniLM-L6-v2`)做语义召回,但首版**不引入额外依赖**。

#### 3.2.2 SkillEvolver(P0 核心)

- **输入**:Agent 执行四元组 `(query, toolCalls, outcome, feedback)`
- **流程**:
  ```
  每次 BaseAgent.execute() 结束后:
    1. 收集四元组(中间件透明注入)
    2. 评估:success / failure / retry
    3. 若失败次数 > 3 → 调用 LLM 做 reflection,生成或优化技能
    4. 写入 SkillStore,version + 1,记录 parent_version
  ```
- **触发频率控制**:同一 query 24 小时内最多触发 1 次进化(去重)。
- **人工确认**:首次生成的技能进入 `pending_review`,需商户在 UI 确认后才 `active`。

#### 3.2.3 MoAOrchestrator

- **提议层**:2~4 个 LLM 并行调用,可配置 provider / model / weight / role。
- **聚合层**:单一裁判 LLM(默认 DeepSeek)综合 N 个答案,输出最终结果 + 引用每个提议的得分。
- **触发条件**:`minQueryLength` + `keywordsContain` + `alwaysForTasks`(避免简单问候也开 MoA)。
- **降级**:任一 proposer 失败,自动剔除,余下 ≥ 2 个即可继续;全部失败则降级为单模型直连。

#### 3.2.4 SelfHealingExecutor

- **重试策略**:可配置 `retryableErrors` 列表(如 `['timeout', 'rate_limit', '5xx']`)。
- **降级链**:provider 失败时按 `fallbackChain` 顺序切换。
- **Schema 修复**:LLM 输出的 Tool 调用不符合 zod schema 时,自动让 LLM 重写,最多 N 次。
- **接入点**:包裹 `BaseAgent.execute()` 中的 `llm.invoke()`,对外接口不变。

### 3.3 Skill 数据模型

```typescript
interface Skill {
  id: string;                    // 'sk_<uuid>'
  name: string;
  description: string;
  triggerPhrases: string[];      // ['库存不足','补货提醒']
  toolTemplates: ToolTemplate[]; // 引用现有 Tool
  systemPromptAddition: string;
  source: 'preset' | 'learned' | 'optimized';
  status: 'active' | 'pending_review' | 'archived';
  version: number;
  parentVersion?: number;
  usageCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}
```

### 3.4 SQL Schema

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_phrases TEXT NOT NULL,  -- JSON
  tool_templates TEXT NOT NULL,   -- JSON
  system_prompt_addition TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  parent_version INTEGER,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tags TEXT NOT NULL              -- JSON
);

CREATE VIRTUAL TABLE skills_fts USING fts5(
  name, description, trigger_phrases, tags,
  content='skills', content_rowid='rowid'
);
```

---

## 4. 实施路线

分 5 个阶段,**每阶段可独立上线**,回滚成本低。

| 阶段 | 内容 | 估时 | 价值 | 风险 |
|---|---|---|---|---|
| **P0-A** | SkillStore + SkillRetriever(只读预设技能) | 1 周 | 立竿见影,Agent 立刻能"记住"业务专用流程 | 低 |
| **P0-B** | SkillEvolver(进化引擎) + 接入 BaseAgent | 2 周 | 核心卖点,技能自进化 | 中(LLM 反思质量) |
| **P1-A** | SelfHealingExecutor + 接入 CEOAgent | 1 周 | 稳定性提升 | 低 |
| **P1-B** | MoAOrchestrator + 接入 DeepSeek/Ollama | 2 周 | 质量提升 | 中(Token 成本) |
| **P2** | 可视化:技能树 + MoA 投票 + 进化日志 | 1 周 | 用户感知 | 低 |

**优先级**:P0-A → P0-B → P1-A → P1-B → P2。

---

## 5. 文件落点

```
src/
├── lib/
│   ├── agents/
│   │   └── BaseAgent.ts            ← 修改:execute() 通过 HermesCore 调用
│   └── hermes/                     ← 新建目录
│       ├── types.ts
│       ├── skillStore.ts
│       ├── skillEvolver.ts
│       ├── skillRetriever.ts
│       ├── selfHealingExecutor.ts
│       ├── moa.ts
│       ├── hermesCore.ts
│       └── index.ts
├── pages/
│   └── HermesSkillsPage.tsx        ← 新建
└── components/
    └── hermes/                     ← 新建
        ├── SkillTree.tsx
        ├── SkillEvolveLog.tsx
        └── MoAResultPanel.tsx
```

---

## 6. 部署与本地化

```
┌──────────────────────────────────────────────┐
│ ProClaw 桌面端 (Tauri) │
│  - HermesCore (TS) │
│  - SQLite + FTS5 技能库 │
└──────────────────────────────────────────────┘
            │ HTTP/gRPC(都在内网)
            ▼
┌──────────────────────────────────────────────┐
│ 内网 LLM 网关(自建) │
│  - Ollama (Qwen2.5-7B-Instruct,本地 GPU)     │
│  - vLLM (DeepSeek-V3,本地 A100/H100)        │
│  - 可选:内网代理 OpenAI/Anthropic            │
└──────────────────────────────────────────────┘
```

**Token 控制策略**:
- Skill 检索 + MoA 都增加调用次数。
- 大部分命中本地 Ollama,成本可控。
- `LLMProviderManager` 加 `MoA cost guard`,简单查询不走 MoA。
- ProClaw Token 计费模块给 MoA 标注「聚合调用」明细,避免商户对账疑惑。

---

## 7. 与现有 ProClaw 生态衔接

- **CEO Agent**:升级入口,技能自进化对它收益最大(P0-B 重点)。
- **25+ Bundle**:每个 `manifest.json` 加 `skills` 字段,声明默认关联的技能,SkillStore 启动时自动 import。
- **Agent 市场**:自进化出来的技能可一键 export 成 Bundle,丰富 `localTeamSkillMap`。
- **Token 计费**:`getStats()` 已统计调用量,需新增 MoA 明细。
- **MCP**:`mcp.json` 已配 filesystem/git/browser,可直接对接 Hermes 风格工具。

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 进化技能质量不稳定 | 中 | 首次进化进 `pending_review`,UI 确认;后期按成功率自动归档低质技能 |
| MoA 增加 Token 成本 | 中 | 严格触发条件 + cost guard;商户可在设置里关闭 MoA |
| 私有 LLM 推理慢 | 中 | Ollama 默认 Qwen2.5-7B(快);复杂任务才升 DeepSeek-V3 |
| Skills 无限增长 | 低 | 定期清理低成功率技能(usage_count < 3 且 failure_count > 2) |
| SQLite FTS5 中文分词 | 低 | 引入 `jieba` 或简单 `n-gram` tokenization |

---

## 9. 备选方案对比

| 方案 | 优点 | 缺点 | 决策 |
|---|---|---|---|
| **A. 引入 Hermes Agent 原项目作后端** | 立即获得完整能力 | 增加 Python/Rust 运行时;双 Agent 系统并行,概念分裂;本地化部署复杂 | ❌ |
| **B. 在 ProClaw 内嵌入 Hermes 核心模块** | 复用现有 LangChain 体系,渐进上线 | 需要移植部分 Hermes 代码 | ⚠️ 备选 |
| **C. 参考 Hermes 思想自研中间件(本方案)** | 完美契合 ProClaw 现状;可控;不引入新依赖 | 需要从零设计 Skill 数据模型 | ✅ **采纳** |
| **D. 改造 LangChain v1 createAgent** | 用 LangChain 新 API | LangChain v1 的 Skills/MoA 支持还在演进,不稳定 | 观察 |

---

## 10. 参考资料

- [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) — 主线开源项目
- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs) — 架构与 API
- [Hermes Agent 深度技术剖析](https://developer.aliyun.com/article/1743026) — 中文技术报告
- [Hermes Agent 进阶教程:技能自进化/MoA/多后端](https://developer.aliyun.com/article/1745134) — 实现细节
- [Hermes Agent 一行命令部署指南](https://developer.aliyun.com/article/1738949) — 部署参考
- [hermes-agent-source-wiki](https://github.com/FrankFilippi/hermes-agent-source-wiki) — 源码架构 wiki

---

## 11. 评审签字

- [ ] 架构组
- [ ] AI 团队 Lead
- [ ] 安全合规(本地私有化)
- [ ] 产品(技能可视化)

---

**变更记录**

| 日期 | 版本 | 作者 | 变更 |
|---|---|---|---|
| 2026-07-06 | v0.1 | BigLionX | 初稿 |