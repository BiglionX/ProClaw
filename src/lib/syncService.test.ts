import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getDatabaseStats, getSyncStatus } from '../lib/syncService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', async () => {
  const core = await import('@tauri-apps/api/core');
  return {
    isTauri: () => true,
    ipcInvoke: core.invoke,
    ipcInvokeOrNull: core.invoke,
    safeInvoke: core.invoke,
    openExternalUrl: vi.fn(),
  };
});

describe('syncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getDatabaseStats', () => {
    it('应该获取数据库统计信息', async () => {
      const mockStats = {
        products: 100,
        categories: 10,
        transactions: 500,
        pending_sync: 5,
      };
      (invoke as any).mockResolvedValue(mockStats);

      const result = await getDatabaseStats();
      expect(result).toEqual(mockStats);
      expect(invoke).toHaveBeenCalledWith('get_database_stats');
    });

    it('应该返回待同步数为 0', async () => {
      const mockStats = {
        products: 50,
        categories: 5,
        transactions: 100,
        pending_sync: 0,
      };
      (invoke as any).mockResolvedValue(mockStats);

      const result = await getDatabaseStats();
      expect(result.pending_sync).toBe(0);
    });
  });

  describe('getSyncStatus', () => {
    it('应该获取同步状态（有最后同步时间）', async () => {
      (invoke as any).mockResolvedValue({
        products: 100,
        categories: 10,
        transactions: 500,
        pending_sync: 5,
      });
      localStorage.setItem('proclaw_last_sync_time', '2024-01-01T00:00:00Z');

      const result = await getSyncStatus();
      expect(result.pending_operations).toBe(5);
      expect(result.last_sync_time).toBe('2024-01-01T00:00:00Z');
      expect(result.sync_enabled).toBe(true);
    });

    it('应该返回同步状态（无最后同步时间）', async () => {
      (invoke as any).mockResolvedValue({
        products: 0,
        categories: 0,
        transactions: 0,
        pending_sync: 0,
      });

      const result = await getSyncStatus();
      expect(result.pending_operations).toBe(0);
      expect(result.last_sync_time).toBeUndefined();
      expect(result.sync_enabled).toBe(true);
    });
  });
});
