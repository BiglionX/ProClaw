"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
// ProClaw Shop - 数据报表 API
// 提供销售、库存、财务等经营数据分析
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
exports.dynamic = void 0;
exports.GET = GET;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
var tokenApi_1 = require("@/lib/tokenApi");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
function getDateRange(period) {
    var now = new Date();
    var today = now.toISOString().split('T')[0];
    var start;
    switch (period) {
        case 'today':
            start = now;
            break;
        case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'quarter':
            start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case 'year':
            start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return {
        start: start.toISOString().split('T')[0],
        end: today,
    };
}
/**
 * 获取销售报表
 */
function getSalesReport(supabase, schema, dateRange) {
    return __awaiter(this, void 0, void 0, function () {
        var salesOrders, totalOrders, totalAmount, paidAmount, unpaidAmount, byStatus, byDate, salesItems, productSales, productIds, products, productMap, topProducts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase.from("\"".concat(schema, "\".\"sales_orders\"")).select('*').gte('order_date', dateRange.start).lte('order_date', dateRange.end)];
                case 1:
                    salesOrders = (_a.sent()).data;
                    totalOrders = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.length) || 0;
                    totalAmount = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.reduce(function (sum, o) { return sum + (o.total_amount || 0); }, 0)) || 0;
                    paidAmount = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.reduce(function (sum, o) { return sum + (o.paid_amount || 0); }, 0)) || 0;
                    unpaidAmount = totalAmount - paidAmount;
                    byStatus = {
                        draft: 0,
                        pending: 0,
                        confirmed: 0,
                        shipped: 0,
                        completed: 0,
                        cancelled: 0,
                    };
                    salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.forEach(function (o) {
                        var status = o.status || 'draft';
                        byStatus[status] = (byStatus[status] || 0) + 1;
                    });
                    byDate = {};
                    salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.forEach(function (o) {
                        var date = o.order_date;
                        if (!byDate[date]) {
                            byDate[date] = { count: 0, amount: 0 };
                        }
                        byDate[date].count++;
                        byDate[date].amount += o.total_amount || 0;
                    });
                    return [4 /*yield*/, supabase.from("\"".concat(schema, "\".\"sales_order_items\"")).select('*, product_id').order('created_at', { ascending: true })];
                case 2:
                    salesItems = (_a.sent()).data;
                    productSales = {};
                    salesItems === null || salesItems === void 0 ? void 0 : salesItems.forEach(function (item) {
                        if (!productSales[item.product_id]) {
                            productSales[item.product_id] = { quantity: 0, amount: 0 };
                        }
                        productSales[item.product_id].quantity += item.quantity || 0;
                        productSales[item.product_id].amount += item.total_price || 0;
                    });
                    productIds = Object.keys(productSales);
                    return [4 /*yield*/, supabase.from("\"".concat(schema, "\".\"products_spu\"")).select('id, name').in('id', productIds)];
                case 3:
                    products = (_a.sent()).data;
                    productMap = new Map((products === null || products === void 0 ? void 0 : products.map(function (p) { return [p.id, p.name]; })) || []);
                    topProducts = productIds
                        .map(function (id) { return ({
                        id: id,
                        name: productMap.get(id) || '未知商品',
                        quantity: productSales[id].quantity,
                        amount: productSales[id].amount,
                    }); })
                        .sort(function (a, b) { return b.amount - a.amount; })
                        .slice(0, 10);
                    return [2 /*return*/, {
                            summary: {
                                totalOrders: totalOrders,
                                totalAmount: totalAmount,
                                paidAmount: paidAmount,
                                unpaidAmount: unpaidAmount,
                                averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
                            },
                            byStatus: byStatus,
                            byDate: byDate,
                            topProducts: topProducts,
                        }];
            }
        });
    });
}
/**
 * 获取库存报表
 */
