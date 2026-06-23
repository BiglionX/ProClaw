// ProClaw Shop - 购物车页面
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
exports.default = CartPage;
var react_1 = require("react");
var image_1 = require("next/image");
var navigation_1 = require("next/navigation");
function CartPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var params = (0, navigation_1.useParams)();
    var subdomain = params.store || '';
    var _a = (0, react_1.useState)([]), cartItems = _a[0], setCartItems = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(0), totalAmount = _c[0], setTotalAmount = _c[1];
    var _d = (0, react_1.useState)(0), totalItems = _d[0], setTotalItems = _d[1];
    // 获取购物车
    var fetchCart = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
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
                        setTotalItems(result.data.total_items || 0);
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
    }); }, []);
    // 初始化数据
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () {
            fetchCart();
        }, 0);
        return function () { return clearTimeout(timer); };
    }, [fetchCart]);
    // 更新数量
    var updateQuantity = function (itemId, quantity) { return __awaiter(_this, void 0, void 0, function () {
        var res, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch('/api/store/cart', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cart_item_id: itemId, quantity: quantity }),
                        })];
                case 1:
                    res = _a.sent();
                    if (res.ok) {
                        fetchCart();
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('Failed to update quantity:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    // 删除商品
    var removeItem = function (itemId) { return __awaiter(_this, void 0, void 0, function () {
        var res, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fetch("/api/store/cart?id=".concat(itemId), {
                            method: 'DELETE',
                        })];
                case 1:
                    res = _a.sent();
                    if (res.ok) {
                        fetchCart();
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('Failed to remove item:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={function () { return router.back(); }} className="flex items-center text-gray-600 hover:text-gray-900">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              返回
            </button>
            <h1 className="text-xl font-bold text-gray-900">购物车</h1>
            <span className="text-gray-500">{totalItems} 件商品</span>
          </div>
        </div>
      </header>
      
      {/* 内容 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {cartItems.length > 0 ? (<>
            {/* 商品列表 */}
            <div className="bg-white rounded-lg shadow-sm divide-y">
              {cartItems.map(function (item) { return (<div key={item.id} className="p-4 flex gap-4">
                  {/* 图片 */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.product.images && item.product.images[0] ? (<image_1.default src={item.product.images[0]} alt={item.product.name} fill className="object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>)}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {item.product.name}
                    </h3>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      ¥{item.product.price}
                    </p>
                  </div>
                  
                  {/* 操作 */}
                  <div className="flex flex-col items-end justify-between">
                    {/* 数量控制 */}
                    <div className="flex items-center border rounded-lg">
                      <button onClick={function () { return updateQuantity(item.id, item.quantity - 1); }} className="px-3 py-1 text-gray-600 hover:bg-gray-100">
                        -
                      </button>
                      <span className="px-3 py-1 min-w-10 text-center">
                        {item.quantity}
                      </span>
                      <button onClick={function () { return updateQuantity(item.id, item.quantity + 1); }} disabled={item.quantity >= item.product.stock} className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                        +
                      </button>
                    </div>
                    
                    {/* 删除 */}
                    <button onClick={function () { return removeItem(item.id); }} className="text-red-500 hover:text-red-600 text-sm">
                      删除
                    </button>
                  </div>
                </div>); })}
            </div>
            
            {/* 结算栏 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
              <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">
                      共 <span className="text-lg font-bold text-gray-900">{totalItems}</span> 件商品
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      ¥{totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={"https://proclaw.cc/customer-service?store=".concat(encodeURIComponent(subdomain))} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-green-600 border border-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors">
                      联系客服
                    </a>
                    <button onClick={function () { return router.push('/checkout'); }} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      去结算
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>) : (
        /* 空购物车 */
        <div className="bg-white rounded-lg shadow-sm p-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">购物车是空的</h3>
            <p className="mt-2 text-gray-500">快去挑选心仪的商品吧</p>
            <button onClick={function () { return router.push('/'); }} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              去购物
            </button>
          </div>)}
      </main>
    </div>);
}
