// ProClaw AI 网关 — OpenAI 兼容 Chat Completions API
// 模式：统购分销 — ProClaw 统一采购大模型 API，通过网关分发给用户
// 路径：POST /api/v1/chat/completions

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTokenBalance } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

// ========== 网关配置 ==========

interface GatewayConfig {
  upstreamUrl: string;
  upstreamKey: string;
  model: string;
  demoTotalPt: number;
}

function getGatewayConfig(): GatewayConfig {
  return {
    upstreamUrl: process.env.AI_UPSTREAM_URL || 'https://api.deepseek.com/v1',
    upstreamKey: process.env.AI_UPSTREAM_KEY || '',
    model: process.env.AI_UPSTREAM_MODEL || 'deepseek-chat',
    demoTotalPt: parseInt(process.env.DEMO_TOKEN_TOTAL || '10000', 10),
  };
}

// ========== 模型路由 ==========

interface ProClawMeta {
  tenant_id?: string;
  task_type?: string;
  feature?: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  proclaw_meta?: ProClawMeta;
}

/** 根据 task_type 选择最合适的上游模型 */
function routeModel(taskType?: string, defaultModel?: string): string {
  const config = getGatewayConfig();

  // 如有特别指定 model，直接使用
  if (defaultModel && defaultModel.startsWith('proclaw-')) {
    // proclaw- 前缀去掉，用上游默认模型
    return config.model;
  }

  // 按任务类型路由
  const routingMap: Record<string, string> = {
    business_insight: config.model,           // 商务查询 → 默认模型（性价比）
    ceo_decision: config.model,               // CEO 决策 → 默认模型
    sales_forecast: config.model,             // 销售预测 → 默认模型
    simple_query: config.model,               // 简单问答 → 默认模型
  };

  return routingMap[taskType || ''] || config.model;
}

// ========== 鉴权 ==========

/** 是否为演示账号请求 */
function isDemoRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === 'Bearer proclaw-demo';
}

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  isDemo: boolean;
  error?: string;
}

/** 验证请求身份 */
async function authenticate(request: NextRequest): Promise<AuthResult> {
  // 演示账号
  if (isDemoRequest(request)) {
    return { authenticated: true, userId: 'demo', isDemo: true };
  }

  // JWT 鉴权（正式用户）
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return { authenticated: true, userId: session.user.id, isDemo: false };
    }
    return { authenticated: false, isDemo: false, error: '未登录' };
  } catch {
    return { authenticated: false, isDemo: false, error: '鉴权失败' };
  }
}

// ========== 上游转发 ==========

interface UpstreamResponse {
  id: string;
  object: string;
  model: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** 转发请求到上游大模型 */
async function forwardToUpstream(
  body: ChatCompletionRequest,
  routedModel: string, signal?: AbortSignal,
): Promise<UpstreamResponse> {
  const config = getGatewayConfig();

  if (!config.upstreamKey) {
    throw new Error('AI 网关未配置上游 API Key（环境变量 AI_UPSTREAM_KEY 为空）');
  }

  const response = await fetch(`${config.upstreamUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.upstreamKey}`,
    },
    body: JSON.stringify({
      model: routedModel,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 2000,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`上游 LLM 返回错误 ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ========== Token 计费 ==========

/** 估算 PT 消耗（1 token ≈ 1 PT，输入+输出合计） */
function estimatePtCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
  return Math.ceil(usage.prompt_tokens * 1.0 + usage.completion_tokens * 1.5);
}

// ========== POST 处理器 ==========

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. 鉴权
  const auth = await authenticate(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || '未鉴权' }, { status: 401 });
  }

  // 2. 解析请求
  let body: ChatCompletionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: '缺少 messages' }, { status: 400 });
  }

  const meta = body.proclaw_meta || {};

  // 3. 演示账号 Token 余额检查
  if (auth.isDemo) {
    const demoHeader = request.headers.get('x-proclaw-demo-balance');
    const demoBalance = parseInt(demoHeader || '', 10);
    if (!isNaN(demoBalance) && demoBalance <= 0) {
      return NextResponse.json(
        { error: '演示 Token 余额已用完（10,000 PT）。如需继续测试，请联系我们获取更多 Token。' },
        { status: 402 },
      );
    }
  } else if (auth.userId) {
    // 正式用户 Token 余额检查
    const balance = await getTokenBalance(auth.userId);
    if (balance <= 0) {
      return NextResponse.json(
        { error: 'Token 余额不足。请前往用户中心充值。' },
        { status: 402 },
      );
    }
  }

  // 4. 模型路由
  const routedModel = routeModel(meta.task_type, body.model);

  // 5. 转发到上游 LLM
  let upstreamResponse: UpstreamResponse;
  try {
    upstreamResponse = await forwardToUpstream(body, routedModel);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '未知错误';
    console.error('[AI 网关] 上游调用失败:', errMsg);
    return NextResponse.json(
      {
        error: `AI 服务暂时不可用: ${errMsg}`,
        proclaw_meta: {
          routed_model: routedModel,
          error_type: 'upstream_failure',
          latency_ms: Date.now() - startTime,
        },
      },
      { status: 502 },
    );
  }

  // 6. Token 计费
  const costPt = estimatePtCost(upstreamResponse.usage);

  // 演示账号：通过请求头返回消耗，由桌面端 local 扣减
  // 正式用户：走 Supabase Token 扣费（TODO: 本期先记录日志，下期做实际扣减）
  const remainingPt = auth.isDemo
    ? -1 // 桌面端 local 管理
    : -1; // 正式用户暂不在此处扣费

  // 7. 记录调用日志
  console.log('[AI 网关]', {
    user: auth.userId,
    demo: auth.isDemo,
    task: meta.task_type,
    feature: meta.feature,
    model: routedModel,
    tokens: upstreamResponse.usage,
    cost_pt: costPt,
    latency_ms: Date.now() - startTime,
  });

  // 8. 返回 OpenAI 兼容响应 + ProClaw 扩展
  const responseBody = {
    id: upstreamResponse.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    model: body.model || 'proclaw-gpt-4',
    choices: upstreamResponse.choices.map((choice) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content,
      },
      finish_reason: choice.finish_reason,
    })),
    usage: upstreamResponse.usage,

    // ProClaw 扩展元数据
    proclaw_meta: {
      routed_model: routedModel,
      cost_pt: costPt,
      remaining_pt: remainingPt,
      is_demo: auth.isDemo,
      latency_ms: Date.now() - startTime,
    },
  };

  const res = NextResponse.json(responseBody);
  res.headers.set('X-ProClaw-Cost-Pt', String(costPt));
  res.headers.set('X-ProClaw-Routed-Model', routedModel);

  return res;
}
