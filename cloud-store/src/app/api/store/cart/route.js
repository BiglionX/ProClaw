"use strict";
// ProClaw Shop - 购物车 API
// 管理客户购物车
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
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
exports.dynamic = 'force-dynamic';
/**
 * 获取购物车
 * GET /api/store/cart
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, rawDeviceId, deviceId, schemaName, _a, cartItems, error, items, totalAmount, totalItems, error_1;
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
                    rawDeviceId = request.headers.get('x-device-id') ||
                        ((_b = request.cookies.get('device_id')) === null || _b === void 0 ? void 0 : _b.value) ||
                        'anonymous';
                    deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';
                    schemaName = tenantContext.schema;
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".cart_items"))
                            .select("\n        *,\n        product:products(*)\n      ")
                            .eq('device_id', deviceId)
                            .eq('customer_id', null)];
                case 3:
                    _a = _c.sent(), cartItems = _a.data, error = _a.error;
                    if (error) {
                        console.error('Failed to fetch cart:', error);
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取购物车失败' }, { status: 500 })];
                    }
                    items = (cartItems || []).map(function (item) { return ({
                        id: item.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        product: item.product,
                    }); });
                    totalAmount = items.reduce(function (sum, item) {
                        var _a;
                        return sum + (((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0) * item.quantity;
                    }, 0);
                    totalItems = items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                items: items,
                                total_amount: totalAmount,
                                total_items: totalItems,
                            },
                        })];
                case 4:
                    error_1 = _c.sent();
                    console.error('Cart error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '购物车操作失败' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 添加商品到购物车
 * POST /api/store/cart
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, body, product_id, _a, quantity, rawDeviceId, deviceId, schemaName, product, existing, newQuantity, _b, updateResult, updateError, error_2;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _d.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _d.sent();
                    product_id = body.product_id, _a = body.quantity, quantity = _a === void 0 ? 1 : _a;
                    if (!product_id) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少商品ID' }, { status: 400 })];
                    }
                    rawDeviceId = request.headers.get('x-device-id') ||
                        ((_c = request.cookies.get('device_id')) === null || _c === void 0 ? void 0 : _c.value) ||
                        'anonymous';
                    deviceId = rawDeviceId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64) || 'anonymous';
                    schemaName = tenantContext.schema;
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".products"))
                            .select('id, stock, is_on_sale')
                            .eq('id', product_id)
                            .single()];
                case 4:
                    product = (_d.sent()).data;
                    if (!product || !product.is_on_sale) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '商品不存在或已下架' }, { status: 404 })];
                    }
                    if (product.stock < quantity) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '库存不足' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".cart_items"))
                            .select('id, quantity')
                            .eq('device_id', deviceId)
                            .eq('product_id', product_id)
                            .eq('customer_id', null)
                            .single()];
                case 5:
                    existing = (_d.sent()).data;
                    if (!existing) return [3 /*break*/, 7];
                    newQuantity = existing.quantity + quantity;
                    if (newQuantity > product.stock) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '库存不足' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .rpc('atomic_update_cart_quantity', {
                            p_cart_item_id: existing.id,
                            p_new_quantity: newQuantity,
                            p_available_stock: product.stock,
                        })];
                case 6:
                    _b = _d.sent(), updateResult = _b.data, updateError = _b.error;
                    if (updateError || !(updateResult === null || updateResult === void 0 ? void 0 : updateResult.success)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: (updateResult === null || updateResult === void 0 ? void 0 : updateResult.error) || '更新购物车失败' }, { status: 500 })];
                    }
                    return [3 /*break*/, 9];
                case 7: 
                // 新增
                return [4 /*yield*/, supabase
                        .from("".concat(schemaName, ".cart_items"))
                        .insert({
                        device_id: deviceId,
                        product_id: product_id,
                        quantity: quantity,
                        customer_id: null,
                    })];
                case 8:
                    // 新增
                    _d.sent();
                    _d.label = 9;
                case 9: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        message: '已添加到购物车',
                    })];
                case 10:
                    error_2 = _d.sent();
                    console.error('Add to cart error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '添加购物车失败' }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * 更新购物车商品数量
 * PUT /api/store/cart
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, body, cart_item_id, quantity, schemaName, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _a.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _a.sent();
                    cart_item_id = body.cart_item_id, quantity = body.quantity;
                    if (!cart_item_id || quantity === undefined) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })];
                    }
                    schemaName = tenantContext.schema;
                    if (!(quantity <= 0)) return [3 /*break*/, 5];
                    // 删除商品
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".cart_items"))
                            .delete()
                            .eq('id', cart_item_id)];
                case 4:
                    // 删除商品
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: '商品已从购物车移除',
                        })];
                case 5: 
                /* eslint-disable @typescript-eslint/no-explicit-any */
                return [4 /*yield*/, supabase
                        .from("".concat(schemaName, ".cart_items"))
                        .update({ quantity: quantity })
                        .eq('id', cart_item_id)];
                case 6:
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: '购物车已更新',
                        })];
                case 7:
                    error_3 = _a.sent();
                    console.error('Update cart error:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '更新购物车失败' }, { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * 删除购物车商品
 * DELETE /api/store/cart
 */
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, searchParams, itemId, schemaName, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _a.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    searchParams = new URL(request.url).searchParams;
                    itemId = searchParams.get('id');
                    if (!itemId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少商品ID' }, { status: 400 })];
                    }
                    schemaName = tenantContext.schema;
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".cart_items"))
                            .delete()
                            .eq('id', itemId)];
                case 3:
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: '商品已从购物车移除',
                        })];
                case 4:
                    error_4 = _a.sent();
                    console.error('Delete from cart error:', error_4);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '删除购物车商品失败' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
