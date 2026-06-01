// ProClaw Cloud 托管版 - AI 客服知识库检索服务
// 实现三级检索：商品库 → 问答库（精确+向量）→ 订单查询 → LLM 增强回答 / 转人工

import type { SupabaseClient } from '@supabase/supabase-js';

// ===== 类型定义 =====

export interface SearchResult {
  found: boolean;
  answer: string;
  source: 'knowledge_base' | 'model' | 'manual';
  confidence: number;           // 0-1 置信度
  needsTransfer: boolean;       // 是否需要转人工
  transferReason?: string;      // 转人工原因
}

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  stock: number;
  description?: string;
  category?: string;
}

export interface CustomerServiceConfig {
  systemPrompt: string;
  transferMode: 'direct' | 'ai_judged';
  agentName: string;
}

// ===== LLM 调用 =====

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getLLMConfig(): LLMConfig | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  };
}

/**
 * 调用 LLM 生成客服回答
 * 将检索到的数据作为上下文注入，让 AI 自然回答
 */
async function callCustomerServiceLLM(
  config: LLMConfig,
  systemPrompt: string,
  query: string,
  context?: {
    products?: ProductInfo[];
    kbAnswer?: string;
    orderInfo?: string;
    orderQuery?: boolean;
  }
): Promise<{
  answer: string;
  needsTransfer: boolean;
  transferReason?: string;
}> {
  // 构建上下文数据块
  let contextBlock = '';
  if (context?.products && context.products.length > 0) {
    contextBlock += '\n## 当前商品数据\n';
    context.products.forEach((p, i) => {
      contextBlock += `${i + 1}. ${p.name} | ¥${p.price} | 库存 ${p.stock}`;
      if (p.category) contextBlock += ` | 分类: ${p.category}`;
      contextBlock += '\n';
      if (p.description) contextBlock += `   描述: ${p.description}\n`;
    });
  }
  if (context?.kbAnswer) {
    contextBlock += '\n## 问答库匹配结果\n' + context.kbAnswer + '\n';
  }
  if (context?.orderInfo) {
    contextBlock += '\n## 订单信息\n' + context.orderInfo + '\n';
  }

  // 增强系统提示词
  const enhancedSystemPrompt = systemPrompt + '\n\n' +
    `## 回答规则\n` +
    `1. 优先使用下方提供的「当前数据」来回答，涉及价格、库存以实际数据为准\n` +
    `2. 回答要口语化、自然，不要生硬地罗列数据\n` +
    `3. 如果客户的问题需要查更多数据（如某个商品的详细规格），请在回答末尾指定要查询的内容，格式为：【查询: 商品名称】\n` +
    `4. 如果客户的问题需要查看订单状态但未提供订单号，引导客户提供订单号\n` +
    `5. 遇到以下情况请设置需要转人工：议价、投诉、定制需求、要求找真人\n` +
    `6. 回答控制在200字以内，简洁明了`;

  try {
    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
    ] as Array<{ role: string; content: string }>;

    // 如果有数据上下文，先注入
    if (contextBlock) {
      messages.push({
        role: 'system',
        content: `【当前数据库查询到的数据，请参考这些数据回答客户】\n${contextBlock}`,
      });
    }

    messages.push({ role: 'user', content: query });

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();

    if (!content) {
      return { answer: '', needsTransfer: true, transferReason: 'AI 返回空回答' };
    }

    // 解析是否包含转人工需求
    const needsTransfer = /需要转人工|转人工|找真人|请联系人工/i.test(content);

    return {
      answer: content,
      needsTransfer,
      transferReason: needsTransfer ? 'AI 判断需要人工处理' : undefined,
    };
  } catch (err) {
    console.error('LLM 调用失败:', err);
    return { answer: '', needsTransfer: true, transferReason: 'AI 服务暂时不可用' };
  }
}

/**
 * 动态查询商品详情
 * 解析 LLM 回复中的【查询: xxx】标记，执行二次查询
 */
