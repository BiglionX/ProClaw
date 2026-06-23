"use strict";
// ProClaw Cloud 托管版 - 联系人 API Routes
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
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tenant_1 = require("@/lib/tenant");
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, search, query, _a, data, error, error_1;
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
                    if (!session)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    search = request.nextUrl.searchParams.get('search') || '';
                    query = supabase
                        .from((0, tenant_1.schemaTable)(schema, 'contacts'))
                        .select('*')
                        .order('name', { ascending: true });
                    if (search) {
                        query = query.or("name.ilike.%".concat(search, "%,phone.ilike.%").concat(search, "%"));
                    }
                    return [4 /*yield*/, query];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ data: data || [] })];
                case 4:
                    error_1 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, body, _a, contact, error, error_2;
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
                    if (!session)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, request.json()];
                case 3:
                    body = _b.sent();
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'contacts'))
                            .insert({
                            name: body.name,
                            phone: body.phone || '',
                            email: body.email || '',
                            avatar_url: body.avatar_url || '',
                            notes: body.notes || '',
                        })
                            .select()
                            .single()];
                case 4:
                    _a = _b.sent(), contact = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ data: contact, success: true }, { status: 201 })];
                case 5:
                    error_2 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, schema, id, error, error_3;
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
                    if (!session)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    id = request.nextUrl.searchParams.get('id');
                    if (!id)
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少联系人 ID' }, { status: 400 })];
                    return [4 /*yield*/, supabase.from((0, tenant_1.schemaTable)(schema, 'contacts')).delete().eq('id', id)];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, server_1.NextResponse.json({ success: true })];
                case 4:
                    error_3 = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
