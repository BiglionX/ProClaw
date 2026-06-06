/**
 * SyncConnectionManager - 同步连接管理器
 * 集中管理云备份和局域网同步的连接生命周期。
 * 在身份切换时关闭所有活跃连接。
 *
 * 对应 PRD v11.0 第6.2节：切换身份时的资源清理
 */
import { cloudBackupProvider } from '../services/CloudBackupProvider';
import { lanSyncProvider } from '../services/LanSyncProvider';

/**
 * 关闭所有同步连接
 * 在身份切换时调用，确保旧身份的同步通道完全关闭。
 */
export const closeAllSyncConnections = async (): Promise<void> => {
  const errors: string[] = [];

  // 关闭云备份连接
  try {
    await cloudBackupProvider.disconnect();
    console.log('[SyncConnectionManager] Cloud backup disconnected');
  } catch (e) {
    errors.push(`CloudBackup: ${e}`);
  }

  // 关闭局域网同步连接
  try {
    await lanSyncProvider.disconnect();
    console.log('[SyncConnectionManager] LAN sync disconnected');
  } catch (e) {
    errors.push(`LanSync: ${e}`);
  }

  if (errors.length > 0) {
    console.warn('[SyncConnectionManager] Errors during disconnect:', errors.join('; '));
  }
};

export default {
  closeAllSyncConnections,
};