async function handleDynamicQuery(
  supabase: SupabaseClient,
  schema: string,
  answer: string
): Promise<string | null> {
  const match = answer.match(/【查询:\s*(.+?)】/);
  if (!match) return null;

  const queryTerm = match[1].trim();
  if (!queryTerm) return null;

  try {
    const { data } = await supabase
      .from(`"${schema}"."products"`)
      .select('id, name, price, stock, description, category')
      .or(`name.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
      .limit(3);

    if (data && data.length > 0) {
      return (data as Record<string, unknown>[]).map(p =>
        `【${p.name}】¥${p.price}，库存 ${p.stock}${p.description ? `\n说明: ${p.description}` : ''}`
      ).join('\n---\n');
    }
    return `未找到「${queryTerm}」的相关信息。`;
  } catch {
    return null;
  }
}

// ===== 商品库检索 =====

/**
 * 从商品库检索商品信息
 * 关键词匹配商品名称/描述/分类
 */
async function searchProducts(
  supabase: SupabaseClient,
  schema: string,
  query: string
): Promise<ProductInfo[]> {
  const keywords = query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return [];

  try {
    const conditions = keywords.map(k => `name.ilike.%${k}%`);
    const { data } = await supabase
      .from(`"${schema}"."products"`)
      .select('id, name, price, stock, description, category')
      .or(conditions.join(','))
      .limit(5);

    return (data || []).map((p: Record<string, unknown>) => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      description: p.description ? String(p.description) : undefined,
      category: p.category ? String(p.category) : undefined,
    }));
  } catch {
    return [];
  }
}

// ===== 问答库检索 =====

/**
 * 精确关键词匹配问答库
 */
async function exactMatchKB(
  supabase: SupabaseClient,
  tenantId: string,
  query: string
): Promise<{ answer: string; confidence: number } | null> {
  try {
    // 尝试关键词精确匹配
    const { data } = await supabase
      .from('customer_service_knowledge_base')
      .select('question, answer, keywords')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(20);

    if (!data || data.length === 0) return null;

    // 计算关键词匹配分数
    const queryLower = query.toLowerCase();
    let bestMatch: { answer: string; confidence: number } | null = null;

    for (const item of data) {
      const questionLower = item.question.toLowerCase();
      const keywords = (item.keywords || []) as string[];
      
      // 精确匹配检查
      let score = 0;
      
      // 问题包含匹配
      if (questionLower.includes(queryLower) || queryLower.includes(questionLower)) {
        score = Math.max(score, 0.7 + (queryLower.length / Math.max(questionLower.length, 1)) * 0.2);
      }
      
      // 关键词匹配
      const matchedKeywords = keywords.filter(k => queryLower.includes(k.toLowerCase()));
      if (keywords.length > 0) {
        score = Math.max(score, matchedKeywords.length / keywords.length * 0.9);
      }

      if (score > 0.5 && (!bestMatch || score > bestMatch.confidence)) {
        bestMatch = { answer: item.answer, confidence: Math.min(score, 0.95) };
      }
    }

    return bestMatch;
  } catch {
    return null;
  }
}

/**
 * 向量相似度检索问答库
 * 需要 pgvector 扩展和 embedding 字段
 */
async function vectorSearchKB(
  supabase: SupabaseClient,
  tenantId: string,
  embedding: number[]
): Promise<{ answer: string; confidence: number } | null> {
  try {
    // 使用 pgvector 的余弦相似度检索
    const { data } = await supabase.rpc('match_cs_knowledge_base', {
      p_tenant_id: tenantId,
      p_embedding: embedding,
      p_match_threshold: 0.6,
      p_match_count: 3,
    });

    if (data && data.length > 0) {
      return {
        answer: data[0].answer,
        confidence: data[0].similarity,
      };
    }
    return null;
  } catch {
    // 如果 RPC 不存在或向量检索失败，返回 null
    return null;
  }
}

// ===== 订单查询检测 =====

/**
 * 检测查询是否为订单查询
 */
function isOrderQuery(query: string): boolean {
  const orderPatterns = [
    /订单/i,
    /我的订单/i,
    /查.*订单/i,
    /订单号/i,
    /DD\d{6,}/i,
    /ORD/i,
  ];
  return orderPatterns.some(p => p.test(query));
}

/**
 * 从查询中提取订单号
 */
function extractOrderNumber(query: string): string | null {
  const patterns = [
    /(?:订单号[：:]\s*)?(DD\d{6,})/i,
    /(?:订单号[：:]\s*)?(ORD[-_]\w+)/i,
    /(?:订单号[：:]\s*)?(\d{8,})/,
  ];
  for (const p of patterns) {
    const match = query.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * 查询订单状态
 */
async function queryOrderStatus(
  supabase: SupabaseClient,
  schema: string,
  orderNumber: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from(`"${schema}"."orders"`)
      .select('order_number, status, total_amount, created_at')
      .or(`order_number.eq.${orderNumber},id.eq.${orderNumber}`)
      .limit(1)
      .single();

    if (data) {
      const statusMap: Record<string, string> = {
        pending: '待付款',
        paid: '已付款',
        processing: '处理中',
        shipped: '已发货',
        delivered: '已送达',
        completed: '已完成',
        cancelled: '已取消',
        refunding: '退款中',
        refunded: '已退款',
      };
      return `您的订单 **${data.order_number}** 当前状态为：**${statusMap[data.status] || data.status}**\n下单时间：${new Date(data.created_at).toLocaleString('zh-CN')}${data.total_amount ? `\n订单金额：¥${data.total_amount}` : ''}`;
    }
    return '未找到该订单，请检查订单号是否正确。';
  } catch {
    return null;
  }
}

// ===== 主检索流程 =====

/**
 * 客服主检索入口
 * 按三级检索流程处理客户问题
 */
export async function searchCustomerService(
  supabase: SupabaseClient,
  schema: string,
  tenantId: string,
  query: string,
  options?: {
    systemPrompt?: string;
    embedding?: number[];
  }
): Promise<SearchResult> {
  // --- 收集所有可用数据 ---
  const [products, exactMatch, llmConfig] = await Promise.all([
    searchProducts(supabase, schema, query),
    exactMatchKB(supabase, tenantId, query),
    Promise.resolve(getLLMConfig()),
  ]);

  // 向量检索（可选）
  let vectorMatch: { answer: string; confidence: number } | null = null;
  if (!exactMatch && options?.embedding && options.embedding.length > 0) {
    vectorMatch = await vectorSearchKB(supabase, tenantId, options.embedding);
  }

  // 订单查询
  let orderInfo: string | undefined;
  if (isOrderQuery(query)) {
    const orderNumber = extractOrderNumber(query);
    if (orderNumber) {
      orderInfo = await queryOrderStatus(supabase, schema, orderNumber) || undefined;
    }
  }

  // --- 获取商户配置 ---
  let transferMode = 'direct';
  let systemPrompt = options?.systemPrompt || '';
  try {
    const { data: settings } = await supabase
      .from('customer_service_settings')
      .select('transfer_mode, system_prompt')
      .eq('tenant_id', tenantId)
      .single();

    if (settings) {
      transferMode = (settings.transfer_mode as string) || 'direct';
      if (!systemPrompt && settings.system_prompt) {
        systemPrompt = settings.system_prompt as string;
      }
    }
  } catch {
    // 使用默认值
  }

  // 如果未配置自定义提示词，使用默认
  if (!systemPrompt) {
    systemPrompt = '你是云商城的智能客服助手，礼貌、专业地回答客户的问题。回答时参考数据库中的商品信息和知识库内容，涉及价格和库存以实际数据为准。回答简洁明了，使用中文。';
  }

  // --- LLM 可用：生成自然回答 ---
  if (llmConfig) {
    const kbAnswer = exactMatch?.answer || vectorMatch?.answer || undefined;
    const hasData = products.length > 0 || kbAnswer || orderInfo;

    // 有任何上下文数据或至少尝试 LLM 兜底
    const llmResult = await callCustomerServiceLLM(llmConfig, systemPrompt, query, {
      products: products.length > 0 ? products : undefined,
      kbAnswer,
      orderInfo,
    });

    if (llmResult.answer) {
      // 处理动态查询标记
      if (llmResult.answer.includes('【查询:')) {
        const dynamicResult = await handleDynamicQuery(supabase, schema, llmResult.answer);
        if (dynamicResult) {
          // 有动态查询结果，再次调用 LLM 整合
          const secondResult = await callCustomerServiceLLM(
            llmConfig, systemPrompt, query,
            { products: products.length > 0 ? products : undefined, kbAnswer, orderInfo }
          );
          if (secondResult.answer) {
            return {
              found: true,
              answer: secondResult.answer,
              source: 'model',
              confidence: 0.7,
              needsTransfer: secondResult.needsTransfer,
              transferReason: secondResult.transferReason,
            };
          }
        }
      }

      return {
        found: true,
        answer: llmResult.answer,
        source: hasData ? 'knowledge_base' : 'model',
        confidence: hasData ? 0.7 : 0.4,
        needsTransfer: llmResult.needsTransfer,
        transferReason: llmResult.transferReason,
      };
    }

    // LLM 返回空，转人工
    if (transferMode === 'direct') {
      return { found: false, answer: '', source: 'manual', confidence: 0, needsTransfer: true, transferReason: llmResult.transferReason || '无法自动回答' };
    }
  }

  // --- LLM 不可用：回退到静态检索 ---
  if (products.length > 0) {
    const list = products.map(p => `${p.name} ¥${p.price}（库存 ${p.stock}）`).join('、');
    return { found: true, answer: `为您找到以下商品：${list}`, source: 'knowledge_base', confidence: 0.85, needsTransfer: false };
  }

  if (exactMatch) {
    return { found: true, answer: exactMatch.answer, source: 'knowledge_base', confidence: exactMatch.confidence, needsTransfer: false };
  }

  if (orderInfo) {
    return { found: true, answer: orderInfo, source: 'knowledge_base', confidence: 0.9, needsTransfer: false };
  }
  if (isOrderQuery(query)) {
    return { found: true, answer: '请提供您的订单号，我来为您查询订单状态。', source: 'model', confidence: 0.5, needsTransfer: false };
  }

  if (vectorMatch) {
    return { found: true, answer: vectorMatch.answer, source: 'knowledge_base', confidence: vectorMatch.confidence, needsTransfer: false };
  }

  // --- 回退：转人工 ---
  return { found: false, answer: '', source: 'manual', confidence: 0, needsTransfer: true, transferReason: '无法自动回答' };
}
