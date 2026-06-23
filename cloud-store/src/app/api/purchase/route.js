"use strict";
// ProClaw Cloud 托管版 - 采购管理 API Routes
// purchase_orders + purchase_order_items
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
 * GET /api/purchase - 获取采购单列表
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, searchParams, params, query, from, to, _a, data, error, count, orderIds, itemsByOrder_1, items, _i, items_1, item, oid, ordersWithItems, error_1;
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
                        status: searchParams.get('status') || undefined,
                        search: searchParams.get('search') || undefined,
                    };
                    query = supabase
                        .from((0, tenant_1.schemaTable)(schema, 'purchase_orders'))
                        .select('*', { count: 'exact' });
                    if (params.search) {
                        query = query.or("po_number.ilike.%".concat(params.search, "%,notes.ilike.%").concat(params.search, "%"));
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
                    orderIds = (data || []).map(function (o) { return o.id; });
                    itemsByOrder_1 = {};
                    if (!(orderIds.length > 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_order_items'))
                            .select('*')
                            .in('order_id', orderIds)];
                case 4:
                    items = (_b.sent()).data;
                    if (items) {
                        for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                            item = items_1[_i];
                            oid = item.order_id;
                            if (!itemsByOrder_1[oid])
                                itemsByOrder_1[oid] = [];
                            itemsByOrder_1[oid].push(item);
                        }
                    }
                    _b.label = 5;
                case 5:
                    ordersWithItems = (data || []).map(function (order) { return (__assign(__assign({}, order), { items: itemsByOrder_1[order.id] || [] })); });
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: ordersWithItems,
                            total: count || 0,
                            page: params.page || 1,
                            pageSize: params.pageSize || 20,
                        })];
                case 6:
                    error_1 = _b.sent();
                    console.error('获取采购单列表失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/purchase - 创建采购单
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, _a, order_1, orderError, itemsToInsert, itemsError, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
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
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_orders'))
                            .insert({
                            po_number: body.po_number || "PO-".concat(Date.now().toString(36).toUpperCase()),
                            supplier_id: body.supplier_id || null,
                            order_date: body.order_date || new Date().toISOString().split('T')[0],
                            expected_delivery_date: body.expected_delivery_date || null,
                            status: body.status || 'draft',
                            total_amount: body.total_amount || 0,
                            paid_amount: body.paid_amount || 0,
                            payment_status: body.payment_status || 'unpaid',
                            notes: body.notes || '',
                        })
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), order_1 = _a.data, orderError = _a.error;
                    if (orderError)
                        throw orderError;
                    if (!(body.items && Array.isArray(body.items) && body.items.length > 0)) return [3 /*break*/, 6];
                    itemsToInsert = body.items.map(function (item) { return ({
                        order_id: order_1.id,
                        product_id: item.product_id || null,
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || 0,
                        total_price: (item.quantity || 1) * (item.unit_price || 0),
                        notes: item.notes || '',
                    }); });
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_order_items'))
                            .insert(itemsToInsert)];
                case 5:
                    itemsError = (_b.sent()).error;
                    if (itemsError)
                        throw itemsError;
                    _b.label = 6;
                case 6: 
                // Token 扣费（创建采购单消耗 1 token）
                return [4 /*yield*/, supabase.rpc('deduct_tokens', {
                        p_user_id: session.user.id,
                        p_tokens: 1,
                    })];
                case 7:
                    // Token 扣费（创建采购单消耗 1 token）
                    _b.sent();
                    return [4 /*yield*/, supabase.from('api_usage_logs').insert({
                            user_id: session.user.id,
                            resource_type: 'product_sync',
                            tokens_used: 1,
                            endpoint: 'POST /api/purchase',
                            metadata: { order_id: order_1.id, po_number: order_1.po_number },
                        })];
                case 8:
                    _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ data: order_1, success: true }, { status: 201 })];
                case 9:
                    error_2 = _b.sent();
                    console.error('创建采购单失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * PUT /api/purchase - 更新采购单
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, id_1, updateData, _a, order, orderError, itemsToInsert, itemsError, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
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
                    id_1 = body.id, updateData = __rest(body, ["id"]);
                    if (!id_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少采购单 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_orders'))
                            .update({
                            supplier_id: updateData.supplier_id,
                            order_date: updateData.order_date,
                            expected_delivery_date: updateData.expected_delivery_date,
                            status: updateData.status,
                            total_amount: updateData.total_amount,
                            paid_amount: updateData.paid_amount,
                            payment_status: updateData.payment_status,
                            notes: updateData.notes,
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', id_1)
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), order = _a.data, orderError = _a.error;
                    if (orderError)
                        throw orderError;
                    if (!(updateData.items && Array.isArray(updateData.items))) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_order_items'))
                            .delete()
                            .eq('order_id', id_1)];
                case 5:
                    _b.sent();
                    if (!(updateData.items.length > 0)) return [3 /*break*/, 7];
                    itemsToInsert = updateData.items.map(function (item) { return ({
                        order_id: id_1,
                        product_id: item.product_id || null,
                        quantity: item.quantity || 1,
                        unit_price: item.unit_price || 0,
                        total_price: (item.quantity || 1) * (item.unit_price || 0),
                        notes: item.notes || '',
                    }); });
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_order_items'))
                            .insert(itemsToInsert)];
                case 6:
                    itemsError = (_b.sent()).error;
                    if (itemsError)
                        throw itemsError;
                    _b.label = 7;
                case 7: return [2 /*return*/, server_1.NextResponse.json({ data: order, success: true })];
                case 8:
                    error_3 = _b.sent();
                    console.error('更新采购单失败:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/purchase - 删除采购单
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
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少采购单 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'purchase_orders'))
                            .delete()
                            .eq('id', id)];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: '采购单已删除' })];
                case 4:
                    error_4 = _a.sent();
                    console.error('删除采购单失败:', error_4);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_4) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
