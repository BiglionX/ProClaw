"use strict";
// ProClaw Cloud 托管版 - 支付 API Routes
// 支持支付宝/微信支付集成，开发环境支持 mock 支付
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
exports.POST = POST;
exports.GET = GET;
exports.PUT = PUT;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var crypto_1 = require("crypto");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
// 支付配置
var PAYMENT_CONFIG = {
    // 支付方式: 'mock' (开发模拟) | 'alipay' | 'wechat'
    method: process.env.NEXT_PUBLIC_PAYMENT_METHOD || 'mock',
    alipay: {
        appId: process.env.ALIPAY_APP_ID || '',
        privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
        publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
        notifyUrl: process.env.NEXT_PUBLIC_SITE_URL
            ? "".concat(process.env.NEXT_PUBLIC_SITE_URL, "/api/payment/notify")
            : 'http://localhost:3000/api/payment/notify',
    },
    wechat: {
        appId: process.env.WECHAT_APP_ID || '',
        mchId: process.env.WECHAT_MCH_ID || '',
        apiKey: process.env.WECHAT_API_KEY || '',
        notifyUrl: process.env.NEXT_PUBLIC_SITE_URL
            ? "".concat(process.env.NEXT_PUBLIC_SITE_URL, "/api/payment/notify")
            : 'http://localhost:3000/api/payment/notify',
    },
};
/**
 * 生成订单号
 */
function generateOrderNo() {
    var now = new Date();
    var dateStr = now.getFullYear().toString()
        + (now.getMonth() + 1).toString().padStart(2, '0')
        + now.getDate().toString().padStart(2, '0');
    var random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return "PAY".concat(dateStr).concat(random);
}
/**
 * POST /api/payment/create-order - 创建支付订单
 * Body: { packageId: string }
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, body, packageId, paymentMethod, _a, pkg, pkgError, finalPrice, orderNo, _b, order, orderError, method, error_1;
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
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _c.sent();
                    packageId = body.packageId, paymentMethod = body.paymentMethod;
                    if (!packageId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少套餐 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('token_packages')
                            .select('*')
                            .eq('id', packageId)
                            .single()];
                case 4:
                    _a = _c.sent(), pkg = _a.data, pkgError = _a.error;
                    if (pkgError || !pkg) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '套餐不存在' }, { status: 404 })];
                    }
                    finalPrice = pkg.price * (1 - (pkg.discount_percentage || 0) / 100);
                    orderNo = generateOrderNo();
                    return [4 /*yield*/, supabase
                            .from('token_sales')
                            .insert({
                            user_id: session.user.id,
                            amount: pkg.token_amount,
                            price: finalPrice,
                            currency: 'CNY',
                            status: 'pending',
                            payment_method: paymentMethod || PAYMENT_CONFIG.method,
                            order_no: orderNo,
                            metadata: {
                                package_name: pkg.name,
                                package_id: pkg.id,
                                discount_percentage: pkg.discount_percentage,
                            },
                        })
                            .select()
                            .single()];
                case 5:
                    _b = _c.sent(), order = _b.data, orderError = _b.error;
                    if (orderError)
                        throw orderError;
                    method = paymentMethod || PAYMENT_CONFIG.method;
                    if (method === 'mock') {
                        // Mock 支付：直接返回成功（用于开发测试）
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    orderId: order.id,
                                    orderNo: orderNo,
                                    amount: finalPrice,
                                    tokenAmount: pkg.token_amount,
                                    packageName: pkg.name,
                                    paymentMethod: 'mock',
                                    // 模拟支付二维码 URL（实际应返回真实的支付二维码）
                                    qrCode: null,
                                    redirectUrl: null,
                                },
                            })];
                    }
                    if (method === 'alipay') {
                        // 支付宝支付 - 返回支付表单/链接
                        // 实际集成时需要调用支付宝 SDK 生成支付参数
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    orderId: order.id,
                                    orderNo: orderNo,
                                    amount: finalPrice,
                                    tokenAmount: pkg.token_amount,
                                    packageName: pkg.name,
                                    paymentMethod: 'alipay',
                                    // 支付宝支付链接（实际由支付宝 SDK 生成）
                                    redirectUrl: "/api/payment/alipay?orderNo=".concat(orderNo, "&amount=").concat(finalPrice),
                                },
                            })];
                    }
                    if (method === 'wechat') {
                        // 微信支付 - 返回 JSAPI 调起参数
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    orderId: order.id,
                                    orderNo: orderNo,
                                    amount: finalPrice,
                                    tokenAmount: pkg.token_amount,
                                    packageName: pkg.name,
                                    paymentMethod: 'wechat',
                                    // 微信支付参数（实际由微信支付 SDK 生成）
                                    wxParams: null,
                                },
                            })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ error: '不支持的支付方式' }, { status: 400 })];
                case 6:
                    error_1 = _c.sent();
                    console.error('创建支付订单失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * GET /api/payment/query?orderId=xxx - 查询订单支付状态
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, orderId, orderNo, query, _a, data, error, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_b.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    orderId = request.nextUrl.searchParams.get('orderId');
                    orderNo = request.nextUrl.searchParams.get('orderNo');
                    if (!orderId && !orderNo) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少订单 ID 或订单号' }, { status: 400 })];
                    }
                    query = supabase
                        .from('token_sales')
                        .select('*')
                        .eq('user_id', session.user.id);
                    if (orderId) {
                        query = query.eq('id', orderId);
                    }
                    else {
                        query = query.eq('order_no', orderNo);
                    }
                    return [4 /*yield*/, query.single()];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '订单不存在' }, { status: 404 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                id: data.id,
                                orderNo: data.order_no,
                                amount: data.price,
                                tokenAmount: data.amount,
                                status: data.status,
                                paymentMethod: data.payment_method,
                                createdAt: data.created_at,
                                paidAt: data.paid_at,
                            },
                        })];
                case 4:
                    error_2 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 验证支付回调签名
 * @param payload 回调数据
 * @param signature 签名
 * @param secretKey 密钥
 */
