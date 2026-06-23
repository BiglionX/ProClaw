"use strict";
// ProClaw Cloud 托管版 - AI 聊天 API Routes
// 对接 OpenAI/Claude API，支持经营分析、库存建议、销售趋势等
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
exports.dynamic = void 0;
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tokenApi_1 = require("@/lib/tokenApi");
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
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
};
/**
 * 获取 AI Agent 的 system prompt
 */
function getSystemPrompt(agentType) {
    var prompts = {
        general: "\u4F60\u662F ProClaw Cloud \u7684 AI \u667A\u80FD\u52A9\u624B\u3002\u4F60\u5E2E\u52A9\u4E2D\u5C0F\u5546\u6237\u7BA1\u7406\u4ED6\u4EEC\u7684\u4E91\u7AEF\u7ECF\u8425\u7CFB\u7EDF\u3002\n\u4F60\u53EF\u4EE5\uFF1A\n1. \u56DE\u7B54\u5173\u4E8E\u8FDB\u9500\u5B58\u7BA1\u7406\u7684\u95EE\u9898\n2. \u63D0\u4F9B\u7ECF\u8425\u5EFA\u8BAE\n3. \u89E3\u91CA\u7CFB\u7EDF\u529F\u80FD\u548C\u4F7F\u7528\u65B9\u6CD5\n\u8BF7\u7528\u7B80\u6D01\u3001\u4E13\u4E1A\u7684\u4E2D\u6587\u56DE\u7B54\u3002\u56DE\u7B54\u8981\u5B9E\u7528\u3001\u5177\u4F53\u3002",
        inventory: "\u4F60\u662F ProClaw Cloud \u7684\u5E93\u5B58\u7BA1\u7406\u4E13\u5BB6\u3002\u4F60\u5E2E\u52A9\u5546\u6237\u4F18\u5316\u5E93\u5B58\u7BA1\u7406\u3002\n\u4F60\u53EF\u4EE5\uFF1A\n1. \u5206\u6790\u5E93\u5B58\u6570\u636E\u5E76\u63D0\u4F9B\u8865\u8D27\u5EFA\u8BAE\n2. \u8BC6\u522B\u5E93\u5B58\u5468\u8F6C\u95EE\u9898\u548C\u6EDE\u9500\u5546\u54C1\n3. \u5EFA\u8BAE\u6700\u4F4E\u5E93\u5B58\u6C34\u5E73\u548C\u5B89\u5168\u5E93\u5B58\u7B56\u7565\n4. \u5206\u6790\u5E93\u5B58\u6210\u672C\n\u8BF7\u7528\u7B80\u6D01\u3001\u4E13\u4E1A\u7684\u4E2D\u6587\u56DE\u7B54\u3002\u57FA\u4E8E\u6570\u636E\u5206\u6790\u63D0\u4F9B\u5177\u4F53\u5EFA\u8BAE\u3002",
        finance: "\u4F60\u662F ProClaw Cloud \u7684\u8D22\u52A1\u7BA1\u7406\u4E13\u5BB6\u3002\u4F60\u5E2E\u52A9\u5546\u6237\u5206\u6790\u7ECF\u8425\u8D22\u52A1\u72B6\u51B5\u3002\n\u4F60\u53EF\u4EE5\uFF1A\n1. \u5206\u6790 Token \u6D88\u8017\u6A21\u5F0F\u548C\u6210\u672C\u4F18\u5316\n2. \u63D0\u4F9B\u7ECF\u8425\u6536\u5165\u548C\u652F\u51FA\u5206\u6790\n3. \u5EFA\u8BAE\u5B9A\u4EF7\u7B56\u7565\u548C\u5229\u6DA6\u4F18\u5316\n4. \u5206\u6790\u9500\u552E\u8D8B\u52BF\u548C\u5B63\u8282\u6027\u6CE2\u52A8\n\u8BF7\u7528\u7B80\u6D01\u3001\u4E13\u4E1A\u7684\u4E2D\u6587\u56DE\u7B54\u3002\u57FA\u4E8E\u6570\u636E\u63D0\u4F9B\u5177\u4F53\u7684\u8D22\u52A1\u5EFA\u8BAE\u3002",
        sales: "\u4F60\u662F ProClaw Cloud \u7684\u9500\u552E\u5206\u6790\u4E13\u5BB6\u3002\u4F60\u5E2E\u52A9\u5546\u6237\u63D0\u5347\u9500\u552E\u4E1A\u7EE9\u3002\n\u4F60\u53EF\u4EE5\uFF1A\n1. \u5206\u6790\u9500\u552E\u6570\u636E\u548C\u8D8B\u52BF\n2. \u8BC6\u522B\u7545\u9500\u548C\u6EDE\u9500\u5546\u54C1\n3. \u63D0\u4F9B\u4FC3\u9500\u548C\u5B9A\u4EF7\u5EFA\u8BAE\n4. \u5206\u6790\u5BA2\u6237\u8D2D\u4E70\u884C\u4E3A\n\u8BF7\u7528\u7B80\u6D01\u3001\u4E13\u4E1A\u7684\u4E2D\u6587\u56DE\u7B54\u3002\u57FA\u4E8E\u6570\u636E\u63D0\u4F9B\u5177\u4F53\u7684\u9500\u552E\u5EFA\u8BAE\u3002",
    };
    return prompts[agentType] || prompts.general;
}
/**
 * 调用 OpenAI API
 */
