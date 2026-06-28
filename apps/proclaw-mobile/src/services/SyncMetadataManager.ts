/**
 * SyncMetadataManager - 同步元数据管理
 * 管理设备信息、同步时间戳和同步游标。
 *
 * 对应 PRD v11.0 第2.2节
 */

import type { IDatabase } from './DatabaseFactory';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

const DEVICE_ID_KEY = 'device_id';
const DEVICE_NAME_KEY = 'device_name';
const LAST_SYNC_TIME_KEY = 'last_sync_time';
const SYNC_TOKEN_KEY = 'sync_token';

/**
 * 使用 SHA-256 生成设备唯一 ID 的替代方案
 * 基于 platform + 随机数 + 时间戳
 */
const generateHash = async (input: string): Promise<string> => {
  // 审计 R2-B1：修复无效的 hash & hash（恒等操作），改用 |0 强制 32 位整数
  // 使用 DJB2 变体（简单非加密哈希，仅用于生成稳定设备ID）
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0; // |0 强制 32 位有符号整数
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/**
 * 获取或生成设备唯一 ID
 */
export const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    const { loadServerUrl } = await import('./AuthService');
    const serverUrl = await loadServerUrl();
    const base = `${serverUrl || 'local'}_${Platform.OS}_${(Platform as any).Version || 'unknown'}`;
    const hash = await generateHash(base);
    return `device_${hash}`;
  } catch {
    return `device_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
  }
};

/**
 * 获取设备名称
 */
export const getDeviceName = async (): Promise<string> => {
  try {
    const DeviceInfo = await import('react-native' as any);
    return `${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'}`;
  } catch {
    return `${Platform.OS}_device`;
  }
};

/**
 * 初始化同步元数据表记录
 * 同时创建设备信息记录
 */
export const initSyncMetadata = async (
  db: IDatabase,
  deviceId: string
): Promise<void> => {
  // 插入或更新设备信息
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [DEVICE_ID_KEY, deviceId]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [DEVICE_NAME_KEY, await getDeviceName()]
  );
  // 初始化 last_sync_time 为 0
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [LAST_SYNC_TIME_KEY, '0']
  );

  // 同步创建 device_info 记录
  try {
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT OR REPLACE INTO device_info (device_id, device_name, platform, created_at, last_active)
       VALUES (?, ?, ?, ?, ?)`,
      [deviceId, await getDeviceName(), Platform.OS, now, now]
    );
  } catch (e) {
    logger.warn('[SyncMetadata] Failed to create device_info:', e);
  }
};

/**
 * 获取设备 ID
 */
export const getDeviceId = async (db: IDatabase): Promise<string | null> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = ?`,
      [DEVICE_ID_KEY]
    );
    return (row as any)?.value || null;
  } catch {
    return null;
  }
};

/**
 * 获取上次同步时间（毫秒时间戳）
 */
export const getLastSyncTime = async (db: IDatabase): Promise<number> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = ?`,
      [LAST_SYNC_TIME_KEY]
    );
    const val = (row as any)?.value || '0';
    // 兼容旧数据：如果值是秒级时间戳，转换为毫秒
    const num = parseInt(val, 10);
    if (num < 10000000000) { // 秒级时间戳 < 10^10
      return num * 1000;
    }
    return num;
  } catch {
    return 0;
  }
};

/**
 * 更新上次同步时间
 */
export const updateLastSyncTime = async (
  db: IDatabase,
  timestamp: number = Date.now()
): Promise<void> => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [LAST_SYNC_TIME_KEY, String(timestamp)]
  );
};

/**
 * 获取同步游标
 */
export const getSyncToken = async (db: IDatabase): Promise<string | null> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = ?`,
      [SYNC_TOKEN_KEY]
    );
    return (row as any)?.value || null;
  } catch {
    return null;
  }
};

/**
 * 更新同步游标
 */
export const updateSyncToken = async (
  db: IDatabase,
  token: string
): Promise<void> => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [SYNC_TOKEN_KEY, token]
  );
};

/**
 * 清除同步元数据（用于身份重置）
 */
export const clearSyncMetadata = async (db: IDatabase): Promise<void> => {
  try {
    await db.execAsync(`DELETE FROM sync_metadata`);
    await db.execAsync(`DELETE FROM device_info`);
    await db.execAsync(`DELETE FROM change_log`);
    logger.log('[SyncMetadata] Cleared all sync metadata');
  } catch (error) {
    logger.warn('[SyncMetadata] Failed to clear metadata:', error);
  }
};

export default {
  getOrCreateDeviceId,
  initSyncMetadata,
  getDeviceId,
  getLastSyncTime,
  updateLastSyncTime,
  getSyncToken,
  updateSyncToken,
  clearSyncMetadata,
};
