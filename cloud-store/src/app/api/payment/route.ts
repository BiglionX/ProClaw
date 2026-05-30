// ProClaw Cloud 托管版 - 支付 API Routes
// 支持支付宝/微信支付集成，开发环境支持 mock 支付

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '服务器内部错误';
}

// 支付配置
const PAYMENT_CONFIG = {
  // 支付方式: 'mock' (开发模拟) | 'alipay' | 'wechat'
  method: process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'mock',
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    notifyUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/notify`
      : 'http://localhost:3000/api/payment/notify',
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    notifyUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/notify`
      : 'http://localhost:3000/api/payment/notify',
  },
};

/**
 * 生成订单号
 */
function generateOrderNo(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString()
    + (now.getMonth() + 1).toString().padStart(2, '0')
    + now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `PAY${dateStr}${random}`;
}

/**
 * POST /api/payment/create-order - 创建支付订单
 * Body: { packageId: string }
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, paymentMethod } = body;

    if (!packageId) {
      return NextResponse.json({ error: '缺少套餐 ID' }, { status: 400 });
    }

    // 获取套餐信息
    const { data: pkg, error: pkgError } = await supabase
      .from('token_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 404 });
    }

    const finalPrice = pkg.price * (1 - (pkg.discount_percentage || 0) / 100);
    const orderNo = generateOrderNo();

    // 创建支付订单记录
    const { data: order, error: orderError } = await supabase
      .from('token_sales')
      .insert({
        user_id: session.user.id,
        amount: pkg.token_amount,
        price: finalPrice,
        currency: 'CNY',
        status: 'pending',
        payment_method: paymentMethod || PAYMENT_CONFIG.method,
        order_no: orderNo,
        metadata: {
          package_name: pkg.name,
          package_id: pkg.id,
          discount_percentage: pkg.discount_percentage,
        },
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 根据支付方式返回不同响应
    const method = paymentMethod || PAYMENT_CONFIG.method;

    if (method === 'mock') {
      // Mock 支付：直接返回成功（用于开发测试）
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          orderNo,
          amount: finalPrice,
          tokenAmount: pkg.token_amount,
          packageName: pkg.name,
          paymentMethod: 'mock',
          // 模拟支付二维码 URL（实际应返回真实的支付二维码）
          qrCode: null,
          redirectUrl: null,
        },
      });
    }

    if (method === 'alipay') {
      // 支付宝支付 - 返回支付表单/链接
      // 实际集成时需要调用支付宝 SDK 生成支付参数
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          orderNo,
          amount: finalPrice,
          tokenAmount: pkg.token_amount,
          packageName: pkg.name,
          paymentMethod: 'alipay',
          // 支付宝支付链接（实际由支付宝 SDK 生成）
          redirectUrl: `/api/payment/alipay?orderNo=${orderNo}&amount=${finalPrice}`,
        },
      });
    }

    if (method === 'wechat') {
      // 微信支付 - 返回 JSAPI 调起参数
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          orderNo,
          amount: finalPrice,
          tokenAmount: pkg.token_amount,
          packageName: pkg.name,
          paymentMethod: 'wechat',
          // 微信支付参数（实际由微信支付 SDK 生成）
          wxParams: null,
        },
      });
    }

    return NextResponse.json({ error: '不支持的支付方式' }, { status: 400 });
  } catch (error: unknown) {
    console.error('创建支付订单失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/query?orderId=xxx - 查询订单支付状态
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const orderId = request.nextUrl.searchParams.get('orderId');
    const orderNo = request.nextUrl.searchParams.get('orderNo');

    if (!orderId && !orderNo) {
      return NextResponse.json({ error: '缺少订单 ID 或订单号' }, { status: 400 });
    }

    let query = supabase
      .from('token_sales')
      .select('*')
      .eq('user_id', session.user.id);

    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_no', orderNo);
    }

    const { data, error } = await query.single();
    if (error) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        orderNo: data.order_no,
        amount: data.price,
        tokenAmount: data.amount,
        status: data.status,
        paymentMethod: data.payment_method,
        createdAt: data.created_at,
        paidAt: data.paid_at,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment/notify - 支付回调通知（由支付网关调用）
 */
export async function PUT(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const body = await request.json();
    const { orderNo, tradeNo, status } = body;

    if (!orderNo) {
      return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    }

    // 查询订单
    const { data: order, error: orderError } = await supabase
      .from('token_sales')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 如果已经支付完成，跳过重复回调
    if (order.status === 'completed') {
      return NextResponse.json({ success: true, message: '订单已处理' });
    }

    if (status === 'completed' || status === 'success') {
      // 更新订单状态
      const { error: updateError } = await supabase
        .from('token_sales')
        .update({
          status: 'completed',
          trade_no: tradeNo || null,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 增加 Token 余额
      const { error: addError } = await supabase.rpc('add_tokens', {
        p_user_id: order.user_id,
        p_tokens: order.amount,
      });

      if (addError) throw addError;

      return NextResponse.json({ success: true, message: '支付成功，Token 已增加' });
    }

    if (status === 'failed' || status === 'cancelled') {
      await supabase
        .from('token_sales')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      return NextResponse.json({ success: true, message: '订单已标记为失败' });
    }

    return NextResponse.json({ error: '未知状态' }, { status: 400 });
  } catch (error: unknown) {
    console.error('支付回调处理失败:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
