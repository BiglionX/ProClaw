"use strict";
// ProClaw Cloud 托管版 - 文件存储工具
// 基于 Supabase Storage 实现文件上传与管理
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
exports.isAllowedFileType = isAllowedFileType;
exports.isFileSizeAllowed = isFileSizeAllowed;
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
exports.getFileUrl = getFileUrl;
exports.listFiles = listFiles;
exports.estimateUploadTokens = estimateUploadTokens;
exports.formatFileSize = formatFileSize;
var supabase_1 = require("./supabase");
var STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';
/**
 * 获取文件扩展名
 */
function getExtension(filename) {
    var ext = filename.split('.').pop();
    return ext ? ext.toLowerCase() : '';
}
/**
 * 检查文件类型是否允许上传
 */
function isAllowedFileType(filename) {
    var allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        'pdf', 'doc', 'docx', 'xls', 'xlsx',
        'txt', 'csv',
    ];
    return allowedExtensions.includes(getExtension(filename));
}
/**
 * 检查文件大小是否在限制内 (默认 10MB)
 */
function isFileSizeAllowed(size, maxBytes) {
    if (maxBytes === void 0) { maxBytes = 10 * 1024 * 1024; }
    return size <= maxBytes;
}
/**
 * 生成唯一的文件路径
 */
function generateFilePath(userId, filename) {
    var timestamp = Date.now();
    var random = Math.random().toString(36).substring(2, 8);
    var ext = getExtension(filename);
    return "".concat(userId, "/").concat(timestamp, "-").concat(random, ".").concat(ext);
}
/**
 * 上传文件到 Supabase Storage
 */
function uploadFile(file_1, userId_1) {
    return __awaiter(this, arguments, void 0, function (file, userId, bucket) {
        var supabase, path, _a, data, error, urlData;
        if (bucket === void 0) { bucket = STORAGE_BUCKET; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = (0, supabase_1.getSupabaseClient)();
                    path = generateFilePath(userId, file.name);
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .upload(path, file, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: file.type,
                        })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        throw new Error("\u6587\u4EF6\u4E0A\u4F20\u5931\u8D25: ".concat(error.message));
                    }
                    urlData = supabase.storage
                        .from(bucket)
                        .getPublicUrl(path).data;
                    return [2 /*return*/, {
                            url: urlData.publicUrl,
                            path: data.path,
                            name: file.name,
                            size: file.size,
                            mimeType: file.type,
                        }];
            }
        });
    });
}
/**
 * 删除文件
 */
function deleteFile(path_1) {
    return __awaiter(this, arguments, void 0, function (path, bucket) {
        var supabase, error;
        if (bucket === void 0) { bucket = STORAGE_BUCKET; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .remove([path])];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('删除文件失败:', error);
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * 获取文件的公开 URL
 */
function getFileUrl(path, bucket) {
    if (bucket === void 0) { bucket = STORAGE_BUCKET; }
    var supabase = (0, supabase_1.getSupabaseClient)();
    var data = supabase.storage
        .from(bucket)
        .getPublicUrl(path).data;
    return data.publicUrl;
}
/**
 * 列出用户上传的文件
 */
function listFiles(userId_1) {
    return __awaiter(this, arguments, void 0, function (userId, bucket) {
        var supabase, _a, data, error;
        if (bucket === void 0) { bucket = STORAGE_BUCKET; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = (0, supabase_1.getSupabaseClient)();
                    return [4 /*yield*/, supabase.storage
                            .from(bucket)
                            .list(userId, {
                            sortBy: { column: 'created_at', order: 'desc' },
                        })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('获取文件列表失败:', error);
                        return [2 /*return*/, []];
                    }
                    return [2 /*return*/, (data || []).map(function (item) {
                            var _a, _b;
                            var path = "".concat(userId, "/").concat(item.name);
                            return {
                                name: item.name,
                                path: path,
                                url: getFileUrl(path, bucket),
                                size: ((_a = item.metadata) === null || _a === void 0 ? void 0 : _a.size) || 0,
                                created_at: item.created_at || '',
                                mimeType: ((_b = item.metadata) === null || _b === void 0 ? void 0 : _b.mimetype) || 'application/octet-stream',
                            };
                        })];
            }
        });
    });
}
/**
 * 估算文件上传的 Token 消耗 (10 token/MB)
 */
function estimateUploadTokens(fileSize) {
    var sizeMB = fileSize / (1024 * 1024);
    return Math.ceil(sizeMB * 10) || 10; // 至少 10 token
}
/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
