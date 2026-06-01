// ProClaw Cloud 托管版 - AI 客服聊天历史 API
// GET: 获取聊天历史记录（需商户登录）

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/customer-service/history
 * 获取聊天历史（需商户登录，分页）
 * Query: session_id?, customer_id?, keyword?, page=1, page_size=20
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const tenantId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    const customerId = searchParams.get('customer_id');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('customer_service_chat_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (keyword) {
      query = query.or(`question.ilike.%${keyword}%,answer.ilike.%${keyword}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error: unknown) {
    console.error('获取聊天历史失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
