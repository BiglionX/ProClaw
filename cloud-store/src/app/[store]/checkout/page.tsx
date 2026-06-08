// ProClaw Shop - 结算页面
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  product: {
    name: string;
    price: number;
    images?: string[];
  };
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    payment_method: 'mock',
    remark: '',
  });

  // 联系信息
  const [contactInfo, setContactInfo] = useState({
    phone: '',
    wechat: '',
    email: '',
  });
  
  // 加载购物车数据
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/store/cart');
        const result = await res.json();

        if (result.success) {
          setCartItems(result.data.items || []);
          setTotalAmount(result.data.total_amount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 加载联系信息（从 API 或本地存储）
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/tenant/settings');
        const data = await res.json();

        if (data.success && data.data.contact) {
          setContactInfo({
            phone: data.data.contact.phone || '',
            wechat: data.data.contact.wechat || '',
            email: data.data.contact.email || '',
          });
        }
      } catch (error) {
        console.error('Failed to load contact info:', error);
        // 静默失败，使用默认空值
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_address) {
      alert('请填写完整的收货信息');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result = await res.json();
      
      if (result.success) {
        router.push(`/checkout/success?order_id=${result.data.order_id}`);
      } else {
        alert(result.error || '创建订单失败');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('创建订单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">购物车是空的</h2>
          <p className="text-gray-500 mb-4">请先添加商品到购物车</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            返回商城
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">确认订单</h1>
        
        {/* 商品列表 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">商品清单</h2>
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center py-3 border-b last:border-b-0">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-500">x{item.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900">
                ¥{(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        
        {/* 收货信息表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">收货信息</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收货人姓名 *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入收货人姓名"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手机号码 *
              </label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                pattern="^1[3-9]\d{9}$"
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入11位手机号码"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收货地址 *
              </label>
              <textarea
                required
                rows={3}
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入详细收货地址"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="可选：备注信息"
              />
            </div>
          </div>
          
          {/* 订单摘要 */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700">订单总额</span>
              <span className="text-2xl font-bold text-red-600">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交订单'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
