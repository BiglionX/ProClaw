// ProClaw Cloud - 行业插件目录 API
// GET /api/plugins - 返回已发布插件列表
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 尝试使用服务端 Supabase 客户端查询
    // const supabase = await createServerSupabaseClient();
    // const { data, error } = await supabase
    //   .from('industry_plugins')
    //   .select('*')
    //   .eq('status', 'published')
    //   .order('downloads', { ascending: false });

    // 开发阶段：返回模拟数据
    const mockPlugins = [
      {
        id: 'catering',
        name: '餐饮行业版',
        version: '1.2.0',
        status: 'published',
        description: '面向餐饮行业的智能经营方案，含扫码点餐、后厨打印、桌台管理',
        icon: '🍽️',
        downloads: 1234,
        min_app_version: '>=1.0.0',
        published_at: '2026-05-15T00:00:00Z',
      },
      {
        id: 'retail',
        name: '零售行业版',
        version: '1.1.0',
        status: 'published',
        description: '服装、日用等零售行业的进销存管理，含会员管理与多店库存同步',
        icon: '🛍️',
        downloads: 856,
        min_app_version: '>=1.0.0',
        published_at: '2026-05-10T00:00:00Z',
      },
      {
        id: 'beauty',
        name: '美业版',
        version: '0.9.0',
        status: 'review',
        description: '美容美发行业专属，含预约管理、会员储值、服务项目管理',
        icon: '💇',
        downloads: 0,
        min_app_version: '>=1.0.0',
        published_at: null,
      },
      {
        id: 'pet',
        name: '宠物行业版',
        version: '0.1.0',
        status: 'draft',
        description: '宠物店经营方案，含宠物档案、寄养管理、商品销售',
        icon: '🐾',
        downloads: 0,
        min_app_version: '>=1.1.0',
        published_at: null,
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockPlugins,
    });
  } catch (error) {
    console.error('Failed to fetch plugins:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plugins' },
      { status: 500 }
    );
  }
}
