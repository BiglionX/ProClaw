"use strict";
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
// API Route: 商品同步 - Token 计费检查示例
var server_1 = require("next/server");
var tokenGuard_1 = require("@/lib/tokenGuard");
var tokenApi_1 = require("@/lib/tokenApi");
exports.dynamic = 'force-dynamic';
/**
 * POST /api/sync
 * 同步商品到商城，同步前检查并扣除 Token
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, body, productCount, guard, result, error_1, errMsg;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, tokenGuard_1.getUserIdFromSession)(request)];
                case 1:
                    userId = _b.sent();
                    if (!userId) {
                        return [2 /*return*/, (0, tokenGuard_1.unauthorizedResponse)()];
                    }
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    productCount = ((_a = body.product_ids) === null || _a === void 0 ? void 0 : _a.length) || 1;
                    return [4 /*yield*/, (0, tokenGuard_1.tokenGuard)(userId, {
                            resourceType: 'product_sync',
                            quantity: productCount,
                            costPerUnit: 50,
                        })];
                case 4:
                    guard = _b.sent();
                    if (!guard.allowed) {
                        return [2 /*return*/, (0, tokenGuard_1.tokenInsufficientResponse)(guard.error)];
                    }
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(userId, 'product_sync', productCount, '/api/sync', { product_ids: body.product_ids })];
                case 5:
                    result = _b.sent();
                    if (!result.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: result.error || 'Token 扣费失败' }, { status: 402 })];
                    }
                    // TODO: 执行实际商品同步逻辑
                    // ...
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: "\u540C\u6B65\u6210\u529F\uFF0C\u6D88\u8017 ".concat(guard.cost, " PT"),
                            token_cost: guard.cost,
                        })];
                case 6:
                    error_1 = _b.sent();
                    errMsg = error_1 instanceof Error ? error_1.message : '同步失败';
                    console.error('商品同步失败:', errMsg);
                    return [2 /*return*/, server_1.NextResponse.json({ error: errMsg }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
