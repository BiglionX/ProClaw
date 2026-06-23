// ProClaw Shop - 商户注册页面
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
exports.default = TenantRegisterPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var link_1 = require("next/link");
var react_hot_toast_1 = require("react-hot-toast");
function TenantRegisterPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var _a = (0, react_1.useState)(1), step = _a[0], setStep = _a[1];
    var _b = (0, react_1.useState)(false), loading = _b[0], setLoading = _b[1];
    // 表单数据
    var _c = (0, react_1.useState)({
        name: '',
        email: '',
        phone: '',
        subdomain: '',
        customSubdomain: false,
    }), formData = _c[0], setFormData = _c[1];
    // 子域名建议
    var _d = (0, react_1.useState)([]), subdomainSuggestions = _d[0], setSubdomainSuggestions = _d[1];
    // 验证错误
    var _e = (0, react_1.useState)({}), errors = _e[0], setErrors = _e[1];
    // 生成子域名建议
    var generateSubdomainSuggestions = function (name) {
        var base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
        var suggestions = [];
        if (base.length >= 2) {
            suggestions.push(base);
        }
        for (var i = 1; i <= 4; i++) {
            var s = "".concat(base).concat(i);
            if (s.length >= 2)
                suggestions.push(s);
        }
        var prefixes = ['my', 'shop', 'store'];
        prefixes.forEach(function (p) {
            if (suggestions.length < 5) {
                suggestions.push("".concat(p, "-").concat(base));
            }
        });
        setSubdomainSuggestions(suggestions.slice(0, 5));
    };
    // 输入处理
    var handleInputChange = function (e) {
        var _a = e.target, name = _a.name, value = _a.value;
        setFormData(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[name] = value, _a)));
        });
        setErrors(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[name] = '', _a)));
        });
        if (name === 'name' && value.length > 2) {
            generateSubdomainSuggestions(value);
        }
    };
    // 验证表单
    var validateStep1 = function () {
        var newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = '请输入商户名称';
        }
        else if (formData.name.length < 2) {
            newErrors.name = '商户名称至少2个字符';
        }
        if (!formData.email.trim()) {
            newErrors.email = '请输入邮箱';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '请输入有效的邮箱地址';
        }
        if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
            newErrors.phone = '请输入有效的手机号';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    var validateStep2 = function () {
        var newErrors = {};
        if (!formData.subdomain) {
            newErrors.subdomain = '请选择子域名';
        }
        else if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(formData.subdomain)) {
            newErrors.subdomain = '子域名格式不正确';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    // 下一步
    var handleNext = function () {
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };
    // 提交注册
    var handleSubmit = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!validateStep2())
                        return [2 /*return*/];
                    setLoading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/tenant/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: formData.name,
                                email: formData.email,
                                phone: formData.phone,
                                subdomain: formData.subdomain,
                            }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _c.sent();
                    if (result.success) {
                        react_hot_toast_1.default.success('注册成功！');
                        // 跳转到商户控制台
                        router.push("/tenant/dashboard?welcome=true");
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '注册失败');
                        if ((_b = result.error) === null || _b === void 0 ? void 0 : _b.includes('子域名')) {
                            setErrors({ subdomain: result.error });
                        }
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('网络错误，请重试');
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">创建 ProClaw Shop</h1>
          <p className="text-gray-500 mt-2">快速开启您的在线商城之旅</p>
        </div>
        
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ".concat(step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500')}>
              1
            </div>
            <div className={"w-12 h-0.5 ".concat(step >= 2 ? 'bg-blue-600' : 'bg-gray-200')}/>
            <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ".concat(step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500')}>
              2
            </div>
          </div>
        </div>
        
        {/* Step 1: 基本信息 */}
        {step === 1 && (<div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商户名称 <span className="text-red-500">*</span>
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="例如：某某的店" className={"w-full px-4 py-3 rounded-lg border ".concat(errors.name ? 'border-red-500' : 'border-gray-300', " focus:ring-2 focus:ring-blue-500 focus:border-transparent")}/>
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="your@email.com" className={"w-full px-4 py-3 rounded-lg border ".concat(errors.email ? 'border-red-500' : 'border-gray-300', " focus:ring-2 focus:ring-blue-500 focus:border-transparent")}/>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号（可选）
              </label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="13800138000" className={"w-full px-4 py-3 rounded-lg border ".concat(errors.phone ? 'border-red-500' : 'border-gray-300', " focus:ring-2 focus:ring-blue-500 focus:border-transparent")}/>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
            
            <button onClick={handleNext} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              下一步
            </button>
          </div>)}
        
        {/* Step 2: 子域名设置 */}
        {step === 2 && (<div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择子域名 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input type="text" name="subdomain" value={formData.subdomain} onChange={handleInputChange} placeholder="myshop" className={"flex-1 px-4 py-3 rounded-l-lg border ".concat(errors.subdomain ? 'border-red-500' : 'border-gray-300', " focus:ring-2 focus:ring-blue-500 focus:border-transparent")}/>
                <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500">
                  .proclaw.cc
                </span>
              </div>
              {errors.subdomain && <p className="text-red-500 text-sm mt-1">{errors.subdomain}</p>}
              
              {/* 子域名建议 */}
              {subdomainSuggestions.length > 0 && !formData.subdomain && (<div className="mt-3 flex flex-wrap gap-2">
                  {subdomainSuggestions.map(function (suggestion) { return (<button key={suggestion} type="button" onClick={function () {
                        setFormData(function (prev) { return (__assign(__assign({}, prev), { subdomain: suggestion })); });
                        setErrors(function (prev) { return (__assign(__assign({}, prev), { subdomain: '' })); });
                    }} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                      {suggestion}
                    </button>); })}
                </div>)}
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">您的商城地址</h4>
              <p className="text-blue-700 font-mono">
                {formData.subdomain || 'xxxxx'}.proclaw.cc
              </p>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                💡 <strong>提示：</strong> 注册即表示同意我们的服务条款。您将获得 100 Token 试用额度，有效期 7 天。
              </p>
            </div>
            
            <div className="flex gap-4">
              <button type="button" onClick={function () { return setStep(1); }} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                上一步
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? '创建中...' : '创建商城'}
              </button>
            </div>
          </div>)}
        
        {/* 登录链接 */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            已有商城？ <link_1.default href="/tenant/login" className="text-blue-600 hover:underline">立即登录</link_1.default>
          </p>
        </div>
      </div>
    </div>);
}
