"use strict";
// ProClaw Cloud 托管版 - 商品管理 API Routes
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * GET /api/products - 获取商品列表
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, searchParams, params, query, from, to, _a, data, error, count, productIds, skus_1, skuData, productsWithSkus, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    searchParams = request.nextUrl.searchParams;
                    params = {
                        page: parseInt(searchParams.get('page') || '1'),
                        pageSize: parseInt(searchParams.get('pageSize') || '20'),
                        search: searchParams.get('search') || undefined,
                        status: searchParams.get('status') || undefined,
                    };
                    query = supabase
                        .from((0, tenant_1.schemaTable)(schema, 'products_spu'))
                        .select('*', { count: 'exact' });
                    if (params.search) {
                        query = query.ilike('name', "%".concat(params.search, "%"));
                    }
                    if (params.status) {
                        query = query.eq('status', params.status);
                    }
                    from = ((params.page || 1) - 1) * (params.pageSize || 20);
                    to = from + (params.pageSize || 20) - 1;
                    return [4 /*yield*/, query
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error, count = _a.count;
                    if (error)
                        throw error;
                    productIds = (data === null || data === void 0 ? void 0 : data.map(function (p) { return p.id; })) || [];
                    skus_1 = [];
                    if (!(productIds.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_sku'))
                            .select('*')
                            .in('spu_id', productIds)];
                case 4:
                    skuData = (_b.sent()).data;
                    skus_1 = (skuData || []);
                    _b.label = 5;
                case 5:
                    productsWithSkus = data === null || data === void 0 ? void 0 : data.map(function (product) { return (__assign(__assign({}, product), { skus: skus_1.filter(function (s) { return s.spu_id === product.id; }) })); });
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: productsWithSkus || [],
                            total: count || 0,
                            page: params.page || 1,
                            pageSize: params.pageSize || 20,
                        })];
                case 6:
                    error_1 = _b.sent();
                    console.error('获取商品列表失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/products - 创建商品
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, _a, spu, spuError, createdSpu_1, _b, fallbackSpu, fallbackSpuError, skusToInsert, skuError, error_2;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_d.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _d.sent();
                    return [4 /*yield*/, supabase
                            .rpc('create_product_with_skus', {
                            p_spu: {
                                spu_code: body.spu_code || "SPU-".concat(Date.now().toString(36).toUpperCase()),
                                name: body.name,
                                subtitle: body.subtitle,
                                description: body.description,
                                category_id: body.category_id,
                                unit: body.unit || '件',
                                is_on_sale: body.is_on_sale !== false,
                                status: body.status || 'on_sale',
                                images: body.images || [],
                            },
                            p_skus: ((_c = body.skus) === null || _c === void 0 ? void 0 : _c.map(function (sku, index) { return ({
                                sku_code: sku.sku_code,
                                specifications: sku.specifications || {},
                                spec_text: sku.spec_text || Object.values(sku.specifications || {}).join('/'),
                                cost_price: sku.cost_price || 0,
                                sell_price: sku.sell_price || 0,
                                current_stock: sku.current_stock || 0,
                                min_stock: sku.min_stock || 0,
                                max_stock: sku.max_stock || 999999,
                                is_default: index === 0,
                            }); })) || [],
                        })];
                case 4:
                    _a = _d.sent(), spu = _a.data, spuError = _a.error;
                    createdSpu_1 = spu;
                    if (!(spuError || !spu)) return [3 /*break*/, 8];
                    if (spuError) {
                        console.warn('create_product_with_skus RPC 不可用，降级到分离调用');
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_spu'))
                            .insert({
                            spu_code: body.spu_code || "SPU-".concat(Date.now().toString(36).toUpperCase()),
                            name: body.name,
                            subtitle: body.subtitle,
                            description: body.description,
                            category_id: body.category_id,
                            unit: body.unit || '件',
                            is_on_sale: body.is_on_sale !== false,
                            status: body.status || 'on_sale',
                            images: body.images || [],
                        })
                            .select()
                            .single()];
                case 5:
                    _b = _d.sent(), fallbackSpu = _b.data, fallbackSpuError = _b.error;
                    if (fallbackSpuError)
                        throw fallbackSpuError;
                    createdSpu_1 = fallbackSpu;
                    if (!(body.skus && body.skus.length > 0)) return [3 /*break*/, 8];
                    skusToInsert = body.skus.map(function (sku, index) { return ({
                        spu_id: createdSpu_1.id,
                        sku_code: sku.sku_code || "SKU-".concat(createdSpu_1.spu_code, "-").concat((index + 1).toString().padStart(2, '0')),
                        specifications: sku.specifications || {},
                        spec_text: sku.spec_text || Object.values(sku.specifications || {}).join('/'),
                        cost_price: sku.cost_price || 0,
                        sell_price: sku.sell_price || 0,
                        current_stock: sku.current_stock || 0,
                        min_stock: sku.min_stock || 0,
                        max_stock: sku.max_stock || 999999,
                        is_default: index === 0,
                    }); });
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_sku'))
                            .insert(skusToInsert)];
                case 6:
                    skuError = (_d.sent()).error;
                    if (!skuError) return [3 /*break*/, 8];
                    // SKU 创建失败，删除已创建的 SPU（回滚）
                    return [4 /*yield*/, supabase.from((0, tenant_1.schemaTable)(schema, 'products_spu')).delete().eq('id', createdSpu_1.id)];
                case 7:
                    // SKU 创建失败，删除已创建的 SPU（回滚）
                    _d.sent();
                    throw skuError;
                case 8: 
                // Token 扣费（创建商品消耗 1 token）
                return [4 /*yield*/, supabase.rpc('deduct_tokens', {
                        p_user_id: session.user.id,
                        p_tokens: 1,
                    })];
                case 9:
                    // Token 扣费（创建商品消耗 1 token）
                    _d.sent();
                    return [4 /*yield*/, supabase.from('api_usage_logs').insert({
                            user_id: session.user.id,
                            resource_type: 'product_sync',
                            tokens_used: 1,
                            endpoint: 'POST /api/products',
                            metadata: { product_id: spu.id, product_name: body.name },
                        })];
                case 10:
                    _d.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ data: spu, success: true }, { status: 201 })];
                case 11:
                    error_2 = _d.sent();
                    console.error('创建商品失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 12: return [2 /*return*/];
            }
        });
    });
}
/**
 * PUT /api/products - 更新商品
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, id, updateData, _a, spu, spuError, upsertError, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    id = body.id, updateData = __rest(body, ["id"]);
                    if (!id) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少商品 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_spu'))
                            .update({
                            name: updateData.name,
                            subtitle: updateData.subtitle,
                            description: updateData.description,
                            category_id: updateData.category_id,
                            unit: updateData.unit,
                            is_on_sale: updateData.is_on_sale,
                            status: updateData.status,
                            images: updateData.images,
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', id)
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), spu = _a.data, spuError = _a.error;
                    if (spuError)
                        throw spuError;
                    if (!(updateData.skus && Array.isArray(updateData.skus))) return [3 /*break*/, 6];
                    return [4 /*yield*/, supabase
                            .rpc('upsert_product_skus', {
                            p_spu_id: id,
                            p_skus: updateData.skus.map(function (sku, index) { return ({
                                sku_code: sku.sku_code || null,
                                specifications: sku.specifications || {},
                                spec_text: sku.spec_text || Object.values(sku.specifications || {}).join('/'),
                                cost_price: sku.cost_price || 0,
                                sell_price: sku.sell_price || 0,
                                current_stock: sku.current_stock || 0,
                                min_stock: sku.min_stock || 0,
                                max_stock: sku.max_stock || 999999,
                                is_default: index === 0,
                            }); }),
                        })];
                case 5:
                    upsertError = (_b.sent()).error;
                    if (upsertError) {
                        console.error('SKU UPSERT 失败:', upsertError);
                        throw upsertError;
                    }
                    _b.label = 6;
                case 6: return [2 /*return*/, server_1.NextResponse.json({ data: spu, success: true })];
                case 7:
                    error_3 = _b.sent();
                    console.error('更新商品失败:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/products - 删除商品
 */
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, id, error, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    id = request.nextUrl.searchParams.get('id');
                    if (!id) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少商品 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_spu'))
                            .delete()
                            .eq('id', id)];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: '商品已删除' })];
                case 4:
                    error_4 = _a.sent();
                    console.error('删除商品失败:', error_4);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_4) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
