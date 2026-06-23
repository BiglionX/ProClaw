import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/pkce';

const SKIP_PATHS = ['/_next', '/favicon', '/api/health', '/public'];
const AUTH_PATHS = ['/app', '/dashboard'];
const OIDC_ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'proclaw_web';
const OIDC_REDIRECT_URI = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || 'https://proclaw.cc/auth/callback';

/**
 * 获取平台主域名列表
 * 支持从环境变量配置
 */
function getPlatformDomains(): string[] {
  // 默认平台域名
  const defaults = [
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
  ];

  // 从环境变量加载平台域名
  const envDomains = process.env.PLATFORM_DOMAINS;
  if (envDomains) {
    try {
      const parsed = JSON.parse(envDomains);
      if (Array.isArray(parsed)) {
        return [...new Set([...parsed, ...defaults])];
      }
    } catch {
      // 忽略解析错误
    }
  }

  // 从 SITE_URL 添加平台域名
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      defaults.push(url.hostname);
      // 同时添加不带 www 的域名
      if (url.hostname.startsWith('www.')) {
        defaults.push(url.hostname.substring(4));
      } else {
        defaults.push(`www.${url.hostname}`);
      }
    } catch {
      // 忽略无效 URL
    }
  }

  return [...new Set(defaults)];
}

/**
 * 从主机名中提取子域名
 */
function extractSubdomain(hostname: string): string | null {
  // 移除端口号
  const host = hostname.split(':')[0];
  
  // 检查是否是平台主域名
  if (getPlatformDomains().includes(host)) {
    return null;
  }
  
  // 检查是否包含平台域名后缀
  const domainParts = host.split('.');
  
  // 情况1: xxx.proclaw.cc -> 子域名是 xxx
  if (domainParts.length >= 3 && domainParts.slice(-2).join('.') === 'proclaw.cc') {
    return domainParts[0];
  }
  
  // 情况2: xxx.localhost -> 子域名是 xxx（开发环境）
  if (domainParts.length >= 2 && domainParts.slice(-1)[0] === 'localhost') {
    return domainParts[0];
  }
  
  // 情况3: xxx.127.0.0.1 -> 子域名是 xxx（开发环境IP访问）
  if (domainParts.length >= 2 && domainParts.includes('127.0.0.1')) {
    return domainParts[0];
  }
  
  return null;
}

/**
 * 检查路径是否需要跳过
 */
function shouldSkipPath(pathname: string): boolean {
  return SKIP_PATHS.some(prefix => pathname.startsWith(prefix));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(prefix => pathname.startsWith(prefix));
}

/**
 * 构建 OIDC 授权 URL（含 PKCE）
 * 返回授权 URL、state 和 code_verifier
 * verifier 和 state 需存入 cookie 供 callback 使用
 */
async function buildOidcAuthUrl(redirectUri: string): Promise<{ url: string; state: string; verifier: string }> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return {
    url: OIDC_ISSUER + '/oauth/authorize?' + params.toString(),
    state,
    verifier,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 商户登录页 → 演示直通登录（boss 测试账号）
  if (pathname === '/tenant/login') {
    const auto = request.nextUrl.searchParams.get('auto');
    const dest = auto === 'demo' ? '/auth/scan?auto=demo' : '/auth/scan?demo=1';
    return NextResponse.redirect(new URL(dest, request.url));
  }
  
  if (shouldSkipPath(pathname)) {
    return NextResponse.next();
  }
  
  if (isAuthPath(pathname)) {
    // 检查 Supabase 会话 cookie（格式: sb-<project-ref>-auth-token）
    // 或自定义 pc_session cookie
    const allCookies = request.cookies.getAll();
    const hasSupabaseSession = allCookies.some(c =>
      c.name.startsWith('sb-') && c.name.includes('auth-token')
    );
    const hasCustomSession = request.cookies.get('pc_session');

    if (!hasSupabaseSession && !hasCustomSession) {
      // 生成含 PKCE 的 OIDC 授权 URL
      const { url, state, verifier } = await buildOidcAuthUrl(OIDC_REDIRECT_URI);
      const redirectResponse = NextResponse.redirect(new URL(url, request.url));

      // 将 PKCE verifier 和 state 存入 httpOnly cookie（10 分钟有效）
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 10, // 10 分钟
      };
      redirectResponse.cookies.set('pkce_verifier', verifier, cookieOptions);
      redirectResponse.cookies.set('oidc_state', state, cookieOptions);

      return redirectResponse;
    }
  }
  
  // 路径格式: /shop/[store]（标准）或 /[store]（兼容，会 302 到 /shop/[store]）
  let subdomain: string | null = null;
  
  // 情况1: /shop/[store] 路径格式（推荐）
  const shopMatch = pathname.match(/^\/shop\/([a-z0-9-]+)/);
  if (shopMatch) {
    subdomain = shopMatch[1];
  }
  
  // 情况2: /[store] 根路径（兼容旧链接，重定向到 /shop/[store]）
  if (!subdomain) {
    const knownPaths = ['api', 'app', 'auth', 'cart', 'checkout', 'login', 'orders', 'products', 'register', 'tenant', 'shop', 'admin'];
    const pathMatch = pathname.match(/^\/([a-z0-9-]+)(\/.*)?$/);
    if (pathMatch) {
      const firstPath = pathMatch[1].toLowerCase();
      if (!knownPaths.includes(firstPath)) {
        const rest = pathMatch[2] || '';
        return NextResponse.redirect(new URL(`/shop/${pathMatch[1]}${rest}`, request.url));
      }
    }
  }
  if (!subdomain) {
    subdomain = extractSubdomain(request.headers.get('host') || '');
  }
  
  // 如果没有子域名/租户，返回主平台页面
  if (!subdomain) {
    return NextResponse.next();
  }
  
  // 创建响应，添加租户上下文头
  const response = NextResponse.next();
  
  // 设置租户标识（供后续 API 和页面使用）
  response.headers.set('x-tenant-subdomain', subdomain);
  
  // 设置租户上下文 Cookie（方便前端获取）
  const cookieOptions = {
    path: '/',
    maxAge: 60 * 60 * 24, // 24小时
    sameSite: 'lax' as const,
  };
  
  response.cookies.set('tenant_subdomain', subdomain, {
    ...cookieOptions,
    httpOnly: false, // 前端需要读取
  });
  
  return response;
}

// 配置 matcher：只匹配动态商城路由
export const config = {
  matcher: [
    // 匹配所有路径，排除静态文件和内部 API
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