function getInventoryReport(supabase, schema) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, skus, skuError, totalSKUs, totalStock, lowStockItems, overStockItems, outOfStockItems, inventoryValue, skuData;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from("\"".concat(schema, "\".\"products_sku\""))
                        .select('*')];
                case 1:
                    _a = _b.sent(), skus = _a.data, skuError = _a.error;
                    if (skuError)
                        throw skuError;
                    totalSKUs = (skus === null || skus === void 0 ? void 0 : skus.length) || 0;
                    totalStock = (skus === null || skus === void 0 ? void 0 : skus.reduce(function (sum, s) { return sum + (s.current_stock || 0); }, 0)) || 0;
                    lowStockItems = (skus === null || skus === void 0 ? void 0 : skus.filter(function (s) { return s.current_stock <= s.min_stock; })) || [];
                    overStockItems = (skus === null || skus === void 0 ? void 0 : skus.filter(function (s) { return s.current_stock >= s.max_stock; })) || [];
                    outOfStockItems = (skus === null || skus === void 0 ? void 0 : skus.filter(function (s) { return s.current_stock === 0; })) || [];
                    inventoryValue = (skus === null || skus === void 0 ? void 0 : skus.reduce(function (sum, s) {
                        return sum + (s.current_stock || 0) * (s.cost_price || 0);
                    }, 0)) || 0;
                    skuData = (skus === null || skus === void 0 ? void 0 : skus.map(function (s) { return (__assign(__assign({}, s), { stockLevel: s.current_stock <= s.min_stock ? 'low' :
                            s.current_stock >= s.max_stock ? 'high' : 'normal' })); })) || [];
                    return [2 /*return*/, {
                            summary: {
                                totalSKUs: totalSKUs,
                                totalStock: totalStock,
                                inventoryValue: inventoryValue,
                                lowStockCount: lowStockItems.length,
                                overStockCount: overStockItems.length,
                                outOfStockCount: outOfStockItems.length,
                            },
                            lowStockItems: lowStockItems.slice(0, 10),
                            outOfStockItems: outOfStockItems.slice(0, 10),
                            stockDistribution: {
                                normal: skuData.filter(function (s) { return s.stockLevel === 'normal'; }).length,
                                low: lowStockItems.length,
                                over: overStockItems.length,
                                out: outOfStockItems.length,
                            },
                            skuData: skuData.slice(0, 50),
                        }];
            }
        });
    });
}
/**
 * 获取财务报表
 */
function getFinanceReport(supabase, schema, dateRange) {
    return __awaiter(this, void 0, void 0, function () {
        var salesOrders, purchaseOrders, salesRevenue, receivedPayment, pendingPayment, purchaseCost, paidPurchase, estimatedProfit, actualProfit, byMonth, processOrder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase
                        .from("\"".concat(schema, "\".\"sales_orders\""))
                        .select('*')
                        .gte('order_date', dateRange.start)
                        .lte('order_date', dateRange.end)];
                case 1:
                    salesOrders = (_a.sent()).data;
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"purchase_orders\""))
                            .select('*')
                            .gte('order_date', dateRange.start)
                            .lte('order_date', dateRange.end)];
                case 2:
                    purchaseOrders = (_a.sent()).data;
                    salesRevenue = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.reduce(function (sum, o) { return sum + (o.total_amount || 0); }, 0)) || 0;
                    receivedPayment = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.reduce(function (sum, o) { return sum + (o.paid_amount || 0); }, 0)) || 0;
                    pendingPayment = salesRevenue - receivedPayment;
                    purchaseCost = (purchaseOrders === null || purchaseOrders === void 0 ? void 0 : purchaseOrders.reduce(function (sum, o) { return sum + (o.total_amount || 0); }, 0)) || 0;
                    paidPurchase = (purchaseOrders === null || purchaseOrders === void 0 ? void 0 : purchaseOrders.reduce(function (sum, o) { return sum + (o.paid_amount || 0); }, 0)) || 0;
                    estimatedProfit = salesRevenue - purchaseCost;
                    actualProfit = receivedPayment - paidPurchase;
                    byMonth = {};
                    processOrder = function (date, amount, type) {
                        var month = date.substring(0, 7); // YYYY-MM
                        if (!byMonth[month]) {
                            byMonth[month] = { revenue: 0, cost: 0, profit: 0 };
                        }
                        if (type === 'revenue') {
                            byMonth[month].revenue += amount;
                        }
                        else {
                            byMonth[month].cost += amount;
                        }
                        byMonth[month].profit = byMonth[month].revenue - byMonth[month].cost;
                    };
                    salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.forEach(function (o) {
                        if (o.order_date)
                            processOrder(o.order_date, o.total_amount || 0, 'revenue');
                    });
                    purchaseOrders === null || purchaseOrders === void 0 ? void 0 : purchaseOrders.forEach(function (o) {
                        if (o.order_date)
                            processOrder(o.order_date, o.total_amount || 0, 'cost');
                    });
                    return [2 /*return*/, {
                            summary: {
                                salesRevenue: salesRevenue,
                                receivedPayment: receivedPayment,
                                pendingPayment: pendingPayment,
                                purchaseCost: purchaseCost,
                                paidPurchase: paidPurchase,
                                pendingPurchase: purchaseCost - paidPurchase,
                                estimatedProfit: estimatedProfit,
                                actualProfit: actualProfit,
                                profitMargin: salesRevenue > 0 ? (estimatedProfit / salesRevenue) * 100 : 0,
                            },
                            byMonth: byMonth,
                        }];
            }
        });
    });
}
/**
 * 获取客户分析报表
 */
