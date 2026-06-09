// ProClaw Cloud 托管版 - Supabase 服务端实例
// 在 Server Components 和 API Routes 中使用

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

// 强制使用正确的 Supabase URL
const SUPABASE_URL = 'https://ourolpgrntjrtapgaztt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SQoKN2LQZ2Y15XtZplLoDw_R7KVviPC';

console.log('[supabase-server] SUPABASE_URL:', SUPABASE_URL);

/**
 * 创建服务端 Supabase 客户端 (用于 Server Components / Route Handlers)
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * 创建中间件使用的 Supabase 客户端
 */
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * 创建 API Route 使用的 Supabase 客户端
 */
export function createRouteSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}
