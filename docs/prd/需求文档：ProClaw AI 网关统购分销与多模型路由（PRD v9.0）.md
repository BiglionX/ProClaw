# 需求文档：ProClaw AI 网关统购分销与多模型路由（PRD v9.0）

> **版本**: v9.0  
> **更新日期**: 2026-05-31  
> **状态**: 草案  
> **关联 PRD**: v6.4（AI Team 群聊 LLM 接入）、v8.0（Token 计费模式）、v8.5（商务秘书 Agent）

---

## 1. 背景与动机

### 1.1 现状问题

当前 ProClaw 桌面端各 AI 模块（CEO Agent、商务秘书 Agent、AI Team 群聊）的 LLM 调用均**直接面向第三方大模型 API**：

```
前端（LangChain ChatOpenAI）
  → https://api.deepseek.com/chat/completions  （需用户自备 API Key）
```

**问题：**

| 问题 | 影响 |
|------|------|
| 用户需自备 API Key | 普通小老板不会申请，AI 功能形同虚设 |
| 无法统一管控 | Demon 账号 Token 额度只在 local 扣减，无法防篡改 |
| 品牌认知弱 | 用户看到的是"连 DeepSeek"，而非"ProClaw AI" |
| 无法计费 | 无法精确计量、按量向用户收费 |
| 无法多模型调度 | 无法根据任务类型切换模型（便宜/贵） |

### 1.2 核心商业模型：统购分销

ProClaw 的 AI 服务采用 **"统购分销"** 模式：

```
DeepSeek ──→  ProClaw AI 网关  ──→  ProClaw 用户
（一线大模型）   (ai.proclaw.cc)      (桌面端/Web端)
```

| 角色 | 行为 |
|------|------|
| **ProClaw（统购方）** | 向 DeepSeek / 智谱 / OpenAI 等批量采购大模型 API，获得批发价 |
| **ProClaw AI 网关** | 封装成统一 API，做鉴权、限流、计费、模型路由 |
| **用户（消费者）** | 直接在 ProClaw 内使用 AI，无需自行申请任何第三方 Key |
| **用户感知** | "接入 ProClaw 云模型服务"——强大、省心、一站式 |

**类比**：就像 Apple 向富士康采购芯片，用户买的是 iPhone，不需要知道里面有谁的零件。

---

## 2. 目标

### 2.1 产品目标

1. **零配置开箱即用** — 用户打开 ProClaw，AI 对话立刻可用，无需任何第三方 Key
2. **品牌统一** — 用户感知到的 AI 品牌是 "ProClaw GPT-4"，而非底层模型名
3. **Token 经济闭环** — AI Token 消耗与平台 Token 体系打通，支持充值/扣费/余额不足提示
4. **多模型路由** — 网关根据任务类型（简单查询 vs 复杂分析）自动选择最佳模型，平衡成本与体验
5. **可审计** — 所有 API 调用留痕，支持按用户/按任务对账

### 2.2 设计原则

- **对用户透明** — 用户不感知底层模型切换
- **成本最优** — 简单任务用小模型（省钱），复杂分析用大模型（保质量）
- **渐进开放** — 一期接入 DeepSeek，后续扩展更多供应商
- **安全兜底** — 网关挂掉时前端有降级提示，不影响业务数据查询

---

## 3. 架构设计

### 3.1 整体拓扑

```
┌──────────────────────────────────────────────────┐
│                  ProClaw 桌面端                    │
│  FloatingAgentChat / aiTeamChatService            │
│  ChatOpenAI(baseURL: https://ai.proclaw.cc/api/v1)│
└────────────────────┬─────────────────────────────┘
                     │ HTTPS (无需 API Key)
                     ▼
┌─────────────────────────────────────────────────┐
│           ProClaw AI 网关 (ai.proclaw.cc)          │
│                                                   │
│  POST /api/v1/chat/completions                    │
│    ├─ 鉴权：验证租户身份（JWT / API Key）           │
│    ├─ 路由：根据 task_type 选模型                   │
│    ├─ 计费：记录 token 消耗，扣减额度                │
│    ├─ 限流：单用户 QPS / 日消耗上限                  │
│    └─ 转发：OpenAI 兼容格式 → 下游大模型             │
└────┬──────────────┬──────────────┬───────────────┘
     │              │              │
     ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│DeepSeek │  │ 智谱GLM  │  │ OpenAI   │  ...
│（主力）  │  │（备用）   │  │（高级）   │
└─────────┘  └──────────┘  └──────────┘
```

### 3.2 网关 API 设计

#### 端点

```
POST https://ai.proclaw.cc/api/v1/chat/completions
```

