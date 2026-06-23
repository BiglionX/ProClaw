"use strict";
// ProClaw AI 网关 — OpenAI 兼容 Chat Completions API
// 模式：统购分销 — ProClaw 统一采购大模型 API，通过网关分发给用户
// 路径：POST /api/v1/chat/completions
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
var tokenApi_1 = require("@/lib/tokenApi");
exports.dynamic = 'force-dynamic';
function getGatewayConfig() {
    return {
        upstreamUrl: process.env.AI_UPSTREAM_URL || 'https://api.deepseek.com/v1',
        upstreamKey: process.env.AI_UPSTREAM_KEY || '',
        model: process.env.AI_UPSTREAM_MODEL || 'deepseek-chat',
        demoTotalPt: parseInt(process.env.DEMO_TOKEN_TOTAL || '10000', 10),
    };
}
/** 根据 task_type 选择最合适的上游模型 */
function routeModel(taskType, defaultModel) {
    var config = getGatewayConfig();
    // 如有特别指定 model，直接使用
    if (defaultModel && defaultModel.startsWith('proclaw-')) {
        // proclaw- 前缀去掉，用上游默认模型
        return config.model;
    }
    // 按任务类型路由
    var routingMap = {
        business_insight: config.model, // 商务查询 → 默认模型（性价比）
        ceo_decision: config.model, // CEO 决策 → 默认模型
        sales_forecast: config.model, // 销售预测 → 默认模型
        simple_query: config.model, // 简单问答 → 默认模型
    };
    return routingMap[taskType || ''] || config.model;
}
// ========== 鉴权 ==========
/** 是否为演示账号请求 */
function isDemoRequest(request) {
    var authHeader = request.headers.get('authorization') || '';
    return authHeader === 'Bearer proclaw-demo';
}
/** 验证请求身份 */
function authenticate(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // 演示账号
                    if (isDemoRequest(request)) {
                        return [2 /*return*/, { authenticated: true, userId: 'demo', isDemo: true }];
                    }
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_c.sent()).data.session;
                    if ((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.id) {
                        return [2 /*return*/, { authenticated: true, userId: session.user.id, isDemo: false }];
                    }
                    return [2 /*return*/, { authenticated: false, isDemo: false, error: '未登录' }];
                case 3:
                    _a = _c.sent();
                    return [2 /*return*/, { authenticated: false, isDemo: false, error: '鉴权失败' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** 转发请求到上游大模型 */
function forwardToUpstream(body, routedModel, signal) {
    return __awaiter(this, void 0, void 0, function () {
        var config, response, errorText;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    config = getGatewayConfig();
                    if (!config.upstreamKey) {
                        throw new Error('AI 网关未配置上游 API Key（环境变量 AI_UPSTREAM_KEY 为空）');
                    }
                    return [4 /*yield*/, fetch("".concat(config.upstreamUrl, "/chat/completions"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(config.upstreamKey),
                            },
                            body: JSON.stringify({
                                model: routedModel,
                                messages: body.messages,
                                temperature: (_a = body.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                max_tokens: (_b = body.max_tokens) !== null && _b !== void 0 ? _b : 2000,
                            }),
                            signal: signal,
                        })];
                case 1:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text().catch(function () { return ''; })];
                case 2:
                    errorText = _c.sent();
                    throw new Error("\u4E0A\u6E38 LLM \u8FD4\u56DE\u9519\u8BEF ".concat(response.status, ": ").concat(errorText));
                case 3: return [2 /*return*/, response.json()];
            }
        });
    });
}
// ========== Token 计费 ==========
/** 估算 PT 消耗（1 token ≈ 1 PT，输入+输出合计） */
function estimatePtCost(usage) {
    return Math.ceil(usage.prompt_tokens * 1.0 + usage.completion_tokens * 1.5);
}
// ========== POST 处理器 ==========
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, auth, body, _a, meta, demoHeader, demoBalance, balance, routedModel, upstreamResponse, error_1, errMsg, costPt, remainingPt, responseBody, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    startTime = Date.now();
                    return [4 /*yield*/, authenticate(request)];
                case 1:
                    auth = _b.sent();
                    if (!auth.authenticated) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: auth.error || '未鉴权' }, { status: 401 })];
                    }
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: '请求体格式错误' }, { status: 400 })];
                case 5:
                    if (!body.messages || body.messages.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少 messages' }, { status: 400 })];
                    }
                    meta = body.proclaw_meta || {};
                    if (!auth.isDemo) return [3 /*break*/, 6];
                    demoHeader = request.headers.get('x-proclaw-demo-balance');
                    demoBalance = parseInt(demoHeader || '', 10);
                    if (!isNaN(demoBalance) && demoBalance <= 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '演示 Token 余额已用完（10,000 PT）。如需继续测试，请联系我们获取更多 Token。' }, { status: 402 })];
                    }
                    return [3 /*break*/, 8];
                case 6:
                    if (!auth.userId) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, tokenApi_1.getTokenBalance)(auth.userId)];
                case 7:
                    balance = _b.sent();
                    if (balance <= 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Token 余额不足。请前往用户中心充值。' }, { status: 402 })];
                    }
                    _b.label = 8;
                case 8:
                    routedModel = routeModel(meta.task_type, body.model);
                    _b.label = 9;
                case 9:
                    _b.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, forwardToUpstream(body, routedModel)];
                case 10:
                    upstreamResponse = _b.sent();
                    return [3 /*break*/, 12];
                case 11:
                    error_1 = _b.sent();
                    errMsg = error_1 instanceof Error ? error_1.message : '未知错误';
                    console.error('[AI 网关] 上游调用失败:', errMsg);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: "AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528: ".concat(errMsg),
                            proclaw_meta: {
                                routed_model: routedModel,
                                error_type: 'upstream_failure',
                                latency_ms: Date.now() - startTime,
                            },
                        }, { status: 502 })];
                case 12:
                    costPt = estimatePtCost(upstreamResponse.usage);
                    remainingPt = auth.isDemo
                        ? -1 // 桌面端 local 管理
                        : -1;
                    // 7. 记录调用日志
                    console.log('[AI 网关]', {
                        user: auth.userId,
                        demo: auth.isDemo,
                        task: meta.task_type,
                        feature: meta.feature,
                        model: routedModel,
                        tokens: upstreamResponse.usage,
                        cost_pt: costPt,
                        latency_ms: Date.now() - startTime,
                    });
                    responseBody = {
                        id: upstreamResponse.id || "chatcmpl-".concat(Date.now()),
                        object: 'chat.completion',
                        model: body.model || 'proclaw-gpt-4',
                        choices: upstreamResponse.choices.map(function (choice) { return ({
                            index: choice.index,
                            message: {
                                role: choice.message.role,
                                content: choice.message.content,
                            },
                            finish_reason: choice.finish_reason,
                        }); }),
                        usage: upstreamResponse.usage,
                        // ProClaw 扩展元数据
                        proclaw_meta: {
                            routed_model: routedModel,
                            cost_pt: costPt,
                            remaining_pt: remainingPt,
                            is_demo: auth.isDemo,
                            latency_ms: Date.now() - startTime,
                        },
                    };
                    res = server_1.NextResponse.json(responseBody);
                    res.headers.set('X-ProClaw-Cost-Pt', String(costPt));
                    res.headers.set('X-ProClaw-Routed-Model', routedModel);
                    return [2 /*return*/, res];
            }
        });
    });
}
