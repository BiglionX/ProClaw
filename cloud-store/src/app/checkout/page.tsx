// 结算页面
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCart, getCartTotal, getCartCount, clearCart } from '@/lib/api';
import { createOrder } from '@/lib/api';
import { CartItem } from '@/lib/api';

interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  paymentMethod: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'wechat',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<string[]>([]);

  useState(() => {
    setIsClient(true);
    setCart(getCart());
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      alert('请填写完整的收货信息');
      return;
    }

    if (!shippingInfo.paymentMethod) {
      alert('请选择支付方式');
      return;
    }

    setIsSubmitting(true);

    try {
      // 为购物车中的每个商品创建订单
      const orders = [];
      for (const item of cart) {
        const order = await createOrder({
          product_id: item.product.id,
          buyer_info: JSON.stringify(shippingInfo),
          total_amount: item.product.price * item.quantity,
          shipping_address: shippingInfo.address,
          payment_method: shippingInfo.paymentMethod,
        });
        if (order) {
          orders.push(order);
        }
      }

      if (orders.length === cart.length) {
        // 保存创建的订单ID，用于支付模拟
        setCreatedOrders(orders.map(o => o.id));
        clearCart();
        // 显示支付界面
        setShowPayment(true);
      } else {
        alert('部分订单创建失败，请重试');
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      alert('订单创建失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">购物车是空的</h2>
        <p className="text-gray-500 mb-8">请先添加商品到购物车</p>
        <Link
          href="/"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          去购物
        </Link>
      </div>
    );
  }

  const total = getCartTotal(cart);
  const count = getCartCount(cart);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">结算</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 收货信息表单 */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">收货信息</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  收货人姓名 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={shippingInfo.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入收货人姓名"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  联系电话 *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={shippingInfo.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入联系电话"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  收货地址 *
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={shippingInfo.address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入详细收货地址"
                />
              </div>

              {/* 支付方式选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  支付方式 *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="wechat"
                      checked={shippingInfo.paymentMethod === 'wechat'}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="ml-3 flex items-center">
                      <span className="text-2xl mr-2">💚</span>
                      <div>
                        <p className="font-medium text-gray-800">微信支付</p>
                        <p className="text-sm text-gray-500">推荐微信用户使用</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="alipay"
                      checked={shippingInfo.paymentMethod === 'alipay'}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="ml-3 flex items-center">
                      <span className="text-2xl mr-2">💙</span>
                      <div>
                        <p className="font-medium text-gray-800">支付宝</p>
                        <p className="text-sm text-gray-500">推荐支付宝用户使用</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? '提交中...' : `提交订单 (${count} 件商品)`}
            </button>
          </form>
        </div>

        {/* 订单摘要 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">订单摘要</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">商品总数</span>
                <span className="font-semibold">{count} 件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">运费</span>
                <span className="text-green-600">免费</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">合计</span>
                  <span className="text-2xl font-bold text-red-600">
                    ¥{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/cart"
              className="block w-full text-center py-3 text-blue-600 hover:underline"
            >
              返回购物车
            </Link>
          </div>
        </div>
      </div>
    </div>

    {/* 支付模拟弹窗 */}
    {showPayment && (
      <PaymentModal
        orders={createdOrders}
        paymentMethod={shippingInfo.paymentMethod}
        onSuccess={() => {
          setShowPayment(false);
          router.push('/orders');
        }}
      />
    )}
  );
}

// 支付模拟弹窗组件
function PaymentModal({ 
  orders, 
  paymentMethod, 
  onSuccess 
}: { 
  orders: string[]; 
  paymentMethod: string; 
  onSuccess: () => void; 
}) {
  const [status, setStatus] = useState<'waiting' | 'processing' | 'success'>('waiting');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === 'waiting') {
      // 3秒后自动模拟支付成功
      const timer = setTimeout(() => {
        setStatus('processing');
      }, 1000);

      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(progressTimer);
      };
    }

    if (status === 'processing') {
      // 模拟处理中，2秒后成功
      const timer = setTimeout(async () => {
        // 更新所有订单状态为"已支付"
        for (const orderId of orders) {
          await updateOrderStatus(orderId, 'paid');
        }
        setStatus('success');
      }, 2000);

      return () => clearTimeout(timer);
    }

    if (status === 'success') {
      // 3秒后自动关闭弹窗并跳转
      const timer = setTimeout(() => {
        onSuccess();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, orders, onSuccess]);

  const paymentName = paymentMethod === 'wechat' ? '微信支付' : '支付宝';
  const paymentIcon = paymentMethod === 'wechat' ? '💚' : '💙';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        {status === 'waiting' && (
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{paymentIcon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                正在打开{paymentName}
              </h3>
              <p className="text-gray-600">
                请使用{paymentName}扫码完成支付
              </p>
            </div>

            {/* 模拟二维码 */}
            <div className="w-48 h-48 bg-gray-200 mx-auto mb-6 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-2">📱</div>
                <p className="text-sm text-gray-500">模拟二维码</p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-center text-sm text-gray-500">
              正在检测支付状态...
            </p>
          </>
        )}

        {status === 'processing' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              支付处理中
            </h3>
            <p className="text-gray-600">
              正在确认支付结果...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              支付成功！
            </h3>
            <p className="text-gray-600 mb-4">
              订单已创建，即将跳转...
            </p>
            <div className="flex justify-center space-x-2">
              {orders.map((_, index) => (
                <div key={index} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${index * 0.1}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
