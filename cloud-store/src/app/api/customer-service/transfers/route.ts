// ProClaw Cloud 托管版 - AI 客服转人工队列 API
// GET: 获取待处理队列（需商户登录）
// POST: 回复转人工请求

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/customer-service/transfers
 * 获取转人工队列（需商户登录）
 * Query: status=pending, page=1, page_size=20
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
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('customer_service_transfer_queue')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error: unknown) {
    console.error('获取转人工队列失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer-service/transfers
 * 回复转人工请求
 * Body: { transfer_id, answer, save_to_kb (optional) }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const tenantId = session.user.id;
    const body = await request.json();
    const { transfer_id, answer, save_to_kb } = body;

    if (!transfer_id || !answer) {
      return NextResponse.json(
        { error: '缺少必要参数: transfer_id, answer' },
        { status: 400 }
      );
    }

    // 获取转人工记录
    const { data: transfer, error: fetchError } = await supabase
      .from('customer_service_transfer_queue')
      .select('*')
      .eq('id', transfer_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !transfer) {
      return NextResponse.json({ error: '转人工记录不存在' }, { status: 404 });
    }

    // 更新转人工记录
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('customer_service_transfer_queue')
      .update({
        status: 'answered',
        answer,
        answered_at: now,
        answered_by: session.user.id,
        saved_to_kb: save_to_kb || false,
      })
      .eq('id', transfer_id);

    if (updateError) throw updateError;

    // 记录到聊天日志
    const chatLog = transfer as Record<string, unknown>;
    await supabase
      .from('customer_service_chat_logs')
      .insert({
        tenant_id: tenantId,
        session_id: chatLog.session_id,
        customer_id: chatLog.customer_id,
        customer_name: chatLog.customer_name,
        question: chatLog.question,
        answer,
        answer_source: 'manual',
        is_transferred: true,
        transferred_to: 'boss',
        is_resolved: true,
        created_at: now,
      });

    // 如果选择保存到问答库
    let savedToKb = false;
    if (save_to_kb) {
      const { error: kbError } = await supabase
        .from('customer_service_knowledge_base')
        .insert({
          tenant_id: tenantId,
          question: chatLog.question as string,
          answer,
          category: 'general',
          keywords: [],
          is_active: true,
        });

      if (!kbError) {
        savedToKb = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transfer_id,
        answered: true,
        saved_to_kb: savedToKb,
        answered_at: now,
      },
      message: '回复已发送',
    });
  } catch (error: unknown) {
    console.error('回复转人工请求失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
