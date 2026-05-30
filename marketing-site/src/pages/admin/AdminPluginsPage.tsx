import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllPlugins,
  createPlugin,
  updatePlugin,
  deprecatePlugin,
  publishPlugin,
  unpublishPlugin,
  getPluginVersions,
  createPluginVersion,
  parseManifest,
} from '../../lib/pluginService';
import type { IndustryPlugin, PluginStatus, IndustryPluginManifest } from '../../types';

interface PluginFormData {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  min_app_version: string;
  features_modules: string;
  features_dashboards: string;
  features_reports: string;
  nav_add: string;
  nav_remove: string;
}

interface VersionFormData {
  version: string;
  changelog: string;
  package_url: string;
  package_hash: string;
  package_size: number;
  min_app_version: string;
  is_force_update: boolean;
  rollout_percentage: number;
}

const initialPluginForm: PluginFormData = {
  id: '',
  name: '',
  version: '1.0.0',
  description: '',
  icon: '',
  min_app_version: '1.0.0',
  features_modules: '',
  features_dashboards: '',
  features_reports: '',
  nav_add: '[]',
  nav_remove: '',
};

const initialVersionForm: VersionFormData = {
  version: '',
  changelog: '',
  package_url: '',
  package_hash: '',
  package_size: 0,
  min_app_version: '1.0.0',
  is_force_update: false,
  rollout_percentage: 100,
};

const STATUS_CHIP_COLORS: Record<PluginStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  deprecated: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<PluginStatus, string> = {
  draft: '草稿',
  review: '审核中',
  published: '已发布',
  deprecated: '已废弃',
};

