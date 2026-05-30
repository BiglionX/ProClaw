// ProClaw Cloud 托管版 - Auth Callback Route
// 处理 Supabase OAuth 和邮箱验证回调

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/dashboard';

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createRouteSupabaseClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  // 如果出错，跳转到错误页或首页
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`);
}
