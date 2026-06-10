/**
 * CloudBackupProvider - 云备份同步提供者
 * 实现 ISyncProvider 接口，通过 Supabase Storage 进行端到端加密同步。
 *
 * 对应 PRD v11.0 第3节：云备份的加密与同步协议
 */

import type { ISyncProvider, SyncPackage, SyncResult } from './SyncEngine';
import type { IDatabase } from './DatabaseFactory';
import { getPendingChanges, markSynced, type ChangeLogEntry } from './ChangeLogManager';
import { getDeviceId, updateLastSyncTime } from './SyncMetadataManager';
import { encryptBlock, decryptBlock } from '../utils/EncryptionUtil';
import { serializeChanges, deserializeChanges, applyRemoteChanges, ConflictResolver } from './SyncEngine';
import { loadBackupConfig } from './BackupConfigStore';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

/** 云备份配置 */
export interface CloudBackupConfig {
  /** 备份密码 */
  backupPassword: string;
  /** Supabase URL（从 AuthService 获取） */
  supabaseUrl: string;
  /** Supabase anon key */
  supabaseKey: string;
  /** 用户ID */
  userId: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 备份状态 */
export interface BackupStatus {
  lastSyncTime: number;
  pendingChanges: number;
  totalBackups: number;
  isSyncing: boolean;
}

const STORAGE_BUCKET = 'proclaw-backups';

/**
 * 云备份提供者 - 端到端加密同步
 */
export class CloudBackupProvider implements ISyncProvider {
  readonly name = 'cloud_backup';
  private config: CloudBackupConfig | null = null;
  private db: IDatabase | null = null;

  /**
   * 初始化云备份提供者
   */
  async initialize(db: IDatabase, config: CloudBackupConfig): Promise<void> {
    this.db = db;
    this.config = config;
    logger.log('[CloudBackup] Provider initialized');
  }

  /**
   * 从持久化配置自动初始化（从 BackupConfigStore 加载）
   * 无需外部传入密码，自动从安全存储读取。
   */
  async initializeFromStore(db: IDatabase, supabaseUrl?: string, supabaseKey?: string): Promise<boolean> {
    try {
      const persistedConfig = await loadBackupConfig();
      if (!persistedConfig || !persistedConfig.enabled || !persistedConfig.backupPassword) {
        logger.warn('[CloudBackup] No valid persisted backup config found');
        return false;
      }

      this.db = db;
      // 审计 I4：备份密码从安全存储加载后在内存中明文持有
      // 密码生命周期：安全存储 → 内存 → CryptoJS.encrypt。应避免持久化缓存密码对象
      this.config = {
        backupPassword: persistedConfig.backupPassword,
        supabaseUrl: supabaseUrl || '',
        supabaseKey: supabaseKey || '',
        userId: persistedConfig.userId,
        enabled: true,
      };

      logger.log('[CloudBackup] Initialized from persisted config');
      return true;
    } catch (error) {
      logger.warn('[CloudBackup] Failed to initialize from store:', error);
      return false;
    }
  }

