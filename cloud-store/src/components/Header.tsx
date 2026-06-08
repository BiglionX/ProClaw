// 顶部导航组件
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [cartCount, setCartCount] = useState(0);

  // 客户端加载时从 localStorage 获取购物车数量
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = localStorage.getItem('cart');
        const count = cart ? JSON.parse(cart).reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) : 0;
        setCartCount(count);
      } catch {
        // 忽略解析错误
      }
    };

    // 初始加载
    updateCartCount();

    // 监听 storage 变化（其他标签页修改购物车时更新）
    window.addEventListener('storage', updateCartCount);

    // 监听自定义购物车更新事件
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-blue-600">
          ProClaw 商城
        </Link>

        {/* 搜索栏 */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="搜索商品..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 导航链接 */}
        <nav className="flex items-center space-x-6">
          <Link href="/cart" className="relative">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/orders" className="text-gray-700 hover:text-blue-600">
            我的订单
          </Link>
        </nav>
      </div>
    </header>
  );
}
