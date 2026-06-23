"use strict";
// ProClaw Cloud 托管版 - AI 客服聊天 API
// POST: 客户发送消息，触发三级检索流程
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
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
var search_service_1 = require("@/lib/customer-service/search-service");
var tokenApi_1 = require("@/lib/tokenApi");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * POST /api/customer-service/chat
 * 客户发送消息给 AI 客服
 * Body: { session_id?, message, customer_id?, customer_name? }
 * 需 public 可访问（商城访客不需要登录）
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, body, message, session_id, customer_id, customer_name, session, searchParams, tenantId, schema, activeSessionId, activeCustomerId, tokenResult, searchResult, needsTransfer, transferId, transferData, answer, answerSource, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _a.sent();
                    message = body.message, session_id = body.session_id, customer_id = body.customer_id, customer_name = body.customer_name;
                    if (!message || !message.trim()) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '消息内容不能为空' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 3:
                    session = (_a.sent()).data.session;
                    searchParams = request.nextUrl.searchParams;
                    tenantId = searchParams.get('tenant_id');
                    if (!tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少租户 ID' }, { status: 400 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(tenantId);
                    activeSessionId = session_id || "cs_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 10));
                    activeCustomerId = customer_id || "guest_".concat(Math.random().toString(36).substring(2, 10));
                    if (!session) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(tenantId, 'customer_service_chat', 1, 'POST /api/customer-service/chat', { sessionId: activeSessionId })];
                case 4:
                    tokenResult = _a.sent();
                    if (!tokenResult.success) {
                        console.warn('Token 扣费失败:', tokenResult.error);
                    }
                    _a.label = 5;
                case 5: return [4 /*yield*/, (0, search_service_1.searchCustomerService)(supabase, schema, tenantId, message)];
                case 6:
                    searchResult = _a.sent();
                    needsTransfer = false;
                    transferId = null;
                    if (!searchResult.needsTransfer) return [3 /*break*/, 8];
                    needsTransfer = true;
                    return [4 /*yield*/, supabase
                            .from('customer_service_transfer_queue')
                            .insert({
                            tenant_id: tenantId,
                            session_id: activeSessionId,
                            customer_id: activeCustomerId,
                            customer_name: customer_name || null,
                            question: message,
                            transfer_reason: searchResult.transferReason || '无法自动回答',
                            transfer_mode: 'direct',
                            status: 'pending',
                            created_at: new Date().toISOString(),
                        })
                            .select()
                            .single()];
                case 7:
                    transferData = (_a.sent()).data;
                    if (transferData) {
                        transferId = transferData.id;
                    }
                    _a.label = 8;
                case 8:
                    answer = void 0;
                    answerSource = void 0;
                    if (needsTransfer) {
                        answer = '您的问题我将转给人工客服，请稍后。';
                        answerSource = 'manual';
                    }
                    else {
                        answer = searchResult.answer;
                        answerSource = searchResult.source;
                    }
                    // 记录聊天日志
                    return [4 /*yield*/, supabase
                            .from('customer_service_chat_logs')
                            .insert({
                            tenant_id: tenantId,
                            session_id: activeSessionId,
                            customer_id: activeCustomerId,
                            customer_name: customer_name || null,
                            question: message,
                            answer: answer,
                            answer_source: answerSource,
                            is_transferred: needsTransfer,
                            transferred_to: needsTransfer ? 'boss' : null,
                        })];
                case 9:
                    // 记录聊天日志
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                session_id: activeSessionId,
                                customer_id: activeCustomerId,
                                reply: answer,
                                source: answerSource,
                                needs_transfer: needsTransfer,
                                transfer_id: transferId,
                                timestamp: new Date().toISOString(),
                            },
                        })];
                case 10:
                    error_1 = _a.sent();
                    console.error('客服聊天失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
