// ProClaw Shop - Token API
// Token 余额查询和充值

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';

export const dynamic = 'force-dynamic';

/**
 * 获取 Token 余额
 * GET /api/tenant/token
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
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: tenant } = await (supabase as any)
      .from('tenants')
      .select('token_balance, token_used, plan')
      .eq('id', tenantContext.tenantId)
      .single();
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: '租户不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        balance: tenant.token_balance || 0,
        used: tenant.token_used || 0,
        plan: tenant.plan || 'trial',
      },
    });
  } catch (error) {
    console.error('Get token balance error:', error);
    return NextResponse.json(
      { success: false, error: '获取 Token 余额失败' },
      { status: 500 }
    );
  }
}
