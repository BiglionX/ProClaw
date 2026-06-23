"use strict";
// ProClaw Cloud 托管版 - 文件上传 API Routes
// 支持 multipart/form-data 文件上传
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
exports.DELETE = DELETE;
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
/**
 * POST /api/upload - 上传文件
 * 接收 multipart/form-data, 上传到 Supabase Storage
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, formData, file, maxSize, allowedTypes, cost, tokenResult, bucket, ext, timestamp, random, filePath, _a, uploadData, uploadError, urlData, schema, error_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 1:
                    session = (_c.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    return [4 /*yield*/, request.formData()];
                case 2:
                    formData = _c.sent();
                    file = formData.get('file');
                    if (!file) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未提供文件' }, { status: 400 })];
                    }
                    maxSize = 10 * 1024 * 1024;
                    if (file.size > maxSize) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '文件大小超过限制 (最大 10MB)' }, { status: 400 })];
                    }
                    allowedTypes = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
                        'application/pdf', 'text/plain', 'text/csv',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    ];
                    if (!allowedTypes.includes(file.type)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })];
                    }
                    cost = Math.max(Math.ceil(file.size / (1024 * 1024) * 10), 10);
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(session.user.id, 'file_upload', Math.ceil(file.size / (1024 * 1024)), 'POST /api/upload')];
                case 3:
                    tokenResult = _c.sent();
                    if (!tokenResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: tokenResult.error || 'Token 余额不足' }, { status: 402 })];
                    }
                    bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
                    ext = ((_b = file.name.split('.').pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || 'bin';
                    timestamp = Date.now();
                    random = Math.random().toString(36).substring(2, 8);
                    filePath = "".concat(session.user.id, "/").concat(timestamp, "-").concat(random, ".").concat(ext);
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: file.type,
                        })];
                case 4:
                    _a = _c.sent(), uploadData = _a.data, uploadError = _a.error;
                    if (uploadError) {
                        throw new Error("\u4E0A\u4F20\u5931\u8D25: ".concat(uploadError.message));
                    }
                    urlData = supabase.storage
                        .from(bucket)
                        .getPublicUrl(filePath).data;
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'files'))
                            .insert({
                            user_id: session.user.id,
                            file_name: file.name,
                            file_path: filePath,
                            file_size: file.size,
                            mime_type: file.type,
                            public_url: urlData.publicUrl,
                            created_at: new Date().toISOString(),
                        })];
                case 5:
                    _c.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                url: urlData.publicUrl,
                                path: uploadData.path,
                                name: file.name,
                                size: file.size,
                                mimeType: file.type,
                                tokensUsed: cost,
                            },
                        })];
                case 6:
                    error_1 = _c.sent();
                    console.error('文件上传失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * GET /api/upload - 获取已上传文件列表
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session_1, schema, bucket_1, page, pageSize, from, to, _a, records, error, count, storageList, files_1, files, error_2;
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
                    session_1 = (_b.sent()).data.session;
                    if (!session_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    schema = (0, tenant_1.getTenantSchema)(session_1.user.id);
                    bucket_1 = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
                    page = parseInt(request.nextUrl.searchParams.get('page') || '1');
                    pageSize = 20;
                    from = (page - 1) * pageSize;
                    to = from + pageSize - 1;
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'files'))
                            .select('*', { count: 'exact' })
                            .order('created_at', { ascending: false })
                            .range(from, to)];
                case 3:
                    _a = _b.sent(), records = _a.data, error = _a.error, count = _a.count;
                    if (!error) return [3 /*break*/, 5];
                    return [4 /*yield*/, supabase.storage
                            .from(bucket_1)
                            .list(session_1.user.id, {
                            sortBy: { column: 'created_at', order: 'desc' },
                            limit: pageSize,
                            offset: from,
                        })];
                case 4:
                    storageList = (_b.sent()).data;
                    files_1 = (storageList || []).map(function (item) {
                        var _a;
                        var path = "".concat(session_1.user.id, "/").concat(item.name);
                        var urlData = supabase.storage.from(bucket_1).getPublicUrl(path).data;
                        return {
                            name: item.name,
                            path: path,
                            url: urlData.publicUrl,
                            size: ((_a = item.metadata) === null || _a === void 0 ? void 0 : _a.size) || 0,
                            created_at: item.created_at || '',
                        };
                    });
                    return [2 /*return*/, server_1.NextResponse.json({ data: files_1, total: files_1.length })];
                case 5:
                    files = (records || []).map(function (r) { return ({
                        name: r.file_name,
                        path: r.file_path,
                        url: r.public_url,
                        size: r.file_size,
                        created_at: r.created_at,
                    }); });
                    return [2 /*return*/, server_1.NextResponse.json({ data: files, total: count || 0 })];
                case 6:
                    error_2 = _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/upload - 删除文件
 */
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, path, bucket, removeError, schema, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, supabase.auth.getSession()];
                case 2:
                    session = (_a.sent()).data.session;
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未登录' }, { status: 401 })];
                    }
                    path = request.nextUrl.searchParams.get('path');
                    if (!path) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少文件路径' }, { status: 400 })];
                    }
                    bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .remove([path])];
                case 3:
                    removeError = (_a.sent()).error;
                    if (removeError) {
                        throw new Error("\u5220\u9664\u5931\u8D25: ".concat(removeError.message));
                    }
                    schema = (0, tenant_1.getTenantSchema)(session.user.id);
                    return [4 /*yield*/, supabase
                            .from((0, tenant_1.schemaTable)(schema, 'files'))
                            .delete()
                            .eq('file_path', path)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ success: true })];
                case 5:
                    error_3 = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_3) }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
