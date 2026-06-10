/**
 * AIService - 手机端多供应商 AI 对话服务
 *
 * PRD v11.2 Phase 3:
 *   - 多 LLM 供应商回退链：DeepSeek → OpenAI → Anthropic → Ollama
 *   - 流式响应支持（SSE 解析，逐 token yield）
 *   - 格式标准化的 conversationHistory
 */
import { getAIConfig, isAIConfigured, getAvailableProviders, type ProviderConfig } from '../config/ai';
import { getDatabase, getCurrentProfileId } from './DatabaseFactory';
import { logger } from '../utils/logger';
import { getErrorMessage, toError } from '../utils/errorUtils';

// ============ 类型定义 ============

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

// ============ Agent 系统提示词 ============

const AGENT_SYSTEM_PROMPTS: Record<string, (ctx: AgentContext) => string> = {
  secretary: (ctx) => `你是 ProClaw 的商务秘书「小如」，一个专业的 AI 工作助手。你的职责是帮助老板高效管理日常工作。

## 你的能力
- 回答关于公司业务数据的问题（销售额、库存、订单等）
- 管理联系人和日程安排
- 提供经营建议和数据分析
- 协助处理日常事务

## 当前可用的业务数据
${ctx.businessSummary}

## 回答要求
- 使用中文，语气专业但亲切
- 基于提供的业务数据给出准确回答
- 如果数据不足以回答问题，诚实说明并建议如何获取
- 回答简洁明了，重点突出`,

  ceo: (ctx) => `你是 ProClaw 的 CEO Agent，负责经营决策分析和战略建议。

## 你的能力
- 分析公司经营数据，提供决策建议
- 识别业务风险和机会
- 制定增长策略

## 当前业务数据
${ctx.businessSummary}

## 回答要求
- 使用中文，语气专业、有洞察力
- 基于数据给出可操作的建议
- 区分短期执行和长期战略`,

  'customer-service': (ctx) => `你是 ProClaw 的 AI 客服，负责回答客户关于产品的咨询。

## 可用信息
${ctx.businessSummary}

## 回答要求
- 态度友好、专业
- 回答准确，不编造信息
- 如果遇到无法回答的问题，建议联系人工客服`,
};

// ============ 业务上下文 ============

interface AgentContext {
  businessSummary: string;
}

async function buildBusinessContext(): Promise<string> {
  const parts: string[] = [];
  try {
    // 审计 I1：在请求创建时捕获 profileId，防止切换身份后读取错误数据库
    const capturedProfileId = getCurrentProfileId();
    // 审计 H4：捕获 getDatabase 抛出的异常
    let db: any;
    try {
      db = getDatabase();
    } catch (e) {
      logger.warn('[AIService] Database not ready (profile=', capturedProfileId, '), cannot build business context:', e);
      return '暂无可用业务数据';
    }

    // 1. 商品概览（审计 E1/D1：使用正确的表名 product_spu + product_sku）
    try {
      const products: any[] = await db.getAllAsync(
        'SELECT spu.name, sku.sell_price AS price, sku.current_stock AS stock_quantity, spu.category_id AS category FROM product_spu spu LEFT JOIN product_sku sku ON sku.spu_id = spu.id AND sku.is_default = 1 WHERE spu.deleted_at IS NULL LIMIT 20'
      );
      if (products.length > 0) {
        const summary = products
          .map((p: any) => `- ${p.name}：¥${p.price ?? 0}，库存${p.stock_quantity ?? 0}${p.category ? `，分类：${p.category}` : ''}`)
          .join('\n');
        parts.push(`### 商品库（前20条）\n${summary}`);
      }
    } catch { /* 表可能不存在 */ }

    // 2. 联系人概览
    try {
      const contacts: any[] = await db.getAllAsync(
        `SELECT name, contact_type, company, phone FROM customers LIMIT 15`
      );
      if (contacts.length > 0) {
        const summary = contacts
          .map((c: any) => `- ${c.name}（${c.contact_type || '联系人'}）${c.company ? `，${c.company}` : ''}${c.phone ? `，${c.phone}` : ''}`)
          .join('\n');
        parts.push(`### 联系人（前15条）\n${summary}`);
      }
    } catch { /* 表可能不存在 */ }

    // 3. 订单概览（审计 E2/D1：使用正确的表名 sales_orders）
    try {
      const orders: any[] = await db.getAllAsync(
        `SELECT order_number, total_amount, status, created_at FROM sales_orders ORDER BY created_at DESC LIMIT 10`
      );
      if (orders.length > 0) {
        const summary = orders
          .map((o: any) => `- ${o.order_number}：¥${o.total_amount}，状态：${o.status}`)
          .join('\n');
        parts.push(`### 最近订单（前10条）\n${summary}`);
      }
    } catch { /* 表可能不存在 */ }

    // 4. 知识库文档（审计 E3/D1：knowledge_base 表不存在，暂不查询）

  } catch {
    // 数据库未就绪时返回空上下文
  }

  return parts.length > 0 ? parts.join('\n\n') : '暂无可用业务数据';
}

async function buildContext(): Promise<AgentContext> {
  const businessSummary = await buildBusinessContext();
  return { businessSummary };
}

// ============ 核心：多供应商调用（非流式） ============

/**
 * 多供应商回退调用：按 FALLBACK_ORDER 依次尝试，失败则试下一个
 */
