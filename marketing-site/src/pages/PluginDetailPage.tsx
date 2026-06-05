import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RouteSEO from '../components/RouteSEO';
import {
  getPluginById,
  getPluginVersions,
  getPluginRatingSummary,
  getPluginReviews,
  parseManifest,
  recordPluginDownload,
} from '../lib/pluginService';
import type { IndustryPlugin, PluginVersion, PluginRatingSummary, PluginReview, IndustryPluginManifest } from '../types';

const INDUSTRY_ICONS: Record<string, string> = {
  retail: '🛍️', inventory: '📦', virtual_company: '🏢',
  catering: '🍽️', beauty: '💇', pet: '🐾', 'cloud-proclaw': '☁️',
};

const INDUSTRY_COLORS: Record<string, string> = {
  retail: '#e74c3c', inventory: '#111827', virtual_company: '#7c3aed',
  catering: '#e74c3c', beauty: '#ec4899', pet: '#f59e0b', 'cloud-proclaw': '#0ea5e9',
};

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  low: '低风险', medium: '中风险', high: '高风险',
};

interface PluginDetailData {
  plugin: IndustryPlugin;
  manifest: IndustryPluginManifest | null;
  versions: PluginVersion[];
  rating: PluginRatingSummary | null;
  reviews: PluginReview[];
}

/** 权限中文描述映射 */
const PERMISSION_DESCRIPTIONS: Record<string, { label: string; risk: string }> = {
  'database:create_table': { label: '创建数据库表', risk: 'medium' },
  'database:read:*': { label: '读取所有数据', risk: 'high' },
  'database:write:*': { label: '写入所有数据', risk: 'high' },
  'menu:add': { label: '添加导航菜单', risk: 'low' },
  'printer:write': { label: '打印', risk: 'medium' },
  'notification:send': { label: '发送通知', risk: 'low' },
  'filesystem:read': { label: '读取文件系统', risk: 'high' },
  'filesystem:write': { label: '写入文件系统', risk: 'high' },
  'network:http': { label: 'HTTP 网络请求', risk: 'medium' },
};

