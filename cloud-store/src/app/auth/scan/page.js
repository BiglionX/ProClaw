// ProClaw Cloud-Store - ProClaw Shop 扫码登录页面
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
exports.default = ScanLoginPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
function ScanLoginContent() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var searchParams = (0, navigation_1.useSearchParams)();
    var code = searchParams.get('code');
    // 预生成二维码图案（静态）
    var qrPattern = [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true];
    var _a = (0, react_1.useState)('loading'), status = _a[0], setStatus = _a[1];
    var _b = (0, react_1.useState)('正在连接...'), message = _b[0], setMessage = _b[1];
    // 验证登录码
    var verifyCode = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!code) {
                        setStatus('error');
                        setMessage('无效的登录码');
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch('/api/auth/qrcode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'verify', code: code }),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _b.sent();
                    if (result.success && result.data.verified) {
                        setStatus('success');
                        setMessage('登录成功！正在跳转...');
                        // 保存登录状态
                        localStorage.setItem('tenant_id', result.data.tenant_id);
                        localStorage.setItem('is_admin', 'true');
                        // 跳转到商户后台
                        setTimeout(function () {
                            router.push('/tenant/dashboard');
                        }, 1500);
                    }
                    else {
                        setStatus('error');
                        setMessage(result.error || '登录验证失败');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    setStatus('error');
                    setMessage('网络错误，请重试');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [code, router]);
    (0, react_1.useEffect)(function () {
        if (code) {
            // 短暂延迟后显示扫描状态
            var timer1_1 = setTimeout(function () {
                setStatus('scanning');
                setMessage('请用 ProClaw 桌面端扫码登录');
            }, 1000);
            // 验证
            var timer2_1 = setTimeout(function () {
                verifyCode();
            }, 1500);
            return function () {
                clearTimeout(timer1_1);
                clearTimeout(timer2_1);
            };
        }
    }, [code, verifyCode]);
    return (<div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ProClaw Shop</h1>
          <p className="text-gray-500 mt-2">ProClaw Shop 扫码登录</p>
        </div>
        
        {/* 状态显示 */}
        <div className="mb-8">
          {status === 'loading' && (<div className="animate-pulse">
              <div className="w-48 h-48 mx-auto bg-gray-200 rounded-xl"/>
            </div>)}
          
          {status === 'scanning' && (<div className="relative">
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl border-2 border-dashed border-blue-300 flex items-center justify-center">
                {/* 二维码占位 */}
                <div className="w-32 h-32 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {qrPattern.map(function (filled, i) { return (<div key={i} className={"w-4 h-4 rounded-sm ".concat(filled ? 'bg-white' : 'bg-transparent')}/>); })}
                  </div>
                </div>
              </div>
              {/* 扫描动画 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-1 bg-blue-500 animate-pulse rounded-full"/>
              </div>
            </div>)}
          
          {status === 'success' && (<div className="w-48 h-48 mx-auto bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-24 h-24 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>)}
          
          {status === 'error' && (<div className="w-48 h-48 mx-auto bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-24 h-24 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>)}
        </div>
        
        {/* 消息 */}
        <div className={"text-lg font-medium ".concat(status === 'success' ? 'text-green-600' :
            status === 'error' ? 'text-red-600' : 'text-gray-700')}>
          {message}
        </div>
        
        {/* 提示 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">
            💡 <strong>提示：</strong><br />
            1. 在 ProClaw 桌面端打开「管理我的商城」<br />
            2. 点击「扫码登录」生成二维码<br />
            3. 用此页面扫描二维码即可登录
          </p>
        </div>
        
        {/* 重新加载 */}
        {status === 'error' && (<button onClick={function () { return window.location.reload(); }} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            重新扫码
          </button>)}
      </div>
    </div>);
}
function ScanLoginPage() {
    return (<react_1.Suspense fallback={<div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-48 h-48 bg-gray-300 rounded-xl"/>
        </div>
      </div>}>
      <ScanLoginContent />
    </react_1.Suspense>);
}
