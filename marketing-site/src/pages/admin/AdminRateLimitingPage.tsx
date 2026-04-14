import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RateLimitRule {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'user' | 'ip' | 'endpoint';
  endpoint?: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstSize: number;
  isActive: boolean;
  whitelist: string[];
  createdAt: string;
}

const AdminRateLimitingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'user' | 'ip' | 'endpoint'>('all');

  // 模拟限流规则数据
  const [rules] = useState<RateLimitRule[]>([
    {
      id: 'rule-001',
      name: '全局默认限流',
      description: '适用于所有API的全局默认限流策略',
      scope: 'global',
      requestsPerMinute: 60,
      requestsPerHour: 3000,
      requestsPerDay: 50000,
      burstSize: 100,
      isActive: true,
      whitelist: ['127.0.0.1', '192.168.1.1'],
      createdAt: '2024-01-01',
    },
    {
      id: 'rule-002',
      name: '用户级别限流',
      description: '针对单个用户的API调用限制',
      scope: 'user',
      requestsPerMinute: 30,
      requestsPerHour: 1500,
      requestsPerDay: 20000,
      burstSize: 50,
      isActive: true,
      whitelist: [],
      createdAt: '2024-01-15',
    },
    {
      id: 'rule-003',
      name: 'IP地址限流',
      description: '防止单个IP地址过度调用',
      scope: 'ip',
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 80000,
      burstSize: 150,
      isActive: true,
      whitelist: [],
      createdAt: '2024-02-01',
    },
    {
      id: 'rule-004',
      name: '聊天接口限流',
      description: '/api/chat 端点的专用限流策略',
      scope: 'endpoint',
      endpoint: '/api/chat',
      requestsPerMinute: 20,
      requestsPerHour: 1000,
      requestsPerDay: 15000,
      burstSize: 30,
      isActive: true,
      whitelist: [],
      createdAt: '2024-03-01',
    },
    {
      id: 'rule-005',
      name: '图像生成限流',
      description: '/api/images 端点限流（资源密集型）',
      scope: 'endpoint',
      endpoint: '/api/images',
      requestsPerMinute: 5,
      requestsPerHour: 200,
      requestsPerDay: 3000,
      burstSize: 10,
      isActive: true,
      whitelist: [],
      createdAt: '2024-03-15',
    },
    {
      id: 'rule-006',
      name: 'VIP用户宽松限流',
      description: '为VIP用户提供更高的限流阈值',
      scope: 'user',
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 100000,
      burstSize: 200,
      isActive: false,
      whitelist: ['vip-user-001', 'vip-user-002'],
      createdAt: '2024-04-01',
    },
  ]);

  const filteredRules = rules.filter(rule => 
    scopeFilter === 'all' || rule.scope === scopeFilter
  );

  const getScopeBadge = (scope: string) => {
    const styles = {
      global: 'bg-purple-100 text-purple-700',
      user: 'bg-blue-100 text-blue-700',
      ip: 'bg-green-100 text-green-700',
      endpoint: 'bg-orange-100 text-orange-700',
    };
    const labels = {
      global: '全局',
      user: '用户',
      ip: 'IP',
      endpoint: '端点',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[scope as keyof typeof styles]}`}>
        {labels[scope as keyof typeof labels]}
      </span>
    );
  };

  const handleToggleRule = (id: string) => {
    console.log(`切换规则状态: ${id}`);
  };

  const handleEditRule = (id: string) => {
    console.log(`编辑规则: ${id}`);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('确定要删除此限流规则吗？')) {
      console.log(`删除规则: ${id}`);
    }
  };

  const activeRules = rules.filter(r => r.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">API 限流配置</h1>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              添加规则
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总规则数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{rules.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">活跃规则</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{activeRules}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">全局规则</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {rules.filter(r => r.scope === 'global').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">端点规则</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {rules.filter(r => r.scope === 'endpoint').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">范围筛选：</label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            >
              <option value="all">全部</option>
              <option value="global">全局</option>
              <option value="user">用户</option>
              <option value="ip">IP</option>
              <option value="endpoint">端点</option>
            </select>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    {getScopeBadge(rule.scope)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {rule.isActive ? '启用' : '禁用'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                  {rule.endpoint && (
                    <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded text-sm font-mono text-gray-700">
                      {rule.endpoint}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">每分钟</div>
                  <div className="text-xl font-bold text-blue-900">{rule.requestsPerMinute}</div>
                  <div className="text-xs text-blue-600">请求</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600 mb-1">每小时</div>
                  <div className="text-xl font-bold text-green-900">{rule.requestsPerHour.toLocaleString()}</div>
                  <div className="text-xs text-green-600">请求</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-purple-600 mb-1">每天</div>
                  <div className="text-xl font-bold text-purple-900">{rule.requestsPerDay.toLocaleString()}</div>
                  <div className="text-xs text-purple-600">请求</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs text-orange-600 mb-1">突发容量</div>
                  <div className="text-xl font-bold text-orange-900">{rule.burstSize}</div>
                  <div className="text-xs text-orange-600">请求</div>
                </div>
              </div>

              {rule.whitelist.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">白名单 ({rule.whitelist.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {rule.whitelist.map((item, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  创建于: <span className="font-medium text-gray-900">{rule.createdAt}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditRule(rule.id)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      rule.isActive
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {rule.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">添加限流规则</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">规则名称</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="例如：高级用户限流" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">规则描述</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" rows={2} placeholder="规则描述..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">限流范围</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="global">全局</option>
                      <option value="user">用户</option>
                      <option value="ip">IP</option>
                      <option value="endpoint">端点</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API端点（可选）</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="/api/endpoint" />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">每分钟请求</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">每小时请求</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="3000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">每天请求</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="50000" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">突发容量</label>
                  <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="100" />
                  <p className="text-xs text-gray-500 mt-1">允许短时间内的峰值请求数</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">白名单（逗号分隔）</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" rows={2} placeholder="user-id-1, user-id-2, 192.168.1.1" />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    取消
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    创建规则
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRateLimitingPage;
