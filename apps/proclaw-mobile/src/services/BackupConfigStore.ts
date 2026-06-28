/**
 * BackupConfigStore - 备份配置持久化服务
 * 使用 expo-secure-store 安全存储备份密码和云备份配置。
 * Web 平台回退到 AsyncStorage。
 *
 * 对应 PRD v11.0 第3.5节：用户密码管理
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const BACKUP_CONFIG_KEY = '@proclaw_backup_config';

/** 持久化的备份配置 */
export interface PersistedBackupConfig {
  /** 备份是否启用 */
  enabled: boolean;
  /** 加密后的备份密码（用设备密钥加密） */
  encryptedPassword: string;
  /** 备份密码明文（存储在 OS 级加密的 SecureStore 中） */
  backupPassword?: string;
  /** 密码哈希（用于验证密码正确性） */
  passwordHash: string;
  /** 恢复密钥助记词 */
  recoveryWords: string[];
  /** 上次同步时间戳 */
  lastSyncTime: number;
  /** 用户ID */
  userId: string;
}

/**
 * 保存备份配置到安全存储
 */
export const saveBackupConfig = async (config: PersistedBackupConfig): Promise<void> => {
  try {
    const json = JSON.stringify(config);

    if (Platform.OS === 'web') {
      // Web 平台使用 AsyncStorage
      await AsyncStorage.setItem(BACKUP_CONFIG_KEY, json);
    } else {
      // 原生平台使用 expo-secure-store
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(BACKUP_CONFIG_KEY, json);
      } catch {
        // Fallback: expo-secure-store 不可用
        logger.warn('[BackupConfig] SecureStore not available, falling back to AsyncStorage');
        await AsyncStorage.setItem(BACKUP_CONFIG_KEY, json);
      }
    }

    logger.log('[BackupConfig] Configuration saved');
  } catch (error) {
    logger.error('[BackupConfig] Failed to save config:', error);
    throw error;
  }
};

/**
 * 从安全存储加载备份配置
 */
export const loadBackupConfig = async (): Promise<PersistedBackupConfig | null> => {
  try {
    let json: string | null = null;

    if (Platform.OS === 'web') {
      json = await AsyncStorage.getItem(BACKUP_CONFIG_KEY);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        json = await SecureStore.getItemAsync(BACKUP_CONFIG_KEY);
      } catch {
        json = await AsyncStorage.getItem(BACKUP_CONFIG_KEY);
      }
    }

    if (!json) return null;
    return JSON.parse(json) as PersistedBackupConfig;
  } catch (error) {
    logger.warn('[BackupConfig] Failed to load config:', error);
    return null;
  }
};

/**
 * 清除备份配置
 */
export const clearBackupConfig = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(BACKUP_CONFIG_KEY);
    } else {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(BACKUP_CONFIG_KEY);
      } catch {
        await AsyncStorage.removeItem(BACKUP_CONFIG_KEY);
      }
    }

    logger.log('[BackupConfig] Configuration cleared');
  } catch (error) {
    logger.warn('[BackupConfig] Failed to clear config:', error);
  }
};

/**
 * 检查备份配置是否存在
 */
export const hasBackupConfig = async (): Promise<boolean> => {
  const config = await loadBackupConfig();
  return config !== null && config.enabled;
};

export default {
  saveBackupConfig,
  loadBackupConfig,
  clearBackupConfig,
  hasBackupConfig,
};
