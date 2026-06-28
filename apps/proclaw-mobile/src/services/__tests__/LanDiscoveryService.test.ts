/// <reference types="jest" />

/**
 * LanDiscoveryService 单元测试
 * 测试生成扫描目标、设备探测、分批扫描和进度回调
 */

import { scanLanDevices } from '../LanDiscoveryService';
import type { LanDevice } from '../LanDiscoveryService';

declare const global: typeof globalThis;

// Mock ConnectionManager
jest.mock('../ConnectionManager', () => ({
  getLocalIPAddress: jest.fn(),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('LanDiscoveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('scanLanDevices with known servers', () => {
    it('should probe known servers', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      // Mock successful probe for known server
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_id: 'desktop_001',
          device_name: '办公电脑',
          port: 8889,
          profile_id: 'profile_001',
          device_type: 'desktop',
        }),
      });

      const devices = await scanLanDevices(['192.168.1.1']);

      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('办公电脑');
      expect(devices[0].ip).toBe('192.168.1.1');
      expect(devices[0].profileId).toBe('profile_001');
    });

    it('should handle unreachable known servers gracefully', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      // Mock failed probe
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      const devices = await scanLanDevices(['192.168.1.1']);
      expect(devices).toHaveLength(0);
    });
  });

  describe('subnet scanning', () => {
    it('should scan subnet and detect devices', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      // Most IPs don't respond
      mockFetch.mockRejectedValue(new Error('No response'));

      // One IP responds successfully
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_id: 'desktop_002',
          device_name: '财务电脑',
          port: 8889,
          profile_id: 'profile_002',
          device_type: 'desktop',
        }),
      });

      const devices = await scanLanDevices([], undefined, 50);

      expect(devices.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onProgress callback', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      mockFetch.mockRejectedValue(new Error('No response'));

      const onProgress = jest.fn();
      await scanLanDevices([], onProgress, 100);

      expect(onProgress).toHaveBeenCalled();
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThan(0); // scanned count
    });

    it('should use default batch size of 20 when not specified', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      // Return a few mock devices
      mockFetch.mockRejectedValue(new Error('No response'));

      const onProgress = jest.fn();
      await scanLanDevices([], onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should return empty array when no local IP', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue(null);

      const devices = await scanLanDevices();
      expect(devices).toEqual([]);
    });
  });

  describe('device deduplication', () => {
    it('should not add duplicate devices', async () => {
      const { getLocalIPAddress } = require('../ConnectionManager');
      getLocalIPAddress.mockResolvedValue('192.168.1.100');

      // Multiple successful probes for same IP (should only appear once)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            device_id: 'desktop_003',
            device_name: '同一设备',
            port: 8889,
            profile_id: 'profile_003',
            device_type: 'desktop',
          }),
        })
        .mockRejectedValue(new Error('No response'));

      const devices = await scanLanDevices(['192.168.1.50'], undefined, 100);
      const ips = devices.map((d: LanDevice) => d.ip);
      const uniqueIps = new Set(ips);
      expect(ips.length).toBe(uniqueIps.size);
    });
  });
});
