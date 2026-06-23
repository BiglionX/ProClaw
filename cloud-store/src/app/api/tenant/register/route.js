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
// ProClaw Shop - 商户注册 API
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_router_1 = require("@/lib/tenant-router");
exports.dynamic = 'force-dynamic';
/**
 * 注册新商户
 * POST /api/tenant/register
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, body, name_1, subdomain, owner_name, owner_email, owner_phone, _a, plan, suggestions, existing, suggestions, schemaName, _b, tenant, createError, schemaError, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, request.json()];
                case 2:
                    body = _c.sent();
                    name_1 = body.name, subdomain = body.subdomain, owner_name = body.owner_name, owner_email = body.owner_email, owner_phone = body.owner_phone, _a = body.plan, plan = _a === void 0 ? 'trial' : _a;
                    // 验证必填字段
                    if (!name_1 || !subdomain || !owner_email) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 })];
                    }
                    // 验证子域名格式
                    if (!(0, tenant_router_1.isValidSubdomain)(subdomain)) {
                        suggestions = (0, tenant_router_1.generateSubdomainSuggestions)(name_1, 5);
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: '子域名格式不正确，请使用小写字母、数字和连字符',
                                suggestions: suggestions
                            }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id')
                            .eq('subdomain', subdomain.toLowerCase())
                            .single()];
                case 3:
                    existing = (_c.sent()).data;
                    if (existing) {
                        suggestions = (0, tenant_router_1.generateSubdomainSuggestions)(name_1, 5);
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: '该子域名已被占用',
                                suggestions: suggestions
                            }, { status: 409 })];
                    }
                    schemaName = "tenant_".concat(subdomain.replace(/-/g, '_').toLowerCase());
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .insert({
                            name: name_1,
                            subdomain: subdomain.toLowerCase(),
                            schema_name: schemaName,
                            owner_name: owner_name || null,
                            owner_email: owner_email,
                            owner_phone: owner_phone || null,
                            plan: plan,
                            status: 'active',
                            token_balance: plan === 'trial' ? 100 : 0, // 试用账号送 100 Token
                        })
                            .select()
                            .single()];
                case 4:
                    _b = _c.sent(), tenant = _b.data, createError = _b.error;
                    if (createError || !tenant) {
                        console.error('Create tenant error:', createError);
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '创建商户失败' }, { status: 500 })];
                    }
                    return [4 /*yield*/, supabase
                            .rpc('create_tenant_schema', { tenant_schema: schemaName })];
                case 5:
                    schemaError = (_c.sent()).error;
                    if (!schemaError) return [3 /*break*/, 7];
                    console.error('Create schema error:', schemaError);
                    // 回滚租户创建
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .delete()
                            .eq('id', tenant.id)];
                case 6:
                    // 回滚租户创建
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '创建数据库失败' }, { status: 500 })];
                case 7: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        data: {
                            tenant_id: tenant.id,
                            subdomain: tenant.subdomain,
                            store_url: "https://".concat(tenant.subdomain, ".proclaw.cc"),
                            schema_name: schemaName,
                        },
                    })];
                case 8:
                    error_1 = _c.sent();
                    console.error('Register error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * 检查子域名是否可用
 * GET /api/tenant/register?subdomain=xxx
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, searchParams, subdomain, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    searchParams = new URL(request.url).searchParams;
                    subdomain = searchParams.get('subdomain');
                    if (!subdomain) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '缺少 subdomain 参数' }, { status: 400 })];
                    }
                    if (!(0, tenant_router_1.isValidSubdomain)(subdomain)) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    available: false,
                                    reason: '子域名格式不正确',
                                },
                            })];
                    }
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('id')
                            .eq('subdomain', subdomain.toLowerCase())
                            .single()];
                case 1:
                    existing = (_a.sent()).data;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                available: !existing,
                                subdomain: subdomain.toLowerCase(),
                            },
                        })];
            }
        });
    });
}
