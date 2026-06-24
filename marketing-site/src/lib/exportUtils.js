"use strict";
/**
 * 数据导出工具函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportButton = exports.exportToJSON = exports.exportToCSV = void 0;
var react_1 = require("react");
/**
 * 将数据导出为 CSV 文件
 * @param data - 要导出的数据数组
 * @param filename - 文件名（不含扩展名）
 * @param headers - 表头映射（可选，如果不提供则使用数据的第一个对象的键）
 */
var exportToCSV = function (data, filename, headers) {
    if (!data || data.length === 0) {
        alert('没有数据可导出');
        return;
    }
    // 确定表头
    var headerKeys = headers
        ? headers.map(function (h) { return h.key; })
        : Object.keys(data[0]);
    var headerLabels = headers
        ? headers.map(function (h) { return h.label; })
        : headerKeys;
    // 创建 CSV 内容
    var csvRows = [];
    // 添加表头
    csvRows.push(headerLabels.join(','));
    var _loop_1 = function (row) {
        var values = headerKeys.map(function (key) {
            var value = row[key];
            // 处理包含逗号、引号或换行符的值
            if (value === null || value === undefined) {
                return '';
            }
            var stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return "\"".concat(stringValue.replace(/"/g, '""'), "\"");
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    };
    // 添加数据行
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var row = data_1[_i];
        _loop_1(row);
    }
    // 创建 Blob 并下载
    var csvContent = '\uFEFF' + csvRows.join('\n'); // 添加 BOM 以支持中文
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', "".concat(filename, "_").concat(new Date().toISOString().slice(0, 10), ".csv"));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
exports.exportToCSV = exportToCSV;
/**
 * 将数据导出为 JSON 文件
 * @param data - 要导出的数据
 * @param filename - 文件名（不含扩展名）
 */
var exportToJSON = function (data, filename) {
    if (!data) {
        alert('没有数据可导出');
        return;
    }
    var jsonContent = JSON.stringify(data, null, 2);
    var blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', "".concat(filename, "_").concat(new Date().toISOString().slice(0, 10), ".json"));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
exports.exportToJSON = exportToJSON;
/**
 * 通用导出按钮组件
 */
var ExportButton = function (_a) {
    var data = _a.data, filename = _a.filename, _b = _a.format, format = _b === void 0 ? 'csv' : _b, headers = _a.headers, _c = _a.className, className = _c === void 0 ? '' : _c, children = _a.children;
    var handleExport = function () {
        if (format === 'csv') {
            (0, exports.exportToCSV)(data, filename, headers);
        }
        else {
            (0, exports.exportToJSON)(data, filename);
        }
    };
    return (<button onClick={handleExport} className={"flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ".concat(className)}>
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      {children || "\u5BFC\u51FA\u4E3A ".concat(format.toUpperCase())}
    </button>);
};
exports.ExportButton = ExportButton;