function callOpenAI(messages) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error, data;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, fetch("".concat(AI_CONFIG.baseUrl, "/chat/completions"), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': "Bearer ".concat(AI_CONFIG.apiKey),
                        },
                        body: JSON.stringify({
                            model: AI_CONFIG.model,
                            messages: messages,
                            temperature: 0.7,
                            max_tokens: 1024,
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
                    return [2 /*return*/, ((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '抱歉，无法生成回复。'];
            }
        });
    });
}
/**
 * 模拟 AI 回复（当没有配置 API Key 时使用）
 */
function mockAIResponse(userMessage, agentType) {
    var mockResponses = {
        general: [
            "\u60A8\u597D\uFF01\u6211\u662F ProClaw Cloud \u667A\u80FD\u52A9\u624B\u3002\u5173\u4E8E\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u60A8\u67E5\u770B\u7CFB\u7EDF\u5E2E\u52A9\u6587\u6863\u6216\u8054\u7CFB\u6280\u672F\u652F\u6301\u83B7\u53D6\u8BE6\u7EC6\u6307\u5BFC\u3002"),
            "\u611F\u8C22\u60A8\u7684\u63D0\u95EE\u3002\u5173\u4E8E\"".concat(userMessage, "\"\uFF0C\u60A8\u53EF\u4EE5\u5728\u7CFB\u7EDF\u8BBE\u7F6E\u4E2D\u8FDB\u884C\u76F8\u5173\u914D\u7F6E\u3002\u5982\u9700\u8FDB\u4E00\u6B65\u5E2E\u52A9\uFF0C\u8BF7\u8BE6\u7EC6\u63CF\u8FF0\u60A8\u7684\u9700\u6C42\u3002"),
            "\u6536\u5230\u60A8\u7684\u95EE\u9898\uFF1A\"".concat(userMessage, "\"\u3002\u5EFA\u8BAE\u60A8\u6309\u7167\u4EE5\u4E0B\u6B65\u9AA4\u64CD\u4F5C\uFF1A\n1. \u767B\u5F55\u7CFB\u7EDF\n2. \u8FDB\u5165\u76F8\u5173\u529F\u80FD\u6A21\u5757\n3. \u6839\u636E\u63D0\u793A\u5B8C\u6210\u64CD\u4F5C\n\u5982\u679C\u4ECD\u6709\u95EE\u9898\uFF0C\u6B22\u8FCE\u7EE7\u7EED\u54A8\u8BE2\u3002"),
        ],
        inventory: [
            "\u57FA\u4E8E\u5E93\u5B58\u6570\u636E\u5206\u6790\uFF0C\u5173\u4E8E\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u60A8\uFF1A\n1. \u5B9A\u671F\u68C0\u67E5\u4F4E\u5E93\u5B58\u5546\u54C1\uFF0C\u53CA\u65F6\u8865\u8D27\n2. \u5BF9\u6EDE\u9500\u5546\u54C1\u8FDB\u884C\u4FC3\u9500\u5904\u7406\n3. \u8BBE\u7F6E\u5408\u7406\u7684\u6700\u4F4E\u5E93\u5B58\u9884\u8B66\u503C\n4. \u4F18\u5316\u91C7\u8D2D\u5468\u671F\uFF0C\u964D\u4F4E\u5E93\u5B58\u6210\u672C"),
            "\u5E93\u5B58\u5206\u6790\u5EFA\u8BAE\uFF1A\u9488\u5BF9\"".concat(userMessage, "\"\uFF0C\u5F53\u524D\u7CFB\u7EDF\u652F\u6301\u5E93\u5B58\u9884\u8B66\u529F\u80FD\uFF0C\u5EFA\u8BAE\u60A8\u8BBE\u7F6E\u5408\u7406\u7684\u6700\u4F4E\u5E93\u5B58\u9608\u503C\uFF0C\u7CFB\u7EDF\u4F1A\u5728\u5E93\u5B58\u4E0D\u8DB3\u65F6\u81EA\u52A8\u63D0\u9192\u3002"),
        ],
        finance: [
            "\u8D22\u52A1\u5206\u6790\uFF1A\u5173\u4E8E\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u60A8\u5173\u6CE8 Token \u6D88\u8017\u8D8B\u52BF\u3002\u7CFB\u7EDF\u652F\u6301\u6309\u65E5/\u5468/\u6708\u67E5\u770B\u6D88\u8017\u660E\u7EC6\uFF0C\u5E2E\u52A9\u60A8\u4F18\u5316\u6210\u672C\u7ED3\u6784\u3002"),
            "\u7ECF\u8425\u5EFA\u8BAE\uFF1A\u9488\u5BF9\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u5B9A\u671F\u67E5\u770B Token \u4F59\u989D\u548C\u6D88\u8017\u60C5\u51B5\u3002\u5408\u7406\u89C4\u5212 API \u8C03\u7528\u9891\u7387\u53EF\u4EE5\u6709\u6548\u63A7\u5236\u6210\u672C\u3002"),
        ],
        sales: [
            "\u9500\u552E\u5206\u6790\uFF1A\u5173\u4E8E\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u60A8\u67E5\u770B\u9500\u552E\u62A5\u8868\u4E86\u89E3\u5404\u5546\u54C1\u7684\u9500\u552E\u8D8B\u52BF\u3002\u7CFB\u7EDF\u652F\u6301\u6309\u65F6\u95F4\u3001\u5546\u54C1\u3001\u5BA2\u6237\u7B49\u591A\u7EF4\u5EA6\u5206\u6790\u3002"),
            "\u9500\u552E\u5EFA\u8BAE\uFF1A\u9488\u5BF9\"".concat(userMessage, "\"\uFF0C\u5EFA\u8BAE\u5173\u6CE8\u9AD8\u6BDB\u5229\u5546\u54C1\u7684\u9500\u552E\u60C5\u51B5\u3002\u901A\u8FC7\u5206\u6790\u5BA2\u6237\u8D2D\u4E70\u8BB0\u5F55\uFF0C\u53EF\u4EE5\u5236\u5B9A\u66F4\u7CBE\u51C6\u7684\u8425\u9500\u7B56\u7565\u3002"),
        ],
    };
    var responses = mockResponses[agentType] || mockResponses.general;
    return responses[Math.floor(Math.random() * responses.length)];
}
/**
 * 记录 AI 对话到 tenant schema
 */
