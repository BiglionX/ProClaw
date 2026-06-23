"use strict";
// ProClaw Cloud 托管版 - 字段加密辅助函数
// 封装敏感字段的加密/解密，自动处理空值和批量处理
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
exports.encryptFields = encryptFields;
exports.decryptFields = decryptFields;
exports.decryptFieldsInArray = decryptFieldsInArray;
exports.encryptRequestBody = encryptRequestBody;
var crypto_1 = require("./crypto");
/**
 * 加密单个字段值（空值跳过）
 */
function encryptField(value) {
    if (!value)
        return value !== null && value !== void 0 ? value : null;
    return (0, crypto_1.encrypt)(value);
}
/**
 * 解密单个字段值（空值跳过）
 */
function decryptField(value) {
    if (!value)
        return value !== null && value !== void 0 ? value : null;
    return (0, crypto_1.decrypt)(value);
}
/**
 * 批量加密对象中的指定字段
 * @param obj 源对象
 * @param fields 需要加密的字段名数组
 * @returns 新对象（不修改原对象）
 */
function encryptFields(obj, fields) {
    var result = __assign({}, obj);
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var field = fields_1[_i];
        var value = result[field];
        if (typeof value === 'string' && value && !(0, crypto_1.isEncrypted)(value)) {
            result[field] = (0, crypto_1.encrypt)(value);
        }
    }
    return result;
}
/**
 * 批量解密对象中的指定字段
 * @param obj 源对象
 * @param fields 需要解密的字段名数组
 * @returns 新对象（不修改原对象）
 */
function decryptFields(obj, fields) {
    var result = __assign({}, obj);
    for (var _i = 0, fields_2 = fields; _i < fields_2.length; _i++) {
        var field = fields_2[_i];
        var value = result[field];
        if (typeof value === 'string' && value && (0, crypto_1.isEncrypted)(value)) {
            result[field] = (0, crypto_1.decrypt)(value);
        }
    }
    return result;
}
/**
 * 批量解密数组中的每个对象的指定字段
 */
function decryptFieldsInArray(items, fields) {
    return items.map(function (item) { return decryptFields(item, fields); });
}
/**
 * 从请求体中提取并加密敏感字段，返回更新后的 body
 * 用于 POST/PUT 请求处理
 */
function encryptRequestBody(body, sensitiveFields) {
    return encryptFields(body, sensitiveFields);
}
