"use strict";
// ProClaw Shop - 语音消息 API
// 支持语音录制、上传和播放
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
exports.DELETE = DELETE;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var tokenApi_1 = require("@/lib/tokenApi");
exports.dynamic = 'force-dynamic';
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return '服务器内部错误';
}
// 音频文件大小限制 (5MB)
var MAX_AUDIO_SIZE = 5 * 1024 * 1024;
var ALLOWED_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
/**
 * POST /api/audio - 上传语音消息
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, formData, audioFile, cost, tokenResult, bucket, ext, timestamp, random, filePath, _a, uploadData, uploadError, urlData, error_1;
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
                    return [4 /*yield*/, request.formData()];
                case 3:
                    formData = _b.sent();
                    audioFile = formData.get('audio');
                    if (!audioFile) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '未提供音频文件' }, { status: 400 })];
                    }
                    // 检查文件类型
                    if (!ALLOWED_TYPES.includes(audioFile.type)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '不支持的音频格式，请使用 WebM、WAV、MP3 或 M4A 格式' }, { status: 400 })];
                    }
                    // 检查文件大小
                    if (audioFile.size > MAX_AUDIO_SIZE) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '音频文件过大，最大支持 5MB' }, { status: 400 })];
                    }
                    cost = Math.max(Math.ceil(audioFile.size / (1024 * 1024) * 2), 2);
                    return [4 /*yield*/, (0, tokenApi_1.checkAndDeductToken)(session.user.id, 'voice_message', 1, 'POST /api/audio')];
                case 4:
                    tokenResult = _b.sent();
                    if (!tokenResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: tokenResult.error || 'Token 余额不足' }, { status: 402 })];
                    }
                    bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
                    ext = audioFile.type.split('/')[1] || 'webm';
                    timestamp = Date.now();
                    random = Math.random().toString(36).substring(2, 8);
                    filePath = "".concat(session.user.id, "/voice/").concat(timestamp, "-").concat(random, ".").concat(ext);
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .upload(filePath, audioFile, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: audioFile.type,
                        })];
                case 5:
                    _a = _b.sent(), uploadData = _a.data, uploadError = _a.error;
                    if (uploadError) {
                        throw new Error("\u4E0A\u4F20\u5931\u8D25: ".concat(uploadError.message));
                    }
                    urlData = supabase.storage
                        .from(bucket)
                        .getPublicUrl(filePath).data;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                url: urlData.publicUrl,
                                path: uploadData.path,
                                duration: formData.get('duration') || '0',
                                size: audioFile.size,
                                mimeType: audioFile.type,
                            },
                            tokensUsed: cost,
                        })];
                case 6:
                    error_1 = _b.sent();
                    console.error('语音消息上传失败:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_1) }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * DELETE /api/audio - 删除语音消息
 */
function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, session, path, bucket, removeError, error_2;
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
                    path = request.nextUrl.searchParams.get('path');
                    if (!path) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '缺少文件路径' }, { status: 400 })];
                    }
                    // 验证路径属于当前用户
                    if (!path.startsWith(session.user.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: '无权删除此文件' }, { status: 403 })];
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
                    return [2 /*return*/, server_1.NextResponse.json({ success: true })];
                case 4:
                    error_2 = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: getErrorMessage(error_2) }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
