"use strict";
// ProClaw Shop - AI 生成主题 API
// 使用 DeepSeek 生成商城主题配置
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
exports.POST = POST;
exports.GET = GET;
var server_1 = require("next/server");
var supabase_server_1 = require("@/lib/supabase-server");
var multi_tenant_1 = require("@/lib/multi-tenant");
var token_calculator_1 = require("@/lib/token-calculator");
exports.dynamic = 'force-dynamic';
var DEFAULT_THEME = {
    primary_color: '#3B82F6',
    secondary_color: '#60A5FA',
    accent_color: '#F59E0B',
    layout: 'grid',
    style: 'modern',
    font_family: 'Inter, system-ui, sans-serif',
    border_radius: 'medium',
    product_display: 'balanced',
    banner_style: 'carousel',
};
/**
 * 生成主题
 * POST /api/ai/theme
 */
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var body, business_type, style_preference, tenantContext, supabaseUrl, supabaseKey, tokenCalc, consumeResult, theme, response, supabase, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.sent();
                    business_type = body.business_type, style_preference = body.style_preference;
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _a.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                    tokenCalc = new token_calculator_1.TokenCalculator(supabaseUrl, supabaseKey);
                    return [4 /*yield*/, tokenCalc.consume({
                            tenant_id: tenantContext.tenantId,
                            action: token_calculator_1.TokenActions.AI_THEME,
                            quantity: 1,
                        })];
                case 3:
                    consumeResult = _a.sent();
                    if (!consumeResult.success) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: consumeResult.error || 'Token 不足' }, { status: 402 })];
                    }
                    theme = generateTheme(business_type, style_preference);
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .update({ theme_config: theme })
                            .eq('id', tenantContext.tenantId)];
                case 4:
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                theme: theme,
                                tokens_consumed: consumeResult.tokens_consumed,
                            },
                        })];
                case 5:
                    error_1 = _a.sent();
                    console.error('Theme generation error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '主题生成失败' }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取当前主题
 * GET /api/ai/theme
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var tenantContext, response, supabase, tenant, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 1:
                    tenantContext = _a.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .select('theme_config')
                            .eq('id', tenantContext.tenantId)
                            .single()];
                case 2:
                    tenant = (_a.sent()).data;
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                theme: (tenant === null || tenant === void 0 ? void 0 : tenant.theme_config) || DEFAULT_THEME,
                            },
                        })];
                case 3:
                    error_2 = _a.sent();
                    console.error('Get theme error:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取主题失败' }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function generateTheme(businessType, stylePreference) {
    // 根据业务类型生成配色
    var colorSchemes = {
        fashion: { primary: '#EC4899', secondary: '#F472B6', accent: '#FBBF24' },
        electronics: { primary: '#2563EB', secondary: '#3B82F6', accent: '#10B981' },
        food: { primary: '#F97316', secondary: '#FB923C', accent: '#EF4444' },
        beauty: { primary: '#DB2777', secondary: '#EC4899', accent: '#FCD34D' },
        default: { primary: '#3B82F6', secondary: '#60A5FA', accent: '#F59E0B' },
    };
    var scheme = businessType
        ? colorSchemes[businessType.toLowerCase()] || colorSchemes.default
        : colorSchemes.default;
    return __assign(__assign({}, DEFAULT_THEME), { primary_color: scheme.primary, secondary_color: scheme.secondary, accent_color: scheme.accent, style: stylePreference || 'modern' });
}
