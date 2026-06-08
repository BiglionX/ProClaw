// ProClaw Shop - 购物车 API
// 管理客户购物车

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';

export const dynamic = 'force-dynamic';

/**
 * 获取购物车
 * GET /api/store/cart
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
    
    // 从请求头或 Cookie 获取客户 ID（匿名购物车用 device_id）
    // 获取并验证 device_id（防止注入攻击）
    const rawDeviceId = request.headers.get('x-device-id') || 
                        request.cookies.get('device_id')?.value ||
                        'anonymous';
    // 只允许字母、数字和短横线，长度限制
    const deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';
    
    const schemaName = tenantContext.schema;
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: cartItems, error } = await (supabase as any)
      .from(`${schemaName}.cart_items`)
      .select(`
        *,
        product:products(*)
      `)
      .eq('device_id', deviceId)
      .eq('customer_id', null);
    
    if (error) {
      console.error('Failed to fetch cart:', error);
      return NextResponse.json(
        { success: false, error: '获取购物车失败' },
        { status: 500 }
      );
    }
    
    const items = (cartItems || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.product,
    }));
    
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
    
    const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        total_amount: totalAmount,
        total_items: totalItems,
      },
    });
  } catch (error) {
    console.error('Cart error:', error);
    return NextResponse.json(
      { success: false, error: '购物车操作失败' },
      { status: 500 }
    );
  }
}

/**
 * 添加商品到购物车
 * POST /api/store/cart
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
    const { product_id, quantity = 1 } = body;
    
    if (!product_id) {
      return NextResponse.json(
        { success: false, error: '缺少商品ID' },
        { status: 400 }
      );
    }
    
    // 获取并验证 device_id（防止注入攻击）
    const rawDeviceId = request.headers.get('x-device-id') || 
                        request.cookies.get('device_id')?.value ||
                        'anonymous';
    // 只允许字母、数字和短横线，长度限制
    const deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';
    
    const schemaName = tenantContext.schema;
    
    // 检查商品是否存在且有库存
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: product } = await (supabase as any)
      .from(`${schemaName}.products`)
      .select('id, stock, is_on_sale')
      .eq('id', product_id)
      .single();
    
    if (!product || !product.is_on_sale) {
      return NextResponse.json(
        { success: false, error: '商品不存在或已下架' },
        { status: 404 }
      );
    }
    
    if (product.stock < quantity) {
      return NextResponse.json(
        { success: false, error: '库存不足' },
        { status: 400 }
      );
    }
    
    // 检查是否已在购物车
    const { data: existing } = await (supabase as any)
      .from(`${schemaName}.cart_items`)
      .select('id, quantity')
      .eq('device_id', deviceId)
      .eq('product_id', product_id)
      .eq('customer_id', null)
      .single();
    
    if (existing) {
      // 使用原子更新操作：INCREMENT 避免竞态
      const newQuantity = existing.quantity + quantity;

      if (newQuantity > product.stock) {
        return NextResponse.json(
          { success: false, error: '库存不足' },
          { status: 400 }
        );
      }

      // 使用 RPC 执行原子更新（带库存检查）
      const { data: updateResult, error: updateError } = await (supabase as any)
        .rpc('atomic_update_cart_quantity', {
          p_cart_item_id: existing.id,
          p_new_quantity: newQuantity,
          p_available_stock: product.stock,
        });

      if (updateError || !updateResult?.success) {
        return NextResponse.json(
          { success: false, error: updateResult?.error || '更新购物车失败' },
          { status: 500 }
        );
      }
    } else {
      // 新增
      await (supabase as any)
        .from(`${schemaName}.cart_items`)
        .insert({
          device_id: deviceId,
          product_id,
          quantity,
          customer_id: null,
        });
    }
    
    return NextResponse.json({
      success: true,
      message: '已添加到购物车',
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { success: false, error: '添加购物车失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新购物车商品数量
 * PUT /api/store/cart
 */
export async function PUT(request: NextRequest) {
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
    const { cart_item_id, quantity } = body;
    
    if (!cart_item_id || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }
    
    const schemaName = tenantContext.schema;
    
    if (quantity <= 0) {
      // 删除商品
      /* eslint-disable @typescript-eslint/no-explicit-any */
      await (supabase as any)
        .from(`${schemaName}.cart_items`)
        .delete()
        .eq('id', cart_item_id);
      
      return NextResponse.json({
        success: true,
        message: '商品已从购物车移除',
      });
    }
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (supabase as any)
      .from(`${schemaName}.cart_items`)
      .update({ quantity })
      .eq('id', cart_item_id);
    
    return NextResponse.json({
      success: true,
      message: '购物车已更新',
    });
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { success: false, error: '更新购物车失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除购物车商品
 * DELETE /api/store/cart
 */
export async function DELETE(request: NextRequest) {
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
    const itemId = searchParams.get('id');
    
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: '缺少商品ID' },
        { status: 400 }
      );
    }
    
    const schemaName = tenantContext.schema;
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (supabase as any)
      .from(`${schemaName}.cart_items`)
      .delete()
      .eq('id', itemId);
    
    return NextResponse.json({
      success: true,
      message: '商品已从购物车移除',
    });
  } catch (error) {
    console.error('Delete from cart error:', error);
    return NextResponse.json(
      { success: false, error: '删除购物车商品失败' },
      { status: 500 }
    );
  }
}
