// ProClaw Cloud 托管版 - 健康检查 API
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ProClaw Cloud API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
