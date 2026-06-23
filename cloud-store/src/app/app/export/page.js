// ProClaw Cloud 托管版 - 数据导出页面
'use client';
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
exports.default = ExportPage;
var react_1 = require("react");
var react_hot_toast_1 = require("react-hot-toast");
var templates = [
    { id: 'all', name: '全量数据', description: '导出所有业务数据（商品、客户、订单等）', icon: '📦' },
    { id: 'products', name: '商品数据', description: '导出商品 SPU 和 SKU 信息', icon: '🏷️' },
    { id: 'sales', name: '销售数据', description: '导出销售订单和销售明细', icon: '📤' },
    { id: 'purchase', name: '采购数据', description: '导出采购订单和采购明细', icon: '📥' },
    { id: 'inventory', name: '库存数据', description: '导出当前库存状况和交易记录', icon: '📊' },
    { id: 'customers', name: '客户数据', description: '导出客户信息和联系方式', icon: '👥' },
];
function ExportPage() {
    var _this = this;
    var _a = (0, react_1.useState)('all'), selectedTemplate = _a[0], setSelectedTemplate = _a[1];
    var _b = (0, react_1.useState)('csv'), format = _b[0], setFormat = _b[1];
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)([]), exportHistory = _d[0], setExportHistory = _d[1];
    var handleExport = function () { return __awaiter(_this, void 0, void 0, function () {
        var res, result_1, blob, url, a, size_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/export', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                templateId: selectedTemplate,
                                format: format,
                            }),
                        })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    result_1 = _b.sent();
                    if (result_1.success) {
                        blob = new Blob([result_1.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
                        url = URL.createObjectURL(blob);
                        a = document.createElement('a');
                        a.href = url;
                        a.download = result_1.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        size_1 = new Blob([result_1.data]).size;
                        setExportHistory(function (prev) { return __spreadArray([{
                                name: result_1.fileName,
                                time: new Date().toLocaleString(),
                                size: formatSize(size_1),
                            }], prev.slice(0, 4), true); });
                        react_hot_toast_1.default.success("\u5BFC\u51FA\u6210\u529F\uFF01\u6D88\u8017 100 Token\uFF0C\u5171 ".concat(result_1.totalRecords, " \u6761\u8BB0\u5F55"));
                    }
                    else {
                        react_hot_toast_1.default.error(result_1.error || '导出失败');
                    }
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    react_hot_toast_1.default.error('导出失败，请重试');
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var formatSize = function (bytes) {
        if (bytes < 1024)
            return "".concat(bytes, " B");
        if (bytes < 1024 * 1024)
            return "".concat((bytes / 1024).toFixed(1), " KB");
        return "".concat((bytes / (1024 * 1024)).toFixed(1), " MB");
    };
    return (<div className="max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
        <p className="text-sm text-gray-500 mt-1">将业务数据导出为 CSV 或 JSON 格式，方便备份或迁移</p>
      </div>

      {/* 导出模板选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">选择导出内容</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(function (template) { return (<button key={template.id} onClick={function () { return setSelectedTemplate(template.id); }} className={"p-4 rounded-xl border-2 text-left transition-all ".concat(selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{template.icon}</span>
                <span className="font-medium text-gray-900">{template.name}</span>
              </div>
              <p className="text-sm text-gray-500">{template.description}</p>
            </button>); })}
        </div>
      </div>

      {/* 导出格式选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">选择导出格式</h2>
        <div className="flex gap-4">
          <button onClick={function () { return setFormat('csv'); }} className={"flex-1 p-4 rounded-xl border-2 text-center transition-all ".concat(format === 'csv'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300')}>
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-gray-900">CSV 格式</div>
            <div className="text-sm text-gray-500 mt-1">适用于 Excel 编辑</div>
          </button>
          <button onClick={function () { return setFormat('json'); }} className={"flex-1 p-4 rounded-xl border-2 text-center transition-all ".concat(format === 'json'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300')}>
            <div className="text-2xl mb-2"></div>
            <div className="font-medium text-gray-900">JSON 格式</div>
            <div className="text-sm text-gray-500 mt-1">适用于程序处理</div>
          </button>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium text-gray-900">开始导出</h2>
            <p className="text-sm text-gray-500 mt-1">
              每次导出消耗 100 Token，最多导出 10,000 条记录
            </p>
          </div>
          <button onClick={handleExport} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            {loading ? (<>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                导出中...
              </>) : (<>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                导出数据
              </>)}
          </button>
        </div>

        {/* 导出历史 */}
        {exportHistory.length > 0 && (<div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">最近导出</h3>
            <div className="space-y-2">
              {exportHistory.map(function (item, index) { return (<div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{format === 'csv' ? '📄' : '{ }'}</span>
                    <span className="text-sm text-gray-900">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{item.size}</span>
                    <span>{item.time}</span>
                  </div>
                </div>); })}
            </div>
          </div>)}
      </div>

      {/* 注意事项 */}
      <div className="mt-6 bg-yellow-50 rounded-xl p-4">
        <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. 导出数据包含您账号下的所有相关业务数据</li>
          <li>2. 敏感字段（如手机号、地址）已自动脱敏处理</li>
          <li>3. 每次导出最多 10,000 条记录，超出部分需分批导出</li>
          <li>4. 建议定期导出重要数据进行本地备份</li>
        </ul>
      </div>
    </div>);
}
