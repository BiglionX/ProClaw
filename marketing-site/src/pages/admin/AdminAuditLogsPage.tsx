import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '../../lib/exportUtils';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'LOGOUT';
  status: 'success' | 'failed';
  ipAddress: string;
  userAgent: string;
  details?: string;
}

const AdminAuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'LOGOUT'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'custom'>('7d');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // 模拟审计日志数据
  const [logs] = useState<AuditLog[]>([
    {
      id: 'log-001',
      timestamp: '2024-04-14 15:30:22',
      userId: 'admin-001',
      userEmail: 'admin@proclaw.com',
      action: '更新系统设置',
      resource: 'system_settings',
      resourceId: 'rate_limit',
      method: 'UPDATE',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: '修改API速率限制：每分钟60 -> 100',
    },
    {
      id: 'log-002',
      timestamp: '2024-04-14 14:25:10',
      userId: 'user-123',
      userEmail: 'user@example.com',
      action: '创建API密钥',
      resource: 'api_keys',
      resourceId: 'key-456',
      method: 'CREATE',
      status: 'success',
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    {
      id: 'log-003',
      timestamp: '2024-04-14 13:15:45',
      userId: 'admin-001',
      userEmail: 'admin@proclaw.com',
      action: '删除用户账户',
      resource: 'users',
      resourceId: 'user-789',
      method: 'DELETE',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: '用户违规，永久封禁',
    },
    {
      id: 'log-004',
      timestamp: '2024-04-14 12:00:33',
      userId: 'user-456',
      userEmail: 'developer@test.com',
      action: '登录系统',
      resource: 'auth',
      method: 'LOGIN',
      status: 'failed',
      ipAddress: '198.51.100.23',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      details: '密码错误，尝试次数：3/5',
    },
    {
      id: 'log-005',
      timestamp: '2024-04-14 11:45:18',
      userId: 'admin-002',
      userEmail: 'manager@proclaw.com',
      action: '导出订单数据',
      resource: 'orders',
      method: 'READ',
      status: 'success',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: '导出2024年Q1订单数据，共1234条记录',
    },
    {
      id: 'log-006',
      timestamp: '2024-04-14 10:30:55',
      userId: 'user-789',
      userEmail: 'test@example.com',
      action: '购买Token套餐',
      resource: 'token_packages',
      resourceId: 'package-003',
      method: 'CREATE',
      status: 'success',
      ipAddress: '203.0.113.100',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      details: '购买专业套餐，200,000 Tokens，¥1,299',
    },
    {
      id: 'log-007',
      timestamp: '2024-04-14 09:15:42',
      userId: 'admin-001',
      userEmail: 'admin@proclaw.com',
      action: '批准集成申请',
      resource: 'integrations',
      resourceId: 'int-045',
      method: 'UPDATE',
      status: 'success',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      details: '批准用户 user@example.com 的Webhook集成',
    },
    {
      id: 'log-008',
      timestamp: '2024-04-14 08:00:10',
      userId: 'system',
      userEmail: 'system@proclaw.com',
      action: '执行定时任务',
      resource: 'scheduled_tasks',
      resourceId: 'task-001',
      method: 'CREATE',
      status: 'success',
      ipAddress: '127.0.0.1',
      userAgent: 'ProClaw Scheduler v1.0',
      details: '清理过期Token记录，共清理234条',
    },
  ]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.method === actionFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesAction && matchesStatus;
  });

  const getMethodBadge = (method: string) => {
    const styles = {
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-blue-100 text-blue-700',
      DELETE: 'bg-red-100 text-red-700',
      READ: 'bg-gray-100 text-gray-700',
      LOGIN: 'bg-purple-100 text-purple-700',
      LOGOUT: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[method as keyof typeof styles]}`}>
        {method}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' ? (
      <span className="inline-flex items-center text-green-600">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        成功
      </span>
    ) : (
      <span className="inline-flex items-center text-red-600">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        失败
      </span>
    );
  };

  const totalLogs = logs.length;
  const successLogs = logs.filter(l => l.status === 'success').length;
  const failedLogs = logs.filter(l => l.status === 'failed').length;

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
              <h1 className="text-2xl font-bold text-gray-900">审计日志查看</h1>
            </div>
            <ExportButton
              data={filteredLogs}
              filename="audit_logs"
              headers={[
                { key: 'timestamp', label: '时间' },
                { key: 'userEmail', label: '用户' },
                { key: 'action', label: '操作' },
                { key: 'resource', label: '资源' },
                { key: 'method', label: '方法' },
                { key: 'status', label: '状态' },
                { key: 'ipAddress', label: 'IP地址' },
              ]}
            >
              导出日志
            </ExportButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总日志数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{totalLogs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">成功操作</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{successLogs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">失败操作</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{failedLogs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">成功率</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索操作、用户或资源..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">操作类型</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="all">全部</option>
                <option value="CREATE">创建</option>
                <option value="UPDATE">更新</option>
                <option value="DELETE">删除</option>
                <option value="READ">读取</option>
                <option value="LOGIN">登录</option>
                <option value="LOGOUT">登出</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="all">全部</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
              >
                <option value="24h">最近24小时</option>
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    资源
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP地址
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.userEmail}</div>
                      <div className="text-xs text-gray-500">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getMethodBadge(log.method)}
                        <span className="text-sm text-gray-900">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.resource}</div>
                      {log.resourceId && (
                        <div className="text-xs text-gray-500 font-mono">{log.resourceId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-800">查看</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示 <span className="font-medium">1</span> 到 <span className="font-medium">{filteredLogs.length}</span> 条，共 <span className="font-medium">{filteredLogs.length}</span> 条
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                  上一页
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50" disabled>
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">日志详情</h2>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">日志ID</label>
                    <div className="text-sm font-mono text-gray-900">{selectedLog.id}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">时间戳</label>
                    <div className="text-sm text-gray-900">{selectedLog.timestamp}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">用户</label>
                    <div className="text-sm text-gray-900">{selectedLog.userEmail}</div>
                    <div className="text-xs text-gray-500">{selectedLog.userId}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">IP地址</label>
                    <div className="text-sm font-mono text-gray-900">{selectedLog.ipAddress}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">操作</label>
                  <div className="flex items-center space-x-2">
                    {getMethodBadge(selectedLog.method)}
                    <span className="text-sm text-gray-900">{selectedLog.action}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">资源</label>
                  <div className="text-sm text-gray-900">{selectedLog.resource}</div>
                  {selectedLog.resourceId && (
                    <div className="text-xs text-gray-500 font-mono mt-1">{selectedLog.resourceId}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>

                {selectedLog.details && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">详细信息</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedLog.details}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">User Agent</label>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
