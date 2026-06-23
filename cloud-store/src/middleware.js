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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
var server_1 = require("next/server");
var SKIP_PATHS = ['/_next', '/favicon', '/api/health', '/public'];
var AUTH_PATHS = ['/app', '/dashboard'];
var OIDC_ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
var OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || 'proclaw_web';
var OIDC_REDIRECT_URI = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI || 'https://proclaw.cc/auth/callback';
/**
 * 获取平台主域名列表
 * 支持从环境变量配置
 */
function getPlatformDomains() {
    // 默认平台域名
    var defaults = [
        'localhost',
        'localhost:3000',
        '127.0.0.1',
        '127.0.0.1:3000',
    ];
    // 从环境变量加载平台域名
    var envDomains = process.env.PLATFORM_DOMAINS;
    if (envDomains) {
        try {
            var parsed = JSON.parse(envDomains);
            if (Array.isArray(parsed)) {
                return __spreadArray([], new Set(__spreadArray(__spreadArray([], parsed, true), defaults, true)), true);
            }
        }
        catch (_a) {
            // 忽略解析错误
        }
    }
    // 从 SITE_URL 添加平台域名
    var siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
        try {
            var url = new URL(siteUrl);
            defaults.push(url.hostname);
            // 同时添加不带 www 的域名
            if (url.hostname.startsWith('www.')) {
                defaults.push(url.hostname.substring(4));
            }
            else {
                defaults.push("www.".concat(url.hostname));
            }
        }
        catch (_b) {
            // 忽略无效 URL
        }
    }
    return __spreadArray([], new Set(defaults), true);
}
/**
 * 从主机名中提取子域名
 */
function extractSubdomain(hostname) {
    // 移除端口号
    var host = hostname.split(':')[0];
    // 检查是否是平台主域名
    if (getPlatformDomains().includes(host)) {
        return null;
    }
    // 检查是否包含平台域名后缀
    var domainParts = host.split('.');
    // 情况1: xxx.proclaw.cc -> 子域名是 xxx
    if (domainParts.length >= 3 && domainParts.slice(-2).join('.') === 'proclaw.cc') {
        return domainParts[0];
    }
    // 情况2: xxx.localhost -> 子域名是 xxx（开发环境）
    if (domainParts.length >= 2 && domainParts.slice(-1)[0] === 'localhost') {
        return domainParts[0];
    }
    // 情况3: xxx.127.0.0.1 -> 子域名是 xxx（开发环境IP访问）
    if (domainParts.length >= 2 && domainParts.includes('127.0.0.1')) {
        return domainParts[0];
    }
    return null;
}
/**
 * 检查路径是否需要跳过
 */
function shouldSkipPath(pathname) {
    return SKIP_PATHS.some(function (prefix) { return pathname.startsWith(prefix); });
}
function isAuthPath(pathname) {
    return AUTH_PATHS.some(function (prefix) { return pathname.startsWith(prefix); });
}
function buildOidcAuthUrl(redirectUri) {
    var params = new URLSearchParams({
        response_type: 'code',
        client_id: OIDC_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state: crypto.randomUUID(),
    });
    return OIDC_ISSUER + '/oauth/authorize?' + params.toString();
}
function middleware(request) {
    var pathname = request.nextUrl.pathname;
    if (shouldSkipPath(pathname)) {
        return server_1.NextResponse.next();
    }
    if (isAuthPath(pathname)) {
        var sessionCookie = request.cookies.get('pc_session');
        if (!sessionCookie) {
            var authUrl = buildOidcAuthUrl(OIDC_REDIRECT_URI);
            return server_1.NextResponse.redirect(new URL(authUrl, request.url));
        }
    }
    // 路径格式: /shop/[store]（标准）或 /[store]（兼容，会 302 到 /shop/[store]）
    var subdomain = null;
    // 情况1: /shop/[store] 路径格式（推荐）
    var shopMatch = pathname.match(/^\/shop\/([a-z0-9-]+)/);
    if (shopMatch) {
        subdomain = shopMatch[1];
    }
    // 情况2: /[store] 根路径（兼容旧链接，重定向到 /shop/[store]）
    if (!subdomain) {
        var knownPaths = ['api', 'app', 'auth', 'cart', 'checkout', 'login', 'orders', 'products', 'register', 'tenant', 'shop', 'admin'];
        var pathMatch = pathname.match(/^\/([a-z0-9-]+)(\/.*)?$/);
        if (pathMatch) {
            var firstPath = pathMatch[1].toLowerCase();
            if (!knownPaths.includes(firstPath)) {
                var rest = pathMatch[2] || '';
                return server_1.NextResponse.redirect(new URL("/shop/".concat(pathMatch[1]).concat(rest), request.url));
            }
        }
    }
    // 情况3: 子域名格式 (e.g., demo.localhost:3000)
    if (!subdomain) {
        subdomain = extractSubdomain(request.headers.get('host') || '');
    }
    // 如果没有子域名/租户，返回主平台页面
    if (!subdomain) {
        return server_1.NextResponse.next();
    }
    // 创建响应，添加租户上下文头
    var response = server_1.NextResponse.next();
    // 设置租户标识（供后续 API 和页面使用）
    response.headers.set('x-tenant-subdomain', subdomain);
    // 设置租户上下文 Cookie（方便前端获取）
    var cookieOptions = {
        path: '/',
        maxAge: 60 * 60 * 24, // 24小时
        sameSite: 'lax',
    };
    response.cookies.set('tenant_subdomain', subdomain, __assign(__assign({}, cookieOptions), { httpOnly: false }));
    return response;
}
// 配置 matcher：只匹配动态商城路由
exports.config = {
    matcher: [
        // 匹配所有路径，排除静态文件和内部 API
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
