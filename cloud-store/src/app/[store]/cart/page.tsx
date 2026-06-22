// ProClaw Shop - 购物车页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { storePath } from '@/lib/utils';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    stock: number;
  };
}

export default function CartPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = (params.store as string) || '';
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // 获取购物车
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch('/api/store/cart');
      const result = await res.json();
      
      if (result.success) {
        setCartItems(result.data.items || []);
        setTotalAmount(result.data.total_amount || 0);
        setTotalItems(result.data.total_items || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 初始化数据
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCart();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCart]);
  
  // 更新数量
  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch('/api/store/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_item_id: itemId, quantity }),
      });
      
      if (res.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };
  
  // 删除商品
  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/store/cart?id=${itemId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
            <h1 className="text-xl font-bold text-gray-900">购物车</h1>
            <span className="text-gray-500">{totalItems} 件商品</span>
          </div>
        </div>
      </header>
      
      {/* 内容 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {cartItems.length > 0 ? (
          <>
            {/* 商品列表 */}
            <div className="bg-white rounded-lg shadow-sm divide-y">
              {cartItems.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  {/* 图片 */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.product.images && item.product.images[0] ? (
                      <Image 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {item.product.name}
                    </h3>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      ¥{item.product.price}
                    </p>
                  </div>
                  
                  {/* 操作 */}
                  <div className="flex flex-col items-end justify-between">
                    {/* 数量控制 */}
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 min-w-10 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    
                    {/* 删除 */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 结算栏 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">
                      共 <span className="text-lg font-bold text-gray-900">{totalItems}</span> 件商品
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      ¥{totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://proclaw.cc/customer-service?store=${encodeURIComponent(subdomain)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 text-green-600 border border-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                    >
                      联系客服
                    </a>
                    <button
                      onClick={() => router.push(storePath(subdomain, 'checkout'))}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      去结算
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 空购物车 */
          <div className="bg-white rounded-lg shadow-sm p-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">购物车是空的</h3>
            <p className="mt-2 text-gray-500">快去挑选心仪的商品吧</p>
            <button
              onClick={() => router.push(storePath(subdomain))}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              去购物
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
