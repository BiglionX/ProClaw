"use strict";
// 云商城 Token 中间件 API Route 封装
// 在商品同步、订单创建、主题生成等关键操作前检查并扣除 Token
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
exports.tokenGuard = tokenGuard;
exports.getUserIdFromSession = getUserIdFromSession;
exports.getUserIdHintFromRequest = getUserIdHintFromRequest;
exports.tokenInsufficientResponse = tokenInsufficientResponse;
exports.unauthorizedResponse = unauthorizedResponse;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tokenApi_1 = require("@/lib/tokenApi");
var PT_COST = {
    product_sync: 50,
    ai_theme: 5000,
    order_process: 10,
    api_write: 5,
    api_read: 1,
};
// ========== 欠费保护状态码 ==========
var DEBT_STATUS_RESPONSES = {
    readonly: {
        status: 403,
        error: '您的账户处于只读模式（余额耗尽第4~7天），请充值后恢复写操作',
        code: 'DEBT_READONLY',
    },
    suspended: {
        status: 403,
        error: '您的账户已暂停服务（余额耗尽超过7天），请立即充值恢复',
        code: 'DEBT_SUSPENDED',
    },
    archived: {
        status: 403,
        error: '您的账户数据已归档（余额耗尽超过30天），请联系管理员恢复',
        code: 'DEBT_ARCHIVED',
    },
};
/**
 * Token 保护：在执行操作前检查余额并扣费
 * 增强版：增加欠费保护检查和日消耗上限检查
 */
function tokenGuard(userId, options) {
    return __awaiter(this, void 0, void 0, function () {
        var quantity, ptPerUnit, totalCost, debtStatus, resp, resp, dailyCheck, balance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quantity = options.quantity || 1;
                    ptPerUnit = options.costPerUnit || PT_COST[options.resourceType] || 0;
                    totalCost = ptPerUnit * quantity;
                    if (totalCost <= 0) {
                        return [2 /*return*/, { allowed: true, cost: 0 }];
                    }
                    return [4 /*yield*/, (0, tokenApi_1.getDebtStatus)(userId)];
                case 1:
                    debtStatus = _a.sent();
                    if (debtStatus) {
                        if (debtStatus.status === 'suspended' || debtStatus.status === 'archived') {
                            resp = DEBT_STATUS_RESPONSES[debtStatus.status];
                            return [2 /*return*/, {
                                    allowed: false,
                                    error: resp.error,
                                    cost: totalCost,
                                    debtStatus: debtStatus.status,
                                }];
                        }
                        if (debtStatus.status === 'readonly') {
                            // 只读模式：检查是否为读操作
                            // resourceType 以 'api_read' 或查询操作为读
                            if (options.resourceType !== 'api_read') {
                                resp = DEBT_STATUS_RESPONSES['readonly'];
                                return [2 /*return*/, {
                                        allowed: false,
                                        error: resp.error,
                                        cost: totalCost,
                                        debtStatus: 'readonly',
                                    }];
                            }
                        }
                    }
                    return [4 /*yield*/, (0, tokenApi_1.checkDailyLimit)(userId, totalCost)];
                case 2:
                    dailyCheck = _a.sent();
                    if (dailyCheck && !dailyCheck.allowed) {
                        return [2 /*return*/, {
                                allowed: false,
                                error: "\u4ECA\u65E5 Token \u6D88\u8017\u5DF2\u8FBE\u4E0A\u9650\uFF08".concat(dailyCheck.daily_limit.toLocaleString(), " PT\uFF09\u3002\u5982\u9700\u8C03\u6574\uFF0C\u8BF7\u524D\u5F80\u7528\u6237\u4E2D\u5FC3\u8BBE\u7F6E\u3002"),
                                cost: totalCost,
                                dailyRemaining: dailyCheck.remaining,
                            }];
                    }
                    return [4 /*yield*/, (0, tokenApi_1.getTokenBalance)(userId)];
                case 3:
                    balance = _a.sent();
                    if (balance < totalCost) {
                        return [2 /*return*/, {
                                allowed: false,
                                error: "Token \u4F59\u989D\u4E0D\u8DB3\u3002\u9700\u8981 ".concat(totalCost.toLocaleString(), " PT\uFF0C\u5F53\u524D\u4F59\u989D ").concat(balance.toLocaleString(), " PT\u3002\u8BF7\u524D\u5F80\u7528\u6237\u4E2D\u5FC3\u5145\u503C\u3002"),
                                cost: totalCost,
                            }];
                    }
                    return [2 /*return*/, { allowed: true, cost: totalCost, debtStatus: debtStatus === null || debtStatus === void 0 ? void 0 : debtStatus.status, dailyRemaining: dailyCheck === null || dailyCheck === void 0 ? void 0 : dailyCheck.remaining }];
            }
        });
    });
}
// ========== 中间件辅助函数 ==========
/**
 * 从认证会话中获取用户 ID（安全的获取方式）
 * 优先从已验证的 session 获取，永不信任客户端 header
 */
function getUserIdFromSession(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, _a, session, error, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 1:
                    _a = _c.sent(), session = _a.data.session, error = _a.error;
                    if (error || !(session === null || session === void 0 ? void 0 : session.user)) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, session.user.id];
                case 2:
                    _b = _c.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 从请求中提取用户 ID（仅用于日志/调试）
 * 注意：此函数返回的值不应直接用于授权决策
 */
function getUserIdHintFromRequest(request) {
    var _a;
    // 仅从 cookie 获取提示信息（server-side cookie 相对安全）
    var cookieUserId = (_a = request.cookies.get('user_id')) === null || _a === void 0 ? void 0 : _a.value;
    if (cookieUserId && /^[a-zA-Z0-9-]{8,64}$/.test(cookieUserId)) {
        return cookieUserId;
    }
    return null;
}
/**
 * 处理 Token 检查失败响应
 */
function tokenInsufficientResponse(error) {
    return server_1.NextResponse.json({
        error: error,
        code: 'INSUFFICIENT_TOKENS',
        message: 'Token 余额不足，请充值后重试',
        payment_url: '/user-center?tab=4', // 跳转到充值页面
    }, { status: 402 });
}
/**
 * 处理未授权响应
 */
function unauthorizedResponse() {
    return server_1.NextResponse.json({ error: '未登录，无法执行计费操作', code: 'UNAUTHORIZED' }, { status: 401 });
}
