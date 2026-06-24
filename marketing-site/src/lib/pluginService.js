"use strict";
// 行业插件服务 (营销网站 Vite)
// 封装 Supabase 插件相关操作
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
exports.getPluginStats = getPluginStats;
exports.getPluginReviews = getPluginReviews;
exports.getPluginRatingSummary = getPluginRatingSummary;
exports.submitPluginReview = submitPluginReview;
exports.submitThirdPartyPlugin = submitThirdPartyPlugin;
exports.getPublishedPlugins = getPublishedPlugins;
exports.getPluginById = getPluginById;
exports.getAllPlugins = getAllPlugins;
exports.parseManifest = parseManifest;
exports.getPluginVersions = getPluginVersions;
exports.createPlugin = createPlugin;
exports.updatePlugin = updatePlugin;
exports.deprecatePlugin = deprecatePlugin;
exports.publishPlugin = publishPlugin;
exports.unpublishPlugin = unpublishPlugin;
exports.createPluginVersion = createPluginVersion;
exports.recordPluginDownload = recordPluginDownload;
exports.getPluginDownloadTrend = getPluginDownloadTrend;
exports.getActiveIndustryDistribution = getActiveIndustryDistribution;
exports.getRecentPluginReleases = getRecentPluginReleases;
var supabase_1 = require("./supabase");
/**
 * 获取插件统计数据
 */
