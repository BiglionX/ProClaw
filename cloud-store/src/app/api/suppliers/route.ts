// ProClaw Cloud 托管版 - 供应商管理 API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';
import { decryptFieldsInArray, decryptFields, encryptRequestBody } from '@/lib/fieldEncryption';
import { getEncryptedFields } from '@/config/encryptedFields';

const SENSITIVE_FIELDS = getEncryptedFields('suppliers');

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/suppliers - 获取供应商列表
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabase
      .from(schemaTable(schema, 'suppliers'))
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // 解密敏感字段
    const decryptedData = decryptFieldsInArray(data || [], [...SENSITIVE_FIELDS]);

    return NextResponse.json({
      data: decryptedData || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    console.error('获取供应商列表失败:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/suppliers - 创建供应商
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();

    // 加密敏感字段
    const encryptedBody = encryptRequestBody(body, [...SENSITIVE_FIELDS]);

    const { data: supplier, error } = await supabase
      .from(schemaTable(schema, 'suppliers'))
      .insert({
        code: encryptedBody.code || `SUP-${Date.now().toString(36).toUpperCase()}`,
        name: encryptedBody.name as string,
        contact_person: (encryptedBody.contact_person as string) || '',
        phone: (encryptedBody.phone as string) || '',
        email: (encryptedBody.email as string) || '',
        address: (encryptedBody.address as string) || '',
        payment_terms: (encryptedBody.payment_terms as string) || '',
        is_active: encryptedBody.is_active !== false,
        notes: (encryptedBody.notes as string) || '',
      })
      .select()
      .single();

    if (error) throw error;

    // 返回时解密敏感字段
    const decryptedSupplier = decryptFields(supplier as Record<string, unknown>, [...SENSITIVE_FIELDS]);

    return NextResponse.json({ data: decryptedSupplier, success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error('创建供应商失败:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT /api/suppliers - 更新供应商
 */
export async function PUT(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少供应商 ID' }, { status: 400 });
    }

    // 加密敏感字段
    const encryptedUpdate = encryptRequestBody(updateData, [...SENSITIVE_FIELDS]);

    const { data: supplier, error } = await supabase
      .from(schemaTable(schema, 'suppliers'))
      .update({
        name: encryptedUpdate.name as string,
        contact_person: (encryptedUpdate.contact_person as string) || '',
        phone: (encryptedUpdate.phone as string) || '',
        email: (encryptedUpdate.email as string) || '',
        address: (encryptedUpdate.address as string) || '',
        payment_terms: (encryptedUpdate.payment_terms as string) || '',
        is_active: encryptedUpdate.is_active as boolean,
        notes: (encryptedUpdate.notes as string) || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 返回时解密敏感字段
    const decryptedSupplier = decryptFields(supplier as Record<string, unknown>, [...SENSITIVE_FIELDS]);

    return NextResponse.json({ data: decryptedSupplier, success: true });
  } catch (error: unknown) {
    console.error('更新供应商失败:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers - 删除供应商
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const schema = getTenantSchema(session.user.id);
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少供应商 ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from(schemaTable(schema, 'suppliers'))
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('删除供应商失败:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
