// 购物车页面
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCart, removeFromCart, updateCartItemQuantity, getCartTotal, CartItem } from '@/lib/api';

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCart(getCart());
  }, []);

  const handleRemove = (productId: string) => {
    const newCart = removeFromCart(productId);
    setCart([...newCart]);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newCart = updateCartItemQuantity(productId, quantity);
    setCart([...newCart]);
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
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">购物车是空的</h2>
        <p className="text-gray-500 mb-8">快去挑选心仪的商品吧</p>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">购物车</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 购物车商品列表 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="p-6 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-center space-x-4">
                  {/* 商品图片 */}
                  <div className="relative w-24 h-24 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-gray-600 mt-1">
                      ¥{item.product.price.toFixed(2)}
                    </p>
                  </div>

                  {/* 数量控制 */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>

                  {/* 小计 */}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      ¥{(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => handleRemove(item.product.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 订单摘要 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">订单摘要</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">商品总数</span>
                <span className="font-semibold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} 件
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">合计</span>
                <span className="text-2xl font-bold text-red-600">
                  ¥{total.toFixed(2)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              去结算
            </Link>

            <Link
              href="/"
              className="block w-full text-center py-3 text-blue-600 hover:underline mt-4"
            >
              继续购物
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