  /**
   * 检查云备份是否已配置
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.enabled;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const response = await fetch(`${this.config!.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': this.config!.supabaseKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 上传变更到云端（端到端加密，自动重试）
   */
  async upload(package_: SyncPackage, maxRetries: number = 3): Promise<SyncResult> {
    const result: SyncResult = { success: false, applied: 0, conflicts: 0, errors: [] };

    if (!this.isConfigured() || !this.db) {
      result.errors.push('Cloud backup not configured');
      return result;
    }

    let lastError: string | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const password = this.config!.backupPassword;
        const userId = this.config!.userId;
        const deviceId = await getDeviceId(this.db);

        // 序列化变更数据
        const serialized = serializeChanges(package_.changes);

        // 端到端加密
        const encrypted = encryptBlock(serialized, password);

        // 上传到 Supabase Storage
        const timestamp = package_.timestamp;
        // 审计 E2：deviceId 回退使用随机后缀，防止多设备共享 'unknown' 桶导致备份覆盖
        const effectiveDeviceId = deviceId || `unknown_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const path = `${STORAGE_BUCKET}/${userId}/${effectiveDeviceId}/${timestamp}.enc`;

        const uploadResult = await this.uploadToStorage(path, encrypted);

        if (uploadResult) {
          // 标记为已同步
          const changeIds = package_.changes.map(c => c.id);
          await markSynced(this.db!, changeIds);
          await updateLastSyncTime(this.db!, timestamp);

          result.success = true;
          result.applied = package_.changes.length;
          logger.log(`[CloudBackup] Uploaded ${package_.changes.length} changes (attempt ${attempt})`);
          return result;
        } else {
          lastError = `Upload attempt ${attempt} failed`;
          if (attempt < maxRetries) {
            // 指数退避
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
      } catch (error) {
        lastError = getErrorMessage(error, 'Upload error');
        logger.error(`[CloudBackup] Upload attempt ${attempt} failed:`, lastError);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    result.errors.push(lastError || 'Upload failed after all retries');
    return result;
  }

  /**
   * 从云端下载变更（端到端解密）
   * 批量下载所有 sinceTimestamp 之后的加密文件，合并所有变更后统一冲突解决。
   *
   * @param sinceTimestamp 起始时间戳
   * @param deviceId 本设备ID
   * @param onProgress 进度回调 (current: 当前下载数, total: 总文件数)
   */
  async download(
    sinceTimestamp: number,
    deviceId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<SyncPackage | null> {
    if (!this.isConfigured() || !this.db) return null;

    try {
      const password = this.config!.backupPassword;
      const userId = this.config!.userId;

      // 获取远程文件列表
      const files = await this.listRemoteFiles(userId, deviceId, sinceTimestamp);

      if (files.length === 0) {
        logger.log('[CloudBackup] No remote changes');
        return null;
      }

      // 批量下载所有文件
      const allChanges: ChangeLogEntry[] = [];
      let latestTimestamp = sinceTimestamp;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        logger.log(`[CloudBackup] Downloading file ${i + 1}/${files.length}: ${file.path}`);

        const encryptedContent = await this.downloadFromStorage(file.path);

        if (!encryptedContent) {
          logger.warn(`[CloudBackup] Failed to download: ${file.path}, skipping`);
          onProgress?.(i + 1, files.length);
          continue;
        }

        // 端到端解密
        try {
          const decrypted = decryptBlock(encryptedContent, password);
          const changes = deserializeChanges(decrypted);
          allChanges.push(...changes);

          if (file.timestamp > latestTimestamp) {
            latestTimestamp = file.timestamp;
          }

          logger.log(`[CloudBackup] Extracted ${changes.length} changes from ${file.path}`);
        } catch (decryptError) {
          logger.warn(`[CloudBackup] Failed to decrypt: ${file.path}, skipping`);
        }

        onProgress?.(i + 1, files.length);
      }

      if (allChanges.length === 0) {
        logger.log('[CloudBackup] No decodable changes found in remote files');
        return null;
      }

      // 统一合并所有变更到本地数据库
      logger.log(`[CloudBackup] Merging ${allChanges.length} changes from ${files.length} files`);
      const resolver = new ConflictResolver();
      const conflicts = await applyRemoteChanges(this.db!, allChanges, resolver);

      if (conflicts.length > 0) {
        logger.warn(`[CloudBackup] ${conflicts.length} conflicts detected during merge`);
      }

      // 更新同步时间戳为最新文件的时间
      await updateLastSyncTime(this.db!, latestTimestamp);

      logger.log(`[CloudBackup] Downloaded ${allChanges.length} changes, ${conflicts.length} conflicts from ${files.length} files`);

      return {
        deviceId: deviceId,
        profileId: '',
        timestamp: latestTimestamp,
        changes: allChanges,
      };
    } catch (error) {
      logger.error('[CloudBackup] Download failed:', error);
      return null;
    }
  }

  /**
   * 获取备份状态
   */
  async getStatus(db: IDatabase): Promise<BackupStatus> {
    const { getPendingCount } = await import('./ChangeLogManager');
    const { getLastSyncTime } = await import('./SyncMetadataManager');

    const [pendingCount, lastSync] = await Promise.all([
      getPendingCount(db),
      getLastSyncTime(db),
    ]);

    return {
      lastSyncTime: lastSync,
      pendingChanges: pendingCount,
      totalBackups: 0,
      isSyncing: false,
    };
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.db = null;
    logger.log('[CloudBackup] Disconnected');
  }

  // ============================================
  // Supabase Storage 通信
  // ============================================

  /**
   * 上传数据到 Supabase Storage
   * 审计 H8：使用 apikey header + Bearer JWT 认证
   */
  private async uploadToStorage(path: string, content: string): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/storage/v1/object/${path}`,
        {
          method: 'PUT',
          headers: {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
            'Content-Type': 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: content,
        }
      );
      return response.ok;
    } catch (error) {
      logger.error('[CloudBackup] Storage upload error:', error);
      return false;
    }
  }

  /**
   * 从 Supabase Storage 下载数据
   * 审计 H8：使用 apikey header + Bearer JWT 认证
   */
  private async downloadFromStorage(path: string): Promise<string | null> {
    if (!this.config) return null;

    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/storage/v1/object/${path}`,
        {
          headers: {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        logger.warn(`[CloudBackup] Download failed: ${response.status}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      logger.error('[CloudBackup] Storage download error:', error);
      return null;
    }
  }

  /**
   * 获取远程文件列表
   * 审计 H8：使用 apikey header + Bearer JWT 认证
   */
  private async listRemoteFiles(
    userId: string,
    _deviceId: string,
    sinceTimestamp: number
  ): Promise<Array<{ path: string; timestamp: number }>> {
    if (!this.config) return [];

    try {
      const prefix = `${STORAGE_BUCKET}/${userId}/`;
      const response = await fetch(
        `${this.config.supabaseUrl}/storage/v1/object/list/${prefix}`,
        {
          headers: {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
          },
        }
      );

      if (!response.ok) return [];

      const files: any[] = await response.json();
      return files
        .filter((f: any) => {
          // 解析时间戳从文件名: {deviceId}/{timestamp}.enc
          const parts = f.name?.split('/') || [];
          const timestamp = parseInt(parts[1]?.replace('.enc', '') || '0', 10);
          return timestamp > sinceTimestamp;
        })
        .map((f: any) => {
          const parts = f.name?.split('/') || [];
          const timestamp = parseInt(parts[1]?.replace('.enc', '') || '0', 10);
          return {
            path: `${prefix}${f.name}`,
            timestamp,
          };
        })
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }
}

// 全局单例
export const cloudBackupProvider = new CloudBackupProvider();
export default CloudBackupProvider;
