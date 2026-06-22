// ProClaw Cloud 托管版 - 用户注册后初始化 tenant schema

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { initializeTenantSchema } from '@/lib/tenant';
import { ensureDemoTenant } from '@/lib/multi-tenant';
import { storePublicUrl } from '@/lib/utils';

/** 幂等初始化演示租户（ProClaw 一键体验后调用） */
export async function GET() {
  const result = await ensureDemoTenant();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || '初始化失败' },
      { status: 500 }
    );
  }
  return NextResponse.json({
    success: true,
    data: {
      tenant_id: result.tenant_id,
      subdomain: result.subdomain,
      created: result.created,
      store_url: storePublicUrl(result.subdomain!),
    },
  });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    // 获取当前用户
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = session.user.id;

    // 初始化 tenant schema
    const success = await initializeTenantSchema(userId);

    if (!success) {
      return NextResponse.json(
        { error: '初始化租户失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '租户初始化成功',
      user_id: userId,
    });
  } catch (error) {
    console.error('租户初始化 API 错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
