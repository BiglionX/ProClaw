"use strict";
// ProClaw Shop - 租户路由工具函数
// 提供从子域名获取租户信息的功能
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
exports.storeRouteConfig = void 0;
exports.getTenantSubdomainFromHeaders = getTenantSubdomainFromHeaders;
exports.getTenantSubdomainFromCookie = getTenantSubdomainFromCookie;
exports.getCurrentTenantSubdomain = getCurrentTenantSubdomain;
exports.getTenantFromRequest = getTenantFromRequest;
exports.isValidSubdomain = isValidSubdomain;
exports.generateSubdomainSuggestions = generateSubdomainSuggestions;
exports.getStoreUrl = getStoreUrl;
var headers_1 = require("next/headers");
/**
 * 从请求头获取当前租户子域名
 */
function getTenantSubdomainFromHeaders() {
    return __awaiter(this, void 0, void 0, function () {
        var headersList;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, headers_1.headers)()];
                case 1:
                    headersList = _a.sent();
                    return [2 /*return*/, headersList.get('x-tenant-subdomain')];
            }
        });
    });
}
/**
 * 从 Cookie 获取当前租户子域名
 */
function getTenantSubdomainFromCookie() {
    return __awaiter(this, void 0, void 0, function () {
        var cookieStore;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, headers_1.cookies)()];
                case 1:
                    cookieStore = _b.sent();
                    return [2 /*return*/, ((_a = cookieStore.get('tenant_subdomain')) === null || _a === void 0 ? void 0 : _a.value) || null];
            }
        });
    });
}
/**
 * 获取当前租户子域名（优先从请求头，其次从 Cookie）
 */
function getCurrentTenantSubdomain() {
    return __awaiter(this, void 0, void 0, function () {
        var fromHeader;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTenantSubdomainFromHeaders()];
                case 1:
                    fromHeader = _a.sent();
                    if (fromHeader) {
                        return [2 /*return*/, fromHeader];
                    }
                    // 降级到 Cookie
                    return [2 /*return*/, getTenantSubdomainFromCookie()];
            }
        });
    });
}
/**
 * 从 Next.js App Router Context 获取租户子域名
 * 用于 Server Components 和 Route Handlers
 */
function getTenantFromRequest() {
    return __awaiter(this, void 0, void 0, function () {
        var subdomain;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getCurrentTenantSubdomain()];
                case 1:
                    subdomain = _a.sent();
                    if (!subdomain) {
                        return [2 /*return*/, { subdomain: null, tenantId: null, tenant: null }];
                    }
                    // TODO: 后续实现从数据库查询租户信息
                    // 暂时返回基础信息
                    return [2 /*return*/, {
                            subdomain: subdomain,
                            tenantId: null,
                            tenant: null,
                        }];
            }
        });
    });
}
/**
 * 验证子域名的合法性
 */
function isValidSubdomain(subdomain) {
    // 子域名规则：
    // - 长度 2-32 个字符
    // - 只能包含字母、数字、连字符
    // - 不能以连字符开头或结尾
    // - 不能是保留词
    var reservedSubdomains = [
        'www', 'mail', 'ftp', 'admin', 'api', 'blog', 'shop', 'store',
        'dev', 'test', 'demo', ' staging', 'prod', 'platform',
        'proclaw', 'admin', 'dashboard', 'console',
    ];
    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
        return false;
    }
    var regex = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
    return regex.test(subdomain);
}
/**
 * 生成可用的子域名建议
 */
function generateSubdomainSuggestions(name, count) {
    if (count === void 0) { count = 5; }
    // 移除特殊字符，转为小写
    var base = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
    var suggestions = [];
    // 原始名称
    if (isValidSubdomain(base)) {
        suggestions.push(base);
    }
    // 带数字后缀
    for (var i = 1; i <= count && suggestions.length < count; i++) {
        var suggestion = "".concat(base).concat(i);
        if (isValidSubdomain(suggestion)) {
            suggestions.push(suggestion);
        }
    }
    // 带前缀
    var prefixes = ['my', 'shop', 'store', 'go'];
    for (var _i = 0, prefixes_1 = prefixes; _i < prefixes_1.length; _i++) {
        var prefix = prefixes_1[_i];
        var suggestion = "".concat(prefix, "-").concat(base);
        if (suggestions.length >= count)
            break;
        if (isValidSubdomain(suggestion)) {
            suggestions.push(suggestion);
        }
    }
    return suggestions.slice(0, count);
}
/**
 * 路由重写配置 - 动态商城页面
 * 将 /[store] 路由映射到实际的租户商城
 */
exports.storeRouteConfig = {
    // 动态路由参数名
    paramName: 'store',
    // 可选的商城页面列表
    pages: ['', 'products', 'cart', 'checkout', 'orders', 'profile'],
    // 页面标题映射
    pageTitles: {
        '': '首页',
        'products': '商品列表',
        'cart': '购物车',
        'checkout': '结算',
        'orders': '我的订单',
        'profile': '个人中心',
    },
};
/**
 * 获取租户商城的完整 URL
 * 标准路径：proclaw.cc/shop/{subdomain}
 */
function getStoreUrl(subdomain, customDomain) {
    if (customDomain) {
        return "https://".concat(customDomain);
    }
    var siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://proclaw.cc').replace(/\/$/, '');
    return "".concat(siteOrigin, "/shop/").concat(subdomain);
}
