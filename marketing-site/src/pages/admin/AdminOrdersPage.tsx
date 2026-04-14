import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '../../lib/exportUtils';

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  packageId: string;
  packageName: string;
  tokenAmount: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentMethod?: 'alipay' | 'wechat' | 'stripe' | 'paypal';
  createdAt: string;
  completedAt?: string;
}

const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'refunded' | 'failed'>('all');

  // 模拟订单数据
  const [orders] = useState<Order[]>([
    {
      id: 'ORD-2024-001',
      userId: 'user-001',
      userEmail: 'user1@example.com',
      packageId: 'pkg-001',
      packageName: '标准套餐',
      tokenAmount: 50000,
      amount: 399,
      currency: 'CNY',
      status: 'completed',
      paymentMethod: 'alipay',
      createdAt: '2024-04-14 10:30:00',
      completedAt: '2024-04-14 10:30:15',
    },
    {
      id: 'ORD-2024-002',
      userId: 'user-002',
      userEmail: 'user2@example.com',
      packageId: 'pkg-002',
      packageName: '专业套餐',
      tokenAmount: 200000,
      amount: 1299,
      currency: 'CNY',
      status: 'completed',
      paymentMethod: 'wechat',
      createdAt: '2024-04-14 09:15:00',
      completedAt: '2024-04-14 09:15:20',
    },
    {
      id: 'ORD-2024-003',
      userId: 'user-003',
      userEmail: 'user3@example.com',
      packageId: 'pkg-001',
      packageName: '体验套餐',
      tokenAmount: 10000,
      amount: 99,
      currency: 'CNY',
      status: 'pending',
      paymentMethod: 'alipay',
      createdAt: '2024-04-14 11:00:00',
    },
    {
      id: 'ORD-2024-004',
      userId: 'user-004',
      userEmail: 'user4@example.com',
      packageId: 'pkg-003',
      packageName: '企业套餐',
      tokenAmount: 1000000,
      amount: 4999,
      currency: 'CNY',
      status: 'refunded',
      paymentMethod: 'stripe',
      createdAt: '2024-04-13 15:20:00',
      completedAt: '2024-04-13 15:20:30',
    },
  ]);

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      refunded: 'bg-gray-100 text-gray-700',
      failed: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending: '待支付',
      completed: '已完成',
      refunded: '已退款',
      failed: '失败',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPaymentMethodIcon = (method?: string) => {
    const icons = {
      alipay: '💙 支付宝',
      wechat: '💚 微信',
      stripe: '💳 Stripe',
      paypal: '🅿️ PayPal',
    };
    return method ? icons[method as keyof typeof icons] : '-';
  };

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingCount = orders.filter(o => o.status === 'pending').length;

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
              <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
            </div>
            <ExportButton
              data={filteredOrders}
              filename="orders"
              headers={[
                { key: 'id', label: '订单号' },
                { key: 'userEmail', label: '用户邮箱' },
                { key: 'packageName', label: '套餐' },
                { key: 'tokenAmount', label: 'Token数量' },
                { key: 'amount', label: '金额' },
                { key: 'currency', label: '货币' },
                { key: 'status', label: '状态' },
                { key: 'paymentMethod', label: '支付方式' },
                { key: 'createdAt', label: '创建时间' },
                { key: 'completedAt', label: '完成时间' },
              ]}
            >
              导出订单
            </ExportButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总订单数</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">总收入</p>
            <p className="text-2xl font-bold text-green-600 mt-2">¥{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">待支付</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600">完成率</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {orders.length > 0 ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">状态筛选：</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            >
              <option value="all">全部</option>
              <option value="pending">待支付</option>
              <option value="completed">已完成</option>
              <option value="refunded">已退款</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    套餐
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金额
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支付方式
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.packageName}</div>
                      <div className="text-xs text-gray-500">{order.tokenAmount.toLocaleString()} Tokens</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">¥{order.amount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getPaymentMethodIcon(order.paymentMethod)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.createdAt}</div>
                      {order.completedAt && (
                        <div className="text-xs text-gray-500">完成: {order.completedAt}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-900 hover:text-gray-700 mr-3">详情</button>
                      {order.status === 'pending' && (
                        <button className="text-red-600 hover:text-red-800">取消</button>
                      )}
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
                显示 <span className="font-medium">1</span> 到 <span className="font-medium">{filteredOrders.length}</span> 条，共 <span className="font-medium">{filteredOrders.length}</span> 条
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
    </div>
  );
};

export default AdminOrdersPage;
