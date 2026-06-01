// ProClaw Cloud 托管版 - AI 客服聊天 API
// POST: 客户发送消息，触发三级检索流程

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema } from '@/lib/tenant';
import { searchCustomerService } from '@/lib/customer-service/search-service';
import { checkAndDeductToken } from '@/lib/tokenApi';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

interface ChatRequest {
  session_id?: string;
  message: string;
  customer_id?: string;
  customer_name?: string;
}

/**
 * POST /api/customer-service/chat
 * 客户发送消息给 AI 客服
 * Body: { session_id?, message, customer_id?, customer_name? }
 * 需 public 可访问（商城访客不需要登录）
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const body: ChatRequest = await request.json();
    const { message, session_id, customer_id, customer_name } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 尝试获取认证会话（如果存在）
    const { data: { session } } = await supabase.auth.getSession();

    // 从请求参数获取 tenant_id（商城前端传递）
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: '缺少租户 ID' }, { status: 400 });
    }

    // 获取 tenant schema
    const schema = getTenantSchema(tenantId);

    // 生成或复用会话 ID
    const activeSessionId = session_id || `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // 客户标识
    const activeCustomerId = customer_id || `guest_${Math.random().toString(36).substring(2, 10)}`;

    // Token 扣费（如果商户已登录）
    if (session) {
      const tokenResult = await checkAndDeductToken(
        tenantId,
        'customer_service_chat',
        1,
        'POST /api/customer-service/chat',
        { sessionId: activeSessionId }
      );

      if (!tokenResult.success) {
        console.warn('Token 扣费失败:', tokenResult.error);
      }
    }

    // 执行三级检索
    const searchResult = await searchCustomerService(
      supabase,
      schema,
      tenantId,
      message
    );

    // 处理转人工
    let needsTransfer = false;
    let transferId: string | null = null;

    if (searchResult.needsTransfer) {
      needsTransfer = true;

      // 插入转人工队列
      const { data: transferData } = await supabase
        .from('customer_service_transfer_queue')
        .insert({
          tenant_id: tenantId,
          session_id: activeSessionId,
          customer_id: activeCustomerId,
          customer_name: customer_name || null,
          question: message,
          transfer_reason: searchResult.transferReason || '无法自动回答',
          transfer_mode: 'direct',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (transferData) {
        transferId = (transferData as Record<string, unknown>).id as string;
      }
    }

    // 确定回答和来源
    let answer: string;
    let answerSource: string;

    if (needsTransfer) {
      answer = '您的问题我将转给人工客服，请稍后。';
      answerSource = 'manual';
    } else {
      answer = searchResult.answer;
      answerSource = searchResult.source;
    }

    // 记录聊天日志
    await supabase
      .from('customer_service_chat_logs')
      .insert({
        tenant_id: tenantId,
        session_id: activeSessionId,
        customer_id: activeCustomerId,
        customer_name: customer_name || null,
        question: message,
        answer,
        answer_source: answerSource,
        is_transferred: needsTransfer,
        transferred_to: needsTransfer ? 'boss' : null,
      });

    return NextResponse.json({
      success: true,
      data: {
        session_id: activeSessionId,
        customer_id: activeCustomerId,
        reply: answer,
        source: answerSource,
        needs_transfer: needsTransfer,
        transfer_id: transferId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('客服聊天失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
