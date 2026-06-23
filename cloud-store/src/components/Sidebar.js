// ProClaw Cloud 托管版 - 侧边导航
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sidebar;
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var utils_1 = require("@/lib/utils");
var navItems = [
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
function Sidebar(_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose;
    var pathname = (0, navigation_1.usePathname)();
    return (<>
      {/* 移动端遮罩 */}
      {isOpen && (<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose}/>)}

      {/* 侧边栏 */}
      <aside className={(0, utils_1.cn)('fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto', isOpen ? 'translate-x-0' : '-translate-x-full')}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-700">
          <link_1.default href="/app/dashboard" className="text-xl font-bold">
            ProClaw Cloud
          </link_1.default>
        </div>

        {/* 导航菜单 */}
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map(function (item) {
            var isActive = pathname.startsWith(item.href);
            return (<link_1.default key={item.href} href={item.href} onClick={onClose} className={(0, utils_1.cn)('flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors', isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white')}>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </link_1.default>);
        })}
        </nav>

        {/* 底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <link_1.default href="/app/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors" onClick={onClose}>
            <span className="text-lg">👤</span>
            <span>个人中心</span>
          </link_1.default>
        </div>
      </aside>
    </>);
}
