// ProClaw Cloud 托管版 - 顶部导航栏
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
exports.default = TopBar;
var react_1 = require("react");
var auth_store_1 = require("@/lib/auth-store");
var tokenApi_1 = require("@/lib/tokenApi");
var utils_1 = require("@/lib/utils");
function TopBar(_a) {
    var _this = this;
    var onMenuClick = _a.onMenuClick;
    var _b = (0, auth_store_1.useAuthStore)(), user = _b.user, logout = _b.logout;
    var _c = (0, react_1.useState)(0), tokenBalance = _c[0], setTokenBalance = _c[1];
    (0, react_1.useEffect)(function () {
        if (user === null || user === void 0 ? void 0 : user.id) {
            (0, tokenApi_1.getTokenBalance)(user.id).then(setTokenBalance).catch(function () { return setTokenBalance(0); });
        }
        // 每 30 秒刷新一次余额
        var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var balance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(user === null || user === void 0 ? void 0 : user.id)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, tokenApi_1.getTokenBalance)(user.id)];
                    case 1:
                        balance = _a.sent();
                        setTokenBalance(balance);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); }, 30000);
        return function () { return clearInterval(interval); };
    }, [user === null || user === void 0 ? void 0 : user.id]);
    return (<header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* 左侧：移动端菜单按钮 + 页面标题 */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100" aria-label="打开菜单">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      {/* 右侧：Token 余额 + 用户信息 */}
      <div className="flex items-center gap-4">
        {/* Token 余额 */}
        <div className="hidden sm:flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
          <span className="text-yellow-600 text-sm font-medium">Token:</span>
          <span className="text-yellow-800 font-bold">{(0, utils_1.formatTokens)(tokenBalance)}</span>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">
            {(user === null || user === void 0 ? void 0 : user.email) || ''}
          </span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
            退出
          </button>
        </div>
      </div>
    </header>);
}