function getCustomerReport(supabase, schema, dateRange) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, customers, customerError, salesOrders, totalCustomers, activeCustomers, customerStats, avgOrderValue, customerMap, topCustomers, newCustomersThreshold, newCustomers;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase
                        .from("\"".concat(schema, "\".\"customers\""))
                        .select('*')];
                case 1:
                    _a = _b.sent(), customers = _a.data, customerError = _a.error;
                    if (customerError)
                        throw customerError;
                    return [4 /*yield*/, supabase
                            .from("\"".concat(schema, "\".\"sales_orders\""))
                            .select('*')
                            .gte('order_date', dateRange.start)
                            .lte('order_date', dateRange.end)];
                case 2:
                    salesOrders = (_b.sent()).data;
                    totalCustomers = (customers === null || customers === void 0 ? void 0 : customers.length) || 0;
                    activeCustomers = new Set((salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.map(function (o) { return o.customer_id; })) || []);
                    customerStats = {};
                    salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.forEach(function (o) {
                        if (!o.customer_id)
                            return;
                        if (!customerStats[o.customer_id]) {
                            customerStats[o.customer_id] = { count: 0, amount: 0 };
                        }
                        customerStats[o.customer_id].count++;
                        customerStats[o.customer_id].amount += o.total_amount || 0;
                    });
                    avgOrderValue = (salesOrders === null || salesOrders === void 0 ? void 0 : salesOrders.length) ?
                        (salesOrders.reduce(function (sum, o) { return sum + (o.total_amount || 0); }, 0) / salesOrders.length) : 0;
                    customerMap = new Map((customers === null || customers === void 0 ? void 0 : customers.map(function (c) { return [c.id, c.name]; })) || []);
                    topCustomers = Object.entries(customerStats)
                        .map(function (_a) {
                        var id = _a[0], stats = _a[1];
                        return ({
                            id: id,
                            name: customerMap.get(id) || '未知客户',
                            orderCount: stats.count,
                            totalAmount: stats.amount,
                            avgOrderValue: stats.count > 0 ? stats.amount / stats.count : 0,
                        });
                    })
                        .sort(function (a, b) { return b.totalAmount - a.totalAmount; })
                        .slice(0, 10);
                    newCustomersThreshold = new Date(dateRange.start);
                    newCustomers = (customers === null || customers === void 0 ? void 0 : customers.filter(function (c) {
                        var created = new Date(c.created_at);
                        return created >= newCustomersThreshold;
                    }).length) || 0;
                    return [2 /*return*/, {
                            summary: {
                                totalCustomers: totalCustomers,
                                activeCustomers: activeCustomers.size,
                                inactiveCustomers: totalCustomers - activeCustomers.size,
                                newCustomers: newCustomers,
                                avgOrderValue: avgOrderValue,
                                customerActivity: totalCustomers > 0 ? (activeCustomers.size / totalCustomers) * 100 : 0,
                            },
                            topCustomers: topCustomers,
                            customerStats: customerStats,
                        }];
            }
        });
    });
}
/**
 * GET /api/reports - 获取报表数据
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, searchParams, reportType, period, tokenResult, schema, dateRange, reportData, _a, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 14, , 15]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    searchParams = request.nextUrl.searchParams;
                    reportType = searchParams.get('type') || 'sales';
                    period = searchParams.get('period') || 'month';
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(session.user.id, 'report_view', 1, 'GET /api/reports', { type: reportType, period: period })];
                case 3:
                    tokenResult = _b.sent();
                    if (!tokenResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: tokenResult.error || 'Token 余额不足' }, { status: 402 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    dateRange = getDateRange(period);
                    reportData = void 0;
                    _a = reportType;
                    switch (_a) {
                        case 'sales': return [3 /*break*/, 4];
                        case 'inventory': return [3 /*break*/, 6];
                        case 'finance': return [3 /*break*/, 8];
                        case 'customer': return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 12];
                case 4: return [4 /*yield*/, getSalesReport(supabase, schema, dateRange)];
                case 5:
                    reportData = _b.sent();
                    return [3 /*break*/, 13];
                case 6: return [4 /*yield*/, getInventoryReport(supabase, schema)];
                case 7:
                    reportData = _b.sent();
                    return [3 /*break*/, 13];
                case 8: return [4 /*yield*/, getFinanceReport(supabase, schema, dateRange)];
                case 9:
                    reportData = _b.sent();
                    return [3 /*break*/, 13];
                case 10: return [4 /*yield*/, getCustomerReport(supabase, schema, dateRange)];
                case 11:
                    reportData = _b.sent();
                    return [3 /*break*/, 13];
                case 12: return [2 /*return*/, server_1.NextResponse.json({ error: '不支持的报表类型' }, { status: 400 })];
                case 13: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        data: __assign({ type: reportType, period: period, dateRange: dateRange }, reportData),
                        tokensUsed: 10,
                    })];
                case 14:
                    error_1 = _b.sent();
                    console.error('获取报表失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 15: return [2 /*return*/];
            }
        });
    });
}
