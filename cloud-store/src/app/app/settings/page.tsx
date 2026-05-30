// ProClaw Cloud 托管版 - 设置页面
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { formatDate } from '@/lib/utils';
import { PRESET_TEMPLATES, ALL_AVAILABLE_TABLES, generateExportFileName, type ExportFormat, type ExportField } from '@/lib/export';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'account' | 'export'>('account');

  // 导出状态
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // 自定义模板状态
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedTables, setSelectedTables] = useState<{ tableName: string; fields: ExportField[] }[]>([]);
  const [selectingTable, setSelectingTable] = useState('');

  const handleExport = async () => {
    if (exporting) return;

    let templateId: string;
    let customTables: { tableName: string; fields: ExportField[] }[] | undefined;
    let name: string;

    if (customMode) {
      if (!customName.trim()) { toast.error('请输入自定义模板名称'); return; }
      if (selectedTables.length === 0) { toast.error('请至少选择一个数据表'); return; }
      templateId = 'custom';
      customTables = selectedTables;
      name = customName.trim();
    } else {
      if (!selectedPreset) { toast.error('请选择一个预设模板'); return; }
      templateId = selectedPreset;
      name = PRESET_TEMPLATES.find(t => t.id === selectedPreset)?.name || '数据';
    }

    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          format: exportFormat,
          customTables,
          customName: customMode ? customName.trim() : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(result.error || 'Token 余额不足');
        } else {
          toast.error(result.error || '导出失败');
        }
        setExporting(false);
        return;
      }

      if (result.success && result.data) {
        // 下载文件
        const blob = new Blob([result.data], {
          type: exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName || generateExportFileName(name, exportFormat);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`导出成功！共 ${result.totalRecords || 0} 条记录`);
      } else {
        toast.error(result.error || '导出失败');
      }
    } catch {
      toast.error('导出请求失败，请检查网络');
    } finally {
      setExporting(false);
    }
  };

  const addTableToCustom = () => {
    if (!selectingTable) return;
    const found = ALL_AVAILABLE_TABLES.find(t => t.tableName === selectingTable);
    if (found && !selectedTables.find(t => t.tableName === selectingTable)) {
      setSelectedTables([...selectedTables, { ...found, fields: [...found.fields] }]);
    }
    setSelectingTable('');
  };

  const removeTableFromCustom = (tableName: string) => {
    setSelectedTables(selectedTables.filter(t => t.tableName !== tableName));
  };

  const toggleFieldInCustom = (tableName: string, key: string) => {
    setSelectedTables(selectedTables.map(t => {
      if (t.tableName !== tableName) return t;
      const exists = t.fields.find(f => f.key === key);
      return {
        ...t,
        fields: exists
          ? t.fields.filter(f => f.key !== key)
          : [...t.fields, ALL_AVAILABLE_TABLES.find(at => at.tableName === tableName)?.fields.find(f => f.key === key)].filter(Boolean) as ExportField[],
      };
    }));
  };

  const sections = [
    { key: 'account' as const, label: '账户信息' },
    { key: 'export' as const, label: '数据导出' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toaster position="top-center" />
      <h1 className="text-2xl font-bold text-gray-900">设置</h1>

      {/* 分段导航 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {sections.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === sec.key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* 账户信息 */}
      {activeSection === 'account' && (
        <>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">账户信息</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">邮箱</span>
                <span className="text-gray-900">{user?.email || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">用户 ID</span>
                <span className="text-gray-900 text-sm">{user?.id || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">注册时间</span>
                <span className="text-gray-900">
                  {user?.created_at ? formatDate(user.created_at, 'long') : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">操作</h2>
            <div className="space-y-3">
              <button
                onClick={logout}
                className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-left"
              >
                退出登录
              </button>
            </div>
          </div>
        </>
      )}

      {/* 数据导出 */}
      {activeSection === 'export' && (
        <div className="space-y-4">
          {/* 模式切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => { setCustomMode(false); setSelectedPreset(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!customMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              预设模板
            </button>
            <button
              onClick={() => { setCustomMode(true); setSelectedPreset(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${customMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              自定义模板
            </button>
          </div>

          {/* 预设模板选择 */}
          {!customMode && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">选择导出模板</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedPreset(tpl.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${selectedPreset === tpl.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{tpl.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{tpl.description}</div>
                    <div className="text-xs text-gray-400 mt-2">{tpl.tables.length} 个数据表</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 自定义模板编辑器 */}
          {customMode && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold">自定义导出模板</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="例如：我的库存报告"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择数据表</label>
                <div className="flex gap-2">
                  <select
                    value={selectingTable}
                    onChange={e => setSelectingTable(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- 请选择数据表 --</option>
                    {ALL_AVAILABLE_TABLES.map(t => (
                      <option key={t.tableName} value={t.tableName}>{t.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={addTableToCustom}
                    disabled={!selectingTable}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* 已选数据表及字段 */}
              {selectedTables.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">尚未选择任何数据表</p>
              ) : (
                <div className="space-y-3">
                  {selectedTables.map(table => {
                    const allFields = ALL_AVAILABLE_TABLES.find(t => t.tableName === table.tableName)?.fields || [];
                    return (
                      <div key={table.tableName} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {ALL_AVAILABLE_TABLES.find(t => t.tableName === table.tableName)?.label || table.tableName}
                          </span>
                          <button
                            onClick={() => removeTableFromCustom(table.tableName)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            移除
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {allFields.map(f => {
                            const selected = table.fields.some(sf => sf.key === f.key);
                            return (
                              <button
                                key={f.key}
                                onClick={() => toggleFieldInCustom(table.tableName, f.key)}
                                className={`text-xs px-2 py-1 rounded-full transition-colors ${selected
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 导出格式 & 操作 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">导出格式:</span>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value as ExportFormat)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">每次导出消耗 100 PT</span>
                <button
                  onClick={handleExport}
                  disabled={exporting || (!customMode && !selectedPreset) || (customMode && selectedTables.length === 0)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? '导出中...' : '导出数据'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
