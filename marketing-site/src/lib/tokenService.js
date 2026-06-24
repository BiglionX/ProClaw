"use strict";
// Token 计费服务 (营销网站 Vite)
// 封装 Supabase Token 相关操作
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
exports.getTokenBalanceSummary = getTokenBalanceSummary;
exports.getTokenBalance = getTokenBalance;
exports.getTokenPricingRules = getTokenPricingRules;
exports.getTokenPackages = getTokenPackages;
exports.getTokenConsumption = getTokenConsumption;
exports.getUsageLogsDirect = getUsageLogsDirect;
exports.purchaseToken = purchaseToken;
exports.getPurchaseHistory = getPurchaseHistory;
exports.getUserTokenConfig = getUserTokenConfig;
exports.updateUserTokenConfig = updateUserTokenConfig;
exports.getFreeAllowance = getFreeAllowance;
var supabase_1 = require("./supabase");
// ==========================================================
// 余额查询
// ==========================================================
/**
 * 获取 Token 余额摘要（RPC）
 */
function getTokenBalanceSummary(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase.rpc('get_token_balance_summary', {
                            p_user_id: userId,
                        })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data];
                case 2:
                    error_1 = _b.sent();
                    console.error('获取 Token 余额摘要失败:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取 Token 余额
 */
function getTokenBalance(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_balances')
                            .select('balance')
                            .eq('user_id', userId)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.balance) || 0];
                case 2:
                    error_2 = _b.sent();
                    console.error('获取 Token 余额失败:', error_2);
                    return [2 /*return*/, 0];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 定价 & 套餐
// ==========================================================
/**
 * 获取 Token 定价规则
 */
function getTokenPricingRules() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase.rpc('get_token_pricing_rules')];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_3 = _b.sent();
                    console.error('获取定价规则失败:', error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取 Token 套餐列表
 */
function getTokenPackages() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_packages')
                            .select('*')
                            .eq('is_active', true)
                            .order('sort_order')];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_4 = _b.sent();
                    console.error('获取套餐列表失败:', error_4);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 消费明细
// ==========================================================
/**
 * 获取 Token 消费明细（RPC 分页）
 */
function getTokenConsumption(userId_1, resourceType_1) {
    return __awaiter(this, arguments, void 0, function (userId, resourceType, page, pageSize) {
        var _a, data, error, error_5;
        if (page === void 0) { page = 1; }
        if (pageSize === void 0) { pageSize = 20; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase.rpc('get_token_consumption', {
                            p_user_id: userId,
                            p_resource_type: resourceType || null,
                            p_limit: pageSize,
                            p_offset: (page - 1) * pageSize,
                        })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data];
                case 2:
                    error_5 = _b.sent();
                    console.error('获取消费明细失败:', error_5);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 直接查询 api_usage_logs（当 RPC 不可用时备用）
 */
function getUsageLogsDirect(userId_1) {
    return __awaiter(this, arguments, void 0, function (userId, limit, offset) {
        var _a, data, error, error_6;
        if (limit === void 0) { limit = 50; }
        if (offset === void 0) { offset = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('api_usage_logs')
                            .select('*')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })
                            .range(offset, offset + limit - 1)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_6 = _b.sent();
                    console.error('查询用量日志失败:', error_6);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// Token 购买（模拟支付）
// ==========================================================
/**
 * 购买 Token（模拟支付）
 */
function purchaseToken(userId, packageId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, pkg, pkgError, finalPrice, _b, sale, saleError, addError, error_7;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_packages')
                            .select('*')
                            .eq('id', packageId)
                            .single()];
                case 1:
                    _a = _c.sent(), pkg = _a.data, pkgError = _a.error;
                    if (pkgError || !pkg) {
                        return [2 /*return*/, { success: false, error: '套餐不存在' }];
                    }
                    finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_sales')
                            .insert({
                            user_id: userId,
                            amount: pkg.token_amount,
                            price: finalPrice,
                            currency: 'CNY',
                            status: 'completed',
                            payment_method: 'mock',
                            metadata: { package_name: pkg.name, package_id: pkg.id },
                        })
                            .select()
                            .single()];
                case 2:
                    _b = _c.sent(), sale = _b.data, saleError = _b.error;
                    if (saleError)
                        throw saleError;
                    return [4 /*yield*/, supabase_1.supabase.rpc('add_tokens', {
                            p_user_id: userId,
                            p_tokens: pkg.token_amount,
                        })];
                case 3:
                    addError = (_c.sent()).error;
                    if (addError)
                        throw addError;
                    return [2 /*return*/, { success: true, saleId: sale === null || sale === void 0 ? void 0 : sale.id }];
                case 4:
                    error_7 = _c.sent();
                    console.error('Token 购买失败:', error_7);
                    return [2 /*return*/, { success: false, error: error_7.message || '购买失败' }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取充值记录
 */
function getPurchaseHistory(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_8;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_sales')
                            .select('*')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_8 = _b.sent();
                    console.error('获取充值记录失败:', error_8);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 用户 Token 配置
// ==========================================================
/**
 * 获取用户 Token 配置
 */
function getUserTokenConfig(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_9;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('user_token_config')
                            .select('*')
                            .eq('user_id', userId)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data];
                case 2:
                    error_9 = _b.sent();
                    console.error('获取 Token 配置失败:', error_9);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 更新用户 Token 配置
 */
function updateUserTokenConfig(userId, config) {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('user_token_config')
                            .upsert(__assign(__assign({ user_id: userId }, config), { updated_at: new Date().toISOString() }))
                            .eq('user_id', userId)];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, true];
                case 2:
                    error_10 = _a.sent();
                    console.error('更新 Token 配置失败:', error_10);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 免费额度查询
// ==========================================================
/**
 * 获取新用户免费额度信息
 */
function getFreeAllowance(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var balance, freeTokenUsed, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('token_balances')
                            .select('total_purchased, total_used')
                            .eq('user_id', userId)
                            .single()];
                case 1:
                    balance = (_a.sent()).data;
                    if (!balance)
                        return [2 /*return*/, null];
                    freeTokenUsed = Math.min(balance.total_used, 50000);
                    return [2 /*return*/, {
                            free_token_used: freeTokenUsed,
                            free_products_used: 0,
                            free_storage_mb_used: 0,
                        }];
                case 2:
                    error_11 = _a.sent();
                    console.error('获取免费额度失败:', error_11);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