async function callLLM(messages: ChatMessage[]): Promise<string> {
  const config = await getAIConfig();

  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error('AI 服务未配置任何可用的 API 密钥。请在设置中配置至少一个 LLM 供应商。');
  }

  let lastError: Error | null = null;

  for (const provider of available) {
    try {
      return await callProvider(provider, messages);
    } catch (err) {
      logger.warn(`[AIService] Provider ${provider.name} failed:`, getErrorMessage(err));
      lastError = toError(err);
      // 继续尝试下一个供应商
    }
  }

  throw new Error(
    `所有 AI 供应商均不可用。最后错误：${lastError?.message || '未知错误'}`
  );
}

/** 调用单个供应商 */
async function callProvider(provider: ProviderConfig, messages: ChatMessage[]): Promise<string> {
  const config = await getAIConfig();
  const url = `${provider.apiBase}/chat/completions`;

  logger.log(`[AIService] Calling ${provider.name} (${provider.model}) at ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ollama 可选 Authorization；其他供应商必需
  if (provider.id !== 'ollama' || provider.apiKey !== 'ollama-local') {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.name} 返回错误 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (data.usage) {
    logger.log(
      `[AIService] ${provider.name} tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`
    );
  }

  return content.trim();
}

// ============ 核心：流式调用（SSE） ============

/**
 * 流式多供应商调用：返回 async generator，逐 token yield
 * 同样支持回退链，但流式失败后回退到非流式调用
 */
async function* callLLMStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const config = await getAIConfig();
  const available = getAvailableProviders();

  if (available.length === 0) {
    yield 'AI 服务未配置任何可用的 API 密钥。请在设置中配置至少一个 LLM 供应商。';
    return;
  }

  // 尝试流式
  for (const provider of available) {
    try {
      const tokens = streamProvider(provider, messages, config.maxTokens, config.temperature);
      let hasYielded = false;
      for await (const token of tokens) {
        hasYielded = true;
        yield token;
      }
      if (hasYielded) return; // 流式成功
    } catch (err) {
      logger.warn(`[AIService] Stream from ${provider.name} failed:`, getErrorMessage(err));
    }
  }

  // 流式全部失败 → 回退到非流式
  try {
    const fullResponse = await callLLM(messages);
    if (fullResponse) {
      yield fullResponse;
    }
  } catch (fallbackErr) {
    yield `抱歉，AI 服务暂时无法响应（${getErrorMessage(fallbackErr, '未知错误')}）。`;
  }
}

/** SSE 流式解析 */
async function* streamProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): AsyncGenerator<string> {
  const url = `${provider.apiBase}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.id !== 'ollama' || provider.apiKey !== 'ollama-local') {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.name} 流式返回错误 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('流式响应不支持（无 ReadableStream）');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 解析：每行以 "data: " 开头
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 未完成行放回 buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.substring(5).trim();
        if (jsonStr === '[DONE]') return; // 流结束

        try {
          const chunk: StreamChunk = JSON.parse(jsonStr);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // 忽略解析失败的行
        }
      }
    }

    // 处理 buffer 中残留的最后一行
    if (buffer.trim().startsWith('data:')) {
      const jsonStr = buffer.trim().substring(5).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const chunk: StreamChunk = JSON.parse(jsonStr);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch { /* 忽略 */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ============ 公开 API ============

export interface AgentChatRequest {
  agentId: string;
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AgentChatResponse {
  reply: string;
  tokensUsed?: number;
}

/**
 * 与指定 Agent 对话（非流式，向后兼容）
 */
export async function chatWithAgent(request: AgentChatRequest): Promise<AgentChatResponse> {
  const { agentId, userMessage, conversationHistory = [] } = request;

  // 0. 快速检查
  if (!isAIConfigured()) {
    const config = await getAIConfig();
    if (getAvailableProviders().length === 0) {
      return {
        reply:
          '⚠️ AI 服务尚未配置 API 密钥。\n\n' +
          '请前往「我的 → AI 设置」配置至少一个 LLM 供应商的 API Key。\n\n' +
          '支持：DeepSeek、OpenAI、Anthropic Claude、Ollama 本地模型',
      };
    }
  }

  // 1. 业务上下文
  const ctx = await buildContext();

  // 2. System Prompt
  const systemPromptBuilder = AGENT_SYSTEM_PROMPTS[agentId];
  const systemPrompt = systemPromptBuilder
    ? systemPromptBuilder(ctx)
    : AGENT_SYSTEM_PROMPTS.secretary(ctx);

  // 3. 组装消息
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 4. 多供应商回退调用
  const reply = await callLLM(messages);
  return { reply };
}

/**
 * 与 Agent 流式对话：返回 async generator，逐 token yield
 *
 * 使用方式：
 *   for await (const token of chatWithAgentStream(request)) {
 *     setReply(prev => prev + token);
 *   }
 */
export async function* chatWithAgentStream(
  request: AgentChatRequest
): AsyncGenerator<string> {
  const { agentId, userMessage, conversationHistory = [] } = request;

  // 0. 快速检查
  if (!isAIConfigured()) {
    const config = await getAIConfig();
    if (getAvailableProviders().length === 0) {
      yield '⚠️ AI 服务尚未配置 API 密钥。\n\n请前往「我的 → AI 设置」配置至少一个 LLM 供应商的 API Key。';
      return;
    }
  }

  // 1. 业务上下文
  const ctx = await buildContext();

  // 2. System Prompt
  const systemPromptBuilder = AGENT_SYSTEM_PROMPTS[agentId];
  const systemPrompt = systemPromptBuilder
    ? systemPromptBuilder(ctx)
    : AGENT_SYSTEM_PROMPTS.secretary(ctx);

  // 3. 组装消息
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 4. 流式多供应商回退调用
  yield* callLLMStream(messages);
}

/**
 * 快速文本生成（不带 Agent 上下文，纯 LLM 调用）
 */
export async function generateText(prompt: string): Promise<string> {
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  return callLLM(messages);
}
