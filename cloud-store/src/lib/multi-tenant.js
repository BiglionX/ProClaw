"use strict";
// ProClaw Shop - 多租户上下文管理
// 提供在请求处理过程中访问租户信息的能力
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
exports.tenantHeaders = void 0;
exports.createTenantSupabaseClient = createTenantSupabaseClient;
exports.getTenantSchema = getTenantSchema;
exports.formatSubdomainToSchema = formatSubdomainToSchema;
exports.isSubdomainLengthValid = isSubdomainLengthValid;
exports.getMaxSubdomainLength = getMaxSubdomainLength;
exports.getTenantContext = getTenantContext;
exports.validateTenant = validateTenant;
exports.getTenantSettings = getTenantSettings;
exports.createTenantResponse = createTenantResponse;
exports.createTenantErrorResponse = createTenantErrorResponse;
var ssr_1 = require("@supabase/ssr");
var headers_1 = require("next/headers");
var tenant_router_1 = require("./tenant-router");
var supabase_js_1 = require("@supabase/supabase-js");
/**
 * 创建 Supabase 客户端工厂函数
 */
function createServiceSupabaseClient() {
    var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
/**
 * 创建支持多租户的 Supabase 客户端
 * 根据当前租户自动切换到对应的 Schema
 */
function createTenantSupabaseClient() {
    return __awaiter(this, void 0, void 0, function () {
        var subdomain, supabaseUrl, supabaseAnonKey, cookieStore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, tenant_router_1.getCurrentTenantSubdomain)()];
                case 1:
                    subdomain = _a.sent();
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (!supabaseUrl || !supabaseAnonKey) {
                        throw new Error('Missing Supabase environment variables');
                    }
                    return [4 /*yield*/, (0, headers_1.cookies)()];
                case 2:
                    cookieStore = _a.sent();
                    return [2 /*return*/, (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, {
                            cookies: {
                                get: function (name) {
                                    var _a;
                                    return (_a = cookieStore.get(name)) === null || _a === void 0 ? void 0 : _a.value;
                                },
                                set: function (name, value, options) {
                                    try {
                                        cookieStore.set(__assign({ name: name, value: value }, options));
                                    }
                                    catch (error) {
                                        // 记录非预期的错误（权限不足、参数错误等应被关注）
                                        console.error("[Cookie\u8BBE\u7F6E\u5931\u8D25] ".concat(name, ":"), error);
                                    }
                                },
                                remove: function (name, options) {
                                    try {
                                        cookieStore.set(__assign({ name: name, value: '' }, options));
                                    }
                                    catch (error) {
                                        console.error("[Cookie\u5220\u9664\u5931\u8D25] ".concat(name, ":"), error);
                                    }
                                },
                            },
                            global: {
                                headers: {
                                    'x-tenant-subdomain': subdomain || '',
                                },
                            },
                        })];
            }
        });
    });
}
// PostgreSQL 标识符最大长度限制
var MAX_SCHEMA_NAME_LENGTH = 63;
var MAX_SUBDOMAIN_LENGTH = 50;
/**
 * 获取当前租户的 Schema 名称
 * 每个租户在 PostgreSQL 中有独立的 Schema
 */
function getTenantSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var subdomain;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, tenant_router_1.getCurrentTenantSubdomain)()];
                case 1:
                    subdomain = _a.sent();
                    if (!subdomain) {
                        // 如果没有子域名，返回公共 Schema
                        return [2 /*return*/, 'public'];
                    }
                    // 子域名格式化为 Schema 名称
                    // 例如: myshop -> tenant_myshop
                    return [2 /*return*/, formatSubdomainToSchema(subdomain)];
            }
        });
    });
}
/**
 * 将子域名格式化为合法的 PostgreSQL schema 名称
 */
function formatSubdomainToSchema(subdomain) {
    // 清理并规范化子域名
    var cleaned = subdomain
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // 非字母数字字符替换为下划线
        .replace(/_+/g, '_') // 多个下划线合并
        .replace(/^_|_$/g, ''); // 去除首尾下划线
    // 长度限制：tenant_ 前缀 + 清理后的子域名 <= 63
    var maxSubdomainLength = MAX_SCHEMA_NAME_LENGTH - 'tenant_'.length;
    var truncated = cleaned.substring(0, maxSubdomainLength);
    return "tenant_".concat(truncated);
}
/**
 * 验证子域名长度是否合法
 */
function isSubdomainLengthValid(subdomain) {
    return subdomain.length > 0 && subdomain.length <= MAX_SUBDOMAIN_LENGTH;
}
/**
 * 获取子域名最大允许长度
 */
function getMaxSubdomainLength() {
    return MAX_SUBDOMAIN_LENGTH;
}
/**
 * 获取租户上下文
 * 在 API Route 和 Server Components 中使用
 */
