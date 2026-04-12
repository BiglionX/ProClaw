import { invoke } from '@tauri-apps/api/core';

export interface DatabaseStats {
  products: number;
  categories: number;
  transactions: number;
  pending_sync: number;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  return await invoke('get_database_stats');
}

export async function getSyncStatus(): Promise<{
  pending_operations: number;
  last_sync_time?: string;
  sync_enabled: boolean;
}> {
  const stats = await getDatabaseStats();

  // 从 localStorage 获取最后同步时间
  const lastSyncTime = localStorage.getItem('proclaw_last_sync_time');

  return {
    pending_operations: stats.pending_sync,
    last_sync_time: lastSyncTime || undefined,
    sync_enabled: true,
  };
}
