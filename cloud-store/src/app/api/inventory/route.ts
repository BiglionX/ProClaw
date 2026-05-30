// ProClaw Cloud 托管版 - 库存管理 API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/inventory - 获取库存列表及交易记录
 * query: type=summary|transactions, page, pageSize
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    if (type === 'transactions') {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from(schemaTable(schema, 'inventory_transactions'))
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return NextResponse.json({
        data: data || [],
        total: count || 0,
        page, pageSize,
      });
    }

    // type === 'summary' - 获取所有 SKU 的库存概况
    // 通过 join products_sku 获取库存数据
    const { data: skus, error: skuError, count } = await supabase
      .from(schemaTable(schema, 'products_sku'))
      .select(`
        id,
        sku_code,
        spec_text,
        current_stock,
        min_stock,
        max_stock,
        cost_price,
        sell_price,
        spu_id,
        status,
        products_spu!inner(name, spu_code)
      `, { count: 'exact' })
      .order('current_stock', { ascending: true });

    if (skuError) throw skuError;

    return NextResponse.json({
      data: skus || [],
      total: count || 0,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/inventory - 创建库存交易（入库/出库/盘点）
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const schema = getTenantSchema(session.user.id);
    const body = await request.json();

    const { data: transaction, error } = await supabase
      .from(schemaTable(schema, 'inventory_transactions'))
      .insert({
        product_id: body.product_id,
        sku_id: body.sku_id,
        transaction_type: body.transaction_type,
        quantity: body.quantity,
        reference_no: body.reference_no || '',
        reason: body.reason || '',
        notes: body.notes || '',
      })
      .select()
      .single();

    if (error) throw error;

    // 更新 SKU 库存数量
    if (body.sku_id) {
      const { data: sku } = await supabase
        .from(schemaTable(schema, 'products_sku'))
        .select('current_stock')
        .eq('id', body.sku_id)
        .single();

      if (sku) {
        const newStock = body.transaction_type === 'in'
          ? (sku.current_stock || 0) + body.quantity
          : Math.max(0, (sku.current_stock || 0) - body.quantity);

        await supabase
          .from(schemaTable(schema, 'products_sku'))
          .update({ current_stock: newStock })
          .eq('id', body.sku_id);
      }
    }

    return NextResponse.json({ data: transaction, success: true }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
