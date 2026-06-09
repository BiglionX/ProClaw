// ProClaw Shop - Token 用量 API
// 获取用户 AI 使用量和消费明细

import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext } from '@/lib/multi-tenant';

export const dynamic = 'force-dynamic';

interface UsageRecord {
  id: string;
  resource_type: string;
  tokens_used: number;
  endpoint: string | null;
  created_at: string;
}

interface UsageStats {
  tokens_used: number;
  created_at: string;
}

/**
 * 获取 Token 用量统计和消费明细
 * GET /api/tenant/usage
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);

  try {
    const tenantContext = await getTenantContext();

    if (!tenantContext.tenantId) {
      return NextResponse.json(
        { success: false, error: '未获取到租户信息' },
        { status: 400 }
      );
    }

    // 获取该租户的所有用户
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantContext.tenantId);

    if (profilesError) {
      console.error('Get profiles error:', profilesError);
    }

    const userIds = profiles?.map((p) => p.id) || [];
    
    // 如果没有用户，返回空数据
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          records: [],
          summary: { today: 0, week: 0, month: 0, total: 0 },
        },
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 获取消费记录（最近50条）
    const { data: records, error: recordsError } = await supabase
      .from('api_usage_logs')
      .select('id, resource_type, tokens_used, endpoint, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recordsError) {
      console.error('Get usage records error:', recordsError);
    }

    // 获取用量统计
    const { data: stats, error: statsError } = await supabase
      .from('api_usage_logs')
      .select('tokens_used, created_at')
      .in('user_id', userIds);

    if (statsError) {
      console.error('Get usage stats error:', statsError);
    }

    // 计算统计
    const allRecords = (stats as UsageStats[]) || [];
    const todayUsage = allRecords
      .filter((r) => new Date(r.created_at) >= new Date(todayStart))
      .reduce((sum, r) => sum + r.tokens_used, 0);
    
    const weekUsage = allRecords
      .filter((r) => new Date(r.created_at) >= new Date(weekStart))
      .reduce((sum, r) => sum + r.tokens_used, 0);
    
    const monthUsage = allRecords
      .filter((r) => new Date(r.created_at) >= new Date(monthStart))
      .reduce((sum, r) => sum + r.tokens_used, 0);
    
    const totalUsage = allRecords.reduce((sum, r) => sum + r.tokens_used, 0);

    return NextResponse.json({
      success: true,
      data: {
        records: (records as UsageRecord[]) || [],
        summary: {
          today: todayUsage,
          week: weekUsage,
          month: monthUsage,
          total: totalUsage,
        },
      },
    });
  } catch (error) {
    console.error('Get token usage error:', error);
    return NextResponse.json(
      { success: false, error: '获取 Token 用量失败' },
      { status: 500 }
    );
  }
}
