// ProClaw Shop - 扫码登录 API
// 商户在 ProClaw 桌面端扫码登录商城

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_TENANT_SUBDOMAIN,
  ensureDemoTenant,
  getTenantContext,
} from '@/lib/multi-tenant';
import { randomBytes } from 'crypto';

// 存储待验证的登录码（使用 Redis 或数据库，生产环境避免内存存储）
// 内存存储仅用于开发环境或单实例部署
const pendingCodes = new Map<string, {
  tenant_id: string;
  expires_at: number;
}>();

/**
 * 生成扫码登录码
 * POST /api/auth/qrcode/generate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'generate') {
      return handleGenerate(request);
    } else if (action === 'verify') {
      return handleVerify(request);
    } else if (action === 'check') {
      return handleCheck(request);
    } else if (action === 'demo') {
      return handleDemoLogin(request);
    }
    
    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('QR Code login error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 生成登录二维码
 */
async function handleGenerate(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  // 从请求头或 Cookie 获取租户信息
  const tenantContext = await getTenantContext();
  
  if (!tenantContext.tenantId) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }
  
  // 生成安全的登录码（16字节熵值）
  const code = randomBytes(8).toString('hex').toUpperCase().slice(0, 12);
  const token = randomBytes(32).toString('hex');
  
  // 设置过期时间（5分钟）
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  // 存储登录码
  pendingCodes.set(code, {
    tenant_id: tenantContext.tenantId,
    expires_at: expiresAt,
  });
  
  // 同时在数据库存储（持久化）
  /* eslint-disable @typescript-eslint/no-explicit-any */
  await (supabase as any)
    .from('qr_login_sessions')
    .insert({
      code,
      token,
      tenant_id: tenantContext.tenantId,
      expires_at: new Date(expiresAt).toISOString(),
      status: 'pending',
    });
  
  return NextResponse.json({
    success: true,
    data: {
      code,
      token,
      expires_at: expiresAt,
      // 扫码地址
      scan_url: `/auth/scan?code=${code}`,
    },
  });
}

/**
 * 验证登录码（商城扫码后调用）
 */
async function handleVerify(request: NextRequest) {
  const response = NextResponse.next();
  const body = await request.json();
  
  const { code } = body;
  
  if (!code) {
    return NextResponse.json(
      { success: false, error: '缺少登录码' },
      { status: 400 }
    );
  }
  
  // 检查登录码
  const session = pendingCodes.get(code);
  
  if (!session) {
    // 从数据库查询
    const supabase = createRouteSupabaseClient(request, response);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: dbSession } = await (supabase as any)
      .from('qr_login_sessions')
      .select('*')
      .eq('code', code)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!dbSession) {
      return NextResponse.json(
        { success: false, error: '登录码无效或已过期' },
        { status: 400 }
      );
    }
    
    // 更新会话状态
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (supabase as any)
      .from('qr_login_sessions')
      .update({ status: 'verified' })
      .eq('code', code);
    
    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        tenant_id: dbSession.tenant_id,
      },
    });
  }
  
  // 清理内存中的记录
  pendingCodes.delete(code);
  
  return NextResponse.json({
    success: true,
    data: {
      verified: true,
      tenant_id: session.tenant_id,
    },
  });
}

/**
 * 检查登录状态（轮询）
 */
async function handleCheck(request: NextRequest) {
  const body = await request.json();
  const { token } = body;
  
  if (!token) {
    return NextResponse.json(
      { success: false, error: '缺少 token' },
      { status: 400 }
    );
  }
  
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: session } = await (supabase as any)
    .from('qr_login_sessions')
    .select('*')
    .eq('token', token)
    .single();
  
  if (!session) {
    return NextResponse.json({
      success: true,
      data: { status: 'pending' },
    });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      status: session.status,
      tenant_id: session.tenant_id,
    },
  });
}

const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * 演示账号直通登录（boss / boss@proclaw.demo）
 */
async function handleDemoLogin(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || 'boss').trim().toLowerCase();
  const isBoss =
    username === 'boss' || username === DEMO_ACCOUNT_EMAIL;

  if (!isBoss) {
    return NextResponse.json(
      { success: false, error: '仅支持 ProClaw 演示账号登录' },
      { status: 403 }
    );
  }

  const ensured = await ensureDemoTenant();
  if (!ensured.success || !ensured.tenant_id) {
    return NextResponse.json(
      { success: false, error: ensured.error || '演示租户未就绪' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      email: DEMO_ACCOUNT_EMAIL,
      tenant_id: ensured.tenant_id,
      subdomain: DEMO_TENANT_SUBDOMAIN,
      redirect: '/tenant/dashboard',
    },
  });

  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set('pc_demo_auth', DEMO_ACCOUNT_EMAIL, {
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    secure,
  });
  response.cookies.set('pc_session', `demo:${ensured.tenant_id}`, {
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: true,
    secure,
  });
  response.cookies.set('tenant_subdomain', DEMO_TENANT_SUBDOMAIN, {
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
  });
  response.cookies.set('tenant_id', ensured.tenant_id, {
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
  });

  return response;
}
