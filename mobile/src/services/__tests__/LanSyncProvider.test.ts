/// <reference types="jest" />

/**
 * LanSyncProvider 单元测试
 * 测试 WebSocket 连接、配对、三种同步方向、超时和身份验证
 */

import { LanSyncProvider } from '../LanSyncProvider';
import type { IDatabase } from '../DatabaseFactory';

declare const global: typeof globalThis;

// Mock dependencies
jest.mock('../ChangeLogManager', () => ({
  getPendingChanges: jest.fn(),
  markSynced: jest.fn(),
}));

jest.mock('../SyncMetadataManager', () => ({
  getDeviceId: jest.fn(),
}));

jest.mock('../SyncEngine', () => {
  const actual = jest.requireActual('../SyncEngine');
  return {
    ...actual,
    applyRemoteChanges: jest.fn(() => Promise.resolve([])),
  };
});

// WebSocket mock
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  readyState: number = WebSocket.CONNECTING;
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    // Simulated: subclasses override in tests
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  // Helper to simulate open
  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  // Helper to simulate message
  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  // Helper to simulate error
  simulateError(): void {
    this.onerror?.();
  }
}

// Store mock WebSocket factory
let mockWsInstance: MockWebSocket | null = null;
const originalWebSocket = global.WebSocket;

describe('LanSyncProvider', () => {
  let provider: LanSyncProvider;
  let mockDb: IDatabase;

  beforeAll(() => {
    (global as any).WebSocket = jest.fn((url: string) => {
      mockWsInstance = new MockWebSocket(url);
      return mockWsInstance;
    }) as any;
  });

  afterAll(() => {
    global.WebSocket = originalWebSocket;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWsInstance = null;

    provider = new LanSyncProvider();

    mockDb = {
      execAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      closeAsync: jest.fn(),
    };

    const { getPendingChanges, markSynced } = require('../ChangeLogManager');
    const { getDeviceId } = require('../SyncMetadataManager');
    getPendingChanges.mockResolvedValue([]);
    markSynced.mockResolvedValue(undefined);
    getDeviceId.mockResolvedValue('device_test_001');
  });

  describe('connect', () => {
    it('should successfully connect and pair', async () => {
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );

      // Simulate WebSocket open
      expect(mockWsInstance).not.toBeNull();
      mockWsInstance!.simulateOpen();

      // Simulate pair_ack
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));

      const result = await connectPromise;
      expect(result).toBe(true);
      expect(provider.pairingStatus).toBe('connected');
    });

    it('should reject on incorrect pairing code', async () => {
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '000000',
        mockDb,
      );

      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: false }));

      const result = await connectPromise;
      expect(result).toBe(false);
      expect(provider.pairingStatus).toBe('error');
    });

    it('should handle connection timeout', async () => {
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );

      // Don't simulate open -> will time out (5s timeout)
      // We just verify the promise rejects eventually
      const result = await connectPromise;
      expect(result).toBe(false);
    }, 10000);

    it('should handle WebSocket error', async () => {
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );

      mockWsInstance!.simulateError();

      const result = await connectPromise;
      expect(result).toBe(false);
    });
  });

  describe('sync - send_only', () => {
    it('should send pending changes to remote', async () => {
      // First connect
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );
      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));
      await connectPromise;

      // Mock pending changes
      const { getPendingChanges } = require('../ChangeLogManager');
      getPendingChanges.mockResolvedValue([
        { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{}', timestamp: 1000, sync_status: 'pending' },
      ]);

      // Use a spy to capture WebSocket sends
      const wsSpy = jest.fn();
      mockWsInstance!.send = wsSpy;

      const result = await provider.sync('send_only');

      expect(result.success).toBe(true);
      expect(result.applied).toBe(1);
      // Verify that send was called with serialized changes
      expect(wsSpy).toHaveBeenCalled();
      const sentData = JSON.parse(wsSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('sync_push');
    });

    it('should handle sync when not connected', async () => {
      const result = await provider.sync('send_only');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Not connected');
    });
  });

  describe('sync - receive_only', () => {
    it('should pull and apply remote changes', async () => {
      // First connect
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );
      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));
      await connectPromise;

      const wsSpy = jest.fn();
      mockWsInstance!.send = wsSpy;

      // Start sync_receive_only and simulate response
      const syncPromise = provider.sync('receive_only');

      // Simulate delayed sync_data response
      setTimeout(() => {
        mockWsInstance!.simulateMessage(JSON.stringify({
          type: 'sync_data',
          changes: JSON.stringify({
            product_spu: [
              { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{"name":"商品"}', timestamp: 2000, sync_status: 'pending' },
            ],
          }),
          deviceId: 'remote_device',
          timestamp: 3000,
        }));
      }, 50);

      const result = await syncPromise;

      expect(result.success).toBe(true);
      // Verify sync_pull was sent
      const sentData = JSON.parse(wsSpy.mock.calls[0][0]);
      expect(sentData.type).toBe('sync_pull');
    });
  });

  describe('sync - merge', () => {
    it('should send local changes and pull remote changes', async () => {
      // First connect
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );
      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));
      await connectPromise;

      const { getPendingChanges } = require('../ChangeLogManager');
      getPendingChanges.mockResolvedValue([
        { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{}', timestamp: 1000, sync_status: 'pending' },
      ]);

      const wsSpy = jest.fn();
      mockWsInstance!.send = wsSpy;

      const syncPromise = provider.sync('merge');

      // Simulate sync_data response
      setTimeout(() => {
        mockWsInstance!.simulateMessage(JSON.stringify({
          type: 'sync_data',
          changes: JSON.stringify({
            customers: [
              { id: 2, table_name: 'customers', row_id: 'c1', operation: 'update', old_value: null, new_value: '{"name":"客户"}', timestamp: 2000, sync_status: 'pending' },
            ],
          }),
          deviceId: 'remote_device',
          timestamp: 3000,
        }));
      }, 50);

      const result = await syncPromise;

      expect(result.success).toBe(true);
      // Should have sent sync_push and sync_pull
      expect(wsSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket and reset state', async () => {
      // First connect
      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );
      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));
      await connectPromise;

      expect(provider.pairingStatus).toBe('connected');
      await provider.disconnect();
      expect(provider.pairingStatus).toBe('idle');
    });
  });

  describe('status callback', () => {
    it('should notify status changes via callback', async () => {
      const statusCallback = jest.fn();
      provider.setStatusCallback(statusCallback);

      const connectPromise = provider.connect(
        { id: 'd1', name: '桌面端', ip: '192.168.1.10', port: 8889, profileId: 'profile_001', deviceType: 'desktop', lastSeen: Date.now() },
        '123456',
        mockDb,
      );
      mockWsInstance!.simulateOpen();
      mockWsInstance!.simulateMessage(JSON.stringify({ type: 'pair_ack', success: true }));
      await connectPromise;

      expect(statusCallback).toHaveBeenCalledWith('pairing');
      expect(statusCallback).toHaveBeenCalledWith('connected');
    });
  });
});
