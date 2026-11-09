import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  getBackupConfig,
  restoreFromBackup,
  setAutoBackupSchedule,
  triggerBackup,
} from './cloudBackupService';

describe('cloudBackupService invoke 参数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getBackupConfig 传 userId', async () => {
    (invoke as any).mockResolvedValue({ data: { id: 'cfg' } });
    await getBackupConfig('user-1');
    expect(invoke).toHaveBeenCalledWith('get_backup_config_cmd', { userId: 'user-1' });
  });

  it('triggerBackup 传 userId', async () => {
    (invoke as any).mockResolvedValue({ data: { backup_id: 'b1' } });
    await triggerBackup('user-1');
    expect(invoke).toHaveBeenCalledWith('trigger_cloud_backup_cmd', { userId: 'user-1' });
  });

  it('setAutoBackupSchedule 使用 camelCase', async () => {
    (invoke as any).mockResolvedValue(undefined);
    await setAutoBackupSchedule('user-1', true, 'daily', '02:00', 30, true);
    expect(invoke).toHaveBeenCalledWith('set_auto_backup_schedule_cmd', {
      userId: 'user-1',
      enabled: true,
      frequency: 'daily',
      backupTime: '02:00',
      retentionDays: 30,
      encryptBackup: true,
    });
  });

  it('restoreFromBackup 传 backupId', async () => {
    (invoke as any).mockResolvedValue(undefined);
    await restoreFromBackup('bak-1');
    expect(invoke).toHaveBeenCalledWith('restore_from_backup_cmd', { backupId: 'bak-1' });
  });
});
