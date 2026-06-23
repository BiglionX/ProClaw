// ProClaw Cloud 托管版 - AI 订单识别页面
// 支持拍照/上传图片识别订单
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
exports.default = OrderRecognitionPage;
var react_1 = require("react");
var image_1 = require("next/image");
var navigation_1 = require("next/navigation");
var react_hot_toast_1 = require("react-hot-toast");
function OrderRecognitionPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var fileInputRef = (0, react_1.useRef)(null);
    var cameraInputRef = (0, react_1.useRef)(null);
    // 状态
    var _a = (0, react_1.useState)('sales'), orderType = _a[0], setOrderType = _a[1];
    var _b = (0, react_1.useState)(null), selectedImage = _b[0], setSelectedImage = _b[1];
    var _c = (0, react_1.useState)(null), selectedFile = _c[0], setSelectedFile = _c[1];
    var _d = (0, react_1.useState)(false), uploading = _d[0], setUploading = _d[1];
    var _e = (0, react_1.useState)(false), recognizing = _e[0], setRecognizing = _e[1];
    var _f = (0, react_1.useState)(null), ocrResult = _f[0], setOcrResult = _f[1];
    var _g = (0, react_1.useState)([]), history = _g[0], setHistory = _g[1];
    var _h = (0, react_1.useState)(false), loadingHistory = _h[0], setLoadingHistory = _h[1];
    var _j = (0, react_1.useState)(false), showHistory = _j[0], setShowHistory = _j[1];
    // 处理文件选择
    var handleFileSelect = (0, react_1.useCallback)(function (e) {
        var _a;
        var file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            react_hot_toast_1.default.error('请选择图片文件');
            return;
        }
        // 检查文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            react_hot_toast_1.default.error('图片大小不能超过 10MB');
            return;
        }
        setSelectedFile(file);
        var reader = new FileReader();
        reader.onload = function (event) {
            var _a;
            setSelectedImage((_a = event.target) === null || _a === void 0 ? void 0 : _a.result);
            setOcrResult(null);
        };
        reader.readAsDataURL(file);
    }, []);
    // 上传图片
    var uploadImage = function () { return __awaiter(_this, void 0, void 0, function () {
        var formData, res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!selectedFile)
                        return [2 /*return*/, null];
                    setUploading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    formData = new FormData();
                    formData.append('file', selectedFile);
                    return [4 /*yield*/, fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success && result.data) {
                        return [2 /*return*/, result.data.url];
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '图片上传失败');
                        return [2 /*return*/, null];
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('图片上传失败');
                    return [2 /*return*/, null];
                case 5:
                    setUploading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // 执行识别
    var handleRecognize = function () { return __awaiter(_this, void 0, void 0, function () {
        var imageUrl, res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!selectedImage) {
                        react_hot_toast_1.default.error('请先选择图片');
                        return [2 /*return*/];
                    }
                    setRecognizing(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, uploadImage()];
                case 2:
                    imageUrl = _b.sent();
                    if (!imageUrl) {
                        setRecognizing(false);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fetch('/api/ai/ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageUrl: imageUrl, type: orderType }),
                        })];
                case 3:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 4:
                    result = _b.sent();
                    if (result.success) {
                        setOcrResult(result.data);
                        react_hot_toast_1.default.success("\u8BC6\u522B\u5B8C\u6210\uFF0C\u6D88\u8017 ".concat(result.tokensUsed, " Token"));
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '识别失败');
                    }
                    return [3 /*break*/, 7];
                case 5:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('识别失败，请重试');
                    return [3 /*break*/, 7];
                case 6:
                    setRecognizing(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    // 创建订单
    var handleCreateOrder = function () {
        if (!ocrResult || ocrResult.items.length === 0) {
            react_hot_toast_1.default.error('没有可创建订单的商品');
            return;
        }
        // 将识别结果存储到 sessionStorage（临时方案）
        sessionStorage.setItem('ocr_order_items', JSON.stringify(ocrResult.items));
        sessionStorage.setItem('ocr_order_type', orderType);
        // 跳转到对应的订单创建页面
        if (orderType === 'purchase') {
            router.push('/app/purchase?from=ocr');
        }
        else {
            router.push('/app/sales?from=ocr');
        }
    };
    // 加载历史记录
    var loadHistory = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setLoadingHistory(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/ai/ocr')];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.data) {
                        setHistory(result.data);
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('加载历史记录失败');
                    return [3 /*break*/, 6];
                case 5:
                    setLoadingHistory(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // 切换历史记录显示
    var toggleHistory = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!showHistory) return [3 /*break*/, 2];
                    return [4 /*yield*/, loadHistory()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    setShowHistory(!showHistory);
                    return [2 /*return*/];
            }
        });
    }); };
    // 重新选择图片
    var handleReselect = function () {
        setSelectedImage(null);
        setSelectedFile(null);
        setOcrResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    return (<div className="max-w-6xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 订单识别</h1>
          <p className="text-sm text-gray-500 mt-1">拍照或上传订单图片，AI 自动识别商品信息</p>
        </div>
        <button onClick={toggleHistory} className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          {showHistory ? '收起历史' : '查看历史'}
        </button>
      </div>

      {/* 历史记录面板 */}
      {showHistory && (<div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-3">识别历史</h3>
          {loadingHistory ? (<div className="text-center py-8 text-gray-400">加载中...</div>) : history.length === 0 ? (<div className="text-center py-8 text-gray-400">暂无历史记录</div>) : (<div className="space-y-3 max-h-64 overflow-y-auto">
              {history.map(function (item) {
                    var _a;
                    return (<div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.image_url && (<image_1.default src={item.image_url} alt="订单图片" width={48} height={48} className="rounded-lg object-cover"/>)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.type === 'purchase' ? '采购订单' : '销售订单'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {((_a = JSON.parse(item.result || '{}').items) === null || _a === void 0 ? void 0 : _a.length) || 0} 件商品
                  </div>
                </div>);
                })}
            </div>)}
        </div>)}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：图片上传 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* 订单类型切换 */}
          <div className="flex gap-2 mb-4">
            <button onClick={function () { return setOrderType('sales'); }} className={"flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ".concat(orderType === 'sales'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              销售订单
            </button>
            <button onClick={function () { return setOrderType('purchase'); }} className={"flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ".concat(orderType === 'purchase'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              采购订单
            </button>
          </div>

          {/* 图片预览区 */}
          <div className={"relative border-2 border-dashed rounded-xl ".concat(selectedImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300')} style={{ minHeight: '300px' }}>
            {selectedImage ? (<div className="relative w-full h-full">
                <image_1.default src={selectedImage} alt="选择的图片" fill className="object-contain rounded-xl"/>
                <button onClick={handleReselect} className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>) : (<div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <p className="text-sm mb-4">点击下方按钮选择图片</p>
                <p className="text-xs">支持 JPG、PNG、GIF 格式，最大 10MB</p>
              </div>)}
          </div>

          {/* 上传按钮 */}
          <div className="flex gap-3 mt-4">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect}/>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect}/>
            <button onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} disabled={uploading || recognizing} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              选择图片
            </button>
            <button onClick={function () { var _a; return (_a = cameraInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} disabled={uploading || recognizing} className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              拍照
            </button>
          </div>

          {/* 识别按钮 */}
          <button onClick={handleRecognize} disabled={!selectedImage || uploading || recognizing} className="w-full mt-3 py-3 px-4 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
            {recognizing ? (<>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                AI 识别中...
              </>) : (<>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                开始 AI 识别
              </>)}
          </button>

          {/* Token 消耗提示 */}
          <p className="text-xs text-gray-400 text-center mt-3">
            每次识别消耗 5 Token（图片上传另计）
          </p>
        </div>

        {/* 右侧：识别结果 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            识别结果 {orderType === 'sales' ? '（销售订单）' : '（采购订单）'}
          </h3>

          {!ocrResult ? (<div className="flex flex-col items-center justify-center h-80 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p className="text-sm">上传图片后自动显示识别结果</p>
            </div>) : (<div className="space-y-4">
              {/* 订单信息 */}
              {(ocrResult.customerName || ocrResult.orderDate) && (<div className="bg-gray-50 rounded-lg p-3">
                  {ocrResult.customerName && (<div className="text-sm">
                      <span className="text-gray-500">客户：</span>
                      <span className="font-medium text-gray-900">{ocrResult.customerName}</span>
                    </div>)}
                  {ocrResult.orderDate && (<div className="text-sm mt-1">
                      <span className="text-gray-500">日期：</span>
                      <span className="text-gray-900">{ocrResult.orderDate}</span>
                    </div>)}
                </div>)}

              {/* 商品列表 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">商品</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">数量</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">单价</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">小计</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ocrResult.items.map(function (item, index) { return (<tr key={index}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          {item.sku && (<div className="text-xs text-gray-400">{item.sku}</div>)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">¥{item.unitPrice}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          ¥{item.totalPrice}
                        </td>
                      </tr>); })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-gray-600">
                        合计
                      </td>
                      <td className="px-3 py-2 text-right text-lg font-bold text-blue-600">
                        ¥{ocrResult.total}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 备注 */}
              {ocrResult.notes && (<div className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">
                  <span className="font-medium text-yellow-700">备注：</span>
                  {ocrResult.notes}
                </div>)}

              {/* 原始文本 */}
              {ocrResult.rawText && (<details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                    查看原始识别文本
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 whitespace-pre-wrap">
                    {ocrResult.rawText}
                  </pre>
                </details>)}

              {/* 创建订单按钮 */}
              <button onClick={handleCreateOrder} disabled={ocrResult.items.length === 0} className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                创建 {orderType === 'sales' ? '销售' : '采购'} 订单
              </button>
            </div>)}
        </div>
      </div>

      {/* 使用提示 */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">识别技巧</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. 确保图片清晰，光线充足，避免反光</li>
          <li>2. 尽量包含完整的订单信息（商品名称、数量、价格）</li>
          <li>3. 支持手写订单、打印订单、截图等多种格式</li>
          <li>4. 识别结果可编辑，创建订单前请核对商品信息</li>
        </ul>
      </div>
    </div>);
}
