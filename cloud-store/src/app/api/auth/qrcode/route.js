"use strict";
// ProClaw Shop - 扫码登录 API
// 商户在 ProClaw 桌面端扫码登录商城
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
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var crypto_1 = require("crypto");
// 存储待验证的登录码（使用 Redis 或数据库，生产环境避免内存存储）
// 内存存储仅用于开发环境或单实例部署
var pendingCodes = new Map();
/**
 * 生成扫码登录码
 * POST /api/auth/qrcode/generate
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var body, action, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    action = body.action;
                    if (action === 'generate') {
                        return [2 /*return*/, handleGenerate(request)];
                    }
                    else if (action === 'verify') {
                        return [2 /*return*/, handleVerify(request)];
                    }
                    else if (action === 'check') {
                        return [2 /*return*/, handleCheck(request)];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未知操作' }, { status: 400 })];
                case 2:
                    error_1 = _a.sent();
                    console.error('QR Code login error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 生成登录二维码
 */
function handleGenerate(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, code, token, expiresAt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 1:
                    tenantContext = _a.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })];
                    }
                    code = (0, crypto_1.randomBytes)(8).toString('hex').toUpperCase().slice(0, 12);
                    token = (0, crypto_1.randomBytes)(32).toString('hex');
                    expiresAt = Date.now() + 5 * 60 * 1000;
                    // 存储登录码
                    pendingCodes.set(code, {
                        tenant_id: tenantContext.tenantId,
                        expires_at: expiresAt,
                    });
                    // 同时在数据库存储（持久化）
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    return [4 /*yield*/, supabase
                            .from('qr_login_sessions')
                            .insert({
                            code: code,
                            token: token,
                            tenant_id: tenantContext.tenantId,
                            expires_at: new Date(expiresAt).toISOString(),
                            status: 'pending',
                        })];
                case 2:
                    // 同时在数据库存储（持久化）
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                code: code,
                                token: token,
                                expires_at: expiresAt,
                                // 扫码地址
                                scan_url: "/auth/scan?code=".concat(code),
                            },
                        })];
            }
        });
    });
}
/**
 * 验证登录码（商城扫码后调用）
 */
function handleVerify(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, body, code, session, supabase, dbSession;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    code = body.code;
                    if (!code) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少登录码' }, { status: 400 })];
                    }
                    session = pendingCodes.get(code);
                    if (!!session) return [3 /*break*/, 4];
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase
                            .from('qr_login_sessions')
                            .select('*')
                            .eq('code', code)
                            .eq('status', 'pending')
                            .gt('expires_at', new Date().toISOString())
                            .single()];
                case 2:
                    dbSession = (_a.sent()).data;
                    if (!dbSession) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '登录码无效或已过期' }, { status: 400 })];
                    }
                    // 更新会话状态
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    return [4 /*yield*/, supabase
                            .from('qr_login_sessions')
                            .update({ status: 'verified' })
                            .eq('code', code)];
                case 3:
                    // 更新会话状态
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                verified: true,
                                tenant_id: dbSession.tenant_id,
                            },
                        })];
                case 4:
                    // 清理内存中的记录
                    pendingCodes.delete(code);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                verified: true,
                                tenant_id: session.tenant_id,
                            },
                        })];
            }
        });
    });
}
/**
 * 检查登录状态（轮询）
 */
function handleCheck(request) {
    return __awaiter(this, void 0, void 0, function () {
        var body, token, response, supabase, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    token = body.token;
                    if (!token) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少 token' }, { status: 400 })];
                    }
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase
                            .from('qr_login_sessions')
                            .select('*')
                            .eq('token', token)
                            .single()];
                case 2:
                    session = (_a.sent()).data;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: { status: 'pending' },
                            })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                status: session.status,
                                tenant_id: session.tenant_id,
                            },
                        })];
            }
        });
    });
}
