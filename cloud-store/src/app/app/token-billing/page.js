// ProClaw Cloud 托管版 - Token 计费页面 (增强版)
// 支持真实支付集成 + 支付状态轮询
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
exports.default = TokenBillingPage;
var react_1 = require("react");
var auth_store_1 = require("@/lib/auth-store");
var tokenApi_1 = require("@/lib/tokenApi");
var utils_1 = require("@/lib/utils");
var react_hot_toast_1 = require("react-hot-toast");
function TokenBillingPage() {
    var _this = this;
    var _a;
    var user = (0, auth_store_1.useAuthStore)().user;
    var _b = (0, react_1.useState)(null), balanceSummary = _b[0], setBalanceSummary = _b[1];
    var _c = (0, react_1.useState)([]), pricingRules = _c[0], setPricingRules = _c[1];
    var _d = (0, react_1.useState)([]), packages = _d[0], setPackages = _d[1];
    var _e = (0, react_1.useState)(null), consumption = _e[0], setConsumption = _e[1];
    var _f = (0, react_1.useState)([]), purchaseRecords = _f[0], setPurchaseRecords = _f[1];
    var _g = (0, react_1.useState)('overview'), activeTab = _g[0], setActiveTab = _g[1];
    var _h = (0, react_1.useState)(false), showPaymentModal = _h[0], setShowPaymentModal = _h[1];
    var _j = (0, react_1.useState)(null), selectedPackage = _j[0], setSelectedPackage = _j[1];
    var _k = (0, react_1.useState)('alipay'), paymentMethod = _k[0], setPaymentMethod = _k[1];
    var _l = (0, react_1.useState)(false), processing = _l[0], setProcessing = _l[1];
    var _m = (0, react_1.useState)(null), paymentResult = _m[0], setPaymentResult = _m[1];
    var fetchPurchaseRecords = function () { return __awaiter(_this, void 0, void 0, function () {
        var data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(user === null || user === void 0 ? void 0 : user.id))
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/payment/records')];
                case 2: return [4 /*yield*/, (_b.sent()).json()];
                case 3:
                    data = (_b.sent()).data;
                    if (data) {
                        setPurchaseRecords(data);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (!(user === null || user === void 0 ? void 0 : user.id))
            return;
        (0, tokenApi_1.getTokenBalanceSummary)(user.id).then(setBalanceSummary).catch(function () { });
        (0, tokenApi_1.getTokenPricing)().then(setPricingRules).catch(function () { });
        (0, tokenApi_1.getTokenPackages)().then(setPackages).catch(function () { });
        (0, tokenApi_1.getTokenConsumption)(user.id).then(setConsumption).catch(function () { });
        fetch('/api/payment/records').then(function (res) { return res.json(); }).then(function (result) {
            if (result.data) {
                setPurchaseRecords(result.data);
            }
        }).catch(function () { });
    }, [user === null || user === void 0 ? void 0 : user.id]);
    var handleOpenPayment = function (pkg) {
        setSelectedPackage(pkg);
        setPaymentResult(null);
        setShowPaymentModal(true);
    };
    var handlePay = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a, orderNo, orderId, notifyRes, notifyResult, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!selectedPackage || !(user === null || user === void 0 ? void 0 : user.id))
                        return [2 /*return*/];
                    setProcessing(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, 11, 12]);
                    return [4 /*yield*/, fetch('/api/payment/create-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ packageId: selectedPackage.id, paymentMethod: paymentMethod }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _c.sent();
                    if (!result.success) return [3 /*break*/, 8];
                    _a = result.data, orderNo = _a.orderNo, orderId = _a.orderId;
                    if (!(paymentMethod === 'mock')) return [3 /*break*/, 6];
                    return [4 /*yield*/, fetch('/api/payment/notify', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderNo: orderNo, status: 'completed' }),
                        })];
                case 4:
                    notifyRes = _c.sent();
                    return [4 /*yield*/, notifyRes.json()];
                case 5:
                    notifyResult = _c.sent();
                    if (notifyResult.success) {
                        react_hot_toast_1.toast.success("\u8D2D\u4E70\u6210\u529F\uFF01".concat(selectedPackage.token_amount.toLocaleString(), " PT \u5DF2\u5230\u8D26"));
                        setPaymentResult({ orderNo: orderNo, status: 'completed' });
                        // 刷新数据
                        (0, tokenApi_1.getTokenBalanceSummary)(user.id).then(setBalanceSummary);
                        fetchPurchaseRecords();
                    }
                    else {
                        react_hot_toast_1.toast.error(notifyResult.error || '支付处理失败');
                    }
                    return [3 /*break*/, 7];
                case 6:
                    // 真实支付：显示支付二维码/跳转
                    setPaymentResult({ orderNo: orderNo, status: 'pending' });
                    // 开始轮询支付状态
                    pollPaymentStatus(orderId || orderNo);
                    _c.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    react_hot_toast_1.toast.error(result.error || '创建订单失败');
                    _c.label = 9;
                case 9: return [3 /*break*/, 12];
                case 10:
                    _b = _c.sent();
                    react_hot_toast_1.toast.error('支付处理失败');
                    return [3 /*break*/, 12];
                case 11:
                    setProcessing(false);
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    }); };
    var pollPaymentStatus = function (orderNo) { return __awaiter(_this, void 0, void 0, function () {
        var maxAttempts, attempts, poll;
        var _this = this;
        return __generator(this, function (_a) {
            maxAttempts = 30;
            attempts = 0;
            poll = function () { return __awaiter(_this, void 0, void 0, function () {
                var res, result, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (attempts >= maxAttempts) {
                                react_hot_toast_1.toast.error('支付超时，请刷新页面查看状态');
                                return [2 /*return*/];
                            }
                            attempts++;
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, fetch("/api/payment/query?orderNo=".concat(orderNo))];
                        case 2:
                            res = _b.sent();
                            return [4 /*yield*/, res.json()];
                        case 3:
                            result = _b.sent();
                            if (result.success) {
                                if (result.data.status === 'completed') {
                                    react_hot_toast_1.toast.success('支付成功！Token 已到账');
                                    setPaymentResult({ orderNo: orderNo, status: 'completed' });
                                    (0, tokenApi_1.getTokenBalanceSummary)((user === null || user === void 0 ? void 0 : user.id) || '').then(setBalanceSummary);
                                    fetchPurchaseRecords();
                                    return [2 /*return*/];
                                }
                                if (result.data.status === 'failed') {
                                    react_hot_toast_1.toast.error('支付失败');
                                    setPaymentResult({ orderNo: orderNo, status: 'failed' });
                                    return [2 /*return*/];
                                }
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 5];
                        case 5:
                            setTimeout(poll, 3000);
                            return [2 /*return*/];
                    }
                });
            }); };
            setTimeout(poll, 3000);
            return [2 /*return*/];
        });
    }); };
    var tabs = [
        { key: 'overview', label: '余额概览' },
        { key: 'packages', label: '充值套餐' },
        { key: 'consumption', label: '消费明细' },
        { key: 'records', label: '购买记录' },
    ];
    return (<div className="max-w-4xl mx-auto space-y-6">
      <react_hot_toast_1.Toaster position="top-center"/>
      <h1 className="text-2xl font-bold text-gray-900">Token 计费</h1>

      {/* Tab 导航 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(function (tab) { return (<button key={tab.key} onClick={function () { return setActiveTab(tab.key); }} className={"flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900')}>
            {tab.label}
          </button>); })}
      </div>

      {/* 余额概览 */}
      {activeTab === 'overview' && (<div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">当前余额</div>
              <div className="text-3xl font-bold text-yellow-600">
                {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.balance) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">PT (ProClaw Token)</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">今日消耗</div>
              <div className="text-3xl font-bold text-orange-600">
                {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.today_used) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                预估可用 {(_a = balanceSummary === null || balanceSummary === void 0 ? void 0 : balanceSummary.estimated_days) !== null && _a !== void 0 ? _a : '--'} 天
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">日均消耗</div>
              <div className="text-3xl font-bold text-blue-600">
                {balanceSummary ? (0, utils_1.formatTokens)(balanceSummary.daily_avg_30d) : '--'}
              </div>
              <div className="text-xs text-gray-400 mt-2">近 30 天平均</div>
            </div>
          </div>

          {/* 定价规则 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Token 消耗标准</h2>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">操作</th>
                      <th className="pb-2 font-medium text-right">消耗 (PT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRules.map(function (rule) { return (<tr key={rule.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-900">
                          {rule.action_name}
                          {rule.description && (<span className="text-gray-400 text-xs ml-2">({rule.description})</span>)}
                        </td>
                        <td className="py-2.5 text-right font-medium">{rule.pt_cost}</td>
                      </tr>); })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>)}

      {/* 充值套餐 */}
      {activeTab === 'packages' && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(function (pkg) { return (<div key={pkg.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-bold text-blue-600">{(0, utils_1.formatTokens)(pkg.token_amount)}</span>
                <span className="text-gray-500 text-sm ml-1">PT</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                ¥{pkg.price.toFixed(2)}
              </div>
              {pkg.discount_percentage > 0 && (<div className="mt-1 text-sm text-green-600">
                  优惠 {pkg.discount_percentage}%
                  <span className="text-gray-400 ml-1">
                    ({(pkg.price / pkg.token_amount * 1000).toFixed(2)} 元/千 PT)
                  </span>
                </div>)}
              {pkg.description && (<p className="mt-3 text-sm text-gray-500 flex-1">{pkg.description}</p>)}
              <button onClick={function () { return handleOpenPayment(pkg); }} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                立即购买
              </button>
            </div>); })}
        </div>)}

      {/* 消费明细 */}
      {activeTab === 'consumption' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">消费明细</h2>
          </div>
          <div className="p-4">
            {!consumption || consumption.items.length === 0 ? (<p className="text-center text-gray-500 py-8">暂无消费记录</p>) : (<div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">操作类型</th>
                      <th className="pb-2 font-medium text-right">消耗</th>
                      <th className="pb-2 font-medium text-right">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumption.items.map(function (item) { return (<tr key={item.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-900">{item.resource_type}</td>
                        <td className="py-2.5 text-right font-medium text-orange-600">
                          -{item.tokens_used} PT
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>); })}
                  </tbody>
                </table>
              </div>)}
          </div>
        </div>)}

      {/* 购买记录 */}
      {activeTab === 'records' && (<div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">购买记录</h2>
          </div>
          <div className="p-4">
            {purchaseRecords.length === 0 ? (<p className="text-center text-gray-500 py-8">暂无购买记录</p>) : (<div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">订单号</th>
                      <th className="pb-2 font-medium">金额</th>
                      <th className="pb-2 font-medium">Token</th>
                      <th className="pb-2 font-medium">状态</th>
                      <th className="pb-2 font-medium text-right">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRecords.map(function (record) { return (<tr key={record.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-gray-600 text-xs font-mono">{record.orderNo}</td>
                        <td className="py-2.5 text-gray-900">¥{record.amount.toFixed(2)}</td>
                        <td className="py-2.5 font-medium">{(0, utils_1.formatTokens)(record.tokenAmount)} PT</td>
                        <td className="py-2.5">
                          <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium ".concat(record.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : record.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700')}>
                            {record.status === 'completed' ? '已完成' : record.status === 'pending' ? '处理中' : '失败'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>); })}
                  </tbody>
                </table>
              </div>)}
          </div>
        </div>)}

      {/* 支付模态框 */}
      {showPaymentModal && selectedPackage && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return !processing && setShowPaymentModal(false); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={function (e) { return e.stopPropagation(); }}>
            {paymentResult ? (<div className="text-center py-4">
                <div className={"text-5xl mb-4 ".concat(paymentResult.status === 'completed' ? 'text-green-500' : 'text-yellow-500')}>
                  {paymentResult.status === 'completed' ? '✅' : '⏳'}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {paymentResult.status === 'completed' ? '支付成功' : '支付处理中'}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {paymentResult.status === 'completed'
                    ? "".concat(selectedPackage.token_amount.toLocaleString(), " PT \u5DF2\u5230\u8D26")
                    : '请完成支付，系统将在支付成功后自动充值'}
                </p>
                {paymentResult.status === 'completed' ? (<button onClick={function () { return setShowPaymentModal(false); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    完成
                  </button>) : (<p className="text-xs text-gray-400">订单号: {paymentResult.orderNo}</p>)}
              </div>) : (<>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">确认购买</h2>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">套餐</span>
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Token 数量</span>
                    <span className="font-medium">{(0, utils_1.formatTokens)(selectedPackage.token_amount)} PT</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">实付金额</span>
                    <span className="text-xl font-bold text-blue-600">
                      ¥{(selectedPackage.price * (1 - selectedPackage.discount_percentage / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 支付方式选择 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">支付方式</label>
                  <div className="flex gap-2">
                    <button onClick={function () { return setPaymentMethod('alipay'); }} className={"flex-1 py-2 px-3 rounded-lg border text-sm font-medium ".concat(paymentMethod === 'alipay'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400')}>
                      支付宝
                    </button>
                    <button onClick={function () { return setPaymentMethod('wechat'); }} className={"flex-1 py-2 px-3 rounded-lg border text-sm font-medium ".concat(paymentMethod === 'wechat'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400')}>
                      微信支付
                    </button>
                    <button onClick={function () { return setPaymentMethod('mock'); }} className={"flex-1 py-2 px-3 rounded-lg border text-sm font-medium ".concat(paymentMethod === 'mock'
                    ? 'border-gray-500 bg-gray-100 text-gray-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400')}>
                      模拟支付
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={function () { return setShowPaymentModal(false); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" disabled={processing}>
                    取消
                  </button>
                  <button onClick={handlePay} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50" disabled={processing}>
                    {processing ? '处理中...' : '确认支付'}
                  </button>
                </div>
              </>)}
          </div>
        </div>)}
    </div>);
}
