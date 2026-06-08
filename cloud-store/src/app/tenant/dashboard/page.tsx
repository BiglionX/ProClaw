// ProClaw Shop - 商户后台仪表板
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  token_balance: number;
  token_used: number;
  total_orders: number;
  total_products: number;
  today_orders: number;
  today_revenue: number;
}

interface RecentOrder {
  id: string;
  order_no: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function TenantDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    token_balance: 0,
    token_used: 0,
    total_orders: 0,
    total_products: 0,
    today_orders: 0,
    today_revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // 获取 Token 余额
        const tokenRes = await fetch('/api/tenant/token');
        const tokenData = await tokenRes.json();
        if (tokenData.success) {
          setStats((prev) => ({
            ...prev,
            token_balance: tokenData.data.balance,
            token_used: tokenData.data.used,
          }));
        }

        // 获取订单统计
        const ordersRes = await fetch('/api/store/orders');
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
          const orders = ordersData.data || [];
          const today = new Date().toDateString();
          const todayOrders = orders.filter(
            (o: RecentOrder) => new Date(o.created_at).toDateString() === today
          );
          setStats((prev) => ({
            ...prev,
            total_orders: orders.length,
            today_orders: todayOrders.length,
            today_revenue: todayOrders.reduce(
              (sum: number, o: RecentOrder) => sum + o.total_amount,
              0
            ),
          }));
          setRecentOrders(orders.slice(0, 5));
        }

        // 获取商品数量
        const productsRes = await fetch('/api/tenant/products/sync');
        const productsData = await productsRes.json();
        if (productsData.success) {
          setStats((prev) => ({
            ...prev,
            total_products: productsData.data.total || 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">ProClaw Shop 管理后台</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/scan"
                className="text-gray-500 hover:text-gray-900"
              >
                扫码登录
              </Link>
              <span className="text-sm text-gray-500">
                Token: {stats.token_balance}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Token 余额</div>
            <div className="text-2xl font-bold text-blue-600">{stats.token_balance}</div>
            <div className="text-sm text-gray-400 mt-1">已使用 {stats.token_used}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">今日订单</div>
            <div className="text-2xl font-bold text-green-600">{stats.today_orders}</div>
            <div className="text-sm text-gray-400 mt-1">销售额 ¥{stats.today_revenue.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">总订单数</div>
            <div className="text-2xl font-bold text-purple-600">{stats.total_orders}</div>
            <div className="text-sm text-gray-400 mt-1">全部订单</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">商品数量</div>
            <div className="text-2xl font-bold text-orange-600">{stats.total_products}</div>
            <div className="text-sm text-gray-400 mt-1">已上架商品</div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">快捷操作</h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/tenant/products"
              className="flex flex-col items-center p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-medium text-gray-900">商品管理</span>
            </Link>

            <Link
              href="/tenant/orders"
              className="flex flex-col items-center p-4 rounded-lg border hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-gray-900">订单管理</span>
            </Link>

            <Link
              href="/tenant/token"
              className="flex flex-col items-center p-4 rounded-lg border hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">充值 Token</span>
            </Link>

            <Link
              href="/tenant/settings"
              className="flex flex-col items-center p-4 rounded-lg border hover:border-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">商城设置</span>
            </Link>
          </div>
        </div>

        {/* 最近订单 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近订单</h2>
            <Link href="/tenant/orders" className="text-blue-600 hover:text-blue-800 text-sm">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{order.order_no}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.customer_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">¥{order.total_amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'completed' ? '已完成' :
                           order.status === 'paid' ? '已支付' :
                           order.status === 'pending' ? '待支付' :
                           order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                暂无订单数据
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
