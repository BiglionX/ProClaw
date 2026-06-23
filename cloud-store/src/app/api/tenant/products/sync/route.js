"use strict";
// ProClaw Shop - 商品同步 API
// 商户通过 ProClaw 桌面端同步商品到云商城
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
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var token_calculator_1 = require("@/lib/token-calculator");
exports.dynamic = 'force-dynamic';
/**
 * 全量同步商品
 * POST /api/tenant/products/sync
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, body, products, schemaName, successCount, failCount, errors, _i, products_1, product, existing, updateError, insertError, _a, supabaseUrl, supabaseKey, tokenCalc, consumeResult, error_1;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 15, , 16]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _f.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _f.sent();
                    products = body.products;
                    if (!products || !Array.isArray(products)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '无效的商品数据' }, { status: 400 })];
                    }
                    schemaName = tenantContext.schema;
                    successCount = 0;
                    failCount = 0;
                    errors = [];
                    _i = 0, products_1 = products;
                    _f.label = 4;
                case 4:
                    if (!(_i < products_1.length)) return [3 /*break*/, 13];
                    product = products_1[_i];
                    _f.label = 5;
                case 5:
                    _f.trys.push([5, 11, , 12]);
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".products"))
                            .select('id, sync_version')
                            .eq('local_id', product.local_id)
                            .single()];
                case 6:
                    existing = (_f.sent()).data;
                    if (!existing) return [3 /*break*/, 8];
                    return [4 /*yield*/, supabase
                            .from("".concat(schemaName, ".products"))
                            .update({
                            name: product.name,
                            description: product.description || null,
                            price: product.price,
                            stock: (_b = product.stock) !== null && _b !== void 0 ? _b : 0,
                            category: product.category || null,
                            images: product.images || [],
                            is_on_sale: (_c = product.is_on_sale) !== null && _c !== void 0 ? _c : true,
                            sync_version: (existing.sync_version || 0) + 1,
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', existing.id)];
                case 7:
                    updateError = (_f.sent()).error;
                    if (!updateError)
                        successCount++;
                    else {
                        failCount++;
                        errors.push("".concat(product.name, ": \u66F4\u65B0\u5931\u8D25"));
                    }
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, supabase
                        .from("".concat(schemaName, ".products"))
                        .insert({
                        local_id: product.local_id,
                        name: product.name,
                        description: product.description || null,
                        price: product.price,
                        stock: (_d = product.stock) !== null && _d !== void 0 ? _d : 0,
                        category: product.category || null,
                        images: product.images || [],
                        is_on_sale: (_e = product.is_on_sale) !== null && _e !== void 0 ? _e : true,
                        sync_version: 1,
                    })];
                case 9:
                    insertError = (_f.sent()).error;
                    if (!insertError)
                        successCount++;
                    else {
                        failCount++;
                        errors.push("".concat(product.name, ": \u540C\u6B65\u5931\u8D25"));
                    }
                    _f.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    _a = _f.sent();
                    failCount++;
                    errors.push("".concat(product.name, ": \u5F02\u5E38"));
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 4];
                case 13:
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                    tokenCalc = new token_calculator_1.TokenCalculator(supabaseUrl, supabaseKey);
                    return [4 /*yield*/, tokenCalc.consume({
                            tenant_id: tenantContext.tenantId,
                            action: token_calculator_1.TokenActions.PRODUCT_SYNC,
                            quantity: products.length,
                        })];
                case 14:
                    consumeResult = _f.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                total: products.length,
                                success: successCount,
                                failed: failCount,
                                errors: errors.slice(0, 10), // 最多返回10个错误
                                tokens_consumed: consumeResult.tokens_consumed,
                            },
                        })];
                case 15:
                    error_1 = _f.sent();
                    console.error('Product sync error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '商品同步失败' }, { status: 500 })];
                case 16: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取商品列表
 * GET /api/tenant/products/sync
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, searchParams, page, pageSize, schemaName, query, _a, products, count, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _b.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    searchParams = new URL(request.url).searchParams;
                    page = parseInt(searchParams.get('page') || '1');
                    pageSize = parseInt(searchParams.get('pageSize') || '20');
                    schemaName = tenantContext.schema;
                    query = supabase
                        .from("".concat(schemaName, ".products"))
                        .select('*', { count: 'exact' })
                        .eq('is_on_sale', true)
                        .order('updated_at', { ascending: false })
                        .range((page - 1) * pageSize, page * pageSize - 1);
                    return [4 /*yield*/, query];
                case 3:
                    _a = _b.sent(), products = _a.data, count = _a.count, error = _a.error;
                    if (error) {
                        console.error('Fetch products error:', error);
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取商品列表失败' }, { status: 500 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                products: products || [],
                                total: count || 0,
                                page: page,
                                pageSize: pageSize,
                            },
                        })];
                case 4:
                    error_2 = _b.sent();
                    console.error('Fetch products error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取商品列表失败' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
