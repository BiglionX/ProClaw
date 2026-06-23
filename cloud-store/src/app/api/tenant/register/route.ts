// ProClaw Shop - 商户注册 API
import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { isValidSubdomain, generateSubdomainSuggestions } from '@/lib/tenant-router';

export const dynamic = 'force-dynamic';

/**
 * 注册新商户
 * POST /api/tenant/register
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  try {
    const body = await request.json();
    const { 
      name, 
      subdomain, 
      owner_name,
      owner_email,
      owner_phone,
      plan = 'trial'
    } = body;
    
    // 验证必填字段
    if (!name || !subdomain || !owner_email) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
    }
    
    // 验证子域名格式
    if (!isValidSubdomain(subdomain)) {
      const suggestions = generateSubdomainSuggestions(name, 5);
      return NextResponse.json(
        { 
          success: false, 
          error: '子域名格式不正确，请使用小写字母、数字和连字符',
          suggestions 
        },
        { status: 400 }
      );
    }
    
    // 检查子域名是否已被占用
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: existing } = await (supabase as any)
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain.toLowerCase())
      .single();
    
    if (existing) {
      const suggestions = generateSubdomainSuggestions(name, 5);
      return NextResponse.json(
        { 
          success: false, 
          error: '该子域名已被占用',
          suggestions 
        },
        { status: 409 }
      );
    }
    
    // 生成 Schema 名称
    const schemaName = `tenant_${subdomain.replace(/-/g, '_').toLowerCase()}`;
    
    // 创建租户记录
    const { data: tenant, error: createError } = await (supabase as any)
      .from('tenants')
      .insert({
        name,
        subdomain: subdomain.toLowerCase(),
        schema_name: schemaName,
        owner_name: owner_name || null,
        owner_email,
        owner_phone: owner_phone || null,
        plan,
        status: 'active',
        token_balance: plan === 'trial' ? 1000 : 0, // 新用户赠送 1000 Token（无有效期）
      })
      .select()
      .single();
    
    if (createError || !tenant) {
      console.error('Create tenant error:', createError);
      return NextResponse.json(
        { success: false, error: '创建商户失败' },
        { status: 500 }
      );
    }
    
    // 创建租户 Schema (调用数据库函数)
    const { error: schemaError } = await (supabase as any)
      .rpc('create_tenant_schema', { tenant_schema: schemaName });
    
    if (schemaError) {
      console.error('Create schema error:', schemaError);
      // 回滚租户创建
      await (supabase as any)
        .from('tenants')
        .delete()
        .eq('id', tenant.id);
      
      return NextResponse.json(
        { success: false, error: '创建数据库失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        subdomain: tenant.subdomain,
        store_url: `https://proclaw.cc/shop/${tenant.subdomain}`,
        schema_name: schemaName,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 检查子域名是否可用
 * GET /api/tenant/register?subdomain=xxx
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get('subdomain');
  
  if (!subdomain) {
    return NextResponse.json(
      { success: false, error: '缺少 subdomain 参数' },
      { status: 400 }
    );
  }
  
  if (!isValidSubdomain(subdomain)) {
    return NextResponse.json({
      success: true,
      data: {
        available: false,
        reason: '子域名格式不正确',
      },
    });
  }
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: existing } = await (supabase as any)
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain.toLowerCase())
    .single();
  
  return NextResponse.json({
    success: true,
    data: {
      available: !existing,
      subdomain: subdomain.toLowerCase(),
    },
  });
}
