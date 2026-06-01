// ProClaw Cloud 托管版 - AI 客服设置 API
// GET: 获取商户客服设置（公开，需 tenant_id 参数）
// PUT: 更新客服设置（需商户登录）

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * 从请求中获取租户 ID
 * 优先从 Authorization header 获取，其次从 query 参数
 */
async function getTenantId(request: NextRequest): Promise<string | null> {
  const searchParams = request.nextUrl.searchParams;
  const tenantIdFromQuery = searchParams.get('tenant_id');

  if (tenantIdFromQuery) return tenantIdFromQuery;

  // 尝试从认证会话获取
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * GET /api/customer-service/settings?tenant_id=xxx
 * 获取商户客服设置（公开接口，商城前端访客无需登录）
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: '缺少租户 ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customer_service_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 行未找到，属于正常情况
      throw error;
    }

    if (!data) {
      // 返回默认设置
      return NextResponse.json({
        success: true,
        data: {
          is_enabled: true,
          auto_greeting: '您好，我是客服小如，请问有什么可以帮您？',
          transfer_mode: 'direct',
          avatar_url: null,
          agent_name: '智能客服',
          business_hours: null,
          system_prompt: null,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('获取客服设置失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customer-service/settings
 * 更新客服设置（需商户登录）
 * Body: { is_enabled?, auto_greeting?, transfer_mode?, avatar_url?, agent_name?, business_hours? }
 */
export async function PUT(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const tenantId = session.user.id;
    const body = await request.json();

    // 验证可选字段
    const allowedFields = [
      'is_enabled',
      'auto_greeting',
      'transfer_mode',
      'avatar_url',
      'agent_name',
      'business_hours',
      'system_prompt',
    ];

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // 字段验证
        if (field === 'transfer_mode' && !['direct', 'ai_judged'].includes(body[field])) {
          return NextResponse.json(
            { error: '转人工模式无效，必须为 direct 或 ai_judged' },
            { status: 400 }
          );
        }
        updateData[field] = body[field];
      }
    }

    // UPSERT: 不存在则创建，存在则更新
    const { data, error } = await supabase
      .from('customer_service_settings')
      .upsert({
        tenant_id: tenantId,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: '客服设置已更新',
    });
  } catch (error: unknown) {
    console.error('更新客服设置失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
