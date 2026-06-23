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
exports.GET = GET;
// ProClaw Cloud - 单个插件详情 API
// GET /api/plugins/[id] - 返回指定插件的详细信息（含版本历史）
var server_1 = require("next/server");
function GET(_request_1, _a) {
    return __awaiter(this, arguments, void 0, function (_request, _b) {
        var id, mockPluginDetail, plugin;
        var params = _b.params;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, params];
                case 1:
                    id = (_c.sent()).id;
                    try {
                        mockPluginDetail = {
                            catering: {
                                id: 'catering',
                                name: '餐饮行业版',
                                current_version: '1.2.0',
                                status: 'published',
                                description: '面向餐饮行业的智能经营方案',
                                icon: '🍽️',
                                min_app_version: '>=1.0.0',
                                downloads: 1234,
                                features: {
                                    modules: ['pos', 'kitchen-display', 'table-management', 'scan-order', 'reservation'],
                                    dashboards: ['catering-dashboard'],
                                    reports: ['catering-report'],
                                },
                                versions: [
                                    { version: '1.2.0', changelog: '新增扫码点餐功能，优化后厨打印性能', published_at: '2026-05-20' },
                                    { version: '1.1.0', changelog: '新增桌台管理模块', published_at: '2026-05-01' },
                                    { version: '1.0.0', changelog: '首个餐饮行业版发布', published_at: '2026-04-15' },
                                ],
                                published_at: '2026-05-15T00:00:00Z',
                            },
                            retail: {
                                id: 'retail',
                                name: '零售行业版',
                                current_version: '1.1.0',
                                status: 'published',
                                description: '服装、日用等零售行业的进销存管理',
                                icon: '🛍️',
                                min_app_version: '>=1.0.0',
                                downloads: 856,
                                features: {
                                    modules: ['pos', 'membership', 'multi-store-sync', 'mini-program'],
                                    dashboards: ['retail-dashboard'],
                                    reports: ['retail-report'],
                                },
                                versions: [
                                    { version: '1.1.0', changelog: '新增多店库存同步功能', published_at: '2026-05-10' },
                                    { version: '1.0.0', changelog: '首个零售行业版发布', published_at: '2026-04-20' },
                                ],
                                published_at: '2026-05-10T00:00:00Z',
                            },
                        };
                        plugin = mockPluginDetail[id];
                        if (!plugin) {
                            return [2 /*return*/, server_1.NextResponse.json({ success: false, error: "Plugin '".concat(id, "' not found") }, { status: 404 })];
                        }
                        return [2 /*return*/, server_1.NextResponse.json({ success: true, data: plugin })];
                    }
                    catch (error) {
                        console.error("Failed to fetch plugin '".concat(id, "':"), error);
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to fetch plugin details' }, { status: 500 })];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
