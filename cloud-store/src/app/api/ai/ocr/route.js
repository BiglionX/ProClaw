"use strict";
// ProClaw Shop - AI 订单识别 API
// 使用 AI 视觉识别图片中的订单信息
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
exports.GET = GET;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tokenApi_1 = require("@/lib/tokenApi");
var tenant_1 = require("@/lib/tenant");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
// AI API 配置
var AI_CONFIG = {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL_VISION || 'gpt-4o',
};
/**
 * 调用 AI 视觉识别 API
 */
function callVisionAI(imageUrl, type) {
    return __awaiter(this, void 0, void 0, function () {
        var systemPrompt, messages, response, error, data, content, jsonMatch, result;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    systemPrompt = type === 'purchase'
                        ? "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u91C7\u8D2D\u8BA2\u5355\u8BC6\u522B\u4E13\u5BB6\u3002\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247\u4E2D\u7684\u91C7\u8D2D\u8BA2\u5355\uFF0C\u8FD4\u56DE\u7ED3\u6784\u5316\u7684 JSON \u6570\u636E\u3002\n\u8981\u6C42\uFF1A\n1. \u8BC6\u522B\u6240\u6709\u5546\u54C1\u9879\uFF0C\u5305\u62EC\u5546\u54C1\u540D\u79F0\u3001\u6570\u91CF\u3001\u5355\u4EF7\n2. \u8BA1\u7B97\u603B\u91D1\u989D\n3. \u5982\u679C\u6709\u4F9B\u5E94\u5546/\u5BA2\u6237\u4FE1\u606F\u4E5F\u8981\u63D0\u53D6\n4. \u8FD4\u56DE\u683C\u5F0F\u5FC5\u987B\u662F\u6709\u6548\u7684 JSON\uFF0C\u683C\u5F0F\u5982\u4E0B\uFF1A\n{\n  \"success\": true,\n  \"items\": [\n    {\n      \"productName\": \"\u5546\u54C1\u540D\u79F0\",\n      \"quantity\": \u6570\u91CF,\n      \"unitPrice\": \u5355\u4EF7,\n      \"totalPrice\": \u5C0F\u8BA1,\n      \"sku\": \"SKU\u7F16\u7801(\u5982\u6709)\",\n      \"notes\": \"\u5907\u6CE8(\u5982\u6709)\"\n    }\n  ],\n  \"total\": \u603B\u91D1\u989D,\n  \"customerName\": \"\u5BA2\u6237\u540D\u79F0(\u5982\u6709)\",\n  \"orderDate\": \"\u8BA2\u5355\u65E5\u671F(\u5982\u6709)\",\n  \"notes\": \"\u5176\u4ED6\u5907\u6CE8(\u5982\u6709)\",\n  \"rawText\": \"\u539F\u59CB\u8BC6\u522B\u6587\u672C\u6458\u8981\"\n}"
                        : "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u9500\u552E\u8BA2\u5355\u8BC6\u522B\u4E13\u5BB6\u3002\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247\u4E2D\u7684\u9500\u552E\u8BA2\u5355\uFF0C\u8FD4\u56DE\u7ED3\u6784\u5316\u7684 JSON \u6570\u636E\u3002\n\u8981\u6C42\uFF1A\n1. \u8BC6\u522B\u6240\u6709\u5546\u54C1\u9879\uFF0C\u5305\u62EC\u5546\u54C1\u540D\u79F0\u3001\u6570\u91CF\u3001\u5355\u4EF7\n2. \u8BA1\u7B97\u603B\u91D1\u989D\n3. \u5982\u679C\u6709\u5BA2\u6237\u4FE1\u606F\u4E5F\u8981\u63D0\u53D6\n4. \u8FD4\u56DE\u683C\u5F0F\u5FC5\u987B\u662F\u6709\u6548\u7684 JSON\uFF0C\u683C\u5F0F\u5982\u4E0B\uFF1A\n{\n  \"success\": true,\n  \"items\": [\n    {\n      \"productName\": \"\u5546\u54C1\u540D\u79F0\",\n      \"quantity\": \u6570\u91CF,\n      \"unitPrice\": \u5355\u4EF7,\n      \"totalPrice\": \u5C0F\u8BA1,\n      \"sku\": \"SKU\u7F16\u7801(\u5982\u6709)\",\n      \"notes\": \"\u5907\u6CE8(\u5982\u6709)\"\n    }\n  ],\n  \"total\": \u603B\u91D1\u989D,\n  \"customerName\": \"\u5BA2\u6237\u540D\u79F0(\u5982\u6709)\",\n  \"orderDate\": \"\u8BA2\u5355\u65E5\u671F(\u5982\u6709)\",\n  \"notes\": \"\u5176\u4ED6\u5907\u6CE8(\u5982\u6709)\",\n  \"rawText\": \"\u539F\u59CB\u8BC6\u522B\u6587\u672C\u6458\u8981\"\n}";
                    messages = [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: { url: imageUrl },
                                },
                            ],
                        },
                    ];
                    return [4 /*yield*/, fetch("".concat(AI_CONFIG.baseUrl, "/chat/completions"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(AI_CONFIG.apiKey),
                            },
                            body: JSON.stringify({
                                model: AI_CONFIG.model,
                                messages: messages,
                                temperature: 0.1,
                                max_tokens: 2048,
                            }),
                        })];
                case 1:
                    response = _d.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _d.sent();
                    throw new Error("AI API \u8C03\u7528\u5931\u8D25: ".concat(error));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _d.sent();
                    content = ((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
                    // 解析 JSON 响应
                    try {
                        jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            result = JSON.parse(jsonMatch[0]);
                            return [2 /*return*/, result];
                        }
                        throw new Error('无法解析 AI 返回的数据');
                    }
                    catch (_e) {
                        // 返回原始文本作为 rawText
                        return [2 /*return*/, {
                                success: true,
                                items: [],
                                total: 0,
                                rawText: content,
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * 模拟 AI 识别（当没有配置 API Key 时使用）
 */
function mockOcrResult(type) {
    var mockItems = [
        { productName: 'iPhone 15 Pro 电池', quantity: 5, unitPrice: 180, totalPrice: 900 },
        { productName: '三星 Galaxy 电池', quantity: 3, unitPrice: 120, totalPrice: 360 },
        { productName: '华为 Mate 电池', quantity: 2, unitPrice: 150, totalPrice: 300 },
    ];
    return {
        success: true,
        items: mockItems,
        total: 1560,
        customerName: type === 'sales' ? '测试客户' : undefined,
        orderDate: new Date().toISOString().split('T')[0],
        notes: '这是模拟识别结果（未配置 AI API Key）',
        rawText: '模拟识别：iPhone 15 Pro 电池 x5 = 900元, 三星 Galaxy 电池 x3 = 360元, 华为 Mate 电池 x2 = 300元',
    };
}
/**
 * 保存识别记录到数据库
 */
function saveRecognitionLog(supabase, schema, userId, imageUrl, type, result) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'order_recognition_log'))
                            .insert({
                            id: crypto.randomUUID(),
                            image_url: imageUrl,
                            type: type,
                            result: JSON.stringify(result),
                            status: 'completed',
                            created_at: new Date().toISOString(),
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/ai/ocr - 识别订单图片
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, body, imageUrl, _a, type, tokenResult, ocrResult, getTenantSchema_1, schema, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    imageUrl = body.imageUrl, _a = body.type, type = _a === void 0 ? 'sales' : _a;
                    if (!imageUrl) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少图片地址' }, { status: 400 })];
                    }
                    if (!['purchase', 'sales'].includes(type)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '无效的订单类型' }, { status: 400 })];
                    }
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(session.user.id, 'ai_ocr', 1, 'POST /api/ai/ocr', { type: type, imageUrl: imageUrl.substring(0, 100) })];
                case 4:
                    tokenResult = _b.sent();
                    if (!tokenResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: tokenResult.error || 'Token 余额不足' }, { status: 402 })];
                    }
                    ocrResult = void 0;
                    if (!AI_CONFIG.apiKey) return [3 /*break*/, 6];
                    return [4 /*yield*/, callVisionAI(imageUrl, type)];
                case 5:
                    ocrResult = _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    // 没有配置 API Key，使用模拟结果
                    ocrResult = mockOcrResult(type);
                    _b.label = 7;
                case 7: return [4 /*yield*/, Promise.resolve().then(function () { return require('@/lib/tenant'); })];
                case 8:
                    getTenantSchema_1 = (_b.sent()).getTenantSchema;
                    schema = getTenantSchema_1(session.user.id);
                    return [4 /*yield*/, saveRecognitionLog(supabase, schema, session.user.id, imageUrl, type, ocrResult)];
                case 9:
                    _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: ocrResult,
                            tokensUsed: 5,
                        })];
                case 10:
                    error_1 = _b.sent();
                    console.error('AI 订单识别失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * GET /api/ai/ocr - 获取识别历史
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, page, pageSize, from, to, schema, _a, records, error, count, error_2;
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
                    page = parseInt(request.nextUrl.searchParams.get('page') || '1');
                    pageSize = 20;
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'order_recognition_log'))
                            .select('*', { count: 'exact' })
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _b.sent(), records = _a.data, error = _a.error, count = _a.count;
                    if (error) {
                        return [2 /*return*/, server_1.NextResponse.json({ data: [], total: 0 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: records || [],
                            total: count || 0,
                            page: page,
                            pageSize: pageSize,
                        })];
                case 4:
                    error_2 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
