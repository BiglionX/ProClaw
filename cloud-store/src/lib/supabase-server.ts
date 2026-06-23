// ProClaw Cloud 托管版 - Supabase 服务端实例
// 在 Server Components 和 API Routes 中使用

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * 获取 Supabase URL（优先服务端环境变量，其次公开变量）
 */
function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  return url;
}

/**
 * 获取 Supabase 服务端密钥
 * 服务端使用 service role key 以绕过 RLS 执行特权操作（如 schema 创建、token 扣费）
 * 降级到 anon key 仅用于无特权操作的场景
 */
function getSupabaseServerKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return key;
}

/**
 * 创建服务端 Supabase 客户端 (用于 Server Components / Route Handlers)
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseServerKey(),
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
    getSupabaseUrl(),
    getSupabaseServerKey(),
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
    getSupabaseUrl(),
    getSupabaseServerKey(),
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
