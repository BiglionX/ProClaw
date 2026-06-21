// ProClaw Cloud 云备份前端服务
// 封装 Tauri invoke 调用

import { ipcInvoke as invoke } from './tauri';

export interface BackupJob {
  id: string;
  user_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  size_bytes: number | null;
  table_count: number | null;
  error_message: string | null;
}

export interface BackupConfig {
  id: string;
  auto_backup: boolean;
  frequency: string;
  backup_time: string;
  encrypt_backup: boolean;
  retention_days: number;
  updated_at: string | null;
}

export interface BackupStatus {
  available: boolean;
  last_backup_at: string | null;
  total_backups: number;
}

export interface BackupResult {
  backup_id: string;
  status: string;
  record_count: number;
  message: string;
}

/** 获取备份历史 */
export async function getBackupHistory(limit?: number): Promise<BackupJob[]> {
  const result = await invoke<{ data: BackupJob[] }>('get_backup_history_cmd', {
    limit: limit ?? 20,
  });
  return result.data;
}

/** 获取云备份状态 */
export async function getBackupStatus(): Promise<BackupStatus> {
  return invoke<BackupStatus>('get_backup_status_cmd');
}

/** 获取云备份配置 */
export async function getBackupConfig(userId: string): Promise<BackupConfig> {
  const result = await invoke<{ data: BackupConfig }>('get_backup_config_cmd', {
    user_id: userId,
  });
  return result.data;
}

/** 触发手动备份 */
export async function triggerBackup(userId: string): Promise<BackupResult> {
  const result = await invoke<{ data: BackupResult }>('trigger_cloud_backup_cmd', {
    user_id: userId,
  });
  return result.data;
}

/** 设置自动备份策略 */
export async function setAutoBackupSchedule(
  userId: string,
  enabled: boolean,
  frequency: string,
  backupTime: string,
  retentionDays: number,
  encryptBackup: boolean,
): Promise<void> {
  await invoke('set_auto_backup_schedule_cmd', {
    user_id: userId,
    enabled,
    frequency,
    backup_time: backupTime,
    retention_days: retentionDays,
    encrypt_backup: encryptBackup,
  });
}

/** 从备份恢复 */
export async function restoreFromBackup(backupId: string): Promise<void> {
  await invoke('restore_from_backup_cmd', {
    backup_id: backupId,
  });
}