#### 请求格式（OpenAI Compatible + ProClaw 扩展）

```json
{
  "model": "proclaw-gpt-4",
  "messages": [
    { "role": "system", "content": "你是商务秘书..." },
    { "role": "user", "content": "帮我查库存" }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "proclaw_meta": {
    "tenant_id": "xxx",
    "task_type": "business_insight",
    "feature": "secretary_chat"
  }
}
```

#### 响应格式

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "proclaw-gpt-4",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 80,
    "total_tokens": 230
  },
  "proclaw_meta": {
    "routed_model": "deepseek-chat",
    "cost_pt": 115,
    "remaining_pt": 8700
  }
}
```

### 3.3 多模型路由策略

| task_type | 适用场景 | 路由模型 | 预估成本 |
|-----------|---------|---------|---------|
| `simple_query` | 简单问答、引导话术 | 本地规则 / 小模型 | 极低 |
| `business_insight` | 商务秘书数据查询 | DeepSeek-Chat | 中等 |
| `ceo_decision` | CEO Agent 决策分析 | DeepSeek-Reasoner / GPT-4 | 较高 |
| `sales_forecast` | 销售预测分析 | GPT-4 / DeepSeek-Reasoner | 高 |
| `content_generation` | 营销文案/社媒内容 | DeepSeek-Chat | 中等 |

### 3.4 鉴权方案

| 场景 | 鉴权方式 |
|------|---------|
| 桌面端正式用户 | JWT（登录后颁发，包含 tenant_id） |
| 桌面端演示账号 | 固定 `Authorization: Bearer proclaw-demo`，走共享额度 |
| Web 端（云托管） | 同正式用户 JWT |
| 网关间内部调用 | 内部 Service Token |

---

## 4. Token 经济闭环

### 4.1 Token 流通路径

```
用户充值 Token
   → 平台 Token 余额
      → 每次 LLM 调用，网关扣减
         → ProClaw 向 DeepSeek 批量结算（批发价）
            → 差价 = ProClaw 毛利
```

### 4.2 计费规则

| 计费项 | 说明 |
|--------|------|
| **计价单位** | PT（ProClaw Token），1 PT = 约 1 个 LLM token |
| **消耗计算** | prompt_tokens × 输入系数 + completion_tokens × 输出系数 |
| **演示额度** | 首次使用赠送 10,000 PT，用完需充值 |
| **扣减位置** | **网关侧**（非前端 local），防篡改 |
| **余额不足** | 返回 402 Payment Required，前端友好提示 |

### 4.3 采购与分销定价模型

```
ProClaw 向 DeepSeek 采购价：¥1 / 百万 token（批发）
ProClaw 向用户销售价：¥10 / 10,000 PT（零售）

毛利空间：零售价 - 采购成本 = ProClaw AI 服务利润
```

> 具体定价需根据实际 API 采购合同确定。此处为示意模型。

---

## 5. 前端适配

### 5.1 现有代码已就绪

桌面端已通过 `@langchain/openai` 的 `ChatOpenAI` 连接 `https://ai.proclaw.cc/api/v1`：

| 模块 | 文件 | 接入状态 |
|------|------|---------|
| CEO Agent / AI Team 群聊 | `src/lib/aiTeamChatService.ts` | ✅ `ChatOpenAI` → `ai.proclaw.cc` |
| 商务秘书 Agent | `src/components/Agent/FloatingAgentChat.tsx` | ✅ `getLLMForTask('business_insight')` |
| LLM Provider 管理器 | `src/lib/llmProvider.ts` | ✅ 自动初始化 `default-service` |
| 默认配置 | `src/lib/aiConfig.ts` | ✅ endpoint: `ai.proclaw.cc/api/v1` |

### 5.2 网关不可用时的降级

当前已实现：网关 DNS 解析失败时，前端提示用户：
> "⚠️ 无法连接到 ProClaw 云 LLM 服务。请前往设置配置第三方 Key 作为备用。"

备用路径（网关不可用时）：
- 用户可在 **设置 → AI 设置** 配置自己的 DeepSeek / OpenAI API Key
- 此时 ChatOpenAI 直连第三方 API，绕过网关

### 5.3 待适配（网关就绪后）

| 项 | 说明 |
|----|------|
| 请求头带 JWT | 从 auth store 取 token，加到 `configuration.defaultHeaders` |
| 请求体带 `proclaw_meta` | `task_type` + `feature` 透传给网关做路由 |
| 响应体读取 `proclaw_meta.remaining_pt` | 替换当前 local Token 扣减逻辑 |
| Token 扣减从 local 迁至网关 | 删除前端的 `deductTokens()` 调用，改为读网关返回的余额 |

