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
  return {
    pending_operations: stats.pending_sync,
    last_sync_time: undefined, // TODO: 实现最后同步时间跟踪
    sync_enabled: true,
  };
}
