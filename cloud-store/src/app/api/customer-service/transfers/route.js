"use strict";
// ProClaw Cloud 托管版 - AI 客服转人工队列 API
// GET: 获取待处理队列（需商户登录）
// POST: 回复转人工请求
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
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * GET /api/customer-service/transfers
 * 获取转人工队列（需商户登录）
 * Query: status=pending, page=1, page_size=20
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, searchParams, status_1, page, pageSize, from, to, _a, data, error, count, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    tenantId = session.user.id;
                    searchParams = request.nextUrl.searchParams;
                    status_1 = searchParams.get('status') || 'pending';
                    page = parseInt(searchParams.get('page') || '1');
                    pageSize = parseInt(searchParams.get('page_size') || '20');
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    return [4 /*yield*/, supabase
                            .from('customer_service_transfer_queue')
                            .select('*', { count: 'exact' })
                            .eq('tenant_id', tenantId)
                            .eq('status', status_1)
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error, count = _a.count;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: data || [],
                            total: count || 0,
                            page: page,
                            page_size: pageSize,
                        })];
                case 4:
                    error_1 = _b.sent();
                    console.error('获取转人工队列失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/customer-service/transfers
 * 回复转人工请求
 * Body: { transfer_id, answer, save_to_kb (optional) }
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, body, transfer_id, answer, save_to_kb, _a, transfer, fetchError, now, updateError, chatLog, savedToKb, kbError, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
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
                    transfer_id = body.transfer_id, answer = body.answer, save_to_kb = body.save_to_kb;
                    if (!transfer_id || !answer) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少必要参数: transfer_id, answer' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('customer_service_transfer_queue')
                            .select('*')
                            .eq('id', transfer_id)
                            .eq('tenant_id', tenantId)
                            .single()];
                case 4:
                    _a = _b.sent(), transfer = _a.data, fetchError = _a.error;
                    if (fetchError || !transfer) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '转人工记录不存在' }, { status: 404 })];
                    }
                    now = new Date().toISOString();
                    return [4 /*yield*/, supabase
                            .from('customer_service_transfer_queue')
                            .update({
                            status: 'answered',
                            answer: answer,
                            answered_at: now,
                            answered_by: session.user.id,
                            saved_to_kb: save_to_kb || false,
                        })
                            .eq('id', transfer_id)];
                case 5:
                    updateError = (_b.sent()).error;
                    if (updateError)
                        throw updateError;
                    chatLog = transfer;
                    return [4 /*yield*/, supabase
                            .from('customer_service_chat_logs')
                            .insert({
                            tenant_id: tenantId,
                            session_id: chatLog.session_id,
                            customer_id: chatLog.customer_id,
                            customer_name: chatLog.customer_name,
                            question: chatLog.question,
                            answer: answer,
                            answer_source: 'manual',
                            is_transferred: true,
                            transferred_to: 'boss',
                            is_resolved: true,
                            created_at: now,
                        })];
                case 6:
                    _b.sent();
                    savedToKb = false;
                    if (!save_to_kb) return [3 /*break*/, 8];
                    return [4 /*yield*/, supabase
                            .from('customer_service_knowledge_base')
                            .insert({
                            tenant_id: tenantId,
                            question: chatLog.question,
                            answer: answer,
                            category: 'general',
                            keywords: [],
                            is_active: true,
                        })];
                case 7:
                    kbError = (_b.sent()).error;
                    if (!kbError) {
                        savedToKb = true;
                    }
                    _b.label = 8;
                case 8: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        data: {
                            transfer_id: transfer_id,
                            answered: true,
                            saved_to_kb: savedToKb,
                            answered_at: now,
                        },
                        message: '回复已发送',
                    })];
                case 9:
                    error_2 = _b.sent();
                    console.error('回复转人工请求失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
