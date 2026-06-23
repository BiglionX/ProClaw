// ProClaw Shop - 多租户上下文管理
// 提供在请求处理过程中访问租户信息的能力

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCurrentTenantSubdomain } from './tenant-router';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 演示账号常量（与 ProClaw 桌面端 boss 一键体验对齐） */
export const DEMO_ACCOUNT_EMAIL = 'boss@proclaw.demo';
export const DEMO_TENANT_SUBDOMAIN = 'demo';
export const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
export const DEMO_TENANT_SCHEMA = 'tenant_demo';

import { fetchDemoProductImageUrl, isPlaceholderDemoImage } from './demo-product-images';

// ========== 类型定义 ==========

/**
 * 租户信息数据库类型
 */
export interface TenantRecord {
  id: string;
  status: string | null;
  plan: string | null;
}

/**
 * 租户上下文 Hook 类型定义
 */
export interface TenantContext {
  subdomain: string;
  schema: string;
  tenantId: string | null;
  status: 'active' | 'suspended' | 'expired' | 'unknown';
  plan: 'trial' | 'basic' | 'pro' | 'enterprise' | 'unknown';
}

/**
 * 创建 Supabase 客户端工厂函数
 */
function createServiceSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * 创建支持多租户的 Supabase 客户端
 * 根据当前租户自动切换到对应的 Schema
 */
export async function createTenantSupabaseClient() {
  const subdomain = await getCurrentTenantSubdomain();
  
  // 获取标准 Supabase 配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // 创建客户端
  const cookieStore = await cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // 记录非预期的错误（权限不足、参数错误等应被关注）
          console.error(`[Cookie设置失败] ${name}:`, error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          console.error(`[Cookie删除失败] ${name}:`, error);
        }
      },
    },
    global: {
      headers: {
        'x-tenant-subdomain': subdomain || '',
      },
    },
  });
}

// PostgreSQL 标识符最大长度限制
const MAX_SCHEMA_NAME_LENGTH = 63;
const MAX_SUBDOMAIN_LENGTH = 50;

/**
 * 获取当前租户的 Schema 名称
 * 每个租户在 PostgreSQL 中有独立的 Schema
 */
export async function getTenantSchema(): Promise<string> {
  const subdomain = await getCurrentTenantSubdomain();

  if (!subdomain) {
    // 如果没有子域名，返回公共 Schema
    return 'public';
  }

  // 子域名格式化为 Schema 名称
  // 例如: myshop -> tenant_myshop
  return formatSubdomainToSchema(subdomain);
}

/**
 * 将子域名格式化为合法的 PostgreSQL schema 名称
 */
export function formatSubdomainToSchema(subdomain: string): string {
  // 清理并规范化子域名
  const cleaned = subdomain
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')  // 非字母数字字符替换为下划线
    .replace(/_+/g, '_')           // 多个下划线合并
    .replace(/^_|_$/g, '');        // 去除首尾下划线

  // 长度限制：tenant_ 前缀 + 清理后的子域名 <= 63
  const maxSubdomainLength = MAX_SCHEMA_NAME_LENGTH - 'tenant_'.length;
  const truncated = cleaned.substring(0, maxSubdomainLength);

  return `tenant_${truncated}`;
}

/**
 * 验证子域名长度是否合法
 */
export function isSubdomainLengthValid(subdomain: string): boolean {
  return subdomain.length > 0 && subdomain.length <= MAX_SUBDOMAIN_LENGTH;
}

/**
 * 获取子域名最大允许长度
 */
export function getMaxSubdomainLength(): number {
  return MAX_SUBDOMAIN_LENGTH;
}

/**
 * 获取租户上下文
 * 在 API Route 和 Server Components 中使用
 */
