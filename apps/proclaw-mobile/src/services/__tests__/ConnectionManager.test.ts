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
  parseQRCodeData,
  calculateHealthScore,
  getCheckInterval,
  getConnectionHealth,
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

  // P2 项 1：二维码解析纯函数
  describe('parseQRCodeData', () => {
    it('有效 JSON 格式应解析出 serverUrl 与 6 位 code', () => {
      const payload = parseQRCodeData('{"serverUrl":"http://192.168.1.100:8888","code":"123456"}');
      expect(payload).toEqual({
        serverUrl: 'http://192.168.1.100:8888',
        code: '123456',
      });
    });

    it('https 协议也应接受', () => {
      const payload = parseQRCodeData('{"serverUrl":"https://proclaw.example.com","code":"888888"}');
      expect(payload).toEqual({
        serverUrl: 'https://proclaw.example.com',
        code: '888888',
      });
    });

    it('code 为数字类型时也应接受（强转为字符串）', () => {
      const payload = parseQRCodeData('{"serverUrl":"http://192.168.1.100:8888","code":654321}');
      expect(payload).toEqual({
        serverUrl: 'http://192.168.1.100:8888',
        code: '654321',
      });
    });

    it('serverUrl 缺少协议时返回 null', () => {
      const payload = parseQRCodeData('{"serverUrl":"192.168.1.100:8888","code":"123456"}');
      expect(payload).toBeNull();
    });

    it('code 不是 6 位数字时返回 null', () => {
      expect(parseQRCodeData('{"serverUrl":"http://x.com","code":"12345"}')).toBeNull();
      expect(parseQRCodeData('{"serverUrl":"http://x.com","code":"1234567"}')).toBeNull();
      expect(parseQRCodeData('{"serverUrl":"http://x.com","code":"abcdef"}')).toBeNull();
    });

    it('缺少 serverUrl 字段时返回 null', () => {
      expect(parseQRCodeData('{"code":"123456"}')).toBeNull();
    });

    it('缺少 code 字段时返回 null', () => {
      expect(parseQRCodeData('{"serverUrl":"http://x.com"}')).toBeNull();
    });

    it('损坏的 JSON 应返回 null', () => {
      expect(parseQRCodeData('{not valid json')).toBeNull();
    });

    it('非 JSON 纯文本应返回 null', () => {
      expect(parseQRCodeData('hello world')).toBeNull();
      expect(parseQRCodeData('123456')).toBeNull();
    });

    it('空字符串 / null / 非字符串应返回 null', () => {
      expect(parseQRCodeData('')).toBeNull();
      // @ts-expect-error 故意测试非字符串输入
      expect(parseQRCodeData(null)).toBeNull();
      // @ts-expect-error 故意测试非字符串输入
      expect(parseQRCodeData(undefined)).toBeNull();
    });

    it('JSON 数组（而非对象）应返回 null', () => {
      expect(parseQRCodeData('["http://x.com","123456"]')).toBeNull();
    });
  });

  // P4: 连接健康度评分测试
  describe('calculateHealthScore', () => {
    it('连续成功应提高健康分', () => {
      const health = { score: 0, latency: 100, successCount: 5, failCount: 0, lastCheck: Date.now() };
      expect(calculateHealthScore(health)).toBeGreaterThan(50);
    });

    it('连续失败应降低健康分', () => {
      const health = { score: 0, latency: -1, successCount: 0, failCount: 5, lastCheck: Date.now() };
      expect(calculateHealthScore(health)).toBeLessThan(50);
    });


    it('高延迟应惩罚健康分', () => {
      const healthLow = { score: 0, latency: 100, successCount: 2, failCount: 0, lastCheck: Date.now() };
      const healthHigh = { score: 0, latency: 2000, successCount: 2, failCount: 0, lastCheck: Date.now() };
      expect(calculateHealthScore(healthHigh)).toBeLessThan(calculateHealthScore(healthLow));
    });

    it('健康分应在 0-100 范围内', () => {
      const health = { score: 0, latency: -1, successCount: 0, failCount: 0, lastCheck: Date.now() };
      const score = calculateHealthScore(health);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getCheckInterval', () => {
    it('健康分 >= 80 应返回 60s 间隔（HEALTHY）', () => {
      const healthy = { score: 80, latency: 100, successCount: 5, failCount: 0, lastCheck: Date.now() };
      expect(getCheckInterval(healthy)).toBe(60000);
    });

    it('健康分 >= 50 且 < 80 应返回 30s 间隔（FAIR）', () => {
      const fair = { score: 50, latency: 100, successCount: 2, failCount: 0, lastCheck: Date.now() };
      expect(getCheckInterval(fair)).toBe(30000);
    });


    it('健康分 < 50 应返回 10s 间隔（POOR）', () => {
      const poor = { score: 30, latency: -1, successCount: 0, failCount: 3, lastCheck: Date.now() };
      expect(getCheckInterval(poor)).toBe(10000);
    });
  });

  describe('getConnectionHealth', () => {
    it('应返回当前健康度状态的副本', () => {
      const health = getConnectionHealth();
      expect(health).toHaveProperty('score');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('successCount');
      expect(health).toHaveProperty('failCount');
      expect(health).toHaveProperty('lastCheck');
    });
  });
});
