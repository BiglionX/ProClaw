"use strict";
// ProClaw Cloud 托管版 - AI 客服问答库管理 API
// GET: 获取问答库列表（分页搜索）
// POST: 添加问答
// PUT: 更新问答
// DELETE: 删除问答
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
exports.PUT = PUT;
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * GET /api/customer-service/knowledge-base
 * 获取问答库列表（需商户登录，分页搜索）
 * Query: category?, keyword?, page=1, page_size=20
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, searchParams, category, keyword, page, pageSize, from, to, query, _a, data, error, count, error_1;
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
                    category = searchParams.get('category');
                    keyword = searchParams.get('keyword');
                    page = parseInt(searchParams.get('page') || '1');
                    pageSize = parseInt(searchParams.get('page_size') || '20');
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    query = supabase
                        .from('customer_service_knowledge_base')
                        .select('id, tenant_id, question, answer, category, keywords, is_active, created_at, updated_at', { count: 'exact' })
                        .eq('tenant_id', tenantId)
                        .order('updated_at', { ascending: false })
                        .range(from, to);
                    if (category) {
                        query = query.eq('category', category);
                    }
                    if (keyword) {
                        query = query.or("question.ilike.%".concat(keyword, "%,answer.ilike.%").concat(keyword, "%"));
                    }
                    return [4 /*yield*/, query];
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
                            total_pages: Math.ceil((count || 0) / pageSize),
                        })];
                case 4:
                    error_1 = _b.sent();
                    console.error('获取问答库失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/customer-service/knowledge-base
 * 添加问答（需商户登录）
 * Body: { question, answer, category?, keywords? }
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, body, question, answer, category, keywords, _a, data, error, error_2;
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
                    question = body.question, answer = body.answer, category = body.category, keywords = body.keywords;
                    if (!question || !answer) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少必要参数: question, answer' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('customer_service_knowledge_base')
                            .insert({
                            tenant_id: tenantId,
                            question: question,
                            answer: answer,
                            category: category || 'general',
                            keywords: keywords || [],
                            is_active: true,
                        })
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, data: data, message: '问答已添加' }, { status: 201 })];
                case 5:
                    error_2 = _b.sent();
                    console.error('添加问答失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * PUT /api/customer-service/knowledge-base
 * 更新问答（需商户登录）
 * Body: { id, question?, answer?, category?, keywords?, is_active? }
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, body, id, question, answer, category, keywords, is_active, updateData, _a, data, error, error_3;
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
                    id = body.id, question = body.question, answer = body.answer, category = body.category, keywords = body.keywords, is_active = body.is_active;
                    if (!id) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少问答 ID' }, { status: 400 })];
                    }
                    updateData = {
                        updated_at: new Date().toISOString(),
                    };
                    if (question !== undefined)
                        updateData.question = question;
                    if (answer !== undefined)
                        updateData.answer = answer;
                    if (category !== undefined)
                        updateData.category = category;
                    if (keywords !== undefined)
                        updateData.keywords = keywords;
                    if (is_active !== undefined)
                        updateData.is_active = is_active;
                    return [4 /*yield*/, supabase
                            .from('customer_service_knowledge_base')
                            .update(updateData)
                            .eq('id', id)
                            .eq('tenant_id', tenantId)
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: data,
                            message: '问答已更新',
                        })];
                case 5:
                    error_3 = _b.sent();
                    console.error('更新问答失败:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/customer-service/knowledge-base?id=xxx
 * 删除问答（需商户登录）
 */
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, tenantId, id, error, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    tenantId = session.user.id;
                    id = request.nextUrl.searchParams.get('id');
                    if (!id) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少问答 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('customer_service_knowledge_base')
                            .delete()
                            .eq('id', id)
                            .eq('tenant_id', tenantId)];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: '问答已删除',
                        })];
                case 4:
                    error_4 = _a.sent();
                    console.error('删除问答失败:', error_4);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_4) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
