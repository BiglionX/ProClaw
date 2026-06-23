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
// ProClaw Shop - Token 充值 API
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var token_calculator_1 = require("@/lib/token-calculator");
exports.dynamic = 'force-dynamic';
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, body, package_id, _a, payment_method, tenantContext, _b, pkg, pkgError, calculator, result, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _c.sent();
                    package_id = body.package_id, _a = body.payment_method, payment_method = _a === void 0 ? 'mock' : _a;
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 3:
                    tenantContext = _c.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未找到租户信息' }, { status: 401 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('token_packages')
                            .select('*')
                            .eq('id', package_id)
                            .eq('active', true)
                            .single()];
                case 4:
                    _b = _c.sent(), pkg = _b.data, pkgError = _b.error;
                    if (pkgError || !pkg) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '套餐不存在或已下架' }, { status: 400 })];
                    }
                    if (!(payment_method === 'mock')) return [3 /*break*/, 6];
                    calculator = new token_calculator_1.TokenCalculator(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
                    return [4 /*yield*/, calculator.recharge(tenantContext.tenantId, pkg.token_amount, { note: "\u8D2D\u4E70 ".concat(pkg.name) })];
                case 5:
                    result = _c.sent();
                    if (!result.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: result.error }, { status: 500 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                order_id: "MOCK-".concat(Date.now()),
                                token_amount: pkg.token_amount,
                                balance: result.balance_after,
                            },
                        })];
                case 6: 
                // TODO: 实现真实的支付流程
                // 1. 创建支付订单（Stripe/支付宝/微信）
                // 2. 返回支付链接
                // 3. 支付回调后调用 calculator.recharge()
                return [2 /*return*/, server_1.NextResponse.json({
                        success: false,
                        error: '暂不支持该支付方式',
                    }, { status: 400 })];
                case 7:
                    error_1 = _c.sent();
                    console.error('Token purchase error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
