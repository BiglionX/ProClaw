"use strict";
// ProClaw Shop - AI 智能找图 API
// 从 Pexels/Pixabay 免费图库搜索商品图片
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
var server_1 = require("next/server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var token_calculator_1 = require("@/lib/token-calculator");
exports.dynamic = 'force-dynamic';
/**
 * 搜索图片
 * POST /api/ai/image-search
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var body, keyword, _a, count, tenantContext, supabaseUrl, supabaseKey, tokenCalc, consumeResult, images, PEXELS_API_KEY, response, data, _i, _b, photo, error_1, i, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _c.sent();
                    keyword = body.keyword, _a = body.count, count = _a === void 0 ? 10 : _a;
                    if (!keyword || keyword.trim().length < 2) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '关键词长度至少2个字符' }, { status: 400 })];
                    }
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _c.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                    tokenCalc = new token_calculator_1.TokenCalculator(supabaseUrl, supabaseKey);
                    return [4 /*yield*/, tokenCalc.consume({
                            tenant_id: tenantContext.tenantId,
                            action: token_calculator_1.TokenActions.AI_IMAGE_SEARCH,
                            quantity: 1,
                        })];
                case 3:
                    consumeResult = _c.sent();
                    if (!consumeResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: consumeResult.error || 'Token 不足' }, { status: 402 })];
                    }
                    images = [];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 8, , 9]);
                    PEXELS_API_KEY = process.env.PEXELS_API_KEY;
                    if (!PEXELS_API_KEY) return [3 /*break*/, 7];
                    return [4 /*yield*/, fetch("https://api.pexels.com/v1/search?query=".concat(encodeURIComponent(keyword), "&per_page=").concat(count), {
                            headers: {
                                Authorization: PEXELS_API_KEY,
                            },
                        })];
                case 5:
                    response = _c.sent();
                    if (!response.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, response.json()];
                case 6:
                    data = _c.sent();
                    for (_i = 0, _b = data.photos || []; _i < _b.length; _i++) {
                        photo = _b[_i];
                        images.push({
                            id: "pexels_".concat(photo.id),
                            url: photo.src.large,
                            thumbnail_url: photo.src.tiny,
                            width: photo.width,
                            height: photo.height,
                            source: 'pexels',
                            photographer: photo.photographer,
                            photographer_url: photo.photographer_url,
                        });
                    }
                    _c.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _c.sent();
                    console.error('Pexels API error:', error_1);
                    return [3 /*break*/, 9];
                case 9:
                    // 如果没有结果，生成占位图
                    if (images.length === 0) {
                        for (i = 0; i < count; i++) {
                            images.push({
                                id: "placeholder_".concat(i),
                                url: "https://via.placeholder.com/800x600/3B82F6/FFFFFF?text=".concat(encodeURIComponent(keyword)),
                                thumbnail_url: "https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=".concat(encodeURIComponent(keyword)),
                                width: 800,
                                height: 600,
                                source: 'placeholder',
                            });
                        }
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                images: images,
                                tokens_consumed: consumeResult.tokens_consumed,
                            },
                        })];
                case 10:
                    error_2 = _c.sent();
                    console.error('Image search error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '图片搜索失败' }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
