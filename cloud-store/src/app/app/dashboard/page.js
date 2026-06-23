// ProClaw Cloud 托管版 - 应用仪表板页面
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
var react_1 = require("react");
var auth_store_1 = require("@/lib/auth-store");
var tokenApi_1 = require("@/lib/tokenApi");
var utils_1 = require("@/lib/utils");
function DashboardPage() {
    var user = (0, auth_store_1.useAuthStore)().user;
    var _a = (0, react_1.useState)(null), balanceSummary = _a[0], setBalanceSummary = _a[1];
    (0, react_1.useEffect)(function () {
        if (user === null || user === void 0 ? void 0 : user.id) {
            (0, tokenApi_1.getTokenBalanceSummary)(user.id).then(setBalanceSummary).catch(function () { });
        }
    }, [user === null || user === void 0 ? void 0 : user.id]);
    // 快捷操作卡片
    var quickActions = [
        { label: '新增商品', href: '/app/products', color: 'bg-blue-500', icon: '📦' },
        { label: '创建采购单', href: '/app/purchase', color: 'bg-green-500', icon: '📥' },
        { label: '创建销售单', href: '/app/sales', color: 'bg-purple-500', icon: '📤' },
        { label: '充值 Token', href: '/app/token-billing', color: 'bg-yellow-500', icon: '💰' },
    ];
    return (<div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          欢迎回来！
        </h1>
        <p className="text-blue-100">
          {(user === null || user === void 0 ? void 0 : user.email) || 'ProClaw Cloud 用户'}
        </p>
      </div>

      {/* Token 余额概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Token 余额</div>
          <div className="text-2xl font-bold text-yellow-600">
            {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.balance) : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            今日消耗: {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.today_used) : '--'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">预估可用</div>
          <div className="text-2xl font-bold text-green-600">
            {balanceSummary ? "".concat(balanceSummary.estimated_days, "\u5929") : '--'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            日均消耗: {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.daily_avg_30d) : '--'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">商品总数</div>
          <div className="text-2xl font-bold text-blue-600">--</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">低库存预警</div>
          <div className="text-2xl font-bold text-red-600">--</div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(function (action) { return (<a key={action.label} href={action.href} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="text-sm font-medium text-gray-700">{action.label}</div>
            </a>); })}
        </div>
      </div>
    </div>);
}
