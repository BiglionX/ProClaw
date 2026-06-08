// ProClaw Shop - 订单 API
import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';
import { TokenCalculator, TokenActions } from '@/lib/token-calculator';

export const dynamic = 'force-dynamic';

/**
 * 创建订单
 * POST /api/store/orders
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
    const { customer_name, customer_phone, customer_address, payment_method = 'mock', remark } = body;

    // 验证必填字段
    if (!customer_name || !customer_phone || !customer_address) {
      return NextResponse.json(
        { success: false, error: '请填写完整的收货信息' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(customer_phone)) {
      return NextResponse.json(
        { success: false, error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 验证 deviceId（防止注入攻击）
    const rawDeviceId = request.headers.get('x-device-id') ||
                        request.cookies.get('device_id')?.value ||
                        'anonymous';
    const deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';

    const schemaName = tenantContext.schema;

    // 使用 RPC 执行订单创建事务（包含库存锁定）
    // 原子操作：检查库存 -> 扣减库存 -> 创建订单 -> 清空购物车
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: result, error: orderError } = await (supabase as any)
      .rpc('create_order_with_inventory_lock', {
        p_schema: schemaName,
        p_device_id: deviceId,
        p_customer_name: customer_name,
        p_customer_phone: customer_phone,
        p_customer_address: customer_address,
        p_payment_method: payment_method,
        p_remark: remark,
      });

    if (orderError || !result?.success) {
      console.error('Create order error:', orderError || result?.error);

      // 根据错误类型返回不同消息
      if (result?.error === 'INSUFFICIENT_STOCK') {
        return NextResponse.json(
          { success: false, error: '部分商品库存不足，请返回购物车调整数量' },
          { status: 400 }
        );
      }
      if (result?.error === 'EMPTY_CART') {
        return NextResponse.json(
          { success: false, error: '购物车为空' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: result?.error || '创建订单失败' },
        { status: 500 }
      );
    }

    // 扣 Token (创建订单消耗)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const tokenCalc = new TokenCalculator(supabaseUrl, supabaseKey);
      await tokenCalc.consume({
        tenant_id: tenantContext.tenantId,
        action: TokenActions.ORDER_CREATE,
        quantity: 1,
      });
    } catch (tokenError) {
      // Token 扣费失败不应回滚订单（订单已创建成功）
      console.error('Token 扣费失败（订单已创建）:', tokenError);
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: result.order_id,
        order_no: result.order_no,
        total_amount: result.total_amount,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: '创建订单失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取订单列表
 * GET /api/store/orders
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
    
    const deviceId = request.headers.get('x-device-id') || 
                     request.cookies.get('device_id')?.value ||
                     'anonymous';
    
    const schemaName = tenantContext.schema;
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: orders, error } = await (supabase as any)
      .from(`${schemaName}.orders`)
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Fetch orders error:', error);
      return NextResponse.json(
        { success: false, error: '获取订单失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: orders || [],
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { success: false, error: '获取订单失败' },
      { status: 500 }
    );
  }
}
