"use strict";
// ProClaw Cloud 托管版 - AI 客服知识库检索服务
// 实现三级检索：商品库 → 问答库（精确+向量）→ 订单查询 → LLM 增强回答 / 转人工
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
exports.searchCustomerService = searchCustomerService;
function getLLMConfig() {
    var apiKey = process.env.AI_API_KEY;
    if (!apiKey)
        return null;
    return {
        apiKey: apiKey,
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
    };
}
/**
 * 调用 LLM 生成客服回答
 * 将检索到的数据作为上下文注入，让 AI 自然回答
 */
function callCustomerServiceLLM(config, systemPrompt, query, context) {
    return __awaiter(this, void 0, void 0, function () {
        var contextBlock, enhancedSystemPrompt, messages, response, data, content, needsTransfer, err_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    contextBlock = '';
                    if ((context === null || context === void 0 ? void 0 : context.products) && context.products.length > 0) {
                        contextBlock += '\n## 当前商品数据\n';
                        context.products.forEach(function (p, i) {
                            contextBlock += "".concat(i + 1, ". ").concat(p.name, " | \u00A5").concat(p.price, " | \u5E93\u5B58 ").concat(p.stock);
                            if (p.category)
                                contextBlock += " | \u5206\u7C7B: ".concat(p.category);
                            contextBlock += '\n';
                            if (p.description)
                                contextBlock += "   \u63CF\u8FF0: ".concat(p.description, "\n");
                        });
                    }
                    if (context === null || context === void 0 ? void 0 : context.kbAnswer) {
                        contextBlock += '\n## 问答库匹配结果\n' + context.kbAnswer + '\n';
                    }
                    if (context === null || context === void 0 ? void 0 : context.orderInfo) {
                        contextBlock += '\n## 订单信息\n' + context.orderInfo + '\n';
                    }
                    enhancedSystemPrompt = systemPrompt + '\n\n' +
                        "## \u56DE\u7B54\u89C4\u5219\n" +
                        "1. \u4F18\u5148\u4F7F\u7528\u4E0B\u65B9\u63D0\u4F9B\u7684\u300C\u5F53\u524D\u6570\u636E\u300D\u6765\u56DE\u7B54\uFF0C\u6D89\u53CA\u4EF7\u683C\u3001\u5E93\u5B58\u4EE5\u5B9E\u9645\u6570\u636E\u4E3A\u51C6\n" +
                        "2. \u56DE\u7B54\u8981\u53E3\u8BED\u5316\u3001\u81EA\u7136\uFF0C\u4E0D\u8981\u751F\u786C\u5730\u7F57\u5217\u6570\u636E\n" +
                        "3. \u5982\u679C\u5BA2\u6237\u7684\u95EE\u9898\u9700\u8981\u67E5\u66F4\u591A\u6570\u636E\uFF08\u5982\u67D0\u4E2A\u5546\u54C1\u7684\u8BE6\u7EC6\u89C4\u683C\uFF09\uFF0C\u8BF7\u5728\u56DE\u7B54\u672B\u5C3E\u6307\u5B9A\u8981\u67E5\u8BE2\u7684\u5185\u5BB9\uFF0C\u683C\u5F0F\u4E3A\uFF1A\u3010\u67E5\u8BE2: \u5546\u54C1\u540D\u79F0\u3011\n" +
                        "4. \u5982\u679C\u5BA2\u6237\u7684\u95EE\u9898\u9700\u8981\u67E5\u770B\u8BA2\u5355\u72B6\u6001\u4F46\u672A\u63D0\u4F9B\u8BA2\u5355\u53F7\uFF0C\u5F15\u5BFC\u5BA2\u6237\u63D0\u4F9B\u8BA2\u5355\u53F7\n" +
                        "5. \u9047\u5230\u4EE5\u4E0B\u60C5\u51B5\u8BF7\u8BBE\u7F6E\u9700\u8981\u8F6C\u4EBA\u5DE5\uFF1A\u8BAE\u4EF7\u3001\u6295\u8BC9\u3001\u5B9A\u5236\u9700\u6C42\u3001\u8981\u6C42\u627E\u771F\u4EBA\n" +
                        "6. \u56DE\u7B54\u63A7\u5236\u5728200\u5B57\u4EE5\u5185\uFF0C\u7B80\u6D01\u660E\u4E86";
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 4, , 5]);
                    messages = [
                        { role: 'system', content: enhancedSystemPrompt },
                    ];
                    // 如果有数据上下文，先注入
                    if (contextBlock) {
                        messages.push({
                            role: 'system',
                            content: "\u3010\u5F53\u524D\u6570\u636E\u5E93\u67E5\u8BE2\u5230\u7684\u6570\u636E\uFF0C\u8BF7\u53C2\u8003\u8FD9\u4E9B\u6570\u636E\u56DE\u7B54\u5BA2\u6237\u3011\n".concat(contextBlock),
                        });
                    }
                    messages.push({ role: 'user', content: query });
                    return [4 /*yield*/, fetch("".concat(config.baseUrl, "/chat/completions"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(config.apiKey),
                            },
                            body: JSON.stringify({
                                model: config.model,
                                messages: messages,
                                temperature: 0.3,
                                max_tokens: 500,
                            }),
                        })];
                case 2:
                    response = _d.sent();
                    if (!response.ok) {
                        throw new Error("LLM API error: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _d.sent();
                    content = (((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '').trim();
                    if (!content) {
                        return [2 /*return*/, { answer: '', needsTransfer: true, transferReason: 'AI 返回空回答' }];
                    }
                    needsTransfer = /需要转人工|转人工|找真人|请联系人工/i.test(content);
                    return [2 /*return*/, {
                            answer: content,
                            needsTransfer: needsTransfer,
                            transferReason: needsTransfer ? 'AI 判断需要人工处理' : undefined,
                        }];
                case 4:
                    err_1 = _d.sent();
                    console.error('LLM 调用失败:', err_1);
                    return [2 /*return*/, { answer: '', needsTransfer: true, transferReason: 'AI 服务暂时不可用' }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 动态查询商品详情
 * 解析 LLM 回复中的【查询: xxx】标记，执行二次查询
 */
function handleDynamicQuery(supabase, schema, answer) {
    return __awaiter(this, void 0, void 0, function () {
        var match, queryTerm, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    match = answer.match(/【查询:\s*(.+?)】/);
                    if (!match)
                        return [2 /*return*/, null];
                    queryTerm = match[1].trim();
                    if (!queryTerm)
                        return [2 /*return*/, null];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"products\""))
                            .select('id, name, price, stock, description, category')
                            .or("name.ilike.%".concat(queryTerm, "%,description.ilike.%").concat(queryTerm, "%"))
                            .limit(3)];
                case 2:
                    data = (_b.sent()).data;
                    if (data && data.length > 0) {
                        return [2 /*return*/, data.map(function (p) {
                                return "\u3010".concat(p.name, "\u3011\u00A5").concat(p.price, "\uFF0C\u5E93\u5B58 ").concat(p.stock).concat(p.description ? "\n\u8BF4\u660E: ".concat(p.description) : '');
                            }).join('\n---\n')];
                    }
                    return [2 /*return*/, "\u672A\u627E\u5230\u300C".concat(queryTerm, "\u300D\u7684\u76F8\u5173\u4FE1\u606F\u3002")];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ===== 商品库检索 =====
/**
 * 从商品库检索商品信息
 * 关键词匹配商品名称/描述/分类
 */
function searchProducts(supabase, schema, query) {
    return __awaiter(this, void 0, void 0, function () {
        var keywords, conditions, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    keywords = query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
                    if (keywords.length === 0)
                        return [2 /*return*/, []];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    conditions = keywords.map(function (k) { return "name.ilike.%".concat(k, "%"); });
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"products\""))
                            .select('id, name, price, stock, description, category')
                            .or(conditions.join(','))
                            .limit(5)];
                case 2:
                    data = (_b.sent()).data;
                    return [2 /*return*/, (data || []).map(function (p) { return ({
                            id: String(p.id || ''),
                            name: String(p.name || ''),
                            price: Number(p.price) || 0,
                            stock: Number(p.stock) || 0,
                            description: p.description ? String(p.description) : undefined,
                            category: p.category ? String(p.category) : undefined,
                        }); })];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ===== 问答库检索 =====
/**
 * 精确关键词匹配问答库
 */
function exactMatchKB(supabase, tenantId, query) {
    return __awaiter(this, void 0, void 0, function () {
        var data, queryLower_1, bestMatch, _i, data_1, item, questionLower, keywords, score, matchedKeywords, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase
                            .from('customer_service_knowledge_base')
                            .select('question, answer, keywords')
                            .eq('tenant_id', tenantId)
                            .eq('is_active', true)
                            .limit(20)];
                case 1:
                    data = (_b.sent()).data;
                    if (!data || data.length === 0)
                        return [2 /*return*/, null];
                    queryLower_1 = query.toLowerCase();
                    bestMatch = null;
                    for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                        item = data_1[_i];
                        questionLower = item.question.toLowerCase();
                        keywords = (item.keywords || []);
                        score = 0;
                        // 问题包含匹配
                        if (questionLower.includes(queryLower_1) || queryLower_1.includes(questionLower)) {
                            score = Math.max(score, 0.7 + (queryLower_1.length / Math.max(questionLower.length, 1)) * 0.2);
                        }
                        matchedKeywords = keywords.filter(function (k) { return queryLower_1.includes(k.toLowerCase()); });
                        if (keywords.length > 0) {
                            score = Math.max(score, matchedKeywords.length / keywords.length * 0.9);
                        }
                        if (score > 0.5 && (!bestMatch || score > bestMatch.confidence)) {
                            bestMatch = { answer: item.answer, confidence: Math.min(score, 0.95) };
                        }
                    }
                    return [2 /*return*/, bestMatch];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 向量相似度检索问答库
 * 需要 pgvector 扩展和 embedding 字段
 */
function vectorSearchKB(supabase, tenantId, embedding) {
    return __awaiter(this, void 0, void 0, function () {
        var data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase.rpc('match_cs_knowledge_base', {
                            p_tenant_id: tenantId,
                            p_embedding: embedding,
                            p_match_threshold: 0.6,
                            p_match_count: 3,
                        })];
                case 1:
                    data = (_b.sent()).data;
                    if (data && data.length > 0) {
                        return [2 /*return*/, {
                                answer: data[0].answer,
                                confidence: data[0].similarity,
                            }];
                    }
                    return [2 /*return*/, null];
                case 2:
                    _a = _b.sent();
                    // 如果 RPC 不存在或向量检索失败，返回 null
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ===== 订单查询检测 =====
/**
 * 检测查询是否为订单查询
 */
function isOrderQuery(query) {
    var orderPatterns = [
        /订单/i,
        /我的订单/i,
        /查.*订单/i,
        /订单号/i,
        /DD\d{6,}/i,
        /ORD/i,
    ];
    return orderPatterns.some(function (p) { return p.test(query); });
}
/**
 * 从查询中提取订单号
 */
function extractOrderNumber(query) {
    var patterns = [
        /(?:订单号[：:]\s*)?(DD\d{6,})/i,
        /(?:订单号[：:]\s*)?(ORD[-_]\w+)/i,
        /(?:订单号[：:]\s*)?(\d{8,})/,
    ];
    for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
        var p = patterns_1[_i];
        var match = query.match(p);
        if (match)
            return match[1];
    }
    return null;
}
/**
 * 查询订单状态
 */
function queryOrderStatus(supabase, schema, orderNumber) {
    return __awaiter(this, void 0, void 0, function () {
        var data, statusMap, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"orders\""))
                            .select('order_number, status, total_amount, created_at')
                            .or("order_number.eq.".concat(orderNumber, ",id.eq.").concat(orderNumber))
                            .limit(1)
                            .single()];
                case 1:
                    data = (_b.sent()).data;
                    if (data) {
                        statusMap = {
                            pending: '待付款',
                            paid: '已付款',
                            processing: '处理中',
                            shipped: '已发货',
                            delivered: '已送达',
                            completed: '已完成',
                            cancelled: '已取消',
                            refunding: '退款中',
                            refunded: '已退款',
                        };
                        return [2 /*return*/, "\u60A8\u7684\u8BA2\u5355 **".concat(data.order_number, "** \u5F53\u524D\u72B6\u6001\u4E3A\uFF1A**").concat(statusMap[data.status] || data.status, "**\n\u4E0B\u5355\u65F6\u95F4\uFF1A").concat(new Date(data.created_at).toLocaleString('zh-CN')).concat(data.total_amount ? "\n\u8BA2\u5355\u91D1\u989D\uFF1A\u00A5".concat(data.total_amount) : '')];
                    }
                    return [2 /*return*/, '未找到该订单，请检查订单号是否正确。'];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ===== 主检索流程 =====
/**
 * 客服主检索入口
 * 按三级检索流程处理客户问题
 */
function searchCustomerService(supabase, schema, tenantId, query, options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, products, exactMatch, llmConfig, vectorMatch, orderInfo, orderNumber, transferMode, systemPrompt, settings, _b, kbAnswer, hasData, llmResult, dynamicResult, secondResult, list;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        searchProducts(supabase, schema, query),
                        exactMatchKB(supabase, tenantId, query),
                        Promise.resolve(getLLMConfig()),
                    ])];
                case 1:
                    _a = _c.sent(), products = _a[0], exactMatch = _a[1], llmConfig = _a[2];
                    vectorMatch = null;
                    if (!(!exactMatch && (options === null || options === void 0 ? void 0 : options.embedding) && options.embedding.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, vectorSearchKB(supabase, tenantId, options.embedding)];
                case 2:
                    vectorMatch = _c.sent();
                    _c.label = 3;
                case 3:
                    if (!isOrderQuery(query)) return [3 /*break*/, 5];
                    orderNumber = extractOrderNumber(query);
                    if (!orderNumber) return [3 /*break*/, 5];
                    return [4 /*yield*/, queryOrderStatus(supabase, schema, orderNumber)];
                case 4:
                    orderInfo = (_c.sent()) || undefined;
                    _c.label = 5;
                case 5:
                    transferMode = 'direct';
                    systemPrompt = (options === null || options === void 0 ? void 0 : options.systemPrompt) || '';
                    _c.label = 6;
                case 6:
                    _c.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, supabase
                            .from('customer_service_settings')
                            .select('transfer_mode, system_prompt')
                            .eq('tenant_id', tenantId)
                            .single()];
                case 7:
                    settings = (_c.sent()).data;
                    if (settings) {
                        transferMode = settings.transfer_mode || 'direct';
                        if (!systemPrompt && settings.system_prompt) {
                            systemPrompt = settings.system_prompt;
                        }
                    }
                    return [3 /*break*/, 9];
                case 8:
                    _b = _c.sent();
                    return [3 /*break*/, 9];
                case 9:
                    // 如果未配置自定义提示词，使用默认
                    if (!systemPrompt) {
                        systemPrompt = '你是云商城的智能客服助手，礼貌、专业地回答客户的问题。回答时参考数据库中的商品信息和知识库内容，涉及价格和库存以实际数据为准。回答简洁明了，使用中文。';
                    }
                    if (!llmConfig) return [3 /*break*/, 15];
                    kbAnswer = (exactMatch === null || exactMatch === void 0 ? void 0 : exactMatch.answer) || (vectorMatch === null || vectorMatch === void 0 ? void 0 : vectorMatch.answer) || undefined;
                    hasData = products.length > 0 || kbAnswer || orderInfo;
                    return [4 /*yield*/, callCustomerServiceLLM(llmConfig, systemPrompt, query, {
                            products: products.length > 0 ? products : undefined,
                            kbAnswer: kbAnswer,
                            orderInfo: orderInfo,
                        })];
                case 10:
                    llmResult = _c.sent();
                    if (!llmResult.answer) return [3 /*break*/, 14];
                    if (!llmResult.answer.includes('【查询:')) return [3 /*break*/, 13];
                    return [4 /*yield*/, handleDynamicQuery(supabase, schema, llmResult.answer)];
                case 11:
                    dynamicResult = _c.sent();
                    if (!dynamicResult) return [3 /*break*/, 13];
                    return [4 /*yield*/, callCustomerServiceLLM(llmConfig, systemPrompt, query, { products: products.length > 0 ? products : undefined, kbAnswer: kbAnswer, orderInfo: orderInfo })];
                case 12:
                    secondResult = _c.sent();
                    if (secondResult.answer) {
                        return [2 /*return*/, {
                                found: true,
                                answer: secondResult.answer,
                                source: 'model',
                                confidence: 0.7,
                                needsTransfer: secondResult.needsTransfer,
                                transferReason: secondResult.transferReason,
                            }];
                    }
                    _c.label = 13;
                case 13: return [2 /*return*/, {
                        found: true,
                        answer: llmResult.answer,
                        source: hasData ? 'knowledge_base' : 'model',
                        confidence: hasData ? 0.7 : 0.4,
                        needsTransfer: llmResult.needsTransfer,
                        transferReason: llmResult.transferReason,
                    }];
                case 14:
                    // LLM 返回空，转人工
                    if (transferMode === 'direct') {
                        return [2 /*return*/, { found: false, answer: '', source: 'manual', confidence: 0, needsTransfer: true, transferReason: llmResult.transferReason || '无法自动回答' }];
                    }
                    _c.label = 15;
                case 15:
                    // --- LLM 不可用：回退到静态检索 ---
                    if (products.length > 0) {
                        list = products.map(function (p) { return "".concat(p.name, " \u00A5").concat(p.price, "\uFF08\u5E93\u5B58 ").concat(p.stock, "\uFF09"); }).join('、');
                        return [2 /*return*/, { found: true, answer: "\u4E3A\u60A8\u627E\u5230\u4EE5\u4E0B\u5546\u54C1\uFF1A".concat(list), source: 'knowledge_base', confidence: 0.85, needsTransfer: false }];
                    }
                    if (exactMatch) {
                        return [2 /*return*/, { found: true, answer: exactMatch.answer, source: 'knowledge_base', confidence: exactMatch.confidence, needsTransfer: false }];
                    }
                    if (orderInfo) {
                        return [2 /*return*/, { found: true, answer: orderInfo, source: 'knowledge_base', confidence: 0.9, needsTransfer: false }];
                    }
                    if (isOrderQuery(query)) {
                        return [2 /*return*/, { found: true, answer: '请提供您的订单号，我来为您查询订单状态。', source: 'model', confidence: 0.5, needsTransfer: false }];
                    }
                    if (vectorMatch) {
                        return [2 /*return*/, { found: true, answer: vectorMatch.answer, source: 'knowledge_base', confidence: vectorMatch.confidence, needsTransfer: false }];
                    }
                    // --- 回退：转人工 ---
                    return [2 /*return*/, { found: false, answer: '', source: 'manual', confidence: 0, needsTransfer: true, transferReason: '无法自动回答' }];
            }
        });
    });
}
