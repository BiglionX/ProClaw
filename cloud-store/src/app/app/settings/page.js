// ProClaw Cloud 托管版 - 设置页面
'use client';
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
exports.default = SettingsPage;
var react_1 = require("react");
var auth_store_1 = require("@/lib/auth-store");
var utils_1 = require("@/lib/utils");
var export_1 = require("@/lib/export");
var react_hot_toast_1 = require("react-hot-toast");
function SettingsPage() {
    var _this = this;
    var _a = (0, auth_store_1.useAuthStore)(), user = _a.user, logout = _a.logout;
    var _b = (0, react_1.useState)('account'), activeSection = _b[0], setActiveSection = _b[1];
    // 导出状态
    var _c = (0, react_1.useState)('json'), exportFormat = _c[0], setExportFormat = _c[1];
    var _d = (0, react_1.useState)(''), selectedPreset = _d[0], setSelectedPreset = _d[1];
    var _e = (0, react_1.useState)(false), exporting = _e[0], setExporting = _e[1];
    // 自定义模板状态
    var _f = (0, react_1.useState)(false), customMode = _f[0], setCustomMode = _f[1];
    var _g = (0, react_1.useState)(''), customName = _g[0], setCustomName = _g[1];
    var _h = (0, react_1.useState)([]), selectedTables = _h[0], setSelectedTables = _h[1];
    var _j = (0, react_1.useState)(''), selectingTable = _j[0], setSelectingTable = _j[1];
    var handleExport = function () { return __awaiter(_this, void 0, void 0, function () {
        var templateId, customTables, name, res, result, blob, url, a, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (exporting)
                        return [2 /*return*/];
                    if (customMode) {
                        if (!customName.trim()) {
                            react_hot_toast_1.default.error('请输入自定义模板名称');
                            return [2 /*return*/];
                        }
                        if (selectedTables.length === 0) {
                            react_hot_toast_1.default.error('请至少选择一个数据表');
                            return [2 /*return*/];
                        }
                        templateId = 'custom';
                        customTables = selectedTables;
                        name = customName.trim();
                    }
                    else {
                        if (!selectedPreset) {
                            react_hot_toast_1.default.error('请选择一个预设模板');
                            return [2 /*return*/];
                        }
                        templateId = selectedPreset;
                        name = ((_b = export_1.PRESET_TEMPLATES.find(function (t) { return t.id === selectedPreset; })) === null || _b === void 0 ? void 0 : _b.name) || '数据';
                    }
                    setExporting(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/export', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                templateId: templateId,
                                format: exportFormat,
                                customTables: customTables,
                                customName: customMode ? customName.trim() : undefined,
                            }),
                        })];
                case 2:
                    res = _c.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result = _c.sent();
                    if (!res.ok) {
                        if (res.status === 402) {
                            react_hot_toast_1.default.error(result.error || 'Token 余额不足');
                        }
                        else {
                            react_hot_toast_1.default.error(result.error || '导出失败');
                        }
                        setExporting(false);
                        return [2 /*return*/];
                    }
                    if (result.success && result.data) {
                        blob = new Blob([result.data], {
                            type: exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
                        });
                        url = URL.createObjectURL(blob);
                        a = document.createElement('a');
                        a.href = url;
                        a.download = result.fileName || (0, export_1.generateExportFileName)(name, exportFormat);
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        react_hot_toast_1.default.success("\u5BFC\u51FA\u6210\u529F\uFF01\u5171 ".concat(result.totalRecords || 0, " \u6761\u8BB0\u5F55"));
                    }
                    else {
                        react_hot_toast_1.default.error(result.error || '导出失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _c.sent();
                    react_hot_toast_1.default.error('导出请求失败，请检查网络');
                    return [3 /*break*/, 6];
                case 5:
                    setExporting(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var addTableToCustom = function () {
        if (!selectingTable)
            return;
        var found = export_1.ALL_AVAILABLE_TABLES.find(function (t) { return t.tableName === selectingTable; });
        if (found && !selectedTables.find(function (t) { return t.tableName === selectingTable; })) {
            setSelectedTables(__spreadArray(__spreadArray([], selectedTables, true), [__assign(__assign({}, found), { fields: __spreadArray([], found.fields, true) })], false));
        }
        setSelectingTable('');
    };
    var removeTableFromCustom = function (tableName) {
        setSelectedTables(selectedTables.filter(function (t) { return t.tableName !== tableName; }));
    };
    var toggleFieldInCustom = function (tableName, key) {
        setSelectedTables(selectedTables.map(function (t) {
            var _a;
            if (t.tableName !== tableName)
                return t;
            var exists = t.fields.find(function (f) { return f.key === key; });
            return __assign(__assign({}, t), { fields: exists
                    ? t.fields.filter(function (f) { return f.key !== key; })
                    : __spreadArray(__spreadArray([], t.fields, true), [(_a = export_1.ALL_AVAILABLE_TABLES.find(function (at) { return at.tableName === tableName; })) === null || _a === void 0 ? void 0 : _a.fields.find(function (f) { return f.key === key; })], false).filter(Boolean) });
        }));
    };
    var sections = [
        { key: 'account', label: '账户信息' },
        { key: 'export', label: '数据导出' },
    ];
    return (<div className="max-w-4xl mx-auto space-y-6">
      <react_hot_toast_1.Toaster position="top-center"/>
      <h1 className="text-2xl font-bold text-gray-900">设置</h1>

      {/* 分段导航 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {sections.map(function (sec) { return (<button key={sec.key} onClick={function () { return setActiveSection(sec.key); }} className={"flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ".concat(activeSection === sec.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900')}>
            {sec.label}
          </button>); })}
      </div>

      {/* 账户信息 */}
      {activeSection === 'account' && (<>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">账户信息</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">邮箱</span>
                <span className="text-gray-900">{(user === null || user === void 0 ? void 0 : user.email) || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">用户 ID</span>
                <span className="text-gray-900 text-sm">{(user === null || user === void 0 ? void 0 : user.id) || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">注册时间</span>
                <span className="text-gray-900">
                  {(user === null || user === void 0 ? void 0 : user.created_at) ? (0, utils_1.formatDate)(user.created_at, 'long') : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">操作</h2>
            <div className="space-y-3">
              <button onClick={logout} className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-left">
                退出登录
              </button>
            </div>
          </div>
        </>)}

      {/* 数据导出 */}
      {activeSection === 'export' && (<div className="space-y-4">
          {/* 模式切换 */}
          <div className="flex gap-2">
            <button onClick={function () { setCustomMode(false); setSelectedPreset(''); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors ".concat(!customMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              预设模板
            </button>
            <button onClick={function () { setCustomMode(true); setSelectedPreset(''); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors ".concat(customMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              自定义模板
            </button>
          </div>

          {/* 预设模板选择 */}
          {!customMode && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">选择导出模板</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {export_1.PRESET_TEMPLATES.map(function (tpl) { return (<button key={tpl.id} onClick={function () { return setSelectedPreset(tpl.id); }} className={"p-4 rounded-lg border text-left transition-colors ".concat(selectedPreset === tpl.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50')}>
                    <div className="font-medium text-gray-900">{tpl.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{tpl.description}</div>
                    <div className="text-xs text-gray-400 mt-2">{tpl.tables.length} 个数据表</div>
                  </button>); })}
              </div>
            </div>)}

          {/* 自定义模板编辑器 */}
          {customMode && (<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold">自定义导出模板</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input type="text" value={customName} onChange={function (e) { return setCustomName(e.target.value); }} placeholder="例如：我的库存报告" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择数据表</label>
                <div className="flex gap-2">
                  <select value={selectingTable} onChange={function (e) { return setSelectingTable(e.target.value); }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- 请选择数据表 --</option>
                    {export_1.ALL_AVAILABLE_TABLES.map(function (t) { return (<option key={t.tableName} value={t.tableName}>{t.label}</option>); })}
                  </select>
                  <button onClick={addTableToCustom} disabled={!selectingTable} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    添加
                  </button>
                </div>
              </div>

              {/* 已选数据表及字段 */}
              {selectedTables.length === 0 ? (<p className="text-sm text-gray-400 text-center py-4">尚未选择任何数据表</p>) : (<div className="space-y-3">
                  {selectedTables.map(function (table) {
                        var _a, _b;
                        var allFields = ((_a = export_1.ALL_AVAILABLE_TABLES.find(function (t) { return t.tableName === table.tableName; })) === null || _a === void 0 ? void 0 : _a.fields) || [];
                        return (<div key={table.tableName} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900">
                            {((_b = export_1.ALL_AVAILABLE_TABLES.find(function (t) { return t.tableName === table.tableName; })) === null || _b === void 0 ? void 0 : _b.label) || table.tableName}
                          </span>
                          <button onClick={function () { return removeTableFromCustom(table.tableName); }} className="text-xs text-red-500 hover:text-red-700">
                            移除
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {allFields.map(function (f) {
                                var selected = table.fields.some(function (sf) { return sf.key === f.key; });
                                return (<button key={f.key} onClick={function () { return toggleFieldInCustom(table.tableName, f.key); }} className={"text-xs px-2 py-1 rounded-full transition-colors ".concat(selected
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300')}>
                                {f.label}
                              </button>);
                            })}
                        </div>
                      </div>);
                    })}
                </div>)}
            </div>)}

          {/* 导出格式 & 操作 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">导出格式:</span>
                <select value={exportFormat} onChange={function (e) { return setExportFormat(e.target.value); }} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">每次导出消耗 100 PT</span>
                <button onClick={handleExport} disabled={exporting || (!customMode && !selectedPreset) || (customMode && selectedTables.length === 0)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {exporting ? '导出中...' : '导出数据'}
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
