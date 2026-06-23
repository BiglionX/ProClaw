"use strict";
// ProClaw Cloud 托管版 - 工具函数
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatTokens = formatTokens;
exports.generateId = generateId;
var clsx_1 = require("clsx");
var tailwind_merge_1 = require("tailwind-merge");
/**
 * 合并 Tailwind CSS 类名
 */
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
/**
 * 格式化金额
 */
function formatCurrency(amount, currency) {
    if (currency === void 0) { currency = 'CNY'; }
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
/**
 * 格式化日期
 */
function formatDate(date, format) {
    if (format === void 0) { format = 'short'; }
    var d = typeof date === 'string' ? new Date(date) : date;
    if (format === 'relative') {
        var now = new Date();
        var diffMs = now.getTime() - d.getTime();
        var diffMins = Math.floor(diffMs / 60000);
        var diffHours = Math.floor(diffMs / 3600000);
        var diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return '刚刚';
        if (diffMins < 60)
            return "".concat(diffMins, "\u5206\u949F\u524D");
        if (diffHours < 24)
            return "".concat(diffHours, "\u5C0F\u65F6\u524D");
        if (diffDays < 30)
            return "".concat(diffDays, "\u5929\u524D");
        return formatDate(date, 'short');
    }
    var options = format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('zh-CN', options).format(d);
}
/**
 * 格式化 Token 数量
 */
function formatTokens(amount) {
    if (amount >= 10000) {
        return "".concat((amount / 10000).toFixed(1), "\u4E07");
    }
    return amount.toLocaleString();
}
/**
 * 生成唯一 ID
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