---

## 6. 用户故事

- **作为** 小老板用户，我打开 ProClaw 后直接在秘书窗口问"今天销售额多少"，AI 立刻回答——不需要去 DeepSeek 官网注册、充钱、拿 Key、粘贴配置。

- **作为** 演示账号用户，我用 `boss@proclaw.demo` 登录后获赠 10,000 PT，可以充分体验所有 AI 功能，Token 用完时有清晰提示引导充值。

- **作为** ProClaw 运营方，我在网关后台可以看到：哪个租户用量最大、哪个模型被调用最多、采购成本 vs 销售收入。

- **作为** 开发者，我可以在前端用统一的 `ChatOpenAI` 接口调用，不需要关心底层走的是 DeepSeek 还是智谱。

---

## 7. 实施计划

### 阶段一：网关 MVP（核心功能）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| OpenAI 兼容 `/chat/completions` | P0 | 与现有前端代码无缝对接 |
| 对接 DeepSeek API 转发 | P0 | 一期主力模型 |
| 租户鉴权（JWT） | P0 | 识别用户身份 |
| Token 计费扣减 | P0 | 网关侧扣费，返回剩余余额 |
| 演示账号 10,000 PT | P0 | 登录即赠 |

### 阶段二：多模型路由与运营

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 多模型路由（task_type → 模型） | P1 | 成本优化 |
| 用量监控面板 | P1 | 后台看板 |
| 接入智谱 / GPT-4 | P2 | 多供应商冗余 |

### 阶段三：前端完全迁移

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 前端 Token 扣减改为读网关 | P1 | 废弃 local 扣减 |
| 请求带 `proclaw_meta` 透传 | P1 | 支持模型路由 |
| 第三方 Key 模式作为备用 | P2 | 网关挂了也能用 |

---

## 8. 技术选型建议（网关侧）

| 组件 | 建议 | 理由 |
|------|------|------|
| **网关框架** | Express.js / Fastify | 轻量、Node 生态，已有 Next.js 经验 |
| **部署** | Vercel Serverless Functions | 与 cloud-store（Next.js）共部署 |
| **鉴权** | JWT + Supabase Auth | 复用现有用户体系 |
| **数据库** | Supabase PostgreSQL | 计费记录、租户配置、用量日志 |
| **限流** | Vercel KV / Upstash Redis | 分布式限流 |
| **监控** | Vercel Analytics + 自建日志 | 调用量、错误率、延迟 |

> **备选方案**：如网关与 cloud-store 合并部署，可直接在 Next.js `app/api/v1/chat/completions/route.ts` 实现，减少服务数量。

---

## 9. 验收标准

- [ ] 桌面端无需任何第三方 API Key，AI 对话立即可用
- [ ] 演示账号登录后 10,000 PT 可用，对话消耗能正确扣减
- [ ] 网关侧 Token 扣减准确，与 LLM 实际消耗误差 < 5%
- [ ] 余额不足时返回清晰提示，不中断对话
- [ ] 网关挂掉时前端降级提示 + 支持手动配第三方 Key 兜底
- [ ] OpenAI 兼容格式，前端无需修改 `ChatOpenAI` 调用代码
- [ ] 网关后台可查看调用日志、租户用量、模型分布

---

## 10. 附录

### A. 与现有 Token 系统的关系

| 系统 | Token 类型 | 用途 |
|------|-----------|------|
| 云商城 Token（PRD v8.0） | 商城 Token | 商品同步、AI主题、订单处理等云商城操作 |
| AI 对话 Token（本文档） | AI Token（PT） | LLM 对话调用消耗 |

> 两个 Token 体系当前独立。未来可讨论合并为"ProClaw 统一额度"。

### B. 前端现有代码分析

| 文件 | 当前行为 | 网关就绪后变更 |
|------|---------|--------------|
| `src/lib/aiConfig.ts` | endpoint: `ai.proclaw.cc`，apiKey 为空 | 不变，网关不需要 API Key |
| `src/lib/llmProvider.ts` | `ChatOpenAI({ apiKey: 'proclaw-default' })` | 改为从 auth store 取 JWT |
| `src/lib/aiTeamTokenService.ts` | local `deductTokens()` | 废弃，读网关返回的 `remaining_pt` |
| `FloatingAgentChat.tsx` | 前端扣 Token + 显示余额 | 改为读网关返回的余额 |

### C. 关键域名称

| 域名 | 用途 |
|------|------|
| `ai.proclaw.cc` | AI 网关 API 入口 |
| `app.proclaw.cc` | 云托管商城（已有） |
| `www.proclaw.cc` | 营销网站（已有） |

