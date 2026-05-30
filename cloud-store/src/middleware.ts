// ProClaw Cloud 托管版 - 认证中间件
// 保护 /app/* 路由，公开路由 /login, /register, /, /store/*

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server';

// 公开路由（无需登录）
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/auth',
  '/_next',
  '/favicon.ico',
  '/store',
  '/api/public',
  '/api/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径直接放行
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 保护 /app/* 路由
  if (pathname.startsWith('/app')) {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // 未登录，重定向到登录页
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 将用户信息添加到请求头，供下游使用
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-email', session.user.email || '');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // 保护 API 路由（除了公开 API）
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
