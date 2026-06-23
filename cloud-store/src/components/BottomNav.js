// ProClaw Cloud 托管版 - 移动端底部导航栏
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BottomNav;
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var utils_1 = require("@/lib/utils");
// 底部导航项
var bottomNavItems = [
    { href: '/app/dashboard', label: '首页', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/app/products', label: '商品', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { href: '/app/sales', label: '销售', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z' },
    { href: '/app/chat', label: '消息', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { href: '/app/agents', label: 'AI', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];
function BottomNav() {
    var pathname = (0, navigation_1.usePathname)();
    return (<>
      {/* 移动端底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map(function (item) {
            var isActive = pathname.startsWith(item.href);
            return (<link_1.default key={item.href} href={item.href} className={(0, utils_1.cn)('flex flex-col items-center justify-center flex-1 h-full transition-colors', isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700')}>
                <svg className={(0, utils_1.cn)('w-6 h-6', isActive ? 'text-blue-600' : 'text-gray-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/>
                </svg>
                <span className={(0, utils_1.cn)('text-xs mt-1', isActive ? 'font-medium' : '')}>
                  {item.label}
                </span>
              </link_1.default>);
        })}
        </div>
      </nav>

      {/* 底部导航占位（防止内容被遮挡） */}
      <div className="h-16 lg:hidden"/>
    </>);
}
