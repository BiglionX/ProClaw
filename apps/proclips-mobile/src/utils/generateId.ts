/**
 * 共享 ID 生成器
 * 审计 M1：从 ApiService、ProfileManager、ChatService 三处重复代码中提取
 *
 * @param prefix 前缀（如 'local_', 'profile_', 'msg_'）
 * @returns 唯一标识符字符串
 */
export const generateId = (prefix: string = 'id_'): string => {
  return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
};

export default generateId;
