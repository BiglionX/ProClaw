/// <reference types="jest" />

/**
 * ConnectionManager 单元测试
 * 测试连接管理、网络探测、局域网同步可用性
 */

// Mock AuthService
jest.mock('../AuthService', () => ({
  loadServerUrl: jest.fn(),
  getApiClient: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

declare const global: typeof globalThis;

import {
  checkConnection,
  startConnectionMonitor,
  stopConnectionMonitor,
  getConnectionMode,
  setConnectionMode,
  getLocalIPAddress,
  isLanSyncAvailable,
} from '../ConnectionManager';

describe('ConnectionManager', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default: offline (no server URL)
    const { loadServerUrl } = require('../AuthService');
    loadServerUrl.mockResolvedValue(null);
  });

  afterEach(() => {
    stopConnectionMonitor();
  });

  describe('getConnectionMode / setConnectionMode', () => {
    it('初始化模式应为 offline', () => {
      expect(getConnectionMode()).toBe('offline');
    });

    it('应能设置和获取连接模式', () => {
      setConnectionMode('direct');
      expect(getConnectionMode()).toBe('direct');

      setConnectionMode('lan');
      expect(getConnectionMode()).toBe('lan');

      setConnectionMode('offline');
      expect(getConnectionMode()).toBe('offline');
    });
  });

  describe('checkConnection', () => {
    it('无 serverUrl 时应返回 offline', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue(null);

      const result = await checkConnection();
      expect(result.mode).toBe('offline');
      expect(result.isConnected).toBe(false);
    });

    it('服务器可达时应返回 direct', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue('http://192.168.1.100:8080');

      mockFetch.mockResolvedValue({ ok: true });

      const result = await checkConnection();
      expect(result.mode).toBe('direct');
      expect(result.isConnected).toBe(true);
      expect(result.serverUrl).toBe('http://192.168.1.100:8080');
    });

    it('服务器不可达时应返回 offline', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue('http://192.168.1.100:8080');

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkConnection();
      expect(result.mode).toBe('offline');
      expect(result.isConnected).toBe(false);
    });

    it('健康检查超时时应返回 offline', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue('http://192.168.1.100:8080');

      // Simulate timeout via AbortController
      mockFetch.mockImplementation(async (_url: string, options?: any) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {});
        }
        throw new Error('AbortError');
      });

      const result = await checkConnection();
      expect(result.mode).toBe('offline');
    });

    it('应返回延迟时间（连接成功时）', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue('http://192.168.1.100:8080');

      mockFetch.mockResolvedValue({ ok: true });

      const result = await checkConnection();
      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe('number');
    });

    it('loadServerUrl 抛出异常时应优雅降级', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockRejectedValue(new Error('Unexpected error'));

      const result = await checkConnection();
      expect(result.mode).toBe('offline');
      expect(result.isConnected).toBe(false);
    });
  });

  describe('startConnectionMonitor / stopConnectionMonitor', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('启动时应立即检查一次连接', async () => {
      const { loadServerUrl } = require('../AuthService');
      loadServerUrl.mockResolvedValue(null);

      // startConnectionMonitor calls checkConnection() immediately
      const promise = startConnectionMonitor();

      // Allow the immediate check to resolve
      await promise;

      expect(loadServerUrl).toHaveBeenCalled();
    });

    it('停止后应清除定时器', () => {
      // Start the monitor (uses fake timers)
      startConnectionMonitor();

      // Stop should clear the interval
      expect(() => stopConnectionMonitor()).not.toThrow();
    });
  });

  describe('getLocalIPAddress', () => {
    it('Web 平台应返回 localhost', async () => {
      const ip = await getLocalIPAddress();
      expect(ip).toBe('localhost');
    });
  });

  describe('isLanSyncAvailable', () => {
    it('无本地 IP 时应返回 false', async () => {
      // With web platform mock, getLocalIPAddress returns 'localhost'
      // But no ProClaw service is running, so all probes will fail
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await isLanSyncAvailable();
      expect(result).toBe(false);
    });

    it('探测到同步服务时应返回 true', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes(':8889/proclaw/sync/info')) {
          return { ok: true };
        }
        throw new Error('Not found');
      });

      const result = await isLanSyncAvailable();
      expect(result).toBe(true);
    });

    it('无探测目标可达时应返回 false', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await isLanSyncAvailable();
      expect(result).toBe(false);
    });
  });
});
