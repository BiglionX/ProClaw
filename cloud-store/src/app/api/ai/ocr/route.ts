// ProClaw Shop - AI 订单识别 API
// 使用 AI 视觉识别图片中的订单信息

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { checkAndDeductToken } from '@/lib/tokenApi';
import { getTenantSchema, schemaTable } from '@/lib/tenant';

// Supabase 客户端类型别名
type SupabaseClient = ReturnType<typeof createRouteSupabaseClient>;

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
  model: process.env.AI_MODEL_VISION || 'gpt-4o',
};

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  notes?: string;
}

interface OcrResult {
  success: boolean;
  items: OrderItem[];
  total: number;
  customerName?: string;
  orderDate?: string;
  notes?: string;
  rawText?: string;
}

/**
 * 调用 AI 视觉识别 API
 */
async function callVisionAI(imageUrl: string, type: 'purchase' | 'sales'): Promise<OcrResult> {
  const systemPrompt = type === 'purchase' 
    ? `你是一个专业的采购订单识别专家。请分析这张图片中的采购订单，返回结构化的 JSON 数据。
要求：
1. 识别所有商品项，包括商品名称、数量、单价
2. 计算总金额
3. 如果有供应商/客户信息也要提取
4. 返回格式必须是有效的 JSON，格式如下：
{
  "success": true,
  "items": [
    {
      "productName": "商品名称",
      "quantity": 数量,
      "unitPrice": 单价,
      "totalPrice": 小计,
      "sku": "SKU编码(如有)",
      "notes": "备注(如有)"
    }
  ],
  "total": 总金额,
  "customerName": "客户名称(如有)",
  "orderDate": "订单日期(如有)",
  "notes": "其他备注(如有)",
  "rawText": "原始识别文本摘要"
}`
    : `你是一个专业的销售订单识别专家。请分析这张图片中的销售订单，返回结构化的 JSON 数据。
要求：
1. 识别所有商品项，包括商品名称、数量、单价
2. 计算总金额
3. 如果有客户信息也要提取
4. 返回格式必须是有效的 JSON，格式如下：
{
  "success": true,
  "items": [
    {
      "productName": "商品名称",
      "quantity": 数量,
      "unitPrice": 单价,
      "totalPrice": 小计,
      "sku": "SKU编码(如有)",
      "notes": "备注(如有)"
    }
  ],
  "total": 总金额,
  "customerName": "客户名称(如有)",
  "orderDate": "订单日期(如有)",
  "notes": "其他备注(如有)",
  "rawText": "原始识别文本摘要"
}`;

  // 构建消息
  const messages = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'image_url' as const,
          image_url: { url: imageUrl },
        },
      ],
    },
  ];

  const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // 解析 JSON 响应
  try {
    // 尝试提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result as OcrResult;
    }
    throw new Error('无法解析 AI 返回的数据');
  } catch {
    // 返回原始文本作为 rawText
    return {
      success: true,
      items: [],
      total: 0,
      rawText: content,
    };
  }
}

/**
 * 模拟 AI 识别（当没有配置 API Key 时使用）
 */
function mockOcrResult(type: 'purchase' | 'sales'): OcrResult {
  const mockItems: OrderItem[] = [
    { productName: 'iPhone 15 Pro 电池', quantity: 5, unitPrice: 180, totalPrice: 900 },
    { productName: '三星 Galaxy 电池', quantity: 3, unitPrice: 120, totalPrice: 360 },
    { productName: '华为 Mate 电池', quantity: 2, unitPrice: 150, totalPrice: 300 },
  ];

  return {
    success: true,
    items: mockItems,
    total: 1560,
    customerName: type === 'sales' ? '测试客户' : undefined,
    orderDate: new Date().toISOString().split('T')[0],
    notes: '这是模拟识别结果（未配置 AI API Key）',
    rawText: '模拟识别：iPhone 15 Pro 电池 x5 = 900元, 三星 Galaxy 电池 x3 = 360元, 华为 Mate 电池 x2 = 300元',
  };
}

/**
 * 保存识别记录到数据库
 */
async function saveRecognitionLog(
  supabase: SupabaseClient,
  schema: string,
  userId: string,
  imageUrl: string,
  type: 'purchase' | 'sales',
  result: OcrResult
): Promise<void> {
  try {
    await supabase
      .from(schemaTable(schema, 'order_recognition_log'))
      .insert({
        id: crypto.randomUUID(),
        image_url: imageUrl,
        type,
        result: JSON.stringify(result),
        status: 'completed',
        created_at: new Date().toISOString(),
      });
  } catch {
    // 表不存在则跳过
  }
}

/**
 * POST /api/ai/ocr - 识别订单图片
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, type = 'sales' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片地址' }, { status: 400 });
    }

    if (!['purchase', 'sales'].includes(type)) {
      return NextResponse.json({ error: '无效的订单类型' }, { status: 400 });
    }

    // Token 扣费检查 (5 token/次)
    const tokenResult = await checkAndDeductToken(
      session.user.id,
      'ai_ocr',
      1,
      'POST /api/ai/ocr',
      { type, imageUrl: imageUrl.substring(0, 100) }
    );

    if (!tokenResult.success) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 余额不足' },
        { status: 402 }
      );
    }

    // 调用 AI 识别
    let ocrResult: OcrResult;

    if (AI_CONFIG.apiKey) {
      ocrResult = await callVisionAI(imageUrl, type);
    } else {
      // 没有配置 API Key，使用模拟结果
      ocrResult = mockOcrResult(type);
    }

    // 保存识别记录
    const { getTenantSchema } = await import('@/lib/tenant');
    const schema = getTenantSchema(session.user.id);
    await saveRecognitionLog(supabase, schema, session.user.id, imageUrl, type, ocrResult);

    return NextResponse.json({
      success: true,
      data: ocrResult,
      tokensUsed: 5,
    });
  } catch (error: unknown) {
    console.error('AI 订单识别失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/ocr - 获取识别历史
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const schema = getTenantSchema(session.user.id);

    const { data: records, error, count } = await supabase
      .from(schemaTable(schema, 'order_recognition_log'))
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ data: [], total: 0 });
    }

    return NextResponse.json({
      data: records || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
