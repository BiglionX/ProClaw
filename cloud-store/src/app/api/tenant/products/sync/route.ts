// ProClaw Shop - 商品同步 API
// 商户通过 ProClaw 桌面端同步商品到云商城

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';
import { TokenCalculator, TokenActions } from '@/lib/token-calculator';

export const dynamic = 'force-dynamic';

interface Product {
  local_id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  category?: string;
  images?: string[];
  is_on_sale?: boolean;
}

/**
 * 全量同步商品
 * POST /api/tenant/products/sync
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  try {
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { products } = body as { products: Product[] };
    
    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { success: false, error: '无效的商品数据' },
        { status: 400 }
      );
    }
    
    const schemaName = tenantContext.schema;
    
    // 同步商品到租户 Schema
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (const product of products) {
      try {
        // 检查商品是否已存在
        const { data: existing } = await (supabase as any)
          .from(`${schemaName}.products`)
          .select('id, sync_version')
          .eq('local_id', product.local_id)
          .single();
        
        if (existing) {
          // 更新现有商品
          const { error: updateError } = await (supabase as any)
            .from(`${schemaName}.products`)
            .update({
              name: product.name,
              description: product.description || null,
              price: product.price,
              stock: product.stock ?? 0,
              category: product.category || null,
              images: product.images || [],
              is_on_sale: product.is_on_sale ?? true,
              sync_version: (existing.sync_version || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          
          if (!updateError) successCount++;
          else {
            failCount++;
            errors.push(`${product.name}: 更新失败`);
          }
        } else {
          // 新增商品
          const { error: insertError } = await (supabase as any)
            .from(`${schemaName}.products`)
            .insert({
              local_id: product.local_id,
              name: product.name,
              description: product.description || null,
              price: product.price,
              stock: product.stock ?? 0,
              category: product.category || null,
              images: product.images || [],
              is_on_sale: product.is_on_sale ?? true,
              sync_version: 1,
            });
          
          if (!insertError) successCount++;
          else {
            failCount++;
            errors.push(`${product.name}: 同步失败`);
          }
        }
      } catch {
        failCount++;
        errors.push(`${product.name}: 异常`);
      }
    }
    
    // 扣 Token (商品同步消耗)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const tokenCalc = new TokenCalculator(supabaseUrl, supabaseKey);
    const consumeResult = await tokenCalc.consume({
      tenant_id: tenantContext.tenantId!,
      action: TokenActions.PRODUCT_SYNC,
      quantity: products.length,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        total: products.length,
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // 最多返回10个错误
        tokens_consumed: consumeResult.tokens_consumed,
      },
    });
  } catch (error) {
    console.error('Product sync error:', error);
    return NextResponse.json(
      { success: false, error: '商品同步失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取商品列表
 * GET /api/tenant/products/sync
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  try {
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    const schemaName = tenantContext.schema;
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const query = (supabase as any)
      .from(`${schemaName}.products`)
      .select('*', { count: 'exact' })
      .eq('is_on_sale', true)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    const { data: products, count, error } = await query;
    
    if (error) {
      console.error('Fetch products error:', error);
      return NextResponse.json(
        { success: false, error: '获取商品列表失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        products: products || [],
        total: count || 0,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { success: false, error: '获取商品列表失败' },
      { status: 500 }
    );
  }
}