export default function PluginDetailPage() {
  const { pluginId } = useParams<{ pluginId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PluginDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'versions' | 'reviews'>('overview');

  useEffect(() => {
    async function load() {
      if (!pluginId) return;
      setLoading(true);
      try {
        const plugin = await getPluginById(pluginId);
        if (!plugin) {
          setLoading(false);
          return;
        }
        const [versions, rating, reviews] = await Promise.all([
          getPluginVersions(pluginId),
          getPluginRatingSummary(pluginId),
          getPluginReviews(pluginId, 10),
        ]);
        const manifest = parseManifest(plugin);
        setData({ plugin, manifest, versions, rating, reviews });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pluginId]);

  const handleInstall = async () => {
    if (!data) return;
    const installUrl = `proclaw://install-plugin?id=${data.plugin.id}&version=${data.plugin.version}`;

    // 尝试通过 deep link 唤起桌面端
    try {
      window.location.href = installUrl;
      // 记录下载
      await recordPluginDownload(data.plugin.id);
    } catch {
      // 如果 deep link 失败，引导用户到下载页面先安装桌面端
      navigate('/download');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🔌</div>
          <p className="text-gray-400">加载插件详情...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg text-gray-500">插件未找到</p>
          <button onClick={() => navigate('/plugins')} className="mt-4 text-blue-600 hover:underline">
            返回插件商店
          </button>
        </div>
      </div>
    );
  }

  const { plugin, manifest, versions, rating, reviews } = data;
  const icon = plugin.icon || INDUSTRY_ICONS[plugin.id] || '🔌';
  const color = INDUSTRY_COLORS[plugin.id] || '#6b7280';
  const permissions = manifest?.permissions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <RouteSEO
        routeKey="pluginDetail"
        customUrl={`https://proclaw.cc/plugins/${plugin.id}`}
      />

      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/plugins')}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← 返回插件商店
          </button>
        </div>
      </div>

      {/* 插件头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-6">
            {/* 图标 */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              {icon}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">{plugin.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <span className="font-mono">{plugin.id}</span>
                <span>·</span>
                <span>v{plugin.version}</span>
                {rating && rating.count > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500">
                      {'★'.repeat(Math.floor(rating.average))}{'☆'.repeat(5 - Math.floor(rating.average))}
                      {' '}{rating.average.toFixed(1)} ({rating.count} 评价)
                    </span>
                  </>
                )}
                <span>·</span>
                <span>⬇️ {plugin.downloads} 下载</span>
              </div>
              <p className="mt-3 text-gray-600 leading-relaxed">{plugin.description}</p>

              {/* Manifest tags */}
              {manifest?.tags && manifest.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {manifest.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 安装按钮 */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleInstall}
                  className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
                >
                  安装插件
                </button>
                <span className="text-xs text-gray-400">
                  安装后将同时激活关联的 AI 经营团队
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-6">
            {(['overview', 'permissions', 'versions', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 pt-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'permissions' && `权限 (${permissions.length})`}
                {tab === 'versions' && `版本历史 (${versions.length})`}
                {tab === 'reviews' && `评价 (${rating?.count || 0})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 概览 Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 功能模块 */}
            {manifest && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">功能模块</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manifest.features.modules.map((mod) => (
                    <div key={mod} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                          📦
                        </div>
                        <span className="font-medium text-gray-900">{mod}</span>
                      </div>
                    </div>
                  ))}
                  {manifest.features.dashboards.map((dash) => (
                    <div key={dash} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                          📊
                        </div>
                        <span className="font-medium text-gray-900">{dash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 导航项 */}
            {manifest && manifest.navigation.add.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">新增导航</h2>
                <div className="flex flex-wrap gap-3">
                  {manifest.navigation.add.map((item) => (
                    <div key={item.path} className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex items-center gap-2 text-sm">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.text}</span>
                      <span className="text-gray-400 ml-1">{item.path}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* 权限 Tab */}
        {activeTab === 'permissions' && (
          <div>
            <p className="text-sm text-gray-500 mb-6">
              以下权限将在安装时向您展示。高风险权限表示插件可访问您的本地数据，请谨慎确认。
            </p>
            {permissions.length === 0 ? (
              <p className="text-gray-400 text-sm">该插件未声明任何权限</p>
            ) : (
              <div className="space-y-3">
                {permissions.map((perm) => {
                  const desc = PERMISSION_DESCRIPTIONS[perm] || { label: perm, risk: 'medium' };
                  return (
                    <div key={perm} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{desc.label}</span>
                        <span className="text-gray-400 text-sm ml-3 font-mono">{perm}</span>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${RISK_COLORS[desc.risk] || '#f59e0b'}15`,
                          color: RISK_COLORS[desc.risk] || '#f59e0b',
                        }}
                      >
                        {RISK_LABELS[desc.risk] || '中风险'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 版本历史 Tab */}
        {activeTab === 'versions' && (
          <div>
            {versions.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无版本历史</p>
            ) : (
              <div className="space-y-4">
                {versions.map((v) => (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-gray-900">v{v.version}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(v.created_at).toLocaleDateString('zh-CN')}
                        </span>
                        {v.is_force_update && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-xs font-medium">
                            强制更新
                          </span>
                        )}
                      </div>
                      {v.rollout_percentage < 100 && (
                        <span className="text-xs text-gray-400">
                          灰度 {v.rollout_percentage}%
                        </span>
                      )}
                    </div>
                    {v.changelog && (
                      <p className="mt-2 text-sm text-gray-600">{v.changelog}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      最低版本要求: {v.min_app_version || '无'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 评价 Tab */}
        {activeTab === 'reviews' && (
          <div>
            {/* 评分概览 */}
            {rating && rating.count > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900">{rating.average.toFixed(1)}</div>
                    <div className="text-amber-500 text-sm mt-1">
                      {'★'.repeat(Math.floor(rating.average))}{'☆'.repeat(5 - Math.floor(rating.average))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{rating.count} 条评价</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = rating.distribution[star] || 0;
                      const pct = rating.count > 0 ? (count / rating.count) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 w-8">{star} 星</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-gray-400 w-6 text-xs">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 评价列表 */}
            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无评价</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                          {review.user_name?.charAt(0) || '?'}
                        </span>
                        <span className="font-medium text-gray-900">{review.user_name || '匿名用户'}</span>
                      </div>
                      <span className="text-amber-500 text-sm">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                    {review.title && (
                      <h4 className="mt-2 font-medium text-gray-800">{review.title}</h4>
                    )}
                    {review.content && (
                      <p className="mt-1 text-sm text-gray-600">{review.content}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