function saveAIConversation(supabase, schema, userId, messages, response) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    // 尝试保存到 ai_conversations 表（如果存在的话）
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"ai_conversations\""))
                            .insert({
                            user_id: userId,
                            messages: JSON.stringify(messages),
                            response: response,
                            created_at: new Date().toISOString(),
                        })];
                case 1:
                    // 尝试保存到 ai_conversations 表（如果存在的话）
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
 * POST /api/ai/chat - 发送 AI 聊天消息
 * Body: { messages: ChatMessage[], agentType?: string }
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, body, messages, _a, agentType, tokenResult, systemPrompt, fullMessages, aiResponse, lastUserMessage, getTenantSchema, schema, error_1;
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
                    messages = body.messages, _a = body.agentType, agentType = _a === void 0 ? 'general' : _a;
                    if (!messages || messages.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少消息内容' }, { status: 400 })];
                    }
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(session.user.id, 'ai_chat', 1, 'POST /api/ai/chat', { agentType: agentType, messageCount: messages.length })];
                case 4:
                    tokenResult = _b.sent();
                    if (!tokenResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: tokenResult.error || 'Token 余额不足' }, { status: 402 })];
                    }
                    systemPrompt = getSystemPrompt(agentType);
                    fullMessages = __spreadArray([
                        { role: 'system', content: systemPrompt }
                    ], messages, true);
                    aiResponse = void 0;
                    if (!AI_CONFIG.apiKey) return [3 /*break*/, 6];
                    return [4 /*yield*/, callOpenAI(fullMessages)];
                case 5:
                    aiResponse = _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    lastUserMessage = messages.filter(function (m) { return m.role === 'user'; }).pop();
                    aiResponse = mockAIResponse((lastUserMessage === null || lastUserMessage === void 0 ? void 0 : lastUserMessage.content) || '', agentType);
                    _b.label = 7;
                case 7: return [4 /*yield*/, Promise.resolve().then(function () { return require('@/lib/tenant'); })];
                case 8:
                    getTenantSchema = (_b.sent()).getTenantSchema;
                    schema = getTenantSchema(session.user.id);
                    return [4 /*yield*/, saveAIConversation(supabase, schema, session.user.id, messages, aiResponse)];
                case 9:
                    _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                role: 'assistant',
                                content: aiResponse,
                                agentType: agentType,
                                tokensUsed: 5,
                            },
                        })];
                case 10:
                    error_1 = _b.sent();
                    console.error('AI 聊天失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
