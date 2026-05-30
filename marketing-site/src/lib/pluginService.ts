// 行业插件服务 (营销网站 Vite)
// 封装 Supabase 插件相关操作

import { supabase } from './supabase';
import type {
  IndustryPlugin,
  IndustryPluginManifest,
  PluginVersion,
  PluginStatus,
  PluginReview,
  PluginRatingSummary,
  PluginStats,
} from '../types';

/**
 * 获取插件统计数据
 */
export async function getPluginStats(pluginId: string): Promise<PluginStats | null> {
  try {
    const { data, error } = await supabase
      .from('industry_plugins')
      .select('id, downloads, active_installs')
      .eq('id', pluginId)
      .single();
    if (error) throw error;

    // 获取评分统计
    const { data: ratingData } = await supabase
      .from('plugin_reviews')
      .select('rating', { count: 'exact' })
      .eq('plugin_id', pluginId);

    const reviews = (ratingData || []).length;
    const avg = ratingData && ratingData.length > 0
      ? ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length
      : 0;

    return {
      plugin_id: data.id,
      total_downloads: data.downloads || 0,
      active_installs: data.active_installs || 0,
      total_reviews: reviews,
      average_rating: Math.round(avg * 10) / 10,
      recent_downloads_30d: 0,
    };
  } catch (error) {
    console.error(`获取插件 ${pluginId} 统计数据失败:`, error);
    return null;
  }
}

// ==========================================================
// 社区评分/评价系统
// ==========================================================

/**
 * 获取插件评价列表
 */
export async function getPluginReviews(
  pluginId: string,
  limit = 20
): Promise<PluginReview[]> {
  try {
    const { data, error } = await supabase
      .from('plugin_reviews')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('plugin_id', pluginId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      user_name: r.profiles?.full_name,
      user_avatar: r.profiles?.avatar_url,
    }));
  } catch (error) {
    console.error(`获取插件 ${pluginId} 评价失败:`, error);
    return [];
  }
}

/**
 * 获取插件评分汇总
 */