export default function AdminPluginsPage() {
  const navigate = useNavigate();
  const [plugins, setPlugins] = useState<IndustryPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PluginStatus | 'all'>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<IndustryPlugin | null>(null);
  const [showPluginDialog, setShowPluginDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [showManifestDialog, setShowManifestDialog] = useState(false);
  const [manifestPreview, setManifestPreview] = useState<string>('');
  const [pluginForm, setPluginForm] = useState<PluginFormData>(initialPluginForm);
  const [versionForm, setVersionForm] = useState<VersionFormData>(initialVersionForm);
  const [versions, setVersions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    const data = await getAllPlugins();
    setPlugins(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- 插件编辑 ---

  const openNewPlugin = () => {
    setSelectedPlugin(null);
    setPluginForm(initialPluginForm);
    setShowPluginDialog(true);
  };

  const openEditPlugin = async (plugin: IndustryPlugin) => {
    setSelectedPlugin(plugin);
    const manifest = parseManifest(plugin);
    setPluginForm({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      icon: plugin.icon || '',
      min_app_version: plugin.min_app_version || '',
      features_modules: manifest?.features.modules.join(', ') || '',
      features_dashboards: manifest?.features.dashboards.join(', ') || '',
      features_reports: manifest?.features.reports.join(', ') || '',
      nav_add: JSON.stringify(manifest?.navigation.add || [], null, 2),
      nav_remove: manifest?.navigation.remove.join(', ') || '',
    });
    setShowPluginDialog(true);
  };

  const buildManifest = (form: PluginFormData): IndustryPluginManifest => {
    let navAdd: any[] = [];
    try { navAdd = JSON.parse(form.nav_add || '[]'); } catch { navAdd = []; }
    return {
      id: form.id,
      name: form.name,
      version: form.version,
      description: form.description,
      icon: form.icon,
      compatibleAppVersion: form.min_app_version || '1.0.0',
      features: {
        modules: form.features_modules.split(',').map(s => s.trim()).filter(Boolean),
        dashboards: form.features_dashboards.split(',').map(s => s.trim()).filter(Boolean),
        reports: form.features_reports.split(',').map(s => s.trim()).filter(Boolean),
      },
      navigation: {
        add: navAdd,
        remove: form.nav_remove.split(',').map(s => s.trim()).filter(Boolean),
      },
      ui: {},
      assets: { path: '', files: [] },
    };
  };

  const handleSavePlugin = async () => {
    if (!pluginForm.id.trim() || !pluginForm.name.trim()) {
      showMessage('error', '插件 ID 和名称不能为空');
      return;
    }

    setSaving(true);
    const manifest = buildManifest(pluginForm);
    const manifestStr = JSON.stringify(manifest, null, 2);

    if (selectedPlugin) {
      // 更新现有插件
      const result = await updatePlugin(selectedPlugin.id, {
        name: pluginForm.name,
        version: pluginForm.version,
        manifest_json: manifestStr,
        icon: pluginForm.icon || undefined,
        description: pluginForm.description || undefined,
        min_app_version: pluginForm.min_app_version || undefined,
      });
      if (result.success) {
        showMessage('success', '插件更新成功');
        setShowPluginDialog(false);
        loadPlugins();
      } else {
        showMessage('error', result.error || '更新失败');
      }
    } else {
      // 创建新插件
      const result = await createPlugin({
        id: pluginForm.id,
        name: pluginForm.name,
        version: pluginForm.version,
        manifest_json: manifestStr,
        icon: pluginForm.icon || undefined,
        description: pluginForm.description || undefined,
        min_app_version: pluginForm.min_app_version || undefined,
      });
      if (result.success) {
        showMessage('success', '插件创建成功');
        setShowPluginDialog(false);
        loadPlugins();
      } else {
        showMessage('error', result.error || '创建失败');
      }
    }
    setSaving(false);
  };

  const handlePublish = async (plugin: IndustryPlugin) => {
    if (!window.confirm(`确认发布插件「${plugin.name}」？`)) return;
    const result = await publishPlugin(plugin.id);
    if (result.success) {
      showMessage('success', '插件已发布');
      loadPlugins();
    } else {
      showMessage('error', result.error || '发布失败');
    }
  };

  const handleUnpublish = async (plugin: IndustryPlugin) => {
    if (!window.confirm(`确认下架插件「${plugin.name}」？`)) return;
    const result = await unpublishPlugin(plugin.id);
    if (result.success) {
      showMessage('success', '插件已下架');
      loadPlugins();
    } else {
      showMessage('error', result.error || '下架失败');
    }
  };

  const handleDeprecate = async (plugin: IndustryPlugin) => {
    if (!window.confirm(`确认废弃插件「${plugin.name}」？此操作不可逆。`)) return;
    const result = await deprecatePlugin(plugin.id);
    if (result.success) {
      showMessage('success', '插件已废弃');
      loadPlugins();
    } else {
      showMessage('error', result.error || '废弃失败');
    }
  };

  const previewManifest = (plugin: IndustryPlugin) => {
    try {
      const parsed = JSON.parse(plugin.manifest_json);
      setManifestPreview(JSON.stringify(parsed, null, 2));
    } catch {
      setManifestPreview(plugin.manifest_json);
    }
    setShowManifestDialog(true);
  };

  // --- 版本管理 ---

  const openVersionDialog = async (plugin: IndustryPlugin) => {
    setSelectedPlugin(plugin);
    setVersionForm({
      ...initialVersionForm,
      version: plugin.version,
      min_app_version: plugin.min_app_version || '1.0.0',
    });
    const v = await getPluginVersions(plugin.id);
    setVersions(v);
    setShowVersionDialog(true);
  };

  const handleSaveVersion = async () => {
    if (!versionForm.version.trim() || !versionForm.package_url.trim()) {
      showMessage('error', '版本号和包下载地址不能为空');
      return;
    }
    if (!selectedPlugin) return;

    setSaving(true);
    const vid = `${selectedPlugin.id}-v${versionForm.version}-${Date.now()}`;
    const result = await createPluginVersion({
      id: vid,
      plugin_id: selectedPlugin.id,
      version: versionForm.version,
      changelog: versionForm.changelog || undefined,
      package_url: versionForm.package_url,
      package_hash: versionForm.package_hash,
      package_size: versionForm.package_size,
      min_app_version: versionForm.min_app_version || undefined,
      is_force_update: versionForm.is_force_update,
      rollout_percentage: versionForm.rollout_percentage,
    });
    if (result.success) {
      showMessage('success', '版本发布成功');
      const v = await getPluginVersions(selectedPlugin.id);
      setVersions(v);
      loadPlugins();
    } else {
      showMessage('error', result.error || '版本发布失败');
    }
    setSaving(false);
  };

  // --- 过滤 ---

  const filteredPlugins = plugins.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    }
    return true;
  });

  // --- 渲染 ---

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1"
            >
              &larr; 返回 Admin
            </button>
            <h1 className="text-2xl font-bold text-gray-900">行业插件管理</h1>
          </div>
          <button
            onClick={openNewPlugin}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + 发布新插件
          </button>
        </div>
      </div>

      {/* 提示消息 */}
      {message && (
        <div className={`max-w-7xl mx-auto mt-4 px-6`}>
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* 过滤栏 */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="搜索插件 ID 或名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1">
            {(['all', 'draft', 'review', 'published', 'deprecated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? '全部' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 插件表格 */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="text-center py-16 text-gray-400">加载中...</div>
        ) : filteredPlugins.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {plugins.length === 0 ? '暂无插件数据，点击"+ 发布新插件"开始' : '没有匹配的插件'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">版本</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">下载量</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">活跃安装</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlugins.map((plugin) => (
                  <tr key={plugin.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{plugin.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{plugin.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">v{plugin.version}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_CHIP_COLORS[plugin.status]
                        }`}
                      >
                        {STATUS_LABELS[plugin.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{plugin.downloads}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{plugin.active_installs}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditPlugin(plugin)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          编辑
                        </button>
                        {plugin.status === 'draft' || plugin.status === 'review' ? (
                          <button
                            onClick={() => handlePublish(plugin)}
                            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                          >
                            发布
                          </button>
                        ) : null}
                        {plugin.status === 'published' ? (
                          <button
                            onClick={() => handleUnpublish(plugin)}
                            className="px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-50 rounded"
                          >
                            下架
                          </button>
                        ) : null}
                        <button
                          onClick={() => openVersionDialog(plugin)}
                          className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          版本
                        </button>
                        <button
                          onClick={() => previewManifest(plugin)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Manifest
                        </button>
                        {plugin.status !== 'deprecated' ? (
                          <button
                            onClick={() => handleDeprecate(plugin)}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            废弃
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== 插件编辑对话框 ========== */}
      {showPluginDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPluginDialog(false)}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedPlugin ? `编辑插件 - ${selectedPlugin.name} (${selectedPlugin.id})` : '发布新插件'}
              </h2>
              <button onClick={() => setShowPluginDialog(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">插件 ID</label>
                  <input
                    type="text"
                    value={pluginForm.id}
                    onChange={(e) => setPluginForm({ ...pluginForm, id: e.target.value })}
                    disabled={!!selectedPlugin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="如: catering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={pluginForm.name}
                    onChange={(e) => setPluginForm({ ...pluginForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如: 餐饮行业版"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                  <input
                    type="text"
                    value={pluginForm.version}
                    onChange={(e) => setPluginForm({ ...pluginForm, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低兼容桌面端版本</label>
                  <input
                    type="text"
                    value={pluginForm.min_app_version}
                    onChange={(e) => setPluginForm({ ...pluginForm, min_app_version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={pluginForm.description}
                  onChange={(e) => setPluginForm({ ...pluginForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="面向餐饮行业的经营管理系统..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标 URL</label>
                <input
                  type="text"
                  value={pluginForm.icon}
                  onChange={(e) => setPluginForm({ ...pluginForm, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="图标 URL 或 emoji"
                />
              </div>

              <hr className="border-gray-200" />

              {/* 功能开关 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">功能模块</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['pos', 'kitchen-display', 'reservation', 'scan-order', 'delivery', 'membership', 'inventory', 'reports'].map(
                    (mod) => {
                      const enabled = pluginForm.features_modules.includes(mod);
                      return (
                        <label key={mod} className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => {
                              const list = pluginForm.features_modules
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const updated = enabled
                                ? list.filter((m) => m !== mod)
                                : [...list, mod];
                              setPluginForm({ ...pluginForm, features_modules: updated.join(', ') });
                            }}
                            className="rounded"
                          />
                          {mod}
                        </label>
                      );
                    }
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仪表板组件 (逗号分隔)</label>
                  <input
                    type="text"
                    value={pluginForm.features_dashboards}
                    onChange={(e) => setPluginForm({ ...pluginForm, features_dashboards: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sales-dashboard, inventory-dashboard"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">报表 (逗号分隔)</label>
                  <input
                    type="text"
                    value={pluginForm.features_reports}
                    onChange={(e) => setPluginForm({ ...pluginForm, features_reports: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sales-report, inventory-report"
                  />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* 导航定制 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新增导航项 (JSON)</label>
                <textarea
                  value={pluginForm.nav_add}
                  onChange={(e) => setPluginForm({ ...pluginForm, nav_add: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder='[{"text":"收银台","icon":"point-of-sale","path":"/pos"}]'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">隐藏默认项 (逗号分隔路径)</label>
                <input
                  type="text"
                  value={pluginForm.nav_remove}
                  onChange={(e) => setPluginForm({ ...pluginForm, nav_remove: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/supplychain, /datacenter"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPluginDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSavePlugin}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : selectedPlugin ? '保存修改' : '创建插件'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 版本管理对话框 ========== */}
      {showVersionDialog && selectedPlugin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowVersionDialog(false)}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                版本管理 - {selectedPlugin.name} (v{selectedPlugin.version})
              </h2>
              <button onClick={() => setShowVersionDialog(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">发布新版本</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                  <input
                    type="text"
                    value={versionForm.version}
                    onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.1.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低兼容版本</label>
                  <input
                    type="text"
                    value={versionForm.min_app_version}
                    onChange={(e) => setVersionForm({ ...versionForm, min_app_version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">包下载地址</label>
                <input
                  type="text"
                  value={versionForm.package_url}
                  onChange={(e) => setVersionForm({ ...versionForm, package_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://storage.example.com/plugins/catering-v1.1.plugin"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SHA256</label>
                  <input
                    type="text"
                    value={versionForm.package_hash}
                    onChange={(e) => setVersionForm({ ...versionForm, package_hash: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">大小 (字节)</label>
                  <input
                    type="number"
                    value={versionForm.package_size}
                    onChange={(e) => setVersionForm({ ...versionForm, package_size: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">灰度比例 (%)</label>
                  <input
                    type="number"
                    value={versionForm.rollout_percentage}
                    onChange={(e) => setVersionForm({ ...versionForm, rollout_percentage: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Changelog</label>
                <textarea
                  value={versionForm.changelog}
                  onChange={(e) => setVersionForm({ ...versionForm, changelog: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="修复了...\n新增了...\n优化了..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={versionForm.is_force_update}
                  onChange={(e) => setVersionForm({ ...versionForm, is_force_update: e.target.checked })}
                  className="rounded"
                />
                强制更新（安全修复必须勾选）
              </label>

              <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? '发布中...' : '发布新版本'}
              </button>

              {/* 版本历史 */}
              {versions.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <h3 className="text-sm font-semibold text-gray-700">版本历史</h3>
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">v{v.version}</span>
                          <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>
                        {v.changelog && (
                          <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{v.changelog}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>灰度: {v.rollout_percentage}%</span>
                          <span>{v.is_force_update ? '强制更新' : '可选更新'}</span>
                          <span>{v.package_size ? `${(v.package_size / 1024).toFixed(1)} KB` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== Manifest 预览对话框 ========== */}
      {showManifestDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowManifestDialog(false)}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Manifest 预览</h2>
              <button onClick={() => setShowManifestDialog(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <pre className="px-6 py-4 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {manifestPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
