// ProClaw Shop - 用户订单中心
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  status: string;
  payment_method: string;
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已支付', color: 'bg-blue-100 text-blue-800' },
  processing: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: '已发货', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/store/orders');
        const result = await res.json();
        
        if (result.success) {
          setOrders(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);
  
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'pending') return order.status === 'pending' || order.status === 'paid';
    if (activeTab === 'completed') return order.status === 'completed' || order.status === 'cancelled';
    return true;
  });
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">我的订单</h1>
        </div>
      </header>
      
      {/* 标签页 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {[
              { key: 'all', label: '全部订单' },
              { key: 'pending', label: '待处理' },
              { key: 'completed', label: '已完成' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* 订单列表 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' };
              
              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* 订单头 */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="text-sm text-gray-500">
                      订单号: {order.order_no}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  {/* 商品列表 */}
                  <div className="divide-y">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded shrink-0 flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500">x{item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">¥{item.price}</p>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div className="px-4 py-2 text-sm text-gray-500 text-center">
                        还有 {order.items.length - 3} 件商品
                      </div>
                    )}
                  </div>
                  
                  {/* 订单底 */}
                  <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-900">
                        ¥{order.total_amount.toFixed(2)}
                      </span>
                      {order.status === 'pending' && (
                        <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                          去支付
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">暂无订单</h3>
            <p className="mt-2 text-gray-500">快去选购心仪的商品吧</p>
            <Link
              href="/"
              className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              去购物
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