export async function getPluginRatingSummary(
  pluginId: string
): Promise<PluginRatingSummary> {
  try {
    const { data, error } = await supabase
      .from('plugin_reviews')
      .select('rating')
      .eq('plugin_id', pluginId);

    if (error) throw error;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of data || []) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    const count = (data || []).length;
    const average = count > 0
      ? Math.round((data!.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return {
      plugin_id: pluginId,
      average,
      count,
      distribution,
    };
  } catch (error) {
    console.error(`获取插件 ${pluginId} 评分汇总失败:`, error);
    return { plugin_id: pluginId, average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
}

/**
 * 提交插件评价
 */
export async function submitPluginReview(review: {
  plugin_id: string;
  user_id: string;
  rating: number;
  title?: string;
  content?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查是否已评价
    const { data: existing } = await supabase
      .from('plugin_reviews')
      .select('id')
      .eq('plugin_id', review.plugin_id)
      .eq('user_id', review.user_id)
      .single();

    if (existing) {
      // 更新已有评价
      const { error: updateError } = await supabase
        .from('plugin_reviews')
        .update({
          rating: review.rating,
          title: review.title || null,
          content: review.content || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      // 创建新评价
      const { error: insertError } = await supabase
        .from('plugin_reviews')
        .insert({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          plugin_id: review.plugin_id,
          user_id: review.user_id,
          rating: review.rating,
          title: review.title || null,
          content: review.content || null,
          is_verified: false,
        });
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('提交插件评价失败:', error);
    return { success: false, error: error.message || '提交评价失败' };
  }
}

// ==========================================================
// 第三方插件提交审核
// ==========================================================

/**
 * 第三方开发者提交插件审核
 */
export async function submitThirdPartyPlugin(data: {
  manifest: IndustryPluginManifest;
  package_url: string;
  package_hash?: string;
  developer_email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 先创建草稿插件
    const createResult = await createPlugin({
      id: data.manifest.id,
      name: data.manifest.name,
      version: data.manifest.version,
      manifest_json: JSON.stringify(data.manifest),
      icon: data.manifest.icon,
      description: data.manifest.description,
      min_app_version: data.manifest.compatibleAppVersion,
    });

    if (!createResult.success) {
      return createResult;
    }

    // 创建初始版本
    const versionId = `${data.manifest.id}-v${data.manifest.version}-${Date.now()}`;
    await createPluginVersion({
      id: versionId,
      plugin_id: data.manifest.id,
      version: data.manifest.version,
      package_url: data.package_url,
      package_hash: data.package_hash || '',
      package_size: 0,
      min_app_version: data.manifest.compatibleAppVersion,
    });

    return { success: true };
  } catch (error: any) {
    console.error('提交第三方插件失败:', error);
    return { success: false, error: error.message || '提交失败' };
  }
}


// ==========================================================
// 插件列表与查询
// ==========================================================

/**
 * 获取已发布的插件列表（公开）
 */
export async function getPublishedPlugins(): Promise<IndustryPlugin[]> {
  try {
    const { data, error } = await supabase
      .from('industry_plugins')
      .select('*')
      .eq('status', 'published')
      .order('downloads', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取已发布插件列表失败:', error);
    return [];
  }
}

/**
 * 获取指定插件详情
 */
export async function getPluginById(id: string): Promise<IndustryPlugin | null> {
  try {
    const { data, error } = await supabase
      .from('industry_plugins')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`获取插件 ${id} 失败:`, error);
    return null;
  }
}

/**
 * 获取所有插件（Admin 用，含所有状态）
 */
export async function getAllPlugins(): Promise<IndustryPlugin[]> {
  try {
    const { data, error } = await supabase
      .from('industry_plugins')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取全部插件列表失败:', error);
    return [];
  }
}

/**
 * 解析 manifest_json 字段为对象
 */
export function parseManifest(plugin: IndustryPlugin): IndustryPluginManifest | null {
  try {
    return JSON.parse(plugin.manifest_json) as IndustryPluginManifest;
  } catch {
    return null;
  }
}

// ==========================================================
// 插件版本管理
// ==========================================================

/**
 * 获取指定插件的版本历史
 */
export async function getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
  try {
    const { data, error } = await supabase
      .from('plugin_versions')
      .select('*')
      .eq('plugin_id', pluginId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`获取插件 ${pluginId} 版本历史失败:`, error);
    return [];
  }
}

// ==========================================================
// 插件 CRUD（Admin 用）
// ==========================================================

/**
 * 创建新插件
 */
export async function createPlugin(plugin: {
  id: string;
  name: string;
  version: string;
  manifest_json: string;
  icon?: string;
  description?: string;
  min_app_version?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('industry_plugins').insert({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      status: 'draft',
      manifest_json: plugin.manifest_json,
      icon: plugin.icon || null,
      description: plugin.description || null,
      min_app_version: plugin.min_app_version || null,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('创建插件失败:', error);
    return { success: false, error: error.message || '创建失败' };
  }
}

/**
 * 更新插件信息
 */
export async function updatePlugin(
  id: string,
  updates: Partial<{
    name: string;
    version: string;
    status: PluginStatus;
    manifest_json: string;
    package_url: string;
    package_hash: string;
    package_size: number;
    icon: string;
    description: string;
    min_app_version: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('industry_plugins')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.status === 'published' ? { published_at: new Date().toISOString() } : {}),
      })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error(`更新插件 ${id} 失败:`, error);
    return { success: false, error: error.message || '更新失败' };
  }
}

/**
 * 删除插件（软删除，标记为 deprecated）
 */
export async function deprecatePlugin(id: string): Promise<{ success: boolean; error?: string }> {
  return updatePlugin(id, { status: 'deprecated' });
}

/**
 * 发布插件
 */
export async function publishPlugin(id: string): Promise<{ success: boolean; error?: string }> {
  return updatePlugin(id, { status: 'published' });
}

/**
 * 下架插件
 */
export async function unpublishPlugin(id: string): Promise<{ success: boolean; error?: string }> {
  return updatePlugin(id, { status: 'draft' });
}

// ==========================================================
// 版本发布管理
// ==========================================================

/**
 * 创建新版本发布记录
 */
export async function createPluginVersion(version: {
  id: string;
  plugin_id: string;
  version: string;
  changelog?: string;
  package_url: string;
  package_hash: string;
  package_size: number;
  min_app_version?: string;
  is_force_update?: boolean;
  rollout_percentage?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('plugin_versions').insert({
      id: version.id,
      plugin_id: version.plugin_id,
      version: version.version,
      changelog: version.changelog || null,
      package_url: version.package_url,
      package_hash: version.package_hash,
      package_size: version.package_size,
      min_app_version: version.min_app_version || null,
      is_force_update: version.is_force_update ?? false,
      rollout_percentage: version.rollout_percentage ?? 100,
    });
    if (error) throw error;

    // 同时更新 industry_plugins 的当前版本
    await supabase
      .from('industry_plugins')
      .update({
        version: version.version,
        package_url: version.package_url,
        package_hash: version.package_hash,
        package_size: version.package_size,
        min_app_version: version.min_app_version || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', version.plugin_id);

    return { success: true };
  } catch (error: any) {
    console.error('创建插件版本失败:', error);
    return { success: false, error: error.message || '创建版本失败' };
  }
}

// ==========================================================
// 下载统计
// ==========================================================

/**
 * 获取匿名安装 ID（localStorage 持久化）
 */
function getInstallId(): string {
  const key = 'proclaw-install-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * 记录插件下载事件
 */
export async function recordPluginDownload(
  pluginId: string,
  appVersion?: string,
  os?: string
): Promise<void> {
  try {
    const installId = getInstallId();
    await supabase.from('plugin_installs').insert({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      plugin_id: pluginId,
      app_version: appVersion || null,
      os: os || null,
      install_id: installId,
      action: 'install',
    });

    // 增加总下载量
    await supabase.rpc('increment_plugin_downloads', { p_plugin_id: pluginId });
  } catch (error) {
    console.error('记录插件下载失败:', error);
  }
}

// ==========================================================
// 统计查询（Admin 用）
// ==========================================================

/**
 * 获取插件下载趋势（过去 N 天）
 */
export async function getPluginDownloadTrend(days = 30): Promise<
  { date: string; plugin_id: string; count: number }[]
> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('plugin_installs')
      .select('plugin_id, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 按日期聚合
    const agg: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
      const date = row.created_at?.slice(0, 10) || 'unknown';
      if (!agg[date]) agg[date] = {};
      agg[date][row.plugin_id] = (agg[date][row.plugin_id] || 0) + 1;
    }

    const result: { date: string; plugin_id: string; count: number }[] = [];
    for (const [date, plugins] of Object.entries(agg)) {
      for (const [plugin_id, count] of Object.entries(plugins)) {
        result.push({ date, plugin_id, count });
      }
    }

    return result;
  } catch (error) {
    console.error('获取插件下载趋势失败:', error);
    return [];
  }
}

/**
 * 获取活跃行业分布
 */
export async function getActiveIndustryDistribution(): Promise<
  { plugin_id: string; name: string; installs: number }[]
> {
  try {
    const { data: plugins, error } = await supabase
      .from('industry_plugins')
      .select('id, name, active_installs');

    if (error) throw error;
    return (plugins || []).map((p) => ({
      plugin_id: p.id,
      name: p.name,
      installs: p.active_installs || 0,
    }));
  } catch (error) {
    console.error('获取行业分布失败:', error);
    return [];
  }
}

/**
 * 获取最近发布的插件动态
 */
export async function getRecentPluginReleases(limit = 5): Promise<IndustryPlugin[]> {
  try {
    const { data, error } = await supabase
      .from('industry_plugins')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取最近插件发布失败:', error);
    return [];
  }
}
