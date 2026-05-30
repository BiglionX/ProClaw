// ProClaw Cloud 托管版 - 销售管理 API Routes
// sales_orders + sales_order_items

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';

interface SalesQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

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
    const params: SalesQueryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };

    let query = supabase
      .from(schemaTable(schema, 'sales_orders'))
      .select('*', { count: 'exact' });

    if (params.search) {
      query = query.or(`so_number.ilike.%${params.search}%,notes.ilike.%${params.search}%`);
    }
    if (params.status) query = query.eq('status', params.status);

    const from = ((params.page || 1) - 1) * (params.pageSize || 20);
    const to = from + (params.pageSize || 20) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const orderIds = (data || []).map(o => o.id);
    const itemsByOrder: Record<string, unknown[]> = {};

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from(schemaTable(schema, 'sales_order_items'))
        .select('*')
        .in('order_id', orderIds);

      if (items) {
        for (const item of items) {
          const oid = item.order_id as string;
          if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
          itemsByOrder[oid].push(item);
        }
      }
    }

    const ordersWithItems = (data || []).map(order => ({
      ...order,
      items: itemsByOrder[order.id] || [],
    }));

    return NextResponse.json({ data: ordersWithItems, total: count || 0, page: params.page || 1, pageSize: params.pageSize || 20 });
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

    const { data: order, error: orderError } = await supabase
      .from(schemaTable(schema, 'sales_orders'))
      .insert({
        so_number: body.so_number || `SO-${Date.now().toString(36).toUpperCase()}`,
        customer_id: body.customer_id || null,
        order_date: body.order_date || new Date().toISOString().split('T')[0],
        expected_delivery_date: body.expected_delivery_date || null,
        status: body.status || 'draft',
        total_amount: body.total_amount || 0,
        paid_amount: body.paid_amount || 0,
        payment_status: body.payment_status || 'unpaid',
        shipping_address: body.shipping_address || '',
        notes: body.notes || '',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const itemsToInsert = body.items.map((item: {
        product_id?: string; quantity?: number; unit_price?: number; notes?: string;
      }) => ({
        order_id: order.id,
        product_id: item.product_id || null,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: (item.quantity || 1) * (item.unit_price || 0),
        notes: item.notes || '',
      }));

      const { error: itemsError } = await supabase
        .from(schemaTable(schema, 'sales_order_items'))
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await supabase.rpc('deduct_tokens', { p_user_id: session.user.id, p_tokens: 1 });
    await supabase.from('api_usage_logs').insert({
      user_id: session.user.id, resource_type: 'product_sync', tokens_used: 1,
      endpoint: 'POST /api/sales', metadata: { order_id: order.id, so_number: order.so_number },
    });

    return NextResponse.json({ data: order, success: true }, { status: 201 });
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

    if (!id) return NextResponse.json({ error: '缺少销售单 ID' }, { status: 400 });

    const { data: order, error: orderError } = await supabase
      .from(schemaTable(schema, 'sales_orders'))
      .update({
        customer_id: updateData.customer_id, order_date: updateData.order_date,
        expected_delivery_date: updateData.expected_delivery_date, status: updateData.status,
        total_amount: updateData.total_amount, paid_amount: updateData.paid_amount,
        payment_status: updateData.payment_status, shipping_address: updateData.shipping_address,
        notes: updateData.notes, updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;

    if (updateData.items && Array.isArray(updateData.items)) {
      await supabase.from(schemaTable(schema, 'sales_order_items')).delete().eq('order_id', id);

      if (updateData.items.length > 0) {
        const itemsToInsert = updateData.items.map((item: {
          product_id?: string; quantity?: number; unit_price?: number; notes?: string;
        }) => ({
          order_id: id, product_id: item.product_id || null, quantity: item.quantity || 1,
          unit_price: item.unit_price || 0, total_price: (item.quantity || 1) * (item.unit_price || 0),
          notes: item.notes || '',
        }));

        const { error: itemsError } = await supabase
          .from(schemaTable(schema, 'sales_order_items'))
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }
    }

    return NextResponse.json({ data: order, success: true });
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
    if (!id) return NextResponse.json({ error: '缺少销售单 ID' }, { status: 400 });

    const { error } = await supabase.from(schemaTable(schema, 'sales_orders')).delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