export async function getTenantContext(): Promise<TenantContext> {
  const subdomain = await getCurrentTenantSubdomain();
  
  if (!subdomain) {
    return {
      subdomain: '',
      schema: 'public',
      tenantId: null,
      status: 'unknown',
      plan: 'unknown',
    };
  }
  
  const schema = formatSubdomainToSchema(subdomain);

  // 从数据库查询租户信息
  try {
    const supabase = createServiceSupabaseClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, status, plan')
      .eq('subdomain', subdomain)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116: No rows found, 这是正常的
      console.error('Failed to fetch tenant context:', error);
    }

    if (tenant) {
      return {
        subdomain,
        schema,
        tenantId: tenant.id,
        status: (tenant.status as TenantContext['status']) || 'active',
        plan: (tenant.plan as TenantContext['plan']) || 'trial',
      };
    }
  } catch (error) {
    console.error('Failed to fetch tenant context:', error);
  }
  
  return {
    subdomain,
    schema,
    tenantId: null,
    status: 'unknown',
    plan: 'unknown',
  };
}

/**
 * 验证租户是否有效
 */
export async function validateTenant(subdomain: string): Promise<{
  valid: boolean;
  tenantId?: string;
  error?: string;
}> {
  if (!subdomain) {
    return { valid: false, error: '子域名为空' };
  }
  
  // 保留词检查
  const reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'shop', 'store', 'proclaw'];
  if (reserved.includes(subdomain.toLowerCase())) {
    return { valid: false, error: '该子域名已被保留' };
  }
  
  // 查询数据库验证租户存在且状态正常
  try {
    const supabase = createServiceSupabaseClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, status')
      .eq('subdomain', subdomain)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Validate tenant error:', error);
      return { valid: false, error: '验证失败' };
    }

    if (!tenant) {
      return { valid: false, error: '租户不存在' };
    }

    if (tenant.status !== 'active') {
      return { valid: false, error: `租户状态异常: ${tenant.status}` };
    }

    return { valid: true, tenantId: tenant.id };
  } catch (error) {
    console.error('Validate tenant error:', error);
    return { valid: false, error: '验证失败' };
  }
}

/**
 * 获取租户的配置
 * 包括主题、Logo、联系方式等
 */
export async function getTenantSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tenantId: string
): Promise<{
  theme: {
    primaryColor: string;
    secondaryColor: string;
    layout: 'card' | 'list' | 'grid';
  };
  logoUrl: string | null;
  bannerUrl: string | null;
  contact: {
    phone: string | null;
    wechat: string | null;
    email: string | null;
  };
  customDomain: string | null;
}> {
  // TODO: 从数据库查询租户配置
  // 暂时返回默认值
  
  return {
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#60A5FA',
      layout: 'grid',
    },
    logoUrl: null,
    bannerUrl: null,
    contact: {
      phone: null,
      wechat: null,
      email: null,
    },
    customDomain: null,
  };
}

/**
 * 获取允许的 CORS 来源列表
 */
function getAllowedOrigins(): string[] {
  const origins = [
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'https://proclaw.cc',
    'https://www.proclaw.cc',
  ];

  // 允许从环境变量扩展来源列表
  const envOrigins = process.env.ALLOWED_CORS_ORIGINS;
  if (envOrigins) {
    try {
      const parsed = JSON.parse(envOrigins);
      if (Array.isArray(parsed)) {
        origins.push(...parsed);
      }
    } catch {
      console.warn('ALLOWED_CORS_ORIGINS 格式错误，应为 JSON 数组');
    }
  }

  return [...new Set(origins)];
}

/**
 * 检查请求来源是否被允许
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin) || allowed.some(o => {
    if (o.includes('*')) {
      const pattern = new RegExp('^' + o.replace(/\*/g, '.*') + '$');
      return pattern.test(origin);
    }
    return false;
  });
}

/**
 * 多租户中间件配置
 * 用于 NextResponse
 */
export const tenantHeaders = {
  // 跨域请求头 - 动态设置
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-subdomain, x-requested-with',
};

