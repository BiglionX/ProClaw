// ProClaw Shop - 租户路由工具函数
// 提供从子域名获取租户信息的功能

import { cookies, headers } from 'next/headers';

/**
 * 租户信息接口
 */
export interface TenantInfo {
  id: string;
  subdomain: string;
  name: string;
  status: 'active' | 'suspended' | 'expired';
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  created_at: string;
  settings?: TenantSettings;
}

/**
 * 租户设置接口
 */
export interface TenantSettings {
  theme?: {
    primary_color?: string;
    secondary_color?: string;
    layout?: 'card' | 'list' | 'grid';
  };
  logo_url?: string;
  banner_url?: string;
  contact?: {
    phone?: string;
    wechat?: string;
    email?: string;
  };
  custom_domain?: string;
}

/**
 * 从请求头获取当前租户子域名
 */
export async function getTenantSubdomainFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-tenant-subdomain');
}

/**
 * 从 Cookie 获取当前租户子域名
 */
export async function getTenantSubdomainFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('tenant_subdomain')?.value || null;
}

/**
 * 获取当前租户子域名（优先从请求头，其次从 Cookie）
 */
export async function getCurrentTenantSubdomain(): Promise<string | null> {
  // 优先从请求头获取（中间件设置的）
  const fromHeader = await getTenantSubdomainFromHeaders();
  if (fromHeader) {
    return fromHeader;
  }
  
  // 降级到 Cookie
  return getTenantSubdomainFromCookie();
}

/**
 * 从 Next.js App Router Context 获取租户子域名
 * 用于 Server Components 和 Route Handlers
 */
export async function getTenantFromRequest(): Promise<{
  subdomain: string | null;
  tenantId: string | null;
  tenant: TenantInfo | null;
}> {
  const subdomain = await getCurrentTenantSubdomain();
  
  if (!subdomain) {
    return { subdomain: null, tenantId: null, tenant: null };
  }
  
  // TODO: 后续实现从数据库查询租户信息
  // 暂时返回基础信息
  return {
    subdomain,
    tenantId: null,
    tenant: null,
  };
}

/**
 * 验证子域名的合法性
 */
export function isValidSubdomain(subdomain: string): boolean {
  // 子域名规则：
  // - 长度 2-32 个字符
  // - 只能包含字母、数字、连字符
  // - 不能以连字符开头或结尾
  // - 不能是保留词
  
  const reservedSubdomains = [
    'www', 'mail', 'ftp', 'admin', 'api', 'blog', 'shop', 'store',
    'dev', 'test', 'demo', ' staging', 'prod', 'platform',
    'proclaw', 'admin', 'dashboard', 'console',
  ];
  
  if (reservedSubdomains.includes(subdomain.toLowerCase())) {
    return false;
  }
  
  const regex = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
  return regex.test(subdomain);
}

/**
 * 生成可用的子域名建议
 */
export function generateSubdomainSuggestions(name: string, count = 5): string[] {
  // 移除特殊字符，转为小写
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  
  const suggestions: string[] = [];
  
  // 原始名称
  if (isValidSubdomain(base)) {
    suggestions.push(base);
  }
  
  // 带数字后缀
  for (let i = 1; i <= count && suggestions.length < count; i++) {
    const suggestion = `${base}${i}`;
    if (isValidSubdomain(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  // 带前缀
  const prefixes = ['my', 'shop', 'store', 'go'];
  for (const prefix of prefixes) {
    const suggestion = `${prefix}-${base}`;
    if (suggestions.length >= count) break;
    if (isValidSubdomain(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions.slice(0, count);
}

/**
 * 路由重写配置 - 动态商城页面
 * 将 /[store] 路由映射到实际的租户商城
 */
export const storeRouteConfig = {
  // 动态路由参数名
  paramName: 'store',
  
  // 可选的商城页面列表
  pages: ['', 'products', 'cart', 'checkout', 'orders', 'profile'],
  
  // 页面标题映射
  pageTitles: {
    '': '首页',
    'products': '商品列表',
    'cart': '购物车',
    'checkout': '结算',
    'orders': '我的订单',
    'profile': '个人中心',
  } as Record<string, string>,
};

/**
 * 获取租户商城的完整 URL
 */
export function getStoreUrl(subdomain: string, customDomain?: string): string {
  if (customDomain) {
    return `https://${customDomain}`;
  }
  
  // 开发环境和生产环境判断
  const isDev = process.env.NODE_ENV === 'development';
  const baseDomain = isDev ? `${subdomain}.localhost:3000` : `${subdomain}.proclaw.cc`;
  
  return `https://${baseDomain}`;
}
