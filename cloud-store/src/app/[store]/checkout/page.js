// ProClaw Shop - 结算页面
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
exports.default = CheckoutPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
function CheckoutPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var _a = (0, react_1.useState)([]), cartItems = _a[0], setCartItems = _a[1];
    var _b = (0, react_1.useState)(0), totalAmount = _b[0], setTotalAmount = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), submitting = _d[0], setSubmitting = _d[1];
    // 表单数据
    var _e = (0, react_1.useState)({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        payment_method: 'mock',
        remark: '',
    }), formData = _e[0], setFormData = _e[1];
    // 加载购物车数据
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var res, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, 4, 5]);
                        return [4 /*yield*/, fetch('/api/store/cart')];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            setCartItems(result.data.items || []);
                            setTotalAmount(result.data.total_amount || 0);
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Failed to fetch cart:', error_1);
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
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var res, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (!formData.customer_name || !formData.customer_phone || !formData.customer_address) {
                        alert('请填写完整的收货信息');
                        return [2 /*return*/];
                    }
                    setSubmitting(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/store/orders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(formData),
                        })];
                case 2:
                    res = _a.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        router.push("/checkout/success?order_id=".concat(result.data.order_id));
                    }
                    else {
                        alert(result.error || '创建订单失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    console.error('Failed to create order:', error_2);
                    alert('创建订单失败，请重试');
                    return [3 /*break*/, 6];
                case 5:
                    setSubmitting(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>);
    }
    if (cartItems.length === 0) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">购物车是空的</h2>
          <p className="text-gray-500 mb-4">请先添加商品到购物车</p>
          <button onClick={function () { return router.back(); }} className="text-blue-600 hover:text-blue-800">
            返回商城
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">确认订单</h1>
        
        {/* 商品列表 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">商品清单</h2>
          {cartItems.map(function (item) { return (<div key={item.id} className="flex items-center py-3 border-b last:border-b-0">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-500">x{item.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900">
                ¥{(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>); })}
        </div>
        
        {/* 收货信息表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">收货信息</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收货人姓名 *
              </label>
              <input type="text" required value={formData.customer_name} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { customer_name: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="请输入收货人姓名"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手机号码 *
              </label>
              <input type="tel" required value={formData.customer_phone} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { customer_phone: e.target.value })); }} pattern="^1[3-9]\d{9}$" maxLength={11} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="请输入11位手机号码"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                收货地址 *
              </label>
              <textarea required rows={3} value={formData.customer_address} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { customer_address: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="请输入详细收货地址"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <input type="text" value={formData.remark} onChange={function (e) { return setFormData(__assign(__assign({}, formData), { remark: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="可选：备注信息"/>
            </div>
          </div>
          
          {/* 订单摘要 */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700">订单总额</span>
              <span className="text-2xl font-bold text-red-600">
                ¥{totalAmount.toFixed(2)}
              </span>
            </div>
            
            <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {submitting ? '提交中...' : '提交订单'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
