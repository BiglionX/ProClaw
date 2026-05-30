// ProClaw Cloud 托管版 - 客户管理 API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';
import { decryptFieldsInArray, decryptFields, encryptRequestBody } from '@/lib/fieldEncryption';
import { getEncryptedFields } from '@/config/encryptedFields';

const SENSITIVE_FIELDS = getEncryptedFields('customers');

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabase
      .from(schemaTable(schema, 'customers'))
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
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();

    // 加密敏感字段
    const encryptedBody = encryptRequestBody(body, [...SENSITIVE_FIELDS]);

    const { data: customer, error } = await supabase
      .from(schemaTable(schema, 'customers'))
      .insert({
        code: encryptedBody.code || `CUS-${Date.now().toString(36).toUpperCase()}`,
        name: encryptedBody.name as string,
        contact_person: (encryptedBody.contact_person as string) || '',
        phone: (encryptedBody.phone as string) || '',
        email: (encryptedBody.email as string) || '',
        address: (encryptedBody.address as string) || '',
        customer_type: (encryptedBody.customer_type as string) || 'individual',
        credit_limit: (encryptedBody.credit_limit as number) || 0,
        is_active: encryptedBody.is_active !== false,
        notes: (encryptedBody.notes as string) || '',
      })
      .select()
      .single();

    if (error) throw error;

    // 返回时解密敏感字段
    const decryptedCustomer = decryptFields(customer as Record<string, unknown>, [...SENSITIVE_FIELDS]);

    return NextResponse.json({ data: decryptedCustomer, success: true }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: '缺少客户 ID' }, { status: 400 });

    // 加密敏感字段
    const encryptedUpdate = encryptRequestBody(updateData, [...SENSITIVE_FIELDS]);

    const { data: customer, error } = await supabase
      .from(schemaTable(schema, 'customers'))
      .update({
        name: encryptedUpdate.name as string,
        contact_person: (encryptedUpdate.contact_person as string) || '',
        phone: (encryptedUpdate.phone as string) || '',
        email: (encryptedUpdate.email as string) || '',
        address: (encryptedUpdate.address as string) || '',
        customer_type: (encryptedUpdate.customer_type as string) || 'individual',
        credit_limit: (encryptedUpdate.credit_limit as number) || 0,
        is_active: encryptedUpdate.is_active as boolean,
        notes: (encryptedUpdate.notes as string) || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 返回时解密敏感字段
    const decryptedCustomer = decryptFields(customer as Record<string, unknown>, [...SENSITIVE_FIELDS]);

    return NextResponse.json({ data: decryptedCustomer, success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少客户 ID' }, { status: 400 });

    const { error } = await supabase.from(schemaTable(schema, 'customers')).delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
