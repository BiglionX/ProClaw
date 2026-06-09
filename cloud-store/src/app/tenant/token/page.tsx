// ProClaw Shop - Token 管理页面
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TokenInfo {
  balance: number;
  used: number;
  plan: string;
}

interface UsageRecord {
  id: string;
  resource_type: string;
  tokens_used: number;
  endpoint: string | null;
  created_at: string;
}

interface UsageSummary {
  today: number;
  week: number;
  month: number;
  total: number;
}

// 资源类型中文映射
const resourceTypeNames: Record<string, string> = {
  'ai_chat': 'AI 对话',
  'ai_product_query': '商品智能查询',
  'ai_order_ocr': '订单 OCR 识别',
  'ai_order_recognition': '订单智能识别',
  'data_export': '数据导出',
  'data_sync': '数据同步',
  'chat_message': '客服消息',
  'other': '其他',
};

export default function TokenManagementPage() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({ balance: 0, used: 0, plan: 'trial' });
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary>({ today: 0, week: 0, month: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 数据获取逻辑
    const loadData = async () => {
      try {
        const [tokenRes, usageRes] = await Promise.all([
          fetch('/api/tenant/token'),
          fetch('/api/tenant/usage')
        ]);
        const tokenData = await tokenRes.json();
        const usageData = await usageRes.json();
        if (tokenData.success) setTokenInfo(tokenData.data);
        if (usageData.success) {
          setUsageRecords(usageData.data.records || []);
          setUsageSummary(usageData.data.summary || { today: 0, week: 0, month: 0, total: 0 });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getResourceName = (type: string) => {
    return resourceTypeNames[type] || type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/tenant/dashboard" className="text-gray-500 hover:text-gray-900">
                &larr; 返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Token 管理</h1>
            </div>
            <span className="text-sm text-gray-500">
              余额: <span className="font-bold text-purple-600">{tokenInfo.balance}</span> PT
            </span>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Token 余额卡片 */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-200 text-sm mb-1">当前余额</div>
              <div className="text-4xl font-bold mb-2">{tokenInfo.balance} <span className="text-xl">PT</span></div>
              <div className="text-purple-200 text-sm">已使用 {tokenInfo.used} PT | 套餐: {tokenInfo.plan === 'trial' ? '试用' : '正式'}</div>
            </div>
            <button
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              onClick={() => alert('充值功能即将上线，请联系客服')}
            >
              立即充值
            </button>
          </div>
        </div>

        {/* 用量统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">今日消耗</div>
            <div className="text-2xl font-bold text-red-500">{usageSummary.today}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">本周消耗</div>
            <div className="text-2xl font-bold text-orange-500">{usageSummary.week}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">本月消耗</div>
            <div className="text-2xl font-bold text-blue-500">{usageSummary.month}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">累计消耗</div>
            <div className="text-2xl font-bold text-gray-700">{usageSummary.total}</div>
          </div>
        </div>

        {/* 消费记录 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">消费记录</h2>
          </div>
          <div className="overflow-x-auto">
            {usageRecords.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">消耗 PT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">接口</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usageRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getResourceName(record.resource_type)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-red-500">
                        -{record.tokens_used}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                        {record.endpoint || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                暂无消费记录
              </div>
            )}
          </div>
        </div>

        {/* 定价说明 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token 定价说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">AI 对话</span>
              <span className="font-medium text-purple-600">1 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">商品智能查询</span>
              <span className="font-medium text-purple-600">2 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">订单 OCR 识别</span>
              <span className="font-medium text-purple-600">5 PT / 次</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-gray-700">数据导出</span>
              <span className="font-medium text-purple-600">10 PT / 次</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
