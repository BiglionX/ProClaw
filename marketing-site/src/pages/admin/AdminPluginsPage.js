"use strict";
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
exports.default = AdminPluginsPage;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var pluginService_1 = require("../../lib/pluginService");
var initialPluginForm = {
    id: '',
    name: '',
    version: '1.0.0',
    description: '',
    icon: '',
    min_app_version: '1.0.0',
    features_modules: '',
    features_dashboards: '',
    features_reports: '',
    nav_add: '[]',
    nav_remove: '',
};
var initialVersionForm = {
    version: '',
    changelog: '',
    package_url: '',
    package_hash: '',
    package_size: 0,
    min_app_version: '1.0.0',
    is_force_update: false,
    rollout_percentage: 100,
};
var STATUS_CHIP_COLORS = {
    draft: 'bg-gray-100 text-gray-700',
    review: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    deprecated: 'bg-red-100 text-red-700',
};
var STATUS_LABELS = {
    draft: '草稿',
    review: '审核中',
    published: '已发布',
    deprecated: '已废弃',
};
function AdminPluginsPage() {
    var _this = this;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var _a = (0, react_1.useState)([]), plugins = _a[0], setPlugins = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(''), search = _c[0], setSearch = _c[1];
    var _d = (0, react_1.useState)('all'), statusFilter = _d[0], setStatusFilter = _d[1];
    var _e = (0, react_1.useState)(null), selectedPlugin = _e[0], setSelectedPlugin = _e[1];
    var _f = (0, react_1.useState)(false), showPluginDialog = _f[0], setShowPluginDialog = _f[1];
    var _g = (0, react_1.useState)(false), showVersionDialog = _g[0], setShowVersionDialog = _g[1];
    var _h = (0, react_1.useState)(false), showManifestDialog = _h[0], setShowManifestDialog = _h[1];
    var _j = (0, react_1.useState)(''), manifestPreview = _j[0], setManifestPreview = _j[1];
    var _k = (0, react_1.useState)(initialPluginForm), pluginForm = _k[0], setPluginForm = _k[1];
    var _l = (0, react_1.useState)(initialVersionForm), versionForm = _l[0], setVersionForm = _l[1];
    var _m = (0, react_1.useState)([]), versions = _m[0], setVersions = _m[1];
    var _o = (0, react_1.useState)(false), saving = _o[0], setSaving = _o[1];
    var _p = (0, react_1.useState)(null), message = _p[0], setMessage = _p[1];
    var loadPlugins = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    return [4 /*yield*/, (0, pluginService_1.getAllPlugins)()];
                case 1:
                    data = _a.sent();
                    setPlugins(data);
                    setLoading(false);
                    return [2 /*return*/];
            }
        });
    }); }, []);
    (0, react_1.useEffect)(function () {
        loadPlugins();
    }, [loadPlugins]);
    var showMessage = function (type, text) {
        setMessage({ type: type, text: text });
        setTimeout(function () { return setMessage(null); }, 3000);
    };
    // --- 插件编辑 ---
    var openNewPlugin = function () {
        setSelectedPlugin(null);
        setPluginForm(initialPluginForm);
        setShowPluginDialog(true);
    };
    var openEditPlugin = function (plugin) { return __awaiter(_this, void 0, void 0, function () {
        var manifest;
        return __generator(this, function (_a) {
            setSelectedPlugin(plugin);
            manifest = (0, pluginService_1.parseManifest)(plugin);
            setPluginForm({
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                description: plugin.description || '',
                icon: plugin.icon || '',
                min_app_version: plugin.min_app_version || '',
                features_modules: (manifest === null || manifest === void 0 ? void 0 : manifest.features.modules.join(', ')) || '',
                features_dashboards: (manifest === null || manifest === void 0 ? void 0 : manifest.features.dashboards.join(', ')) || '',
                features_reports: (manifest === null || manifest === void 0 ? void 0 : manifest.features.reports.join(', ')) || '',
                nav_add: JSON.stringify((manifest === null || manifest === void 0 ? void 0 : manifest.navigation.add) || [], null, 2),
                nav_remove: (manifest === null || manifest === void 0 ? void 0 : manifest.navigation.remove.join(', ')) || '',
            });
            setShowPluginDialog(true);
            return [2 /*return*/];
        });
    }); };
    var buildManifest = function (form) {
        var navAdd = [];
        try {
            navAdd = JSON.parse(form.nav_add || '[]');
        }
        catch (_a) {
            navAdd = [];
        }
        return {
            id: form.id,
            name: form.name,
            version: form.version,
            description: form.description,
            icon: form.icon,
            compatibleAppVersion: form.min_app_version || '1.0.0',
            features: {
                modules: form.features_modules.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
                dashboards: form.features_dashboards.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
                reports: form.features_reports.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
            },
            navigation: {
                add: navAdd,
                remove: form.nav_remove.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
            },
            ui: {},
            assets: { path: '', files: [] },
        };
    };
    var handleSavePlugin = function () { return __awaiter(_this, void 0, void 0, function () {
        var manifest, manifestStr, result, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!pluginForm.id.trim() || !pluginForm.name.trim()) {
                        showMessage('error', '插件 ID 和名称不能为空');
                        return [2 /*return*/];
                    }
                    setSaving(true);
                    manifest = buildManifest(pluginForm);
                    manifestStr = JSON.stringify(manifest, null, 2);
                    if (!selectedPlugin) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, pluginService_1.updatePlugin)(selectedPlugin.id, {
                            name: pluginForm.name,
                            version: pluginForm.version,
                            manifest_json: manifestStr,
                            icon: pluginForm.icon || undefined,
                            description: pluginForm.description || undefined,
                            min_app_version: pluginForm.min_app_version || undefined,
                        })];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        showMessage('success', '插件更新成功');
                        setShowPluginDialog(false);
                        loadPlugins();
                    }
                    else {
                        showMessage('error', result.error || '更新失败');
                    }
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (0, pluginService_1.createPlugin)({
                        id: pluginForm.id,
                        name: pluginForm.name,
                        version: pluginForm.version,
                        manifest_json: manifestStr,
                        icon: pluginForm.icon || undefined,
                        description: pluginForm.description || undefined,
                        min_app_version: pluginForm.min_app_version || undefined,
                    })];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        showMessage('success', '插件创建成功');
                        setShowPluginDialog(false);
                        loadPlugins();
                    }
                    else {
                        showMessage('error', result.error || '创建失败');
                    }
                    _a.label = 4;
                case 4:
                    setSaving(false);
                    return [2 /*return*/];
            }
        });
    }); };
    var handlePublish = function (plugin) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!window.confirm("\u786E\u8BA4\u53D1\u5E03\u63D2\u4EF6\u300C".concat(plugin.name, "\u300D\uFF1F")))
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, pluginService_1.publishPlugin)(plugin.id)];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        showMessage('success', '插件已发布');
                        loadPlugins();
                    }
                    else {
                        showMessage('error', result.error || '发布失败');
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var handleUnpublish = function (plugin) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!window.confirm("\u786E\u8BA4\u4E0B\u67B6\u63D2\u4EF6\u300C".concat(plugin.name, "\u300D\uFF1F")))
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, pluginService_1.unpublishPlugin)(plugin.id)];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        showMessage('success', '插件已下架');
                        loadPlugins();
                    }
                    else {
                        showMessage('error', result.error || '下架失败');
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var handleDeprecate = function (plugin) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!window.confirm("\u786E\u8BA4\u5E9F\u5F03\u63D2\u4EF6\u300C".concat(plugin.name, "\u300D\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u9006\u3002")))
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, pluginService_1.deprecatePlugin)(plugin.id)];
                case 1:
                    result = _a.sent();
                    if (result.success) {
                        showMessage('success', '插件已废弃');
                        loadPlugins();
                    }
                    else {
                        showMessage('error', result.error || '废弃失败');
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var previewManifest = function (plugin) {
        try {
            var parsed = JSON.parse(plugin.manifest_json);
            setManifestPreview(JSON.stringify(parsed, null, 2));
        }
        catch (_a) {
            setManifestPreview(plugin.manifest_json);
        }
        setShowManifestDialog(true);
    };
    // --- 版本管理 ---
    var openVersionDialog = function (plugin) { return __awaiter(_this, void 0, void 0, function () {
        var v;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setSelectedPlugin(plugin);
                    setVersionForm(__assign(__assign({}, initialVersionForm), { version: plugin.version, min_app_version: plugin.min_app_version || '1.0.0' }));
                    return [4 /*yield*/, (0, pluginService_1.getPluginVersions)(plugin.id)];
                case 1:
                    v = _a.sent();
                    setVersions(v);
                    setShowVersionDialog(true);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleSaveVersion = function () { return __awaiter(_this, void 0, void 0, function () {
        var vid, result, v;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!versionForm.version.trim() || !versionForm.package_url.trim()) {
                        showMessage('error', '版本号和包下载地址不能为空');
                        return [2 /*return*/];
                    }
                    if (!selectedPlugin)
                        return [2 /*return*/];
                    setSaving(true);
                    vid = "".concat(selectedPlugin.id, "-v").concat(versionForm.version, "-").concat(Date.now());
                    return [4 /*yield*/, (0, pluginService_1.createPluginVersion)({
                            id: vid,
                            plugin_id: selectedPlugin.id,
                            version: versionForm.version,
                            changelog: versionForm.changelog || undefined,
                            package_url: versionForm.package_url,
                            package_hash: versionForm.package_hash,
                            package_size: versionForm.package_size,
                            min_app_version: versionForm.min_app_version || undefined,
                            is_force_update: versionForm.is_force_update,
                            rollout_percentage: versionForm.rollout_percentage,
                        })];
                case 1:
                    result = _a.sent();
                    if (!result.success) return [3 /*break*/, 3];
                    showMessage('success', '版本发布成功');
                    return [4 /*yield*/, (0, pluginService_1.getPluginVersions)(selectedPlugin.id)];
                case 2:
                    v = _a.sent();
                    setVersions(v);
                    loadPlugins();
                    return [3 /*break*/, 4];
                case 3:
                    showMessage('error', result.error || '版本发布失败');
                    _a.label = 4;
                case 4:
                    setSaving(false);
                    return [2 /*return*/];
            }
        });
    }); };
    // --- 过滤 ---
    var filteredPlugins = plugins.filter(function (p) {
        if (statusFilter !== 'all' && p.status !== statusFilter)
            return false;
        if (search) {
            var q = search.toLowerCase();
            return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
        }
        return true;
    });
    // --- 渲染 ---
    return (<div className="min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <button onClick={function () { return navigate('/admin'); }} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              &larr; 返回 Admin
            </button>
            <h1 className="text-2xl font-bold text-gray-900">行业插件管理</h1>
          </div>
          <button onClick={openNewPlugin} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + 发布新插件
          </button>
        </div>
      </div>

      {/* 提示消息 */}
      {message && (<div className={"max-w-7xl mx-auto mt-4 px-6"}>
          <div className={"px-4 py-3 rounded-lg text-sm ".concat(message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200')}>
            {message.text}
          </div>
        </div>)}

      {/* 过滤栏 */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <input type="text" placeholder="搜索插件 ID 或名称..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <div className="flex gap-1">
            {['all', 'draft', 'review', 'published', 'deprecated'].map(function (s) { return (<button key={s} onClick={function () { return setStatusFilter(s); }} className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all ".concat(statusFilter === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {s === 'all' ? '全部' : STATUS_LABELS[s]}
              </button>); })}
          </div>
        </div>
      </div>

      {/* 插件表格 */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (<div className="text-center py-16 text-gray-400">加载中...</div>) : filteredPlugins.length === 0 ? (<div className="text-center py-16 text-gray-400">
            {plugins.length === 0 ? '暂无插件数据，点击"+ 发布新插件"开始' : '没有匹配的插件'}
          </div>) : (<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">版本</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">下载量</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">活跃安装</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlugins.map(function (plugin) { return (<tr key={plugin.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{plugin.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{plugin.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">v{plugin.version}</td>
                    <td className="px-4 py-3">
                      <span className={"inline-block px-2 py-0.5 rounded-full text-xs font-medium ".concat(STATUS_CHIP_COLORS[plugin.status])}>
                        {STATUS_LABELS[plugin.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{plugin.downloads}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{plugin.active_installs}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={function () { return openEditPlugin(plugin); }} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
                          编辑
                        </button>
                        {plugin.status === 'draft' || plugin.status === 'review' ? (<button onClick={function () { return handlePublish(plugin); }} className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded">
                            发布
                          </button>) : null}
                        {plugin.status === 'published' ? (<button onClick={function () { return handleUnpublish(plugin); }} className="px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-50 rounded">
                            下架
                          </button>) : null}
                        <button onClick={function () { return openVersionDialog(plugin); }} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded">
                          版本
                        </button>
                        <button onClick={function () { return previewManifest(plugin); }} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
                          Manifest
                        </button>
                        {plugin.status !== 'deprecated' ? (<button onClick={function () { return handleDeprecate(plugin); }} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
                            废弃
                          </button>) : null}
                      </div>
                    </td>
                  </tr>); })}
              </tbody>
            </table>
          </div>)}
      </div>

      {/* ========== 插件编辑对话框 ========== */}
      {showPluginDialog && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return setShowPluginDialog(false); }}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-y-auto" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedPlugin ? "\u7F16\u8F91\u63D2\u4EF6 - ".concat(selectedPlugin.name, " (").concat(selectedPlugin.id, ")") : '发布新插件'}
              </h2>
              <button onClick={function () { return setShowPluginDialog(false); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">插件 ID</label>
                  <input type="text" value={pluginForm.id} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { id: e.target.value })); }} disabled={!!selectedPlugin} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" placeholder="如: catering"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input type="text" value={pluginForm.name} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { name: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如: 餐饮行业版"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                  <input type="text" value={pluginForm.version} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { version: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.0.0"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低兼容桌面端版本</label>
                  <input type="text" value={pluginForm.min_app_version} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { min_app_version: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.0.0"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={pluginForm.description} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { description: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="面向餐饮行业的经营管理系统..."/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标 URL</label>
                <input type="text" value={pluginForm.icon} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { icon: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="图标 URL 或 emoji"/>
              </div>

              <hr className="border-gray-200"/>

              {/* 功能开关 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">功能模块</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['pos', 'kitchen-display', 'reservation', 'scan-order', 'delivery', 'membership', 'inventory', 'reports'].map(function (mod) {
                var enabled = pluginForm.features_modules.includes(mod);
                return (<label key={mod} className="flex items-center gap-2 text-sm text-gray-600">
                          <input type="checkbox" checked={enabled} onChange={function () {
                        var list = pluginForm.features_modules
                            .split(',')
                            .map(function (s) { return s.trim(); })
                            .filter(Boolean);
                        var updated = enabled
                            ? list.filter(function (m) { return m !== mod; })
                            : __spreadArray(__spreadArray([], list, true), [mod], false);
                        setPluginForm(__assign(__assign({}, pluginForm), { features_modules: updated.join(', ') }));
                    }} className="rounded"/>
                          {mod}
                        </label>);
            })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">仪表板组件 (逗号分隔)</label>
                  <input type="text" value={pluginForm.features_dashboards} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { features_dashboards: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="sales-dashboard, inventory-dashboard"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">报表 (逗号分隔)</label>
                  <input type="text" value={pluginForm.features_reports} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { features_reports: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="sales-report, inventory-report"/>
                </div>
              </div>

              <hr className="border-gray-200"/>

              {/* 导航定制 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新增导航项 (JSON)</label>
                <textarea value={pluginForm.nav_add} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { nav_add: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder='[{"text":"收银台","icon":"point-of-sale","path":"/pos"}]'/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">隐藏默认项 (逗号分隔路径)</label>
                <input type="text" value={pluginForm.nav_remove} onChange={function (e) { return setPluginForm(__assign(__assign({}, pluginForm), { nav_remove: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="/supplychain, /datacenter"/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={function () { return setShowPluginDialog(false); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button onClick={handleSavePlugin} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : selectedPlugin ? '保存修改' : '创建插件'}
              </button>
            </div>
          </div>
        </div>)}

      {/* ========== 版本管理对话框 ========== */}
      {showVersionDialog && selectedPlugin && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return setShowVersionDialog(false); }}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-y-auto" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                版本管理 - {selectedPlugin.name} (v{selectedPlugin.version})
              </h2>
              <button onClick={function () { return setShowVersionDialog(false); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">发布新版本</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                  <input type="text" value={versionForm.version} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { version: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.1.0"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低兼容版本</label>
                  <input type="text" value={versionForm.min_app_version} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { min_app_version: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.0.0"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">包下载地址</label>
                <input type="text" value={versionForm.package_url} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { package_url: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://storage.example.com/plugins/catering-v1.1.plugin"/>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SHA256</label>
                  <input type="text" value={versionForm.package_hash} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { package_hash: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">大小 (字节)</label>
                  <input type="number" value={versionForm.package_size} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { package_size: parseInt(e.target.value) || 0 })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">灰度比例 (%)</label>
                  <input type="number" value={versionForm.rollout_percentage} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { rollout_percentage: parseInt(e.target.value) || 100 })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min={0} max={100}/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Changelog</label>
                <textarea value={versionForm.changelog} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { changelog: e.target.value })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="修复了...\n新增了...\n优化了..."/>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={versionForm.is_force_update} onChange={function (e) { return setVersionForm(__assign(__assign({}, versionForm), { is_force_update: e.target.checked })); }} className="rounded"/>
                强制更新（安全修复必须勾选）
              </label>

              <button onClick={handleSaveVersion} disabled={saving} className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? '发布中...' : '发布新版本'}
              </button>

              {/* 版本历史 */}
              {versions.length > 0 && (<>
                  <hr className="border-gray-200"/>
                  <h3 className="text-sm font-semibold text-gray-700">版本历史</h3>
                  <div className="space-y-2">
                    {versions.map(function (v) { return (<div key={v.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">v{v.version}</span>
                          <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleDateString()}</span>
                        </div>
                        {v.changelog && (<p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{v.changelog}</p>)}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>灰度: {v.rollout_percentage}%</span>
                          <span>{v.is_force_update ? '强制更新' : '可选更新'}</span>
                          <span>{v.package_size ? "".concat((v.package_size / 1024).toFixed(1), " KB") : ''}</span>
                        </div>
                      </div>); })}
                  </div>
                </>)}
            </div>
          </div>
        </div>)}

      {/* ========== Manifest 预览对话框 ========== */}
      {showManifestDialog && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={function () { return setShowManifestDialog(false); }}>
          <div className="bg-white rounded-2xl w-[640px] max-h-[80vh] overflow-y-auto" onClick={function (e) { return e.stopPropagation(); }}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Manifest 预览</h2>
              <button onClick={function () { return setShowManifestDialog(false); }} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <pre className="px-6 py-4 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {manifestPreview}
            </pre>
          </div>
        </div>)}
    </div>);
}
