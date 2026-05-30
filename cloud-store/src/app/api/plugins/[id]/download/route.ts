// ProClaw Cloud - 插件包下载 API
// GET /api/plugins/[id]/download - 下载插件包，记录下载统计
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 记录下载统计（开发阶段跳过）
    // TODO: 生产环境接入 Supabase
    // const supabase = await createServerSupabaseClient();
    // await supabase.from('plugin_installs').insert({
    //   id: crypto.randomUUID(),
    //   plugin_id: id,
    //   action: 'download',
    //   created_at: new Date().toISOString(),
    // });
    // await supabase.rpc('increment_plugin_downloads', { plugin_id: id });

    console.log(`[Plugin Download] Plugin '${id}' downloaded at ${new Date().toISOString()}`);

    // 开发阶段：返回模拟下载 URL
    // 生产环境应从 Supabase Storage 或 CDN 返回文件流
    return NextResponse.json({
      success: true,
      data: {
        plugin_id: id,
        download_url: `https://plugins.proclaw.com/${id}/latest.proclaw-industry-plugin`,
        version: 'latest',
        size_bytes: 0,
        hash: '',
      },
      message: `Download URL for '${id}' (mock - replace with actual CDN URL in production)`,
    });
  } catch (error) {
    console.error(`Failed to process download for '${id}':`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
