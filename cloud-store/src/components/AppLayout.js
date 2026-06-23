// ProClaw Cloud 托管版 - 应用布局（包含侧边栏 + 顶栏 + 移动端底部导航）
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AppLayout;
var react_1 = require("react");
var Sidebar_1 = require("@/components/Sidebar");
var TopBar_1 = require("@/components/TopBar");
var BottomNav_1 = require("@/components/BottomNav");
var CustomerServiceProvider_1 = require("@/components/CustomerService/CustomerServiceProvider");
function AppLayout(_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)(false), sidebarOpen = _b[0], setSidebarOpen = _b[1];
    return (<div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <Sidebar_1.default isOpen={sidebarOpen} onClose={function () { return setSidebarOpen(false); }}/>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar_1.default onMenuClick={function () { return setSidebarOpen(!sidebarOpen); }}/>
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <BottomNav_1.default />

      {/* AI 客服悬浮组件 */}
      <CustomerServiceProvider_1.default />
    </div>);
}
