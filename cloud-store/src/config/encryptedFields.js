"use strict";
// ProClaw Cloud 托管版 - 敏感字段配置
// 定义各数据表中需要 AES-256 加密的字段
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTED_FIELDS = void 0;
exports.getEncryptedFields = getEncryptedFields;
exports.ENCRYPTED_FIELDS = {
    // 客户表
    customers: ['phone', 'email', 'address'],
    // 供应商表
    suppliers: ['phone', 'email', 'address'],
    // 用户档案表（个人敏感信息）
    profiles: ['phone', 'address'],
};
/**
 * 获取指定表需要加密的字段列表
 */
function getEncryptedFields(tableName) {
    return exports.ENCRYPTED_FIELDS[tableName] || [];
}
