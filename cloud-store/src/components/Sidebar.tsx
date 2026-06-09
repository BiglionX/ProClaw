// ProClaw Cloud 托管版 - 侧边导航
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app/dashboard', label: '仪表板', icon: '📊' },
  { href: '/app/products', label: '商品管理', icon: '📦' },
  { href: '/app/purchase', label: '采购管理', icon: '📥' },
  { href: '/app/sales', label: '销售管理', icon: '📤' },
  { href: '/app/inventory', label: '库存管理', icon: '🏭' },
  { href: '/app/order-recognition', label: 'AI 订单识别', icon: '📷' },
  { href: '/app/reports', label: '数据报表', icon: '📈' },
  { href: '/app/chat', label: '消息聊天', icon: '💬' },
  { href: '/app/contacts', label: '联系人', icon: '👥' },
  { href: '/app/agents', label: 'AI 助手', icon: '🤖' },
  { href: '/app/token-billing', label: 'Token 计费', icon: '💰' },
  { href: '/app/export', label: '数据导出', icon: '📥' },
  { href: '/app/settings', label: '设置', icon: '⚙️' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-700">
          <Link href="/app/dashboard" className="text-xl font-bold">
            ProClaw Cloud
          </Link>
        </div>

        {/* 导航菜单 */}
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <Link
            href="/app/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={onClose}
          >
            <span className="text-lg">👤</span>
            <span>个人中心</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
