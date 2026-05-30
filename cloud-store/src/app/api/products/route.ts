// ProClaw Cloud 托管版 - 商品管理 API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema, schemaTable } from '@/lib/tenant';

interface ProductQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

interface SkuInput {
  sku_code?: string;
  specifications?: Record<string, string>;
  spec_text?: string;
  cost_price?: number;
  sell_price?: number;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

/**
 * GET /api/products - 获取商品列表
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
    const params: ProductQueryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    };

    let query = supabase
      .from(schemaTable(schema, 'products_spu'))
      .select('*', { count: 'exact' });

    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const from = ((params.page || 1) - 1) * (params.pageSize || 20);
    const to = from + (params.pageSize || 20) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // 同时获取对应的 SKU 数据
    const productIds = data?.map(p => p.id) || [];
    let skus: Record<string, unknown>[] = [];
    if (productIds.length > 0) {
      const { data: skuData } = await supabase
        .from(schemaTable(schema, 'products_sku'))
        .select('*')
        .in('spu_id', productIds);

      skus = (skuData || []) as Record<string, unknown>[];
    }

    const productsWithSkus = data?.map(product => ({
      ...product,
      skus: skus.filter(s => s.spu_id === product.id),
    }));

    return NextResponse.json({
      data: productsWithSkus || [],
      total: count || 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });
  } catch (error: unknown) {
    console.error('获取商品列表失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - 创建商品
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

    // 创建 SPU
    const { data: spu, error: spuError } = await supabase
      .from(schemaTable(schema, 'products_spu'))
      .insert({
        spu_code: body.spu_code || `SPU-${Date.now().toString(36).toUpperCase()}`,
        name: body.name,
        subtitle: body.subtitle,
        description: body.description,
        category_id: body.category_id,
        unit: body.unit || '件',
        is_on_sale: body.is_on_sale !== false,
        status: body.status || 'on_sale',
        images: body.images || [],
      })
      .select()
      .single();

    if (spuError) throw spuError;

    // 创建 SKU（如果有）
    if (body.skus && body.skus.length > 0) {
      const skusToInsert = body.skus.map((sku: SkuInput, index: number) => ({
        spu_id: spu.id,
        sku_code: sku.sku_code || `SKU-${spu.spu_code}-${(index + 1).toString().padStart(2, '0')}`,
        specifications: sku.specifications || {},
        spec_text: sku.spec_text || Object.values(sku.specifications || {}).join('/'),
        cost_price: sku.cost_price || 0,
        sell_price: sku.sell_price || 0,
        current_stock: sku.current_stock || 0,
        min_stock: sku.min_stock || 0,
        max_stock: sku.max_stock || 999999,
        is_default: index === 0,
      }));

      const { error: skuError } = await supabase
        .from(schemaTable(schema, 'products_sku'))
        .insert(skusToInsert);

      if (skuError) throw skuError;
    }

    // Token 扣费（创建商品消耗 1 token）
    await supabase.rpc('deduct_tokens', {
      p_user_id: session.user.id,
      p_tokens: 1,
    });

    await supabase.from('api_usage_logs').insert({
      user_id: session.user.id,
      resource_type: 'product_sync',
      tokens_used: 1,
      endpoint: 'POST /api/products',
      metadata: { product_id: spu.id, product_name: body.name },
    });

    return NextResponse.json({ data: spu, success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error('创建商品失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products - 更新商品
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
      return NextResponse.json({ error: '缺少商品 ID' }, { status: 400 });
    }

    // 更新 SPU
    const { data: spu, error: spuError } = await supabase
      .from(schemaTable(schema, 'products_spu'))
      .update({
        name: updateData.name,
        subtitle: updateData.subtitle,
        description: updateData.description,
        category_id: updateData.category_id,
        unit: updateData.unit,
        is_on_sale: updateData.is_on_sale,
        status: updateData.status,
        images: updateData.images,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (spuError) throw spuError;

    // 如果有 SKU 更新，则先删除旧 SKU 再插入新 SKU
    if (updateData.skus && Array.isArray(updateData.skus)) {
      await supabase
        .from(schemaTable(schema, 'products_sku'))
        .delete()
        .eq('spu_id', id);

      if (updateData.skus.length > 0) {
        const skusToInsert = updateData.skus.map((sku: SkuInput, index: number) => ({
          spu_id: id,
          sku_code: sku.sku_code || `SKU-${spu.spu_code}-${(index + 1).toString().padStart(2, '0')}`,
          specifications: sku.specifications || {},
          spec_text: sku.spec_text || Object.values(sku.specifications || {}).join('/'),
          cost_price: sku.cost_price || 0,
          sell_price: sku.sell_price || 0,
          current_stock: sku.current_stock || 0,
          min_stock: sku.min_stock || 0,
          max_stock: sku.max_stock || 999999,
          is_default: index === 0,
        }));

        const { error: skuError } = await supabase
          .from(schemaTable(schema, 'products_sku'))
          .insert(skusToInsert);

        if (skuError) throw skuError;
      }
    }

    return NextResponse.json({ data: spu, success: true });
  } catch (error: unknown) {
    console.error('更新商品失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products - 删除商品
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
      return NextResponse.json({ error: '缺少商品 ID' }, { status: 400 });
    }

    // 删除 SPU（SKU 通过 CASCADE 自动删除）
    const { error } = await supabase
      .from(schemaTable(schema, 'products_spu'))
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '商品已删除' });
  } catch (error: unknown) {
    console.error('删除商品失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
