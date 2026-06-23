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
exports.GET = GET;
// ProClaw Shop - 订单 API
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var token_calculator_1 = require("@/lib/token-calculator");
exports.dynamic = 'force-dynamic';
/**
 * 创建订单
 * POST /api/store/orders
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, body, customer_name, customer_phone, customer_address, _a, payment_method, remark, rawDeviceId, deviceId, schemaName, _b, result, orderError, supabaseUrl, supabaseKey, tokenCalc, tokenError_1, error_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _d.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _d.sent();
                    customer_name = body.customer_name, customer_phone = body.customer_phone, customer_address = body.customer_address, _a = body.payment_method, payment_method = _a === void 0 ? 'mock' : _a, remark = body.remark;
                    // 验证必填字段
                    if (!customer_name || !customer_phone || !customer_address) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '请填写完整的收货信息' }, { status: 400 })];
                    }
                    // 验证手机号格式
                    if (!/^1[3-9]\d{9}$/.test(customer_phone)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '手机号格式不正确' }, { status: 400 })];
                    }
                    rawDeviceId = request.headers.get('x-device-id') ||
                        ((_c = request.cookies.get('device_id')) === null || _c === void 0 ? void 0 : _c.value) ||
                        'anonymous';
                    deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';
                    schemaName = tenantContext.schema;
                    return [4 /*yield*/, supabase
                            .rpc('create_order_with_inventory_lock', {
                            p_schema: schemaName,
                            p_device_id: deviceId,
                            p_customer_name: customer_name,
                            p_customer_phone: customer_phone,
                            p_customer_address: customer_address,
                            p_payment_method: payment_method,
                            p_remark: remark,
                        })];
                case 4:
                    _b = _d.sent(), result = _b.data, orderError = _b.error;
                    if (orderError || !(result === null || result === void 0 ? void 0 : result.success)) {
                        console.error('Create order error:', orderError || (result === null || result === void 0 ? void 0 : result.error));
                        // 根据错误类型返回不同消息
                        if ((result === null || result === void 0 ? void 0 : result.error) === 'INSUFFICIENT_STOCK') {
                            return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '部分商品库存不足，请返回购物车调整数量' }, { status: 400 })];
                        }
                        if ((result === null || result === void 0 ? void 0 : result.error) === 'EMPTY_CART') {
                            return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '购物车为空' }, { status: 400 })];
                        }
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: (result === null || result === void 0 ? void 0 : result.error) || '创建订单失败' }, { status: 500 })];
                    }
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 7, , 8]);
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                    tokenCalc = new token_calculator_1.TokenCalculator(supabaseUrl, supabaseKey);
                    return [4 /*yield*/, tokenCalc.consume({
                            tenant_id: tenantContext.tenantId,
                            action: token_calculator_1.TokenActions.ORDER_CREATE,
                            quantity: 1,
                        })];
                case 6:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 7:
                    tokenError_1 = _d.sent();
                    // Token 扣费失败不应回滚订单（订单已创建成功）
                    console.error('Token 扣费失败（订单已创建）:', tokenError_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        data: {
                            order_id: result.order_id,
                            order_no: result.order_no,
                            total_amount: result.total_amount,
                        },
                    })];
                case 9:
                    error_1 = _d.sent();
                    console.error('Create order error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '创建订单失败' }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取订单列表
 * GET /api/store/orders
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, deviceId, schemaName, _a, orders, error, error_2;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _c.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    deviceId = request.headers.get('x-device-id') ||
                        ((_b = request.cookies.get('device_id')) === null || _b === void 0 ? void 0 : _b.value) ||
                        'anonymous';
                    schemaName = tenantContext.schema;
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".orders"))
                            .select("\n        *,\n        items:order_items(*)\n      ")
                            .eq('device_id', deviceId)
                            .order('created_at', { ascending: false })];
                case 3:
                    _a = _c.sent(), orders = _a.data, error = _a.error;
                    if (error) {
                        console.error('Fetch orders error:', error);
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取订单失败' }, { status: 500 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: orders || [],
                        })];
                case 4:
                    error_2 = _c.sent();
                    console.error('Fetch orders error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取订单失败' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
