// ProClaw Cloud 托管版 - 账户注销 API
// PRD §6: 用户可随时导出所有数据并彻底删除账户

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantSchema } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * 注销账户 - 彻底删除用户及其所有数据
 * POST /api/tenant/delete-account
 *
 * 请求体: { confirm: "DELETE" }
 * 用户必须输入 "DELETE" 以确认注销操作
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    // a. 获取当前用户会话
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // b. 解析并校验确认参数
    let body: { confirm?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求体格式错误' },
        { status: 400 }
      );
    }

    if (body?.confirm !== 'DELETE') {
      return NextResponse.json(
        { success: false, error: '请输入 DELETE 以确认注销账户' },
        { status: 400 }
      );
    }

    // 创建服务端特权客户端（用于删除 auth 用户等管理员操作）
    const serviceClient = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // c. 删除租户 schema（级联删除所有业务表）
    const schema = getTenantSchema(userId);
    const { error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`,
    });

    if (schemaError) {
      console.error('删除租户 schema 失败:', schemaError);
      // 不中断流程：即使 schema 删除失败，也继续清理其它数据
    }

    // d. 删除 tenants 表中归属该邮箱的租户记录
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { error: tenantError } = await (serviceClient as any)
      .from('tenants')
      .delete()
      .eq('owner_email', userEmail);

    if (tenantError) {
      console.error('删除租户记录失败:', tenantError);
    }

    // e. 删除用户在公共表中的数据
    await Promise.all([
      (serviceClient as any).from('token_balances').delete().eq('user_id', userId),
      (serviceClient as any).from('api_usage_logs').delete().eq('user_id', userId),
      (serviceClient as any).from('user_token_config').delete().eq('user_id', userId),
    ]);

    // f. 删除 auth 用户（需要 service role key）
    const { error: deleteUserError } =
      await serviceClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('删除 auth 用户失败:', deleteUserError);
      return NextResponse.json(
        { success: false, error: '删除账户失败，请稍后重试' },
        { status: 500 }
      );
    }

    // g. 登出用户
    await supabase.auth.signOut();

    // h. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '账户已彻底删除',
    });
  } catch (error) {
    console.error('账户注销 API 错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
