"use strict";
// ProClaw Cloud 托管版 - AI 客服设置 API
// GET: 获取商户客服设置（公开，需 tenant_id 参数）
// PUT: 更新客服设置（需商户登录）
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
exports.dynamic = void 0;
exports.GET = GET;
exports.PUT = PUT;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * 从请求中获取租户 ID
 * 优先从 Authorization header 获取，其次从 query 参数
 */
function getTenantId(request) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, tenantIdFromQuery, response, supabase, session;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    searchParams = request.nextUrl.searchParams;
                    tenantIdFromQuery = searchParams.get('tenant_id');
                    if (tenantIdFromQuery)
                        return [2 /*return*/, tenantIdFromQuery];
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 1:
                    session = (_b.sent()).data.session;
                    return [2 /*return*/, ((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id) || null];
            }
        });
    });
}
/**
 * GET /api/customer-service/settings?tenant_id=xxx
 * 获取商户客服设置（公开接口，商城前端访客无需登录）
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantId, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, getTenantId(request)];
                case 2:
                    tenantId = _b.sent();
                    if (!tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少租户 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('customer_service_settings')
                            .select('*')
                            .eq('tenant_id', tenantId)
                            .single()];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code !== 'PGRST116') {
                        // PGRST116 = 行未找到，属于正常情况
                        throw error;
                    }
                    if (!data) {
                        // 返回默认设置
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    is_enabled: true,
                                    auto_greeting: '您好，我是客服小如，请问有什么可以帮您？',
                                    transfer_mode: 'direct',
                                    avatar_url: null,
                                    agent_name: '智能客服',
                                    business_hours: null,
                                    system_prompt: null,
                                },
                            })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, data: data })];
                case 4:
                    error_1 = _b.sent();
                    console.error('获取客服设置失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * PUT /api/customer-service/settings
 * 更新客服设置（需商户登录）
 * Body: { is_enabled?, auto_greeting?, transfer_mode?, avatar_url?, agent_name?, business_hours? }
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, body, allowedFields, updateData, _i, allowedFields_1, field, _a, data, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    tenantId = session.user.id;
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    allowedFields = [
                        'is_enabled',
                        'auto_greeting',
                        'transfer_mode',
                        'avatar_url',
                        'agent_name',
                        'business_hours',
                        'system_prompt',
                    ];
                    updateData = {
                        updated_at: new Date().toISOString(),
                    };
                    for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                        field = allowedFields_1[_i];
                        if (body[field] !== undefined) {
                            // 字段验证
                            if (field === 'transfer_mode' && !['direct', 'ai_judged'].includes(body[field])) {
                                return [2 /*return*/, server_1.NextResponse.json({ error: '转人工模式无效，必须为 direct 或 ai_judged' }, { status: 400 })];
                            }
                            updateData[field] = body[field];
                        }
                    }
                    return [4 /*yield*/, supabase
                            .from('customer_service_settings')
                            .upsert(__assign({ tenant_id: tenantId }, updateData))
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: data,
                            message: '客服设置已更新',
                        })];
                case 5:
                    error_2 = _b.sent();
                    console.error('更新客服设置失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
