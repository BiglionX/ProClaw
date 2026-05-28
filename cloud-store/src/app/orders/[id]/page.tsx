// 订单详情页面
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOrder, Order } from '@/lib/api';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  const loadOrder = async (id: string) => {
    setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': '待处理',
      'paid': '已支付',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">😞</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">订单不存在</h2>
        <Link
          href="/orders"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          返回订单列表
        </Link>
      </div>
    );
  }

  // 解析 buyer_info（可能是 JSON 字符串）
  let buyerInfo = { name: '', phone: '', address: '' };
  try {
    buyerInfo = JSON.parse(order.buyer_info);
  } catch {
    // 如果不是 JSON，可能是旧格式
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/orders" className="text-blue-600 hover:underline">
          ← 返回订单列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* 订单头部 */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">订单详情</h1>
            <p className="text-gray-500">订单号: {order.id}</p>
            <p className="text-gray-500">
              下单时间: {new Date(order.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>

        {/* 商品信息 */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">商品信息</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">商品 ID: {order.product_id}</p>
              <p className="text-gray-600 mt-1">数量: 1</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-red-600">¥{order.total_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* 收货信息 */}
        {buyerInfo && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">收货信息</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">收货人：</span>
                {buyerInfo.name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">联系电话：</span>
                {buyerInfo.phone}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">收货地址：</span>
                {buyerInfo.address}
              </p>
            </div>
          </div>
        )}

        {/* 物流信息 */}
        {order.tracking_no && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">物流信息</h2>
            <p className="text-gray-700">
              <span className="font-medium">快递单号：</span>
              {order.tracking_no}
            </p>
          </div>
        )}

        {/* 订单金额 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">订单金额</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">商品总价</span>
              <span className="font-medium">¥{order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">运费</span>
              <span className="text-green-600">免费</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold">实付金额</span>
              <span className="text-2xl font-bold text-red-600">
                ¥{order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4">
          {order.status === 'pending' && (
            <button
              onClick={() => {
                if (confirm('确定要取消此订单吗？')) {
                  // 这里应该调用取消订单的 API
                  alert('取消订单功能待实现');
                }
              }}
              className="px-6 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              取消订单
            </button>
          )}
          {order.status === 'shipped' && (
            <button
              onClick={() => {
                // 这里应该调用确认收货的 API
                alert('确认收货功能待实现');
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              确认收货
            </button>
          )}
          <Link
            href="/orders"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回列表
          </Link>
        </div>
      </div>
    </div>
  );
}
