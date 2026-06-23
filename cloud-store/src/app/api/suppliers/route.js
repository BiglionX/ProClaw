"use strict";
// ProClaw Cloud 托管版 - 供应商管理 API Routes
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
var fieldEncryption_1 = require("@/lib/fieldEncryption");
var encryptedFields_1 = require("@/config/encryptedFields");
var SENSITIVE_FIELDS = (0, encryptedFields_1.getEncryptedFields)('suppliers');
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
/**
 * GET /api/suppliers - 获取供应商列表
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, searchParams, search, page, pageSize, query, from, to, _a, data, error, count, decryptedData, error_1;
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
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    searchParams = request.nextUrl.searchParams;
                    search = searchParams.get('search') || '';
                    page = parseInt(searchParams.get('page') || '1');
                    pageSize = parseInt(searchParams.get('pageSize') || '20');
                    query = supabase
                        .from((0, tenant_1.schemaTable)(schema, 'suppliers'))
                        .select('*', { count: 'exact' });
                    if (search) {
                        query = query.or("name.ilike.%".concat(search, "%,code.ilike.%").concat(search, "%,contact_person.ilike.%").concat(search, "%"));
                    }
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    return [4 /*yield*/, query
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error, count = _a.count;
                    if (error)
                        throw error;
                    decryptedData = (0, fieldEncryption_1.decryptFieldsInArray)(data || [], __spreadArray([], SENSITIVE_FIELDS, true));
                    return [2 /*return*/, server_1.NextResponse.json({
                            data: decryptedData || [],
                            total: count || 0,
                            page: page,
                            pageSize: pageSize,
                        })];
                case 4:
                    error_1 = _b.sent();
                    console.error('获取供应商列表失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * POST /api/suppliers - 创建供应商
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, encryptedBody, _a, supplier, error, decryptedSupplier, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
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
                    encryptedBody = (0, fieldEncryption_1.encryptRequestBody)(body, __spreadArray([], SENSITIVE_FIELDS, true));
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'suppliers'))
                            .insert({
                            code: encryptedBody.code || "SUP-".concat(Date.now().toString(36).toUpperCase()),
                            name: encryptedBody.name,
                            contact_person: encryptedBody.contact_person || '',
                            phone: encryptedBody.phone || '',
                            email: encryptedBody.email || '',
                            address: encryptedBody.address || '',
                            payment_terms: encryptedBody.payment_terms || '',
                            is_active: encryptedBody.is_active !== false,
                            notes: encryptedBody.notes || '',
                        })
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), supplier = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    decryptedSupplier = (0, fieldEncryption_1.decryptFields)(supplier, __spreadArray([], SENSITIVE_FIELDS, true));
                    return [2 /*return*/, server_1.NextResponse.json({ data: decryptedSupplier, success: true }, { status: 201 })];
                case 5:
                    error_2 = _b.sent();
                    console.error('创建供应商失败:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * PUT /api/suppliers - 更新供应商
 */
function PUT(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, id, updateData, encryptedUpdate, _a, supplier, error, decryptedSupplier, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
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
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少供应商 ID' }, { status: 400 })];
                    }
                    encryptedUpdate = (0, fieldEncryption_1.encryptRequestBody)(updateData, __spreadArray([], SENSITIVE_FIELDS, true));
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'suppliers'))
                            .update({
                            name: encryptedUpdate.name,
                            contact_person: encryptedUpdate.contact_person || '',
                            phone: encryptedUpdate.phone || '',
                            email: encryptedUpdate.email || '',
                            address: encryptedUpdate.address || '',
                            payment_terms: encryptedUpdate.payment_terms || '',
                            is_active: encryptedUpdate.is_active,
                            notes: encryptedUpdate.notes || '',
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', id)
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), supplier = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    decryptedSupplier = (0, fieldEncryption_1.decryptFields)(supplier, __spreadArray([], SENSITIVE_FIELDS, true));
                    return [2 /*return*/, server_1.NextResponse.json({ data: decryptedSupplier, success: true })];
                case 5:
                    error_3 = _b.sent();
                    console.error('更新供应商失败:', error_3);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/suppliers - 删除供应商
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
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少供应商 ID' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'suppliers'))
                            .delete()
                            .eq('id', id)];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true })];
                case 4:
                    error_4 = _a.sent();
                    console.error('删除供应商失败:', error_4);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_4) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