function getTenantContext() {
    return __awaiter(this, void 0, void 0, function () {
        var subdomain, schema, supabase, _a, tenant, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, tenant_router_1.getCurrentTenantSubdomain)()];
                case 1:
                    subdomain = _b.sent();
                    if (!subdomain) {
                        return [2 /*return*/, {
                                subdomain: '',
                                schema: 'public',
                                tenantId: null,
                                status: 'unknown',
                                plan: 'unknown',
                            }];
                    }
                    schema = formatSubdomainToSchema(subdomain);
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    supabase = createServiceSupabaseClient();
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id, status, plan')
                            .eq('subdomain', subdomain)
                            .single()];
                case 3:
                    _a = _b.sent(), tenant = _a.data, error = _a.error;
                    if (error && error.code !== 'PGRST116') {
                        // PGRST116: No rows found, 这是正常的
                        console.error('Failed to fetch tenant context:', error);
                    }
                    if (tenant) {
                        return [2 /*return*/, {
                                subdomain: subdomain,
                                schema: schema,
                                tenantId: tenant.id,
                                status: tenant.status || 'active',
                                plan: tenant.plan || 'trial',
                            }];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error('Failed to fetch tenant context:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, {
                        subdomain: subdomain,
                        schema: schema,
                        tenantId: null,
                        status: 'unknown',
                        plan: 'unknown',
                    }];
            }
        });
    });
}
/**
 * 验证租户是否有效
 */
function validateTenant(subdomain) {
    return __awaiter(this, void 0, void 0, function () {
        var reserved, supabase, _a, tenant, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!subdomain) {
                        return [2 /*return*/, { valid: false, error: '子域名为空' }];
                    }
                    reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'shop', 'store', 'proclaw'];
                    if (reserved.includes(subdomain.toLowerCase())) {
                        return [2 /*return*/, { valid: false, error: '该子域名已被保留' }];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    supabase = createServiceSupabaseClient();
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id, status')
                            .eq('subdomain', subdomain)
                            .single()];
                case 2:
                    _a = _b.sent(), tenant = _a.data, error = _a.error;
                    if (error && error.code !== 'PGRST116') {
                        console.error('Validate tenant error:', error);
                        return [2 /*return*/, { valid: false, error: '验证失败' }];
                    }
                    if (!tenant) {
                        return [2 /*return*/, { valid: false, error: '租户不存在' }];
                    }
                    if (tenant.status !== 'active') {
                        return [2 /*return*/, { valid: false, error: "\u79DF\u6237\u72B6\u6001\u5F02\u5E38: ".concat(tenant.status) }];
                    }
                    return [2 /*return*/, { valid: true, tenantId: tenant.id }];
                case 3:
                    error_2 = _b.sent();
                    console.error('Validate tenant error:', error_2);
                    return [2 /*return*/, { valid: false, error: '验证失败' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取租户的配置
 * 包括主题、Logo、联系方式等
 */
function getTenantSettings(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: 从数据库查询租户配置
            // 暂时返回默认值
            return [2 /*return*/, {
                    theme: {
                        primaryColor: '#3B82F6',
                        secondaryColor: '#60A5FA',
                        layout: 'grid',
                    },
                    logoUrl: null,
                    bannerUrl: null,
                    contact: {
                        phone: null,
                        wechat: null,
                        email: null,
                    },
                    customDomain: null,
                }];
        });
    });
}
/**
 * 获取允许的 CORS 来源列表
 */
function getAllowedOrigins() {
    var origins = [
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'https://proclaw.cc',
        'https://www.proclaw.cc',
    ];
    // 允许从环境变量扩展来源列表
    var envOrigins = process.env.ALLOWED_CORS_ORIGINS;
    if (envOrigins) {
        try {
            var parsed = JSON.parse(envOrigins);
            if (Array.isArray(parsed)) {
                origins.push.apply(origins, parsed);
            }
        }
        catch (_a) {
            console.warn('ALLOWED_CORS_ORIGINS 格式错误，应为 JSON 数组');
        }
    }
    return __spreadArray([], new Set(origins), true);
}
/**
 * 检查请求来源是否被允许
 */
function isOriginAllowed(origin) {
    if (!origin)
        return false;
    var allowed = getAllowedOrigins();
    return allowed.includes(origin) || allowed.some(function (o) {
        if (o.includes('*')) {
            var pattern = new RegExp('^' + o.replace(/\*/g, '.*') + '$');
            return pattern.test(origin);
        }
        return false;
    });
}
/**
 * 多租户中间件配置
 * 用于 NextResponse
 */
exports.tenantHeaders = {
    // 跨域请求头 - 动态设置
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-subdomain, x-requested-with',
};
/**
 * 创建带租户头的响应（带 CORS 支持）
 */
function createTenantResponse(data, options) {
    var _a;
    var request = options === null || options === void 0 ? void 0 : options.request;
    var origin = (_a = request === null || request === void 0 ? void 0 : request.headers.get('origin')) !== null && _a !== void 0 ? _a : null;
    var allowedOrigin = isOriginAllowed(origin) ? origin : '';
    var headers = __assign({ 'Content-Type': 'application/json' }, exports.tenantHeaders);
    if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
        headers['Vary'] = 'Origin';
    }
    return new Response(JSON.stringify(data), {
        status: (options === null || options === void 0 ? void 0 : options.status) || 200,
        headers: __assign(__assign({}, headers), options === null || options === void 0 ? void 0 : options.headers),
    });
}
/**
 * 创建错误响应
 */
function createTenantErrorResponse(error, code, status) {
    if (status === void 0) { status = 400; }
    return createTenantResponse({ success: false, error: error, code: code }, { status: status });
}
