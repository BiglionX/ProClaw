"use strict";
// ProClaw Shop - Token 用量 API
// 获取用户 AI 使用量和消费明细
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
var multi_tenant_1 = require("@/lib/multi-tenant");
exports.dynamic = 'force-dynamic';
/**
 * 获取 Token 用量统计和消费明细
 * GET /api/tenant/usage
 */
function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, supabase, tenantContext, _a, profiles, profilesError, userIds, now, todayStart_1, weekStart_1, monthStart_1, _b, records, recordsError, _c, stats, statsError, allRecords, todayUsage, weekUsage, monthUsage, totalUsage, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    response = server_1.NextResponse.next();
                    supabase = (0, supabase_server_1.createRouteSupabaseClient)(request, response);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, (0, multi_tenant_1.getTenantContext)()];
                case 2:
                    tenantContext = _d.sent();
                    if (!tenantContext.tenantId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '未获取到租户信息' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase
                            .from('profiles')
                            .select('id')
                            .eq('tenant_id', tenantContext.tenantId)];
                case 3:
                    _a = _d.sent(), profiles = _a.data, profilesError = _a.error;
                    if (profilesError) {
                        console.error('Get profiles error:', profilesError);
                    }
                    userIds = (profiles === null || profiles === void 0 ? void 0 : profiles.map(function (p) { return p.id; })) || [];
                    // 如果没有用户，返回空数据
                    if (userIds.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: true,
                                data: {
                                    records: [],
                                    summary: { today: 0, week: 0, month: 0, total: 0 },
                                },
                            })];
                    }
                    now = new Date();
                    todayStart_1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                    weekStart_1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    monthStart_1 = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    return [4 /*yield*/, supabase
                            .from('api_usage_logs')
                            .select('id, resource_type, tokens_used, endpoint, created_at')
                            .in('user_id', userIds)
                            .order('created_at', { ascending: false })
                            .limit(50)];
                case 4:
                    _b = _d.sent(), records = _b.data, recordsError = _b.error;
                    if (recordsError) {
                        console.error('Get usage records error:', recordsError);
                    }
                    return [4 /*yield*/, supabase
                            .from('api_usage_logs')
                            .select('tokens_used, created_at')
                            .in('user_id', userIds)];
                case 5:
                    _c = _d.sent(), stats = _c.data, statsError = _c.error;
                    if (statsError) {
                        console.error('Get usage stats error:', statsError);
                    }
                    allRecords = stats || [];
                    todayUsage = allRecords
                        .filter(function (r) { return new Date(r.created_at) >= new Date(todayStart_1); })
                        .reduce(function (sum, r) { return sum + r.tokens_used; }, 0);
                    weekUsage = allRecords
                        .filter(function (r) { return new Date(r.created_at) >= new Date(weekStart_1); })
                        .reduce(function (sum, r) { return sum + r.tokens_used; }, 0);
                    monthUsage = allRecords
                        .filter(function (r) { return new Date(r.created_at) >= new Date(monthStart_1); })
                        .reduce(function (sum, r) { return sum + r.tokens_used; }, 0);
                    totalUsage = allRecords.reduce(function (sum, r) { return sum + r.tokens_used; }, 0);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            data: {
                                records: records || [],
                                summary: {
                                    today: todayUsage,
                                    week: weekUsage,
                                    month: monthUsage,
                                    total: totalUsage,
                                },
                            },
                        })];
                case 6:
                    error_1 = _d.sent();
                    console.error('Get token usage error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: '获取 Token 用量失败' }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
