import React, { useState } from 'react';

const CLOUD_PLANS = [
  { key: 'free', name: '免费版', price: '¥0', products: '20 个', orders: '10 单/月', domain: '子域名' },
  { key: 'basic', name: '基础版', price: '¥29', products: '200 个', orders: '100 单/月', domain: '自定义域名' },
  { key: 'pro', name: '专业版', price: '¥99', products: '2000 个', orders: '2000 单/月', domain: '自定义域名' },
  { key: 'enterprise', name: '企业版', price: '¥299', products: '不限', orders: '不限', domain: '自定义域名' },
];

interface Subscription {
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  billing_cycle: string;
}

interface CloudDataTabProps {
  subscription: Subscription;
  setActiveTab: (i: number) => void;
}

const CloudDataTab: React.FC<CloudDataTabProps> = ({ subscription, setActiveTab }) => {
  const [syncCount] = useState({ synced: 156, pending: 3 });
  const [storeOrders] = useState([
    { id: '#O20260529-001', customer: '张三', amount: '¥299', status: '待发货' },
    { id: '#O20260528-015', customer: '李四', amount: '¥159', status: '已发货' },
    { id: '#O20260527-008', customer: '王五', amount: '¥89', status: '已完成' },
  ]);

  return (
    <div className="space-y-6">
      {/* 商城概览 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">云商城概览</h3>
          <span className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">已开通</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">子域名</span>
            <p className="font-medium text-gray-900">mypro.proclaw.cc</p>
          </div>
          <div>
            <span className="text-gray-500">当前套餐</span>
            <p className="font-medium text-gray-900">{CLOUD_PLANS.find(p => p.key === subscription.plan_type)?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">状态</span>
            <p className="font-medium text-green-600">运行中</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <a href="https://mypro.proclaw.cc" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            访问商城
          </a>
          <button onClick={() => setActiveTab(2)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            管理套餐
          </button>
        </div>
      </div>

      {/* 数据同步 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">数据同步</h3>
          <button className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            立即同步
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500">已同步商品</p>
            <p className="text-2xl font-bold text-gray-900">{syncCount.synced}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500">待同步商品</p>
            <p className="text-2xl font-bold text-orange-600">{syncCount.pending}</p>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium text-gray-700 mb-2">最近同步记录</p>
          {[
            { time: '2026-05-29 10:30', type: '增量同步', status: 'success' as const },
            { time: '2026-05-29 08:15', type: '全量同步', status: 'success' as const },
            { time: '2026-05-28 22:00', type: '增量同步', status: 'success' as const },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg">
              <svg className={`w-4 h-4 ${log.status === 'success' ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                {log.status === 'success'
                  ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  : <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                }
              </svg>
              <span className="text-gray-900">{log.time}</span>
              <span className="text-gray-500">{log.type}</span>
              <span className="text-green-600 text-xs ml-auto">成功</span>
            </div>
          ))}
        </div>
      </div>

      {/* 近期订单 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">近期订单</h3>
          <span className="text-sm text-gray-500">本月 23 单 · 总销售额 ¥3,547</span>
        </div>
        <div className="space-y-2">
          {storeOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{order.id}</span>
                <span className="text-gray-500">{order.customer}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-900">{order.amount}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  order.status === '待发货' ? 'bg-yellow-50 text-yellow-700' :
                  order.status === '已发货' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CloudDataTab;
