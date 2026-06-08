// ProClaw Shop - AI 生成主题 API
// 使用 DeepSeek 生成商城主题配置

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';
import { TokenCalculator, TokenActions } from '@/lib/token-calculator';

export const dynamic = 'force-dynamic';

interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout: 'card' | 'list' | 'grid';
  style: 'modern' | 'classic' | 'minimal';
  font_family: string;
  border_radius: 'none' | 'small' | 'medium' | 'large';
  product_display: 'image_focus' | 'info_focus' | 'balanced';
  banner_style: 'carousel' | 'grid' | 'fullwidth';
}

const DEFAULT_THEME: ThemeConfig = {
  primary_color: '#3B82F6',
  secondary_color: '#60A5FA',
  accent_color: '#F59E0B',
  layout: 'grid',
  style: 'modern',
  font_family: 'Inter, system-ui, sans-serif',
  border_radius: 'medium',
  product_display: 'balanced',
  banner_style: 'carousel',
};

/**
 * 生成主题
 * POST /api/ai/theme
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_type, style_preference } = body;
    
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }
    
    // 扣 Token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const tokenCalc = new TokenCalculator(supabaseUrl, supabaseKey);
    const consumeResult = await tokenCalc.consume({
      tenant_id: tenantContext.tenantId!,
      action: TokenActions.AI_THEME,
      quantity: 1,
    });
    
    if (!consumeResult.success) {
      return NextResponse.json(
        { success: false, error: consumeResult.error || 'Token 不足' },
        { status: 402 }
      );
    }
    
    // 生成主题配置
    const theme = generateTheme(business_type, style_preference);
    
    // 保存主题配置到租户
    const response = NextResponse.next();
    const supabase = createRouteSupabaseClient(request, response);
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (supabase as any)
      .from('tenants')
      .update({ theme_config: theme })
      .eq('id', tenantContext.tenantId);
    
    return NextResponse.json({
      success: true,
      data: {
        theme,
        tokens_consumed: consumeResult.tokens_consumed,
      },
    });
  } catch (error) {
    console.error('Theme generation error:', error);
    return NextResponse.json(
      { success: false, error: '主题生成失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取当前主题
 * GET /api/ai/theme
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    
    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }
    
    const response = NextResponse.next();
    const supabase = createRouteSupabaseClient(request, response);
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: tenant } = await (supabase as any)
      .from('tenants')
      .select('theme_config')
      .eq('id', tenantContext.tenantId)
      .single();
    
    return NextResponse.json({
      success: true,
      data: {
        theme: tenant?.theme_config || DEFAULT_THEME,
      },
    });
  } catch (error) {
    console.error('Get theme error:', error);
    return NextResponse.json(
      { success: false, error: '获取主题失败' },
      { status: 500 }
    );
  }
}

function generateTheme(businessType?: string, stylePreference?: string): ThemeConfig {
  // 根据业务类型生成配色
  const colorSchemes: Record<string, { primary: string; secondary: string; accent: string }> = {
    fashion: { primary: '#EC4899', secondary: '#F472B6', accent: '#FBBF24' },
    electronics: { primary: '#2563EB', secondary: '#3B82F6', accent: '#10B981' },
    food: { primary: '#F97316', secondary: '#FB923C', accent: '#EF4444' },
    beauty: { primary: '#DB2777', secondary: '#EC4899', accent: '#FCD34D' },
    default: { primary: '#3B82F6', secondary: '#60A5FA', accent: '#F59E0B' },
  };
  
  const scheme = businessType
    ? colorSchemes[businessType.toLowerCase()] || colorSchemes.default
    : colorSchemes.default;
  
  return {
    ...DEFAULT_THEME,
    primary_color: scheme.primary,
    secondary_color: scheme.secondary,
    accent_color: scheme.accent,
    style: (stylePreference as ThemeConfig['style']) || 'modern',
  };
}
