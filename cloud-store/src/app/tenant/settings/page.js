// ProClaw Cloud-Store - ProClaw Shop 设置页面
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
exports.default = StoreSettingsPage;
var react_1 = require("react");
function StoreSettingsPage() {
    var _this = this;
    var _a = (0, react_1.useState)({
        primary_color: '#3B82F6',
        secondary_color: '#60A5FA',
        accent_color: '#F59E0B',
        layout: 'grid',
        style: 'modern',
        font_family: 'Inter, system-ui, sans-serif',
        border_radius: 'medium',
        product_display: 'balanced',
        banner_style: 'carousel',
    }), theme = _a[0], setTheme = _a[1];
    var _b = (0, react_1.useState)(false), saving = _b[0], setSaving = _b[1];
    var _c = (0, react_1.useState)(null), message = _c[0], setMessage = _c[1];
    var _d = (0, react_1.useState)(false), generating = _d[0], setGenerating = _d[1];
    var _e = (0, react_1.useState)({
        phone: '',
        wechat: '',
        email: '',
    }), contactInfo = _e[0], setContactInfo = _e[1];
    (0, react_1.useEffect)(function () {
        // 加载当前设置
        var timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var res, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch('/api/ai/theme')];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        data = _a.sent();
                        if (data.success) {
                            setTheme(data.data.theme);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Failed to load settings:', error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, 0);
        return function () { return clearTimeout(timer); };
    }, []);
    var handleSaveTheme = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setSaving(true);
                    setMessage(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/ai/theme', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: theme }),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (data.success) {
                        setMessage({ type: 'success', text: '主题设置已保存' });
                    }
                    else {
                        setMessage({ type: 'error', text: data.error || '保存失败' });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    setMessage({ type: 'error', text: '保存失败' });
                    return [3 /*break*/, 6];
                case 5:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleAIGenerate = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setGenerating(true);
                    setMessage(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/ai/theme', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                business_type: 'default',
                                style_preference: 'modern',
                            }),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (data.success) {
                        setTheme(data.data.theme);
                        setMessage({ type: 'success', text: "AI \u4E3B\u9898\u751F\u6210\u6210\u529F\uFF0C\u6D88\u8017 ".concat(data.data.tokens_consumed, " Token") });
                    }
                    else {
                        setMessage({ type: 'error', text: data.error || '生成失败' });
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    setMessage({ type: 'error', text: 'AI 生成失败' });
                    return [3 /*break*/, 6];
                case 5:
                    setGenerating(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">ProClaw Shop 设置</h1>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (<div className={"mb-6 p-4 rounded-lg ".concat(message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
            {message.text}
          </div>)}

        {/* 主题设置 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">主题设置</h2>
              <p className="text-sm text-gray-500 mt-1">自定义商城外观风格</p>
            </div>
            <button onClick={handleAIGenerate} disabled={generating} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {generating ? 'AI 生成中...' : 'AI 生成主题'}
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 颜色设置 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主色调
                </label>
                <div className="flex items-center gap-3">
                  <input type="color" value={theme.primary_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { primary_color: e.target.value })); }} className="w-12 h-12 rounded cursor-pointer"/>
                  <input type="text" value={theme.primary_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { primary_color: e.target.value })); }} className="flex-1 px-3 py-2 border rounded-lg"/>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  辅助色
                </label>
                <div className="flex items-center gap-3">
                  <input type="color" value={theme.secondary_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { secondary_color: e.target.value })); }} className="w-12 h-12 rounded cursor-pointer"/>
                  <input type="text" value={theme.secondary_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { secondary_color: e.target.value })); }} className="flex-1 px-3 py-2 border rounded-lg"/>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  强调色
                </label>
                <div className="flex items-center gap-3">
                  <input type="color" value={theme.accent_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { accent_color: e.target.value })); }} className="w-12 h-12 rounded cursor-pointer"/>
                  <input type="text" value={theme.accent_color} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { accent_color: e.target.value })); }} className="flex-1 px-3 py-2 border rounded-lg"/>
                </div>
              </div>
            </div>

            {/* 布局设置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品布局
                </label>
                <select value={theme.layout} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { layout: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="grid">网格布局</option>
                  <option value="list">列表布局</option>
                  <option value="card">卡片布局</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  风格
                </label>
                <select value={theme.style} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { style: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="modern">现代</option>
                  <option value="classic">经典</option>
                  <option value="minimal">简约</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  圆角
                </label>
                <select value={theme.border_radius} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { border_radius: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="none">无</option>
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner 样式
                </label>
                <select value={theme.banner_style} onChange={function (e) { return setTheme(__assign(__assign({}, theme), { banner_style: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="carousel">轮播</option>
                  <option value="grid">网格</option>
                  <option value="fullwidth">全宽</option>
                </select>
              </div>
            </div>

            {/* 预览 */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">主题预览</h3>
              <div className="p-6 rounded-lg border-2" style={{
            backgroundColor: "".concat(theme.primary_color, "10"),
            borderColor: theme.primary_color
        }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: theme.primary_color }}>
                    Logo
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: theme.primary_color }}>示例商城</div>
                    <div className="text-sm text-gray-500">Store Preview</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(function (i) { return (<div key={i} className="aspect-square rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: theme.secondary_color }}>
                      Product {i}
                    </div>); })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveTheme} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>

        {/* 联系信息 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">联系信息</h2>
            <p className="text-sm text-gray-500 mt-1">设置商城联系方式</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input type="text" value={contactInfo.phone} onChange={function (e) { return setContactInfo(__assign(__assign({}, contactInfo), { phone: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg" placeholder="138-xxxx-xxxx"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                微信号
              </label>
              <input type="text" value={contactInfo.wechat} onChange={function (e) { return setContactInfo(__assign(__assign({}, contactInfo), { wechat: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg" placeholder="your-wechat"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input type="email" value={contactInfo.email} onChange={function (e) { return setContactInfo(__assign(__assign({}, contactInfo), { email: e.target.value })); }} className="w-full px-3 py-2 border rounded-lg" placeholder="contact@example.com"/>
            </div>
          </div>
        </div>
      </main>
    </div>);
}
