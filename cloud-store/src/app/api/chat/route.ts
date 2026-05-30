// ProClaw Cloud 托管版 - 聊天消息 API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/chat?contactId=xxx - 获取聊天消息
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const contactId = request.nextUrl.searchParams.get('contactId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = 50;

    if (!contactId) {
      return NextResponse.json({ error: '缺少 contactId' }, { status: 400 });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from(schemaTable(schema, 'messages'))
      .select('*', { count: 'exact' })
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // 反转消息顺序（最新的在底部）
    const sortedData = (data || []).reverse();

    return NextResponse.json({ data: sortedData, total: count || 0 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/chat - 发送消息
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();

    if (!body.contactId || !body.content) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const { data: message, error } = await supabase
      .from(schemaTable(schema, 'messages'))
      .insert({
        contact_id: body.contactId,
        direction: 'outgoing',
        content: body.content,
        content_type: body.contentType || 'text',
        file_url: body.fileUrl || '',
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: message, success: true }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
