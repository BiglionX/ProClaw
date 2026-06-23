// ProClaw Cloud 托管版 - OIDC 认证回调
// 完成 account.proclaw.cc OIDC 回调的完整闭环：
// 1. 从 cookie 读取 PKCE verifier + state
// 2. 服务端交换 code → tokens
// 3. 获取用户信息
// 4. 桥接到 Supabase session（generateLink + verifyOtp）

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const OIDC_ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'proclaw_web';

/**
 * 根据请求动态生成 OIDC 回调 URI
 * 支持多域名：cloud.proclaw.cc（云托管版）、proclaw.cc（云商城）等
 * 必须与中间件 buildOidcAuthUrl 中使用的 redirect_uri 一致
 */
function getOidcRedirectUri(request: NextRequest): string {
  const envUri = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI;
  if (envUri) return envUri;
  const url = new URL(request.url);
  return `${url.origin}/auth/callback`;
}

/**
 * OIDC 回调处理
 * GET /auth/callback?code=xxx&state=yyy
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // OIDC 提供方返回错误
  if (error) {
    console.error('[oidc-callback] OIDC provider error:', error);
    return NextResponse.redirect(
      new URL('/auth/scan?error=' + encodeURIComponent(error), request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/scan?error=missing_params', request.url));
  }

  // 验证 state（防 CSRF）
  const savedState = request.cookies.get('oidc_state')?.value;
  if (state !== savedState) {
    console.error('[oidc-callback] State mismatch');
    return NextResponse.redirect(new URL('/auth/scan?error=invalid_state', request.url));
  }

  // 读取 PKCE verifier
  const verifier = request.cookies.get('pkce_verifier')?.value;
  if (!verifier) {
    console.error('[oidc-callback] No PKCE verifier in cookie');
    return NextResponse.redirect(new URL('/auth/scan?error=no_verifier', request.url));
  }

  try {
    // ── 步骤 1: 服务端交换 code → tokens ──
    // redirect_uri 必须与中间件发起授权时使用的完全一致
    const redirectUri = getOidcRedirectUri(request);
    const tokenRes = await fetch(OIDC_ISSUER + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: OIDC_CLIENT_ID,
        code_verifier: verifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[oidc-callback] Token exchange failed:', tokenRes.status, errText);
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokens = await tokenRes.json();

    // ── 步骤 2: 获取用户信息 ──
    const userInfoRes = await fetch(OIDC_ISSUER + '/oauth/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    });

    if (!userInfoRes.ok) {
      throw new Error(`User info request failed: ${userInfoRes.status}`);
    }

    const userInfo = await userInfoRes.json();

    if (!userInfo.email) {
      throw new Error('OIDC userinfo missing email');
    }

    // ── 步骤 3: 桥接到 Supabase session ──
    // 使用 service role key 调用 admin.generateLink 生成 magic link（不发送邮件）
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 生成 magic link（admin API 不发送邮件，仅返回 token）
    // type: 'magiclink' 默认会自动创建不存在的用户
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email,
    });

    if (linkError || !linkData) {
      console.error('[oidc-callback] generateLink failed:', linkError?.message);
      throw new Error('Failed to generate Supabase session link');
    }

    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      throw new Error('No hashed_token in generateLink response');
    }

    // ── 步骤 4: 使用 anon key 客户端验证 OTP，建立 Supabase session ──
    // 创建重定向响应（session cookies 会设置在此响应上）
    const redirectResponse = NextResponse.redirect(new URL('/app/dashboard', request.url));

    const authClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { error: otpError } = await authClient.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'magiclink',
    });

    if (otpError) {
      console.error('[oidc-callback] verifyOtp failed:', otpError.message);
      throw new Error('OTP verification failed: ' + otpError.message);
    }

    // ── 步骤 5: 清理 PKCE cookies ──
    redirectResponse.cookies.delete('pkce_verifier');
    redirectResponse.cookies.delete('oidc_state');

    console.log('[oidc-callback] OIDC login successful for:', userInfo.email);

    return redirectResponse;
  } catch (error) {
    console.error('[oidc-callback] Error:', error instanceof Error ? error.message : error);

    // 清理 PKCE cookies 并重定向到登录页
    const errorResponse = NextResponse.redirect(
      new URL('/auth/scan?error=callback_failed', request.url)
    );
    errorResponse.cookies.delete('pkce_verifier');
    errorResponse.cookies.delete('oidc_state');
    return errorResponse;
  }
}