function getPluginStats(pluginId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, ratingData, reviews, avg, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('id, downloads, active_installs')
                            .eq('id', pluginId)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_reviews')
                            .select('rating', { count: 'exact' })
                            .eq('plugin_id', pluginId)];
                case 2:
                    ratingData = (_b.sent()).data;
                    reviews = (ratingData || []).length;
                    avg = ratingData && ratingData.length > 0
                        ? ratingData.reduce(function (sum, r) { return sum + r.rating; }, 0) / ratingData.length
                        : 0;
                    return [2 /*return*/, {
                            plugin_id: data.id,
                            total_downloads: data.downloads || 0,
                            active_installs: data.active_installs || 0,
                            total_reviews: reviews,
                            average_rating: Math.round(avg * 10) / 10,
                            recent_downloads_30d: 0,
                        }];
                case 3:
                    error_1 = _b.sent();
                    console.error("\u83B7\u53D6\u63D2\u4EF6 ".concat(pluginId, " \u7EDF\u8BA1\u6570\u636E\u5931\u8D25:"), error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 社区评分/评价系统
// ==========================================================
/**
 * 获取插件评价列表
 */
function getPluginReviews(pluginId_1) {
    return __awaiter(this, arguments, void 0, function (pluginId, limit) {
        var _a, data, error, error_2;
        if (limit === void 0) { limit = 20; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_reviews')
                            .select("\n        *,\n        profiles:user_id (full_name, avatar_url)\n      ")
                            .eq('plugin_id', pluginId)
                            .order('created_at', { ascending: false })
                            .limit(limit)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, (data || []).map(function (r) {
                            var _a, _b;
                            return (__assign(__assign({}, r), { user_name: (_a = r.profiles) === null || _a === void 0 ? void 0 : _a.full_name, user_avatar: (_b = r.profiles) === null || _b === void 0 ? void 0 : _b.avatar_url }));
                        })];
                case 2:
                    error_2 = _b.sent();
                    console.error("\u83B7\u53D6\u63D2\u4EF6 ".concat(pluginId, " \u8BC4\u4EF7\u5931\u8D25:"), error_2);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取插件评分汇总
 */
function getPluginRatingSummary(pluginId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, distribution, _i, _b, r, count, average, error_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_reviews')
                            .select('rating')
                            .eq('plugin_id', pluginId)];
                case 1:
                    _a = _c.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    for (_i = 0, _b = data || []; _i < _b.length; _i++) {
                        r = _b[_i];
                        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
                    }
                    count = (data || []).length;
                    average = count > 0
                        ? Math.round((data.reduce(function (sum, r) { return sum + r.rating; }, 0) / count) * 10) / 10
                        : 0;
                    return [2 /*return*/, {
                            plugin_id: pluginId,
                            average: average,
                            count: count,
                            distribution: distribution,
                        }];
                case 2:
                    error_3 = _c.sent();
                    console.error("\u83B7\u53D6\u63D2\u4EF6 ".concat(pluginId, " \u8BC4\u5206\u6C47\u603B\u5931\u8D25:"), error_3);
                    return [2 /*return*/, { plugin_id: pluginId, average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 提交插件评价
 */
function submitPluginReview(review) {
    return __awaiter(this, void 0, void 0, function () {
        var existing, updateError, insertError, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_reviews')
                            .select('id')
                            .eq('plugin_id', review.plugin_id)
                            .eq('user_id', review.user_id)
                            .single()];
                case 1:
                    existing = (_a.sent()).data;
                    if (!existing) return [3 /*break*/, 3];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_reviews')
                            .update({
                            rating: review.rating,
                            title: review.title || null,
                            content: review.content || null,
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', existing.id)];
                case 2:
                    updateError = (_a.sent()).error;
                    if (updateError)
                        throw updateError;
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, supabase_1.supabase
                        .from('plugin_reviews')
                        .insert({
                        id: crypto.randomUUID ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2)),
                        plugin_id: review.plugin_id,
                        user_id: review.user_id,
                        rating: review.rating,
                        title: review.title || null,
                        content: review.content || null,
                        is_verified: false,
                    })];
                case 4:
                    insertError = (_a.sent()).error;
                    if (insertError)
                        throw insertError;
                    _a.label = 5;
                case 5: return [2 /*return*/, { success: true }];
                case 6:
                    error_4 = _a.sent();
                    console.error('提交插件评价失败:', error_4);
                    return [2 /*return*/, { success: false, error: error_4.message || '提交评价失败' }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 第三方插件提交审核
// ==========================================================
/**
 * 第三方开发者提交插件审核
 */
function submitThirdPartyPlugin(data) {
    return __awaiter(this, void 0, void 0, function () {
        var createResult, versionId, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, createPlugin({
                            id: data.manifest.id,
                            name: data.manifest.name,
                            version: data.manifest.version,
                            manifest_json: JSON.stringify(data.manifest),
                            icon: data.manifest.icon,
                            description: data.manifest.description,
                            min_app_version: data.manifest.compatibleAppVersion,
                        })];
                case 1:
                    createResult = _a.sent();
                    if (!createResult.success) {
                        return [2 /*return*/, createResult];
                    }
                    versionId = "".concat(data.manifest.id, "-v").concat(data.manifest.version, "-").concat(Date.now());
                    return [4 /*yield*/, createPluginVersion({
                            id: versionId,
                            plugin_id: data.manifest.id,
                            version: data.manifest.version,
                            package_url: data.package_url,
                            package_hash: data.package_hash || '',
                            package_size: 0,
                            min_app_version: data.manifest.compatibleAppVersion,
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    error_5 = _a.sent();
                    console.error('提交第三方插件失败:', error_5);
                    return [2 /*return*/, { success: false, error: error_5.message || '提交失败' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 插件列表与查询
// ==========================================================
/**
 * 获取已发布的插件列表（公开）
 */
function getPublishedPlugins() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('*')
                            .eq('status', 'published')
                            .order('downloads', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_6 = _b.sent();
                    console.error('获取已发布插件列表失败:', error_6);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取指定插件详情
 */
function getPluginById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_7;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('*')
                            .eq('id', id)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data];
                case 2:
                    error_7 = _b.sent();
                    console.error("\u83B7\u53D6\u63D2\u4EF6 ".concat(id, " \u5931\u8D25:"), error_7);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取所有插件（Admin 用，含所有状态）
 */
function getAllPlugins() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_8;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('*')
                            .order('created_at', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_8 = _b.sent();
                    console.error('获取全部插件列表失败:', error_8);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 解析 manifest_json 字段为对象
 */
function parseManifest(plugin) {
    try {
        return JSON.parse(plugin.manifest_json);
    }
    catch (_a) {
        return null;
    }
}
// ==========================================================
// 插件版本管理
// ==========================================================
/**
 * 获取指定插件的版本历史
 */
function getPluginVersions(pluginId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, error_9;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_versions')
                            .select('*')
                            .eq('plugin_id', pluginId)
                            .order('created_at', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_9 = _b.sent();
                    console.error("\u83B7\u53D6\u63D2\u4EF6 ".concat(pluginId, " \u7248\u672C\u5386\u53F2\u5931\u8D25:"), error_9);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 插件 CRUD（Admin 用）
// ==========================================================
/**
 * 创建新插件
 */
function createPlugin(plugin) {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase.from('industry_plugins').insert({
                            id: plugin.id,
                            name: plugin.name,
                            version: plugin.version,
                            status: 'draft',
                            manifest_json: plugin.manifest_json,
                            icon: plugin.icon || null,
                            description: plugin.description || null,
                            min_app_version: plugin.min_app_version || null,
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, { success: true }];
                case 2:
                    error_10 = _a.sent();
                    console.error('创建插件失败:', error_10);
                    return [2 /*return*/, { success: false, error: error_10.message || '创建失败' }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 更新插件信息
 */
function updatePlugin(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .update(__assign(__assign(__assign({}, updates), { updated_at: new Date().toISOString() }), (updates.status === 'published' ? { published_at: new Date().toISOString() } : {})))
                            .eq('id', id)];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    return [2 /*return*/, { success: true }];
                case 2:
                    error_11 = _a.sent();
                    console.error("\u66F4\u65B0\u63D2\u4EF6 ".concat(id, " \u5931\u8D25:"), error_11);
                    return [2 /*return*/, { success: false, error: error_11.message || '更新失败' }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 删除插件（软删除，标记为 deprecated）
 */
function deprecatePlugin(id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, updatePlugin(id, { status: 'deprecated' })];
        });
    });
}
/**
 * 发布插件
 */
function publishPlugin(id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, updatePlugin(id, { status: 'published' })];
        });
    });
}
/**
 * 下架插件
 */
function unpublishPlugin(id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, updatePlugin(id, { status: 'draft' })];
        });
    });
}
// ==========================================================
// 版本发布管理
// ==========================================================
/**
 * 创建新版本发布记录
 */
function createPluginVersion(version) {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_12;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, supabase_1.supabase.from('plugin_versions').insert({
                            id: version.id,
                            plugin_id: version.plugin_id,
                            version: version.version,
                            changelog: version.changelog || null,
                            package_url: version.package_url,
                            package_hash: version.package_hash,
                            package_size: version.package_size,
                            min_app_version: version.min_app_version || null,
                            is_force_update: (_a = version.is_force_update) !== null && _a !== void 0 ? _a : false,
                            rollout_percentage: (_b = version.rollout_percentage) !== null && _b !== void 0 ? _b : 100,
                        })];
                case 1:
                    error = (_c.sent()).error;
                    if (error)
                        throw error;
                    // 同时更新 industry_plugins 的当前版本
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .update({
                            version: version.version,
                            package_url: version.package_url,
                            package_hash: version.package_hash,
                            package_size: version.package_size,
                            min_app_version: version.min_app_version || null,
                            updated_at: new Date().toISOString(),
                        })
                            .eq('id', version.plugin_id)];
                case 2:
                    // 同时更新 industry_plugins 的当前版本
                    _c.sent();
                    return [2 /*return*/, { success: true }];
                case 3:
                    error_12 = _c.sent();
                    console.error('创建插件版本失败:', error_12);
                    return [2 /*return*/, { success: false, error: error_12.message || '创建版本失败' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 下载统计
// ==========================================================
/**
 * 获取匿名安装 ID（localStorage 持久化）
 */
function getInstallId() {
    var key = 'proclaw-install-id';
    var id = localStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2));
        localStorage.setItem(key, id);
    }
    return id;
}
/**
 * 记录插件下载事件
 */
function recordPluginDownload(pluginId, appVersion, os) {
    return __awaiter(this, void 0, void 0, function () {
        var installId, error_13;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    installId = getInstallId();
                    return [4 /*yield*/, supabase_1.supabase.from('plugin_installs').insert({
                            id: crypto.randomUUID ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2)),
                            plugin_id: pluginId,
                            app_version: appVersion || null,
                            os: os || null,
                            install_id: installId,
                            action: 'install',
                        })];
                case 1:
                    _a.sent();
                    // 增加总下载量
                    return [4 /*yield*/, supabase_1.supabase.rpc('increment_plugin_downloads', { p_plugin_id: pluginId })];
                case 2:
                    // 增加总下载量
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_13 = _a.sent();
                    console.error('记录插件下载失败:', error_13);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ==========================================================
// 统计查询（Admin 用）
// ==========================================================
/**
 * 获取插件下载趋势（过去 N 天）
 */
function getPluginDownloadTrend() {
    return __awaiter(this, arguments, void 0, function (days) {
        var since, _a, data, error, agg, _i, _b, row, date, result, _c, _d, _e, date, plugins, _f, _g, _h, plugin_id, count, error_14;
        var _j;
        if (days === void 0) { days = 30; }
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    _k.trys.push([0, 2, , 3]);
                    since = new Date();
                    since.setDate(since.getDate() - days);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('plugin_installs')
                            .select('plugin_id, created_at')
                            .gte('created_at', since.toISOString())
                            .order('created_at', { ascending: true })];
                case 1:
                    _a = _k.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    agg = {};
                    for (_i = 0, _b = data || []; _i < _b.length; _i++) {
                        row = _b[_i];
                        date = ((_j = row.created_at) === null || _j === void 0 ? void 0 : _j.slice(0, 10)) || 'unknown';
                        if (!agg[date])
                            agg[date] = {};
                        agg[date][row.plugin_id] = (agg[date][row.plugin_id] || 0) + 1;
                    }
                    result = [];
                    for (_c = 0, _d = Object.entries(agg); _c < _d.length; _c++) {
                        _e = _d[_c], date = _e[0], plugins = _e[1];
                        for (_f = 0, _g = Object.entries(plugins); _f < _g.length; _f++) {
                            _h = _g[_f], plugin_id = _h[0], count = _h[1];
                            result.push({ date: date, plugin_id: plugin_id, count: count });
                        }
                    }
                    return [2 /*return*/, result];
                case 2:
                    error_14 = _k.sent();
                    console.error('获取插件下载趋势失败:', error_14);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取活跃行业分布
 */
function getActiveIndustryDistribution() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, plugins, error, error_15;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('id, name, active_installs')];
                case 1:
                    _a = _b.sent(), plugins = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, (plugins || []).map(function (p) { return ({
                            plugin_id: p.id,
                            name: p.name,
                            installs: p.active_installs || 0,
                        }); })];
                case 2:
                    error_15 = _b.sent();
                    console.error('获取行业分布失败:', error_15);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * 获取最近发布的插件动态
 */
function getRecentPluginReleases() {
    return __awaiter(this, arguments, void 0, function (limit) {
        var _a, data, error, error_16;
        if (limit === void 0) { limit = 5; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('industry_plugins')
                            .select('*')
                            .eq('status', 'published')
                            .order('published_at', { ascending: false })
                            .limit(limit)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    return [2 /*return*/, data || []];
                case 2:
                    error_16 = _b.sent();
                    console.error('获取最近插件发布失败:', error_16);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