/**
 * 创建带租户头的响应（带 CORS 支持）
 */
export function createTenantResponse(
  data: unknown,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    request?: Request;
  }
) {
  const request = options?.request;
  const origin = request?.headers.get('origin') ?? null;
  const allowedOrigin = isOriginAllowed(origin) ? origin : '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...tenantHeaders,
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Vary'] = 'Origin';
  }

  return new Response(JSON.stringify(data), {
    status: options?.status || 200,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
}

/**
 * 创建错误响应
 */
export function createTenantErrorResponse(
  error: string,
  code: string,
  status = 400
) {
  return createTenantResponse(
    { success: false, error, code },
    { status }
  );
}

export interface EnsureDemoTenantResult {
  success: boolean;
  tenant_id?: string;
  subdomain?: string;
  created?: boolean;
  error?: string;
}

/** 20 个演示商品（与桌面端 seed_demo_products / demoBootstrapData 对齐） */
const DEMO_CLOUD_PRODUCTS = [
  { id: 'p0000001-0000-0000-0000-000000000001', local_id: 'spu_iphone15pm_bat', name: 'iPhone 15 Pro Max 电池', price: 199, stock: 50, category: 'iPhone 15' },
  { id: 'p0000001-0000-0000-0000-000000000002', local_id: 'spu_iphone15pro_bat', name: 'iPhone 15 Pro 电池', price: 179, stock: 50, category: 'iPhone 15' },
  { id: 'p0000001-0000-0000-0000-000000000003', local_id: 'spu_iphone15_bat', name: 'iPhone 15 电池', price: 159, stock: 60, category: 'iPhone 15' },
  { id: 'p0000001-0000-0000-0000-000000000004', local_id: 'spu_iphone15plus_bat', name: 'iPhone 15 Plus 电池', price: 189, stock: 45, category: 'iPhone 15' },
  { id: 'p0000001-0000-0000-0000-000000000005', local_id: 'spu_iphone14pm_bat', name: 'iPhone 14 Pro Max 电池', price: 179, stock: 45, category: 'iPhone 14' },
  { id: 'p0000001-0000-0000-0000-000000000006', local_id: 'spu_iphone14pro_bat', name: 'iPhone 14 Pro 电池', price: 159, stock: 55, category: 'iPhone 14' },
  { id: 'p0000001-0000-0000-0000-000000000007', local_id: 'spu_iphone14_bat', name: 'iPhone 14 电池', price: 149, stock: 60, category: 'iPhone 14' },
  { id: 'p0000001-0000-0000-0000-000000000008', local_id: 'spu_iphone14plus_bat', name: 'iPhone 14 Plus 电池', price: 169, stock: 40, category: 'iPhone 14' },
  { id: 'p0000001-0000-0000-0000-000000000009', local_id: 'spu_iphone13pm_bat', name: 'iPhone 13 Pro Max 电池', price: 169, stock: 50, category: 'iPhone 13' },
  { id: 'p0000001-0000-0000-0000-00000000000a', local_id: 'spu_iphone13pro_bat', name: 'iPhone 13 Pro 电池', price: 149, stock: 55, category: 'iPhone 13' },
  { id: 'p0000001-0000-0000-0000-00000000000b', local_id: 'spu_iphone13_bat', name: 'iPhone 13 电池', price: 139, stock: 60, category: 'iPhone 13' },
  { id: 'p0000001-0000-0000-0000-00000000000c', local_id: 'spu_iphone13mini_bat', name: 'iPhone 13 mini 电池', price: 119, stock: 35, category: 'iPhone 13' },
  { id: 'p0000001-0000-0000-0000-00000000000d', local_id: 'spu_iphone12pm_bat', name: 'iPhone 12 Pro Max 电池', price: 159, stock: 45, category: 'iPhone 12' },
  { id: 'p0000001-0000-0000-0000-00000000000e', local_id: 'spu_iphone12pro_bat', name: 'iPhone 12 Pro 电池', price: 139, stock: 55, category: 'iPhone 12' },
  { id: 'p0000001-0000-0000-0000-00000000000f', local_id: 'spu_iphone12_bat', name: 'iPhone 12 电池', price: 129, stock: 60, category: 'iPhone 12' },
  { id: 'p0000001-0000-0000-0000-000000000010', local_id: 'spu_iphone12mini_bat', name: 'iPhone 12 mini 电池', price: 109, stock: 40, category: 'iPhone 12' },
  { id: 'p0000001-0000-0000-0000-000000000011', local_id: 'spu_iphone11pm_bat', name: 'iPhone 11 Pro Max 电池', price: 149, stock: 40, category: 'iPhone 11' },
  { id: 'p0000001-0000-0000-0000-000000000012', local_id: 'spu_iphone11pro_bat', name: 'iPhone 11 Pro 电池', price: 129, stock: 50, category: 'iPhone 11' },
  { id: 'p0000001-0000-0000-0000-000000000013', local_id: 'spu_iphone11_bat', name: 'iPhone 11 电池', price: 119, stock: 60, category: 'iPhone 11' },
  { id: 'p0000001-0000-0000-0000-000000000014', local_id: 'spu_iphonese3_bat', name: 'iPhone SE (第三代) 电池', price: 59, stock: 45, category: 'iPhone SE' },
] as const;

/**
 * 幂等：确保 Supabase 中存在 demo 租户、schema 与示例商品
 */
export async function ensureDemoTenant(): Promise<EnsureDemoTenantResult> {
  try {
    const supabase = createServiceSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: existing } = await sb
      .from('tenants')
      .select('id, subdomain, status')
      .eq('subdomain', DEMO_TENANT_SUBDOMAIN)
      .maybeSingle();

    let created = false;

    if (!existing) {
      const { error: insertError } = await sb.from('tenants').upsert(
        {
          id: DEMO_TENANT_ID,
          subdomain: DEMO_TENANT_SUBDOMAIN,
          name: '演示商城',
          email: DEMO_ACCOUNT_EMAIL,
          schema_name: DEMO_TENANT_SCHEMA,
          status: 'active',
          plan: 'trial',
          token_balance: 50000,
          token_used: 0,
        },
        { onConflict: 'id' }
      );

      if (insertError) {
        console.error('[ensureDemoTenant] insert tenant:', insertError);
        return { success: false, error: '创建演示租户失败' };
      }
      created = true;
    } else if (existing.status !== 'active') {
      await sb.from('tenants').update({ status: 'active' }).eq('id', existing.id);
    }

    const tenantId = existing?.id || DEMO_TENANT_ID;

    const { error: schemaError } = await sb.rpc('create_tenant_schema', {
      tenant_schema: DEMO_TENANT_SCHEMA,
    });
    if (schemaError) {
      console.warn('[ensureDemoTenant] create_tenant_schema:', schemaError.message);
    }

    for (const p of DEMO_CLOUD_PRODUCTS) {
      const imageUrl = await fetchDemoProductImageUrl(p.name);
      const images = imageUrl && !isPlaceholderDemoImage(imageUrl) ? [imageUrl] : [];

      await sb.from(`${DEMO_TENANT_SCHEMA}.products`).upsert(
        {
          id: p.id,
          local_id: p.local_id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          is_on_sale: true,
          description: p.name,
          ...(images.length > 0 ? { images } : {}),
        },
        { onConflict: 'id' }
      );

      await new Promise((r) => setTimeout(r, 400));
    }

    return {
      success: true,
      tenant_id: tenantId,
      subdomain: DEMO_TENANT_SUBDOMAIN,
      created,
    };
  } catch (err) {
    console.error('[ensureDemoTenant]', err);
    return { success: false, error: err instanceof Error ? err.message : '未知错误' };
  }
}
