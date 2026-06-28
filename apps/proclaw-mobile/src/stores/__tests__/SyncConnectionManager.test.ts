/// <reference types="jest" />

/**
 * SyncConnectionManager 单元测试
 * 测试身份切换时的同步连接清理
 */

// Mock CloudBackupProvider
const mockCloudDisconnect = jest.fn();
jest.mock('../../services/CloudBackupProvider', () => ({
  cloudBackupProvider: {
    disconnect: mockCloudDisconnect,
  },
}));

// Mock LanSyncProvider
const mockLanDisconnect = jest.fn();
jest.mock('../../services/LanSyncProvider', () => ({
  lanSyncProvider: {
    disconnect: mockLanDisconnect,
  },
}));

import { closeAllSyncConnections } from '../../stores/SyncConnectionManager';

describe('SyncConnectionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('closeAllSyncConnections', () => {
    it('应关闭云备份和局域网同步连接', async () => {
      mockCloudDisconnect.mockResolvedValue(undefined);
      mockLanDisconnect.mockResolvedValue(undefined);

      await closeAllSyncConnections();

      expect(mockCloudDisconnect).toHaveBeenCalledTimes(1);
      expect(mockLanDisconnect).toHaveBeenCalledTimes(1);
    });

    it('某个连接关闭失败时不应影响另一个', async () => {
      mockCloudDisconnect.mockRejectedValue(new Error('Cloud disconnect failed'));
      mockLanDisconnect.mockResolvedValue(undefined);

      // Should not throw even though cloud disconnect fails
      await expect(closeAllSyncConnections()).resolves.not.toThrow();

      // Both should still be called
      expect(mockCloudDisconnect).toHaveBeenCalledTimes(1);
      expect(mockLanDisconnect).toHaveBeenCalledTimes(1);
    });

    it('两个连接都关闭失败时不应抛出异常', async () => {
      mockCloudDisconnect.mockRejectedValue(new Error('Cloud error'));
      mockLanDisconnect.mockRejectedValue(new Error('LAN error'));

      await expect(closeAllSyncConnections()).resolves.not.toThrow();
    });

    it('连接从未初始化时调用 disconnect 不应报错', async () => {
      // Simulate providers where disconnect fails (e.g., never connected)
      mockCloudDisconnect.mockRejectedValue(new Error('Not connected'));
      mockLanDisconnect.mockResolvedValue(undefined);

      await expect(closeAllSyncConnections()).resolves.not.toThrow();
    });

    it('应依次关闭云备份和局域网同步', async () => {
      const callOrder: string[] = [];
      mockCloudDisconnect.mockImplementation(async () => {
        callOrder.push('cloud');
      });
      mockLanDisconnect.mockImplementation(async () => {
        callOrder.push('lan');
      });

      await closeAllSyncConnections();

      // Cloud should be disconnected before LAN (order in code)
      expect(callOrder).toEqual(['cloud', 'lan']);
    });
  });
});
