// ProClaw Shop - 用户订单中心
'use client';
"use strict";
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
exports.default = OrdersPage;
var react_1 = require("react");
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var statusMap = {
    pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: '已支付', color: 'bg-blue-100 text-blue-800' },
    processing: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
    shipped: { label: '已发货', color: 'bg-indigo-100 text-indigo-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
};
function OrdersPage() {
    var _this = this;
    var params = (0, navigation_1.useParams)();
    var subdomain = params.store || '';
    var _a = (0, react_1.useState)([]), orders = _a[0], setOrders = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)('all'), activeTab = _c[0], setActiveTab = _c[1];
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var res, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, 4, 5]);
                        return [4 /*yield*/, fetch('/api/store/orders')];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            setOrders(result.data || []);
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Failed to fetch orders:', error_1);
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); }, 0);
        return function () { return clearTimeout(timer); };
    }, []);
    var filteredOrders = orders.filter(function (order) {
        if (activeTab === 'pending')
            return order.status === 'pending' || order.status === 'paid';
        if (activeTab === 'completed')
            return order.status === 'completed' || order.status === 'cancelled';
        return true;
    });
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">我的订单</h1>
        </div>
      </header>
      
      {/* 标签页 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex">
            {[
            { key: 'all', label: '全部订单' },
            { key: 'pending', label: '待处理' },
            { key: 'completed', label: '已完成' },
        ].map(function (tab) { return (<button key={tab.key} onClick={function () { return setActiveTab(tab.key); }} className={"px-4 py-3 font-medium border-b-2 transition-colors ".concat(activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900')}>
                {tab.label}
              </button>); })}
          </div>
          <a href={"https://proclaw.cc/customer-service?store=".concat(encodeURIComponent(subdomain))} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-green-600 hover:text-green-700 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
            联系客服
          </a>
        </div>
      </div>
      
      {/* 订单列表 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {filteredOrders.length > 0 ? (<div className="space-y-4">
            {filteredOrders.map(function (order) {
                var _a, _b;
                var status = statusMap[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' };
                return (<div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* 订单头 */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="text-sm text-gray-500">
                      订单号: {order.order_no}
                    </span>
                    <span className={"px-2 py-1 text-xs font-medium rounded-full ".concat(status.color)}>
                      {status.label}
                    </span>
                  </div>
                  
                  {/* 商品列表 */}
                  <div className="divide-y">
                    {(_a = order.items) === null || _a === void 0 ? void 0 : _a.slice(0, 3).map(function (item, idx) { return (<div key={idx} className="px-4 py-3 flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded shrink-0 flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500">x{item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">¥{item.price}</p>
                      </div>); })}
                    {((_b = order.items) === null || _b === void 0 ? void 0 : _b.length) > 3 && (<div className="px-4 py-2 text-sm text-gray-500 text-center">
                        还有 {order.items.length - 3} 件商品
                      </div>)}
                  </div>
                  
                  {/* 订单底 */}
                  <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-900">
                        ¥{order.total_amount.toFixed(2)}
                      </span>
                      {order.status === 'pending' && (<button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                          去支付
                        </button>)}
                    </div>
                  </div>
                </div>);
            })}
          </div>) : (<div className="bg-white rounded-lg shadow-sm p-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">暂无订单</h3>
            <p className="mt-2 text-gray-500">快去选购心仪的商品吧</p>
            <link_1.default href="/" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              去购物
            </link_1.default>
          </div>)}
      </main>
    </div>);
}
