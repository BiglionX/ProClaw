"use strict";
// ProClaw Cloud 托管版 - 库存管理 API Routes
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
exports.GET = GET;
exports.POST = POST;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * GET /api/inventory - 获取库存列表及交易记录
 * query: type=summary|transactions, page, pageSize
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, searchParams, type, page, pageSize, from, to, _a, data, error, count_1, _b, skus, skuError, count, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_c.sent()).data.session;
                    if (!session)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    searchParams = request.nextUrl.searchParams;
                    type = searchParams.get('type') || 'summary';
                    page = parseInt(searchParams.get('page') || '1');
                    pageSize = parseInt(searchParams.get('pageSize') || '50');
                    if (!(type === 'transactions')) return [3 /*break*/, 4];
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'inventory_transactions'))
                            .select('*', { count: 'exact' })
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _c.sent(), data = _a.data, error = _a.error, count_1 = _a.count;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: data || [],
                            total: count_1 || 0,
                            page: page,
                            pageSize: pageSize,
                        })];
                case 4: return [4 /*yield*/, supabase
                        .from((0, tenant_1.schemaTable)(schema, 'products_sku'))
                        .select("\n        id,\n        sku_code,\n        spec_text,\n        current_stock,\n        min_stock,\n        max_stock,\n        cost_price,\n        sell_price,\n        spu_id,\n        status,\n        products_spu!inner(name, spu_code)\n      ", { count: 'exact' })
                        .order('current_stock', { ascending: true })];
                case 5:
                    _b = _c.sent(), skus = _b.data, skuError = _b.error, count = _b.count;
                    if (skuError)
                        throw skuError;
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: skus || [],
                            total: count || 0,
                        })];
                case 6:
                    error_1 = _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/inventory - 创建库存交易（入库/出库/盘点）
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, _a, transaction, error, sku, newStock, error_2;
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
                    if (!session)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'inventory_transactions'))
                            .insert({
                            product_id: body.product_id,
                            sku_id: body.sku_id,
                            transaction_type: body.transaction_type,
                            quantity: body.quantity,
                            reference_no: body.reference_no || '',
                            reason: body.reason || '',
                            notes: body.notes || '',
                        })
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), transaction = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    if (!body.sku_id) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_sku'))
                            .select('current_stock')
                            .eq('id', body.sku_id)
                            .single()];
                case 5:
                    sku = (_b.sent()).data;
                    if (!sku) return [3 /*break*/, 7];
                    newStock = body.transaction_type === 'in'
                        ? (sku.current_stock || 0) + body.quantity
                        : Math.max(0, (sku.current_stock || 0) - body.quantity);
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'products_sku'))
                            .update({ current_stock: newStock })
                            .eq('id', body.sku_id)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7: return [2 /*return*/, server_1.NextResponse.json({ data: transaction, success: true }, { status: 201 })];
                case 8:
                    error_2 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
