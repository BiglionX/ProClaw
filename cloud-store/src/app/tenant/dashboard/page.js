// ProClaw Shop - 商户后台仪表板
'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TenantDashboard;
var react_1 = require("react");
var link_1 = require("next/link");
function TenantDashboard() {
    var _this = this;
    var _a = (0, react_1.useState)({
        token_balance: 0,
        token_used: 0,
        total_orders: 0,
        total_products: 0,
        today_orders: 0,
        today_revenue: 0,
    }), stats = _a[0], setStats = _a[1];
    var _b = (0, react_1.useState)([]), recentOrders = _b[0], setRecentOrders = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var tokenRes, tokenData_1, ordersRes, ordersData, orders_1, today_1, todayOrders_1, productsRes, productsData_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, 8, 9]);
                        return [4 /*yield*/, fetch('/api/tenant/token')];
                    case 1:
                        tokenRes = _a.sent();
                        return [4 /*yield*/, tokenRes.json()];
                    case 2:
                        tokenData_1 = _a.sent();
                        if (tokenData_1.success) {
                            setStats(function (prev) { return (__assign(__assign({}, prev), { token_balance: tokenData_1.data.balance, token_used: tokenData_1.data.used })); });
                        }
                        return [4 /*yield*/, fetch('/api/store/orders')];
                    case 3:
                        ordersRes = _a.sent();
                        return [4 /*yield*/, ordersRes.json()];
                    case 4:
                        ordersData = _a.sent();
                        if (ordersData.success) {
                            orders_1 = ordersData.data || [];
                            today_1 = new Date().toDateString();
                            todayOrders_1 = orders_1.filter(function (o) { return new Date(o.created_at).toDateString() === today_1; });
                            setStats(function (prev) { return (__assign(__assign({}, prev), { total_orders: orders_1.length, today_orders: todayOrders_1.length, today_revenue: todayOrders_1.reduce(function (sum, o) { return sum + o.total_amount; }, 0) })); });
                            setRecentOrders(orders_1.slice(0, 5));
                        }
                        return [4 /*yield*/, fetch('/api/tenant/products/sync')];
                    case 5:
                        productsRes = _a.sent();
                        return [4 /*yield*/, productsRes.json()];
                    case 6:
                        productsData_1 = _a.sent();
                        if (productsData_1.success) {
                            setStats(function (prev) { return (__assign(__assign({}, prev), { total_products: productsData_1.data.total || 0 })); });
                        }
                        return [3 /*break*/, 9];
                    case 7:
                        error_1 = _a.sent();
                        console.error('Failed to fetch dashboard data:', error_1);
                        return [3 /*break*/, 9];
                    case 8:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        }); }, 0);
        return function () { return clearTimeout(timer); };
    }, []);
    if (loading) {
        return (<div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">ProClaw Shop 管理后台</h1>
            <div className="flex items-center gap-4">
              <link_1.default href="/auth/scan" className="text-gray-500 hover:text-gray-900">
                扫码登录
              </link_1.default>
              <span className="text-sm text-gray-500">
                Token: {stats.token_balance}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">Token 余额</div>
            <div className="text-2xl font-bold text-blue-600">{stats.token_balance}</div>
            <div className="text-sm text-gray-400 mt-1">已使用 {stats.token_used}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">今日订单</div>
            <div className="text-2xl font-bold text-green-600">{stats.today_orders}</div>
            <div className="text-sm text-gray-400 mt-1">销售额 ¥{stats.today_revenue.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">总订单数</div>
            <div className="text-2xl font-bold text-purple-600">{stats.total_orders}</div>
            <div className="text-sm text-gray-400 mt-1">全部订单</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-1">商品数量</div>
            <div className="text-2xl font-bold text-orange-600">{stats.total_products}</div>
            <div className="text-sm text-gray-400 mt-1">已上架商品</div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">快捷操作</h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <link_1.default href="/tenant/products" className="flex flex-col items-center p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <span className="text-sm font-medium text-gray-900">商品管理</span>
            </link_1.default>

            <link_1.default href="/tenant/orders" className="flex flex-col items-center p-4 rounded-lg border hover:border-green-500 hover:bg-green-50 transition-colors">
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span className="text-sm font-medium text-gray-900">订单管理</span>
            </link_1.default>

            <link_1.default href="/tenant/token" className="flex flex-col items-center p-4 rounded-lg border hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm font-medium text-gray-900">充值 Token</span>
            </link_1.default>

            <a href="https://proclaw.cc/customer-service" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 rounded-lg border hover:border-green-500 hover:bg-green-50 transition-colors">
              <svg className="w-8 h-8 text-green-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              <span className="text-sm font-medium text-gray-900">客服管理</span>
            </a>

            <link_1.default href="/tenant/settings" className="flex flex-col items-center p-4 rounded-lg border hover:border-gray-500 hover:bg-gray-50 transition-colors">
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span className="text-sm font-medium text-gray-900">商城设置</span>
            </link_1.default>
          </div>
        </div>

        {/* 最近订单 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近订单</h2>
            <link_1.default href="/tenant/orders" className="text-blue-600 hover:text-blue-800 text-sm">
              查看全部 &rarr;
            </link_1.default>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length > 0 ? (<table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map(function (order) { return (<tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{order.order_no}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.customer_name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">¥{order.total_amount}</td>
                      <td className="px-6 py-4">
                        <span className={"px-2 py-1 text-xs font-medium rounded-full ".concat(order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800')}>
                          {order.status === 'completed' ? '已完成' :
                    order.status === 'paid' ? '已支付' :
                        order.status === 'pending' ? '待支付' :
                            order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>); })}
                </tbody>
              </table>) : (<div className="p-12 text-center text-gray-500">
                暂无订单数据
              </div>)}
          </div>
        </div>
      </main>
    </div>);
}
