// ProClaw Cloud 托管版 - AI 客服问答库管理 API
// GET: 获取问答库列表（分页搜索）
// POST: 添加问答
// PUT: 更新问答
// DELETE: 删除问答

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/customer-service/knowledge-base
 * 获取问答库列表（需商户登录，分页搜索）
 * Query: category?, keyword?, page=1, page_size=20
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
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('customer_service_knowledge_base')
      .select('id, tenant_id, question, answer, category, keywords, is_active, created_at, updated_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (category) {
      query = query.eq('category', category);
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
    console.error('获取问答库失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer-service/knowledge-base
 * 添加问答（需商户登录）
 * Body: { question, answer, category?, keywords? }
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
    const { question, answer, category, keywords } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: '缺少必要参数: question, answer' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('customer_service_knowledge_base')
      .insert({
        tenant_id: tenantId,
        question,
        answer,
        category: category || 'general',
        keywords: keywords || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data, message: '问答已添加' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('添加问答失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customer-service/knowledge-base
 * 更新问答（需商户登录）
 * Body: { id, question?, answer?, category?, keywords?, is_active? }
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
    const { id, question, answer, category, keywords, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少问答 ID' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('customer_service_knowledge_base')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: '问答已更新',
    });
  } catch (error: unknown) {
    console.error('更新问答失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customer-service/knowledge-base?id=xxx
 * 删除问答（需商户登录）
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const tenantId = session.user.id;
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少问答 ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customer_service_knowledge_base')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '问答已删除',
    });
  } catch (error: unknown) {
    console.error('删除问答失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