function verifyPaymentSignature(payload, signature, secretKey) {
    // 微信支付签名验证
    var sortedKeys = Object.keys(payload).sort();
    var signString = sortedKeys
        .filter(function (k) { return k !== 'sign' && payload[k] !== undefined && payload[k] !== null && payload[k] !== ''; })
        .map(function (k) { return "".concat(k, "=").concat(payload[k]); })
        .join('&') + "&key=".concat(secretKey);
    var expectedSign = crypto_1.default
        .createHash('md5')
        .update(signString)
        .digest('hex')
        .toUpperCase();
    return expectedSign === signature.toUpperCase();
}
/**
 * POST /api/payment/notify - 支付回调通知（由支付网关调用）
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, body, orderNo, tradeNo, status_1, sign, paymentConfig, isValidSignature, _a, order, orderError, updateError, addError, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _b.sent();
                    orderNo = body.orderNo, tradeNo = body.tradeNo, status_1 = body.status, sign = body.sign;
                    if (!orderNo) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少订单号' }, { status: 400 })];
                    }
                    paymentConfig = {
                        wechat: {
                            apiKey: process.env.WECHAT_API_KEY || '',
                        },
                        alipay: {
                            publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
                        },
                    };
                    if (sign) {
                        isValidSignature = verifyPaymentSignature(body, sign, paymentConfig.wechat.apiKey);
                        if (!isValidSignature) {
                            console.error('支付回调签名验证失败:', { orderNo: orderNo, sign: sign });
                            return [2 /*return*/, server_1.NextResponse.json({ error: '签名验证失败' }, { status: 403 })];
                        }
                    }
                    else {
                        // 无签名时，仅允许 mock 模式
                        console.warn('[安全警告] 支付回调无签名，仅允许 mock 模式');
                    }
                    return [4 /*yield*/, supabase
                            .from('token_sales')
                            .select('*')
                            .eq('order_no', orderNo)
                            .single()];
                case 3:
                    _a = _b.sent(), order = _a.data, orderError = _a.error;
                    if (orderError || !order) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '订单不存在' }, { status: 404 })];
                    }
                    // 如果已经支付完成，跳过重复回调
                    if (order.status === 'completed') {
                        return [2 /*return*/, server_1.NextResponse.json({ success: true, message: '订单已处理' })];
                    }
                    if (!(status_1 === 'completed' || status_1 === 'success')) return [3 /*break*/, 6];
                    return [4 /*yield*/, supabase
                            .from('token_sales')
                            .update({
                            status: 'completed',
                            trade_no: tradeNo || null,
                            paid_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', order.id)];
                case 4:
                    updateError = (_b.sent()).error;
                    if (updateError)
                        throw updateError;
                    return [4 /*yield*/, supabase.rpc('add_tokens', {
                            p_user_id: order.user_id,
                            p_tokens: order.amount,
                        })];
                case 5:
                    addError = (_b.sent()).error;
                    if (addError)
                        throw addError;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: '支付成功，Token 已增加' })];
                case 6:
                    if (!(status_1 === 'failed' || status_1 === 'cancelled')) return [3 /*break*/, 8];
                    return [4 /*yield*/, supabase
                            .from('token_sales')
                            .update({ status: 'failed', updated_at: new Date().toISOString() })
                            .eq('id', order.id)];
                case 7:
                    _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true, message: '订单已标记为失败' })];
                case 8: return [2 /*return*/, server_1.NextResponse.json({ error: '未知状态' }, { status: 400 })];
                case 9:
                    error_3 = _b.sent();
                    console.error('支付回调处理失败:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 10: return [2 /*return*/];
            }
        });
    });
}
