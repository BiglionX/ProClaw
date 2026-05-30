// ProClaw Cloud 托管版 - 敏感字段配置
// 定义各数据表中需要 AES-256 加密的字段

export const ENCRYPTED_FIELDS = {
  // 客户表
  customers: ['phone', 'email', 'address'],

  // 供应商表
  suppliers: ['phone', 'email', 'address'],

  // 用户档案表（个人敏感信息）
  profiles: ['phone', 'address'],
} as const;

/**
 * 获取指定表需要加密的字段列表
 */
export function getEncryptedFields(tableName: keyof typeof ENCRYPTED_FIELDS): readonly string[] {
  return ENCRYPTED_FIELDS[tableName] || [];
}

export type EncryptedTableName = keyof typeof ENCRYPTED_FIELDS;
