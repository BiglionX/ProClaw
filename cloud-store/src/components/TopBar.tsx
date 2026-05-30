// ProClaw Cloud 托管版 - 顶部导航栏
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getTokenBalance } from '@/lib/tokenApi';
import { formatTokens } from '@/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuthStore();
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      getTokenBalance(user.id).then(setTokenBalance).catch(() => setTokenBalance(0));
    }

    // 每 30 秒刷新一次余额
    const interval = setInterval(async () => {
      if (user?.id) {
        const balance = await getTokenBalance(user.id);
        setTokenBalance(balance);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* 左侧：移动端菜单按钮 + 页面标题 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          aria-label="打开菜单"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* 右侧：Token 余额 + 用户信息 */}
      <div className="flex items-center gap-4">
        {/* Token 余额 */}
        <div className="hidden sm:flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
          <span className="text-yellow-600 text-sm font-medium">Token:</span>
          <span className="text-yellow-800 font-bold">{formatTokens(tokenBalance)}</span>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user?.email || ''}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
