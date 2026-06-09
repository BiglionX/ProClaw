// ProClaw Shop - 健康检查 API
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let overallStatus = 'healthy';

  // 检查 Supabase 连接
  try {
    const start = Date.now();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('token_balances').select('balance').limit(1);
    checks.supabase = {
      status: error ? 'degraded' : 'healthy',
      latency: Date.now() - start,
      error: error?.message,
    };
    if (error) overallStatus = 'degraded';
  } catch (err) {
    checks.supabase = {
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Connection failed',
    };
    overallStatus = 'unhealthy';
  }

  // 检查存储
  try {
    const start = Date.now();
    const supabase = await createServerSupabaseClient();
    await supabase.storage.listBuckets();
    checks.storage = {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (err) {
    checks.storage = {
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Storage check failed',
    };
    overallStatus = 'unhealthy';
  }

  return NextResponse.json({
    status: overallStatus,
    service: 'ProClaw Cloud API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    region: process.env.VERCEL_REGION || 'unknown',
    checks,
  });
}
