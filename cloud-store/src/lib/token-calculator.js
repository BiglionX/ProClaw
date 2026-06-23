"use strict";
// ProClaw Shop - Token 消耗计算器
// 根据操作类型计算 Token 消耗
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
exports.TokenActions = exports.TokenCalculator = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
/**
 * Token 计算器类
 */
var TokenCalculator = /** @class */ (function () {
    function TokenCalculator(supabaseUrl, supabaseKey) {
        this.rules = new Map();
        this.rulesLoaded = false;
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        // 注意：不再在构造函数中同步调用 loadRules
    }
    /**
     * 初始化规则（异步）
     */
    TokenCalculator.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.rulesLoaded)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.loadRules()];
                    case 1:
                        _a.sent();
                        this.rulesLoaded = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 加载消费规则
     */
    TokenCalculator.prototype.loadRules = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('token_rules')
                            .select('*')
                            .eq('active', true)];
                    case 1:
                        data = (_a.sent()).data;
                        if (data) {
                            data.forEach(function (rule) {
                                _this.rules.set(rule.action, rule);
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取操作规则
     */
    TokenCalculator.prototype.getRule = function (action) {
        return this.rules.get(action);
    };
    /**
     * 计算 Token 消耗
     */
    TokenCalculator.prototype.calculate = function (action, quantity) {
        if (quantity === void 0) { quantity = 1; }
        var rule = this.rules.get(action);
        if (!rule) {
            // 默认消耗 1 Token
            return 1;
        }
        switch (rule.cost_type) {
            case 'fixed':
                return rule.token_cost;
            case 'per_unit':
                return rule.token_cost * quantity;
            case 'tiered':
                // TODO: 实现阶梯计费
                return rule.token_cost * quantity;
            default:
                return rule.token_cost;
        }
    };
    /**
     * 消费 Token（使用数据库事务防止竞态）
     */
    TokenCalculator.prototype.consume = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var tenant_id, action, _a, quantity, metadata, tokens_consumed, _b, data, error, rpcData;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // 确保规则已加载
                    return [4 /*yield*/, this.initialize()];
                    case 1:
                        // 确保规则已加载
                        _c.sent();
                        tenant_id = context.tenant_id, action = context.action, _a = context.quantity, quantity = _a === void 0 ? 1 : _a, metadata = context.metadata;
                        tokens_consumed = this.calculate(action, quantity);
                        return [4 /*yield*/, this.supabase
                                .rpc('consume_token', {
                                p_tenant_id: tenant_id,
                                p_amount: tokens_consumed,
                                p_action: action,
                                p_quantity: quantity,
                                p_metadata: metadata || {},
                            })];
                    case 2:
                        _b = _c.sent(), data = _b.data, error = _b.error;
                        if (error) {
                            console.error('Token consume error:', error);
                            // 回退到原来的非事务方式（仅用于没有 RPC 函数的情况）
                            return [2 /*return*/, this.consumeFallback(context)];
                        }
                        rpcData = data;
                        return [2 /*return*/, {
                                success: rpcData.success,
                                tokens_consumed: rpcData.tokens_consumed,
                                balance_before: rpcData.balance_before,
                                balance_after: rpcData.balance_after,
                                error: rpcData.error,
                            }];
                }
            });
        });
    };
    /**
     * 回退方案（非事务方式，仅用于兼容）
     */
    TokenCalculator.prototype.consumeFallback = function (context) {
        return __awaiter(this, void 0, void 0, function () {
            var tenant_id, action, _a, quantity, metadata, tokens_consumed, _b, tenant, tenantError, tenantData, balance_before, balance_after, updateError, insertError;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        tenant_id = context.tenant_id, action = context.action, _a = context.quantity, quantity = _a === void 0 ? 1 : _a, metadata = context.metadata;
                        tokens_consumed = this.calculate(action, quantity);
                        return [4 /*yield*/, this.supabase
                                .from('tenants')
                                .select('token_balance, token_used')
                                .eq('id', tenant_id)
                                .single()];
                    case 1:
                        _b = _c.sent(), tenant = _b.data, tenantError = _b.error;
                        if (tenantError || !tenant) {
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: 0,
                                    balance_before: 0,
                                    balance_after: 0,
                                    error: '获取租户信息失败',
                                }];
                        }
                        tenantData = tenant;
                        balance_before = tenantData.token_balance || 0;
                        // 检查余额是否充足
                        if (balance_before < tokens_consumed) {
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: tokens_consumed,
                                    balance_before: balance_before,
                                    balance_after: balance_before,
                                    error: 'Token 余额不足',
                                }];
                        }
                        balance_after = balance_before - tokens_consumed;
                        return [4 /*yield*/, this.supabase
                                .from('tenants')
                                .update({
                                token_balance: balance_after,
                                token_used: (tenantData.token_used || 0) + tokens_consumed,
                            })
                                .eq('id', tenant_id)
                                .eq('token_balance', balance_before)];
                    case 2:
                        updateError = (_c.sent()).error;
                        if (updateError || updateError === null) {
                            // 如果 updateError 是 null，说明没有行被更新（余额已变化）
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: tokens_consumed,
                                    balance_before: balance_before,
                                    balance_after: balance_before,
                                    error: '并发冲突，请重试',
                                }];
                        }
                        return [4 /*yield*/, this.supabase
                                .from('token_transactions')
                                .insert({
                                tenant_id: tenant_id,
                                type: 'consume',
                                amount: -tokens_consumed,
                                balance_before: balance_before,
                                balance_after: balance_after,
                                details: __assign({ action: action, quantity: quantity }, metadata),
                            })];
                    case 3:
                        insertError = (_c.sent()).error;
                        if (insertError) {
                            console.error('Failed to record transaction:', insertError);
                            // 交易记录失败意味着数据不一致，应该返回错误让调用方处理
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: tokens_consumed,
                                    balance_before: balance_before,
                                    balance_after: balance_before, // 回滚余额
                                    error: '交易记录失败，Token 可能已扣除但未记录',
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                tokens_consumed: tokens_consumed,
                                balance_before: balance_before,
                                balance_after: balance_after,
                            }];
                }
            });
        });
    };
    /**
     * 充值 Token
     */
    TokenCalculator.prototype.recharge = function (tenant_id, amount, options) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, tenant, tenantError, tenantData, balance_before, balance_after, updateError, insertError;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('tenants')
                            .select('token_balance, token_total_purchased')
                            .eq('id', tenant_id)
                            .single()];
                    case 1:
                        _a = _b.sent(), tenant = _a.data, tenantError = _a.error;
                        if (tenantError || !tenant) {
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: 0,
                                    balance_before: 0,
                                    balance_after: 0,
                                    error: '获取租户信息失败',
                                }];
                        }
                        tenantData = tenant;
                        balance_before = tenantData.token_balance || 0;
                        balance_after = balance_before + amount;
                        return [4 /*yield*/, this.supabase
                                .from('tenants')
                                .update({
                                token_balance: balance_after,
                                token_total_purchased: (tenantData.token_total_purchased || 0) + amount,
                            })
                                .eq('id', tenant_id)];
                    case 2:
                        updateError = (_b.sent()).error;
                        if (updateError) {
                            return [2 /*return*/, {
                                    success: false,
                                    tokens_consumed: 0,
                                    balance_before: balance_before,
                                    balance_after: balance_after,
                                    error: '更新余额失败',
                                }];
                        }
                        return [4 /*yield*/, this.supabase
                                .from('token_transactions')
                                .insert({
                                tenant_id: tenant_id,
                                type: (options === null || options === void 0 ? void 0 : options.grant) ? 'grant' : 'purchase',
                                amount: amount,
                                balance_before: balance_before,
                                balance_after: balance_after,
                                order_id: options === null || options === void 0 ? void 0 : options.order_id,
                                payment_id: options === null || options === void 0 ? void 0 : options.payment_id,
                                note: options === null || options === void 0 ? void 0 : options.note,
                            })];
                    case 3:
                        insertError = (_b.sent()).error;
                        if (insertError) {
                            console.error('Failed to record recharge transaction:', insertError);
                            // 注意：充值成功但记录失败，需要人工干预
                        }
                        return [2 /*return*/, {
                                success: true,
                                tokens_consumed: amount,
                                balance_before: balance_before,
                                balance_after: balance_after,
                            }];
                }
            });
        });
    };
    /**
     * 检查日限额
     */
    TokenCalculator.prototype.checkDailyLimit = function (tenant_id, action) {
        return __awaiter(this, void 0, void 0, function () {
            var rule, today, count, used, allowed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        rule = this.rules.get(action);
                        if (!rule || !rule.daily_limit) {
                            return [2 /*return*/, { allowed: true, used: 0, limit: null }];
                        }
                        today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return [4 /*yield*/, this.supabase
                                .from('token_transactions')
                                .select('*', { count: 'exact', head: true })
                                .eq('tenant_id', tenant_id)
                                .eq('type', 'consume')
                                .eq('details->>action', action)
                                .gte('created_at', today.toISOString())];
                    case 2:
                        count = (_a.sent()).count;
                        used = count || 0;
                        allowed = used < rule.daily_limit;
                        return [2 /*return*/, {
                                allowed: allowed,
                                used: used,
                                limit: rule.daily_limit,
                            }];
                }
            });
        });
    };
    return TokenCalculator;
}());
exports.TokenCalculator = TokenCalculator;
/**
 * Token 操作类型枚举
 */
var TokenActions;
(function (TokenActions) {
    // 商品操作
    TokenActions["VIEW_PRODUCT"] = "view_product";
    TokenActions["ADD_TO_CART"] = "add_to_cart";
    TokenActions["CHECKOUT"] = "checkout";
    // AI 功能
    TokenActions["AI_THEME"] = "ai_theme";
    TokenActions["AI_IMAGE_SEARCH"] = "ai_image_search";
    // 订单操作
    TokenActions["CREATE_ORDER"] = "create_order";
    TokenActions["ORDER_CREATE"] = "order_create";
    TokenActions["VIEW_ORDER"] = "view_order";
    // 同步操作
    TokenActions["SYNC_PRODUCTS"] = "sync_products";
    TokenActions["PRODUCT_SYNC"] = "product_sync";
    // 搜索操作
    TokenActions["SEARCH"] = "search";
    // 默认
    TokenActions["DEFAULT"] = "default";
})(TokenActions || (exports.TokenActions = TokenActions = {}));
