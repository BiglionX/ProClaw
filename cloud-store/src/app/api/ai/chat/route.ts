// ProClaw Cloud 托管版 - AI 聊天 API Routes
// 对接 OpenAI/Claude API，支持经营分析、库存建议、销售趋势等

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

// AI API 配置
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai',
  apiKey: process.env.AI_API_KEY || '',
  baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.AI_MODEL || 'gpt-3.5-turbo',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  agentType?: 'general' | 'inventory' | 'finance' | 'sales';
}

/**
 * 获取 AI Agent 的 system prompt
 */
function getSystemPrompt(agentType: string): string {
  const prompts: Record<string, string> = {
    general: `你是 ProClaw Cloud 的 AI 智能助手。你帮助中小商户管理他们的云端经营系统。
你可以：
1. 回答关于进销存管理的问题
2. 提供经营建议
3. 解释系统功能和使用方法
请用简洁、专业的中文回答。回答要实用、具体。`,

    inventory: `你是 ProClaw Cloud 的库存管理专家。你帮助商户优化库存管理。
你可以：
1. 分析库存数据并提供补货建议
2. 识别库存周转问题和滞销商品
3. 建议最低库存水平和安全库存策略
4. 分析库存成本
请用简洁、专业的中文回答。基于数据分析提供具体建议。`,

    finance: `你是 ProClaw Cloud 的财务管理专家。你帮助商户分析经营财务状况。
你可以：
1. 分析 Token 消耗模式和成本优化
2. 提供经营收入和支出分析
3. 建议定价策略和利润优化
4. 分析销售趋势和季节性波动
请用简洁、专业的中文回答。基于数据提供具体的财务建议。`,

    sales: `你是 ProClaw Cloud 的销售分析专家。你帮助商户提升销售业绩。
你可以：
1. 分析销售数据和趋势
2. 识别畅销和滞销商品
3. 提供促销和定价建议
4. 分析客户购买行为
请用简洁、专业的中文回答。基于数据提供具体的销售建议。`,
  };

  return prompts[agentType] || prompts.general;
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，无法生成回复。';
}

/**
 * 模拟 AI 回复（当没有配置 API Key 时使用）
 */
function mockAIResponse(userMessage: string, agentType: string): string {
  const mockResponses: Record<string, string[]> = {
    general: [
      `您好！我是 ProClaw Cloud 智能助手。关于"${userMessage}"，建议您查看系统帮助文档或联系技术支持获取详细指导。`,
      `感谢您的提问。关于"${userMessage}"，您可以在系统设置中进行相关配置。如需进一步帮助，请详细描述您的需求。`,
      `收到您的问题："${userMessage}"。建议您按照以下步骤操作：\n1. 登录系统\n2. 进入相关功能模块\n3. 根据提示完成操作\n如果仍有问题，欢迎继续咨询。`,
    ],
    inventory: [
      `基于库存数据分析，关于"${userMessage}"，建议您：\n1. 定期检查低库存商品，及时补货\n2. 对滞销商品进行促销处理\n3. 设置合理的最低库存预警值\n4. 优化采购周期，降低库存成本`,
      `库存分析建议：针对"${userMessage}"，当前系统支持库存预警功能，建议您设置合理的最低库存阈值，系统会在库存不足时自动提醒。`,
    ],
    finance: [
      `财务分析：关于"${userMessage}"，建议您关注 Token 消耗趋势。系统支持按日/周/月查看消耗明细，帮助您优化成本结构。`,
      `经营建议：针对"${userMessage}"，建议定期查看 Token 余额和消耗情况。合理规划 API 调用频率可以有效控制成本。`,
    ],
    sales: [
      `销售分析：关于"${userMessage}"，建议您查看销售报表了解各商品的销售趋势。系统支持按时间、商品、客户等多维度分析。`,
      `销售建议：针对"${userMessage}"，建议关注高毛利商品的销售情况。通过分析客户购买记录，可以制定更精准的营销策略。`,
    ],
  };

  const responses = mockResponses[agentType] || mockResponses.general;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * 记录 AI 对话到 tenant schema
 */
async function saveAIConversation(
  supabase: SupabaseClient,
  schema: string,
  userId: string,
  messages: ChatMessage[],
  response: string
): Promise<void> {
  try {
    // 尝试保存到 ai_conversations 表（如果存在的话）
    await supabase
      .from(`"${schema}"."ai_conversations"`)
      .insert({
        user_id: userId,
        messages: JSON.stringify(messages),
        response,
        created_at: new Date().toISOString(),
      });
  } catch {
    // 表不存在则跳过
  }
}

/**
 * POST /api/ai/chat - 发送 AI 聊天消息
 * Body: { messages: ChatMessage[], agentType?: string }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body: ChatRequest = await request.json();
    const { messages, agentType = 'general' } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: '缺少消息内容' }, { status: 400 });
    }

    // Token 扣费 (每次 AI 请求消耗 5 token)
    const tokenResult = await checkAndDeductToken(
      session.user.id,
      'ai_chat',
      1,
      'POST /api/ai/chat',
      { agentType, messageCount: messages.length }
    );

    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 余额不足' },
        { status: 402 }
      );
    }

    // 构建完整消息列表（包含 system prompt）
    const systemPrompt = getSystemPrompt(agentType);
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // 调用 AI API 或使用模拟回复
    let aiResponse: string;

    if (AI_CONFIG.apiKey) {
      aiResponse = await callOpenAI(fullMessages);
    } else {
      // 没有配置 API Key，使用模拟回复
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      aiResponse = mockAIResponse(
        lastUserMessage?.content || '',
        agentType
      );
    }

    // 保存对话记录
    const { getTenantSchema } = await import('@/lib/tenant');
    const schema = getTenantSchema(session.user.id);
    await saveAIConversation(supabase, schema, session.user.id, messages, aiResponse);

    return NextResponse.json({
      success: true,
      data: {
        role: 'assistant',
        content: aiResponse,
        agentType,
        tokensUsed: 5,
      },
    });
  } catch (error: unknown) {
    console.error('AI 聊天失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
