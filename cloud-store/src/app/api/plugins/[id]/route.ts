// ProClaw Cloud - 单个插件详情 API
// GET /api/plugins/[id] - 返回指定插件的详细信息（含版本历史）
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 开发阶段：返回模拟数据
    const mockPluginDetail: Record<string, unknown> = {
      catering: {
        id: 'catering',
        name: '餐饮行业版',
        current_version: '1.2.0',
        status: 'published',
        description: '面向餐饮行业的智能经营方案',
        icon: '🍽️',
        min_app_version: '>=1.0.0',
        downloads: 1234,
        features: {
          modules: ['pos', 'kitchen-display', 'table-management', 'scan-order', 'reservation'],
          dashboards: ['catering-dashboard'],
          reports: ['catering-report'],
        },
        versions: [
          { version: '1.2.0', changelog: '新增扫码点餐功能，优化后厨打印性能', published_at: '2026-05-20' },
          { version: '1.1.0', changelog: '新增桌台管理模块', published_at: '2026-05-01' },
          { version: '1.0.0', changelog: '首个餐饮行业版发布', published_at: '2026-04-15' },
        ],
        published_at: '2026-05-15T00:00:00Z',
      },
      retail: {
        id: 'retail',
        name: '零售行业版',
        current_version: '1.1.0',
        status: 'published',
        description: '服装、日用等零售行业的进销存管理',
        icon: '🛍️',
        min_app_version: '>=1.0.0',
        downloads: 856,
        features: {
          modules: ['pos', 'membership', 'multi-store-sync', 'mini-program'],
          dashboards: ['retail-dashboard'],
          reports: ['retail-report'],
        },
        versions: [
          { version: '1.1.0', changelog: '新增多店库存同步功能', published_at: '2026-05-10' },
          { version: '1.0.0', changelog: '首个零售行业版发布', published_at: '2026-04-20' },
        ],
        published_at: '2026-05-10T00:00:00Z',
      },
    };

    const plugin = mockPluginDetail[id];
    if (!plugin) {
      return NextResponse.json(
        { success: false, error: `Plugin '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plugin });
  } catch (error) {
    console.error(`Failed to fetch plugin '${id}':`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plugin details' },
      { status: 500 }
    );
  }
}
