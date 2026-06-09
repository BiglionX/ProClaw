// ProClaw Cloud 托管版 - 数据导出页面
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

type ExportFormat = 'json' | 'csv';
type ExportTemplate = 'all' | 'products' | 'sales' | 'purchase' | 'inventory' | 'customers';

const templates = [
  { id: 'all', name: '全量数据', description: '导出所有业务数据（商品、客户、订单等）', icon: '📦' },
  { id: 'products', name: '商品数据', description: '导出商品 SPU 和 SKU 信息', icon: '🏷️' },
  { id: 'sales', name: '销售数据', description: '导出销售订单和销售明细', icon: '📤' },
  { id: 'purchase', name: '采购数据', description: '导出采购订单和采购明细', icon: '📥' },
  { id: 'inventory', name: '库存数据', description: '导出当前库存状况和交易记录', icon: '📊' },
  { id: 'customers', name: '客户数据', description: '导出客户信息和联系方式', icon: '👥' },
];

export default function ExportPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('all');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [loading, setLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState<{ name: string; time: string; size: string }[]>([]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          format,
        }),
      });

      const result = await res.json();

      if (result.success) {
        // 下载文件
        const blob = new Blob([result.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 记录历史
        const size = new Blob([result.data]).size;
        setExportHistory(prev => [{
          name: result.fileName,
          time: new Date().toLocaleString(),
          size: formatSize(size),
        }, ...prev.slice(0, 4)]);

        toast.success(`导出成功！消耗 100 Token，共 ${result.totalRecords} 条记录`);
      } else {
        toast.error(result.error || '导出失败');
      }
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
        <p className="text-sm text-gray-500 mt-1">将业务数据导出为 CSV 或 JSON 格式，方便备份或迁移</p>
      </div>

      {/* 导出模板选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">选择导出内容</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id as ExportTemplate)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{template.icon}</span>
                <span className="font-medium text-gray-900">{template.name}</span>
              </div>
              <p className="text-sm text-gray-500">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 导出格式选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">选择导出格式</h2>
        <div className="flex gap-4">
          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
              format === 'csv'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-gray-900">CSV 格式</div>
            <div className="text-sm text-gray-500 mt-1">适用于 Excel 编辑</div>
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
              format === 'json'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">{ }</div>
            <div className="font-medium text-gray-900">JSON 格式</div>
            <div className="text-sm text-gray-500 mt-1">适用于程序处理</div>
          </button>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-gray-900">开始导出</h2>
            <p className="text-sm text-gray-500 mt-1">
              每次导出消耗 100 Token，最多导出 10,000 条记录
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出数据
              </>
            )}
          </button>
        </div>

        {/* 导出历史 */}
        {exportHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">最近导出</h3>
            <div className="space-y-2">
              {exportHistory.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{format === 'csv' ? '📄' : '{ }'}</span>
                    <span className="text-sm text-gray-900">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{item.size}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 注意事项 */}
      <div className="mt-6 bg-yellow-50 rounded-xl p-4">
        <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. 导出数据包含您账号下的所有相关业务数据</li>
          <li>2. 敏感字段（如手机号、地址）已自动脱敏处理</li>
          <li>3. 每次导出最多 10,000 条记录，超出部分需分批导出</li>
          <li>4. 建议定期导出重要数据进行本地备份</li>
        </ul>
      </div>
    </div>
  );
}
