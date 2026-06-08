// ProClaw Shop - Token 充值 API
import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';
import { TokenCalculator } from '@/lib/token-calculator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  try {
    const body = await request.json();
    const { package_id, payment_method = 'mock' } = body;
    
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未找到租户信息' },
        { status: 401 }
      );
    }
    
    // 获取套餐信息
    const { data: pkg, error: pkgError } = await supabase
      .from('token_packages')
      .select('*')
      .eq('id', package_id)
      .eq('active', true)
      .single();
    
    if (pkgError || !pkg) {
      return NextResponse.json(
        { success: false, error: '套餐不存在或已下架' },
        { status: 400 }
      );
    }
    
    // Mock 支付模式（开发环境）
    if (payment_method === 'mock') {
      // 直接充值
      const calculator = new TokenCalculator(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const result = await calculator.recharge(
        tenantContext.tenantId,
        pkg.token_amount,
        { note: `购买 ${pkg.name}` }
      );
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          order_id: `MOCK-${Date.now()}`,
          token_amount: pkg.token_amount,
          balance: result.balance_after,
        },
      });
    }
    
    // TODO: 实现真实的支付流程
    // 1. 创建支付订单（Stripe/支付宝/微信）
    // 2. 返回支付链接
    // 3. 支付回调后调用 calculator.recharge()
    
    return NextResponse.json({
      success: false,
      error: '暂不支持该支付方式',
    }, { status: 400 });
    
  } catch (error) {
    console.error('Token purchase error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
