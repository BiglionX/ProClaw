// ProClaw Shop - 多租户子域名路由中间件
// 根据子域名自动识别租户并设置上下文

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要跳过路由检查的路径
const SKIP_PATHS = ['/_next', '/favicon', '/api/health', '/public'];

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 静态资源和特殊路径跳过
  if (shouldSkipPath(pathname)) {
    return NextResponse.next();
  }
  
  // 获取主机名
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);
  
  // 如果没有子域名，返回主平台页面
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
