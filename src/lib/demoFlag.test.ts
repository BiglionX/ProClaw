/**
 * demoFlag 工具单元测试（ProClaw 1.0.0）
 *
 * 覆盖：
 * - isDemoAccountContext：当前用户是否为演示账号
 * - isDemoDataInitialized / readDemoFlag / markAsDemoData 的读写一致性
 * - updateDemoFlag / recordDemoReset 的字段合并
 * - clearDemoData / isDemoResource 的资源类型判断
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isDemoAccountContext,
  isDemoDataInitialized,
  readDemoFlag,
  markAsDemoData,
  updateDemoFlag,
  recordDemoReset,
  clearDemoData,
  isDemoResource,
  type DemoFlagPayload,
} from './demoFlag';

const DEMO_USER = {
  id: 'mock-boss',
  email: 'boss@proclaw.demo',
  name: '演示老板',
  role: 'admin',
};

const REGULAR_USER = {
  id: 'user-001',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'member',
};

function setCurrentUser(user: any | null) {
  if (user) {
    localStorage.setItem('proclaw_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('proclaw_user');
  }
}

describe('demoFlag', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
  });

  describe('isDemoAccountContext', () => {
    it('无用户时返回 false', () => {
      setCurrentUser(null);
      expect(isDemoAccountContext()).toBe(false);
    });

    it('非演示用户邮箱时返回 false', () => {
      setCurrentUser(REGULAR_USER);
      expect(isDemoAccountContext()).toBe(false);
    });

    it('boss@proclaw.demo 时返回 true', () => {
      setCurrentUser(DEMO_USER);
      expect(isDemoAccountContext()).toBe(true);
    });

    it('localStorage 抛错时不崩溃', () => {
      setCurrentUser(DEMO_USER);
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(isDemoAccountContext()).toBe(false);
      spy.mockRestore();
    });
  });

  describe('isDemoDataInitialized', () => {
    it('未设置 flag 时返回 false', () => {
      expect(isDemoDataInitialized()).toBe(false);
    });

    it('设置 flag 后返回 true', () => {
      const payload: DemoFlagPayload = {
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: ['AI 经营团队'],
        pluginIds: ['ma_foreign_counter'],
        initializedAt: new Date().toISOString(),
      };
      markAsDemoData(payload);
      expect(isDemoDataInitialized()).toBe(true);
    });
  });

  describe('readDemoFlag', () => {
    it('未设置时返回 null', () => {
      expect(readDemoFlag()).toBeNull();
    });

    it('能完整读取写入的 payload', () => {
      const payload: DemoFlagPayload = {
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: ['A', 'B', 'C'],
        pluginIds: ['p1'],
        initializedAt: '2026-06-14T10:00:00Z',
        resetCount: 2,
        lastResetAt: '2026-06-14T11:00:00Z',
      };
      markAsDemoData(payload);
      const read = readDemoFlag();
      expect(read).not.toBeNull();
      expect(read?.productsCount).toBe(20);
      expect(read?.teamNames).toEqual(['A', 'B', 'C']);
      expect(read?.resetCount).toBe(2);
    });

    it('损坏 JSON 时返回 null', () => {
      localStorage.setItem('proclaw_demo_flag_v1', '{not valid json}');
      expect(readDemoFlag()).toBeNull();
    });
  });

  describe('markAsDemoData', () => {
    it('写入成功', () => {
      const payload: DemoFlagPayload = {
        version: '1.0.0',
        productsCount: 0,
        cloudStoreSubdomain: 'demo',
        teamNames: [],
        pluginIds: [],
        initializedAt: new Date().toISOString(),
      };
      markAsDemoData(payload);
      expect(readDemoFlag()?.version).toBe('1.0.0');
    });

    it('二次写入会覆盖', () => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: ['A'],
        pluginIds: [],
        initializedAt: '2026-01-01',
      });
      markAsDemoData({
        version: '1.0.1',
        productsCount: 25,
        cloudStoreSubdomain: 'demo',
        teamNames: ['A', 'B'],
        pluginIds: [],
        initializedAt: '2026-02-01',
      });
      const flag = readDemoFlag();
      expect(flag?.version).toBe('1.0.1');
      expect(flag?.productsCount).toBe(25);
      expect(flag?.initializedAt).toBe('2026-02-01');
    });
  });

  describe('updateDemoFlag', () => {
    it('不存在 flag 时为 no-op', () => {
      updateDemoFlag({ resetCount: 5 });
      expect(readDemoFlag()).toBeNull();
    });

    it('合并新字段但保留未指定字段', () => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: ['A'],
        pluginIds: ['p1'],
        initializedAt: '2026-01-01',
      });
      updateDemoFlag({ resetCount: 3 });
      const flag = readDemoFlag();
      expect(flag?.productsCount).toBe(20);
      expect(flag?.teamNames).toEqual(['A']);
      expect(flag?.resetCount).toBe(3);
    });
  });

  describe('recordDemoReset', () => {
    it('首次重置：resetCount 从 0 -> 1', () => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: [],
        pluginIds: [],
        initializedAt: '2026-01-01',
      });
      recordDemoReset();
      const flag = readDemoFlag();
      expect(flag?.resetCount).toBe(1);
      expect(flag?.lastResetAt).toBeTruthy();
    });

    it('连续重置：resetCount 单调递增', () => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: [],
        pluginIds: [],
        initializedAt: '2026-01-01',
      });
      recordDemoReset();
      recordDemoReset();
      recordDemoReset();
      expect(readDemoFlag()?.resetCount).toBe(3);
    });
  });

  describe('clearDemoData', () => {
    it('清除后 isDemoDataInitialized 返回 false', () => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: [],
        pluginIds: [],
        initializedAt: '2026-01-01',
      });
      expect(isDemoDataInitialized()).toBe(true);
      clearDemoData();
      expect(isDemoDataInitialized()).toBe(false);
      expect(readDemoFlag()).toBeNull();
    });
  });

  describe('isDemoResource', () => {
    beforeEach(() => {
      markAsDemoData({
        version: '1.0.0',
        productsCount: 20,
        cloudStoreSubdomain: 'demo',
        teamNames: ['AI 经营团队', '国内社媒运营 Team'],
        pluginIds: ['ma_foreign_counter'],
        initializedAt: '2026-01-01',
      });
    });

    it('cloudStore 子域名匹配时返回 true', () => {
      expect(isDemoResource('cloudStore', 'demo')).toBe(true);
      expect(isDemoResource('cloudStore', 'other')).toBe(false);
    });

    it('team 名称匹配时返回 true', () => {
      expect(isDemoResource('team', 'AI 经营团队')).toBe(true);
      expect(isDemoResource('team', '海外社媒')).toBe(false);
    });

    it('plugin id 匹配时返回 true', () => {
      expect(isDemoResource('plugin', 'ma_foreign_counter')).toBe(true);
      expect(isDemoResource('plugin', 'unknown')).toBe(false);
    });

    it('product 类型恒为 false（产品判断交给后端）', () => {
      expect(isDemoResource('product', 'any-id')).toBe(false);
    });

    it('flag 缺失时所有判断都返回 false', () => {
      clearDemoData();
      expect(isDemoResource('cloudStore', 'demo')).toBe(false);
      expect(isDemoResource('team', 'AI 经营团队')).toBe(false);
      expect(isDemoResource('plugin', 'ma_foreign_counter')).toBe(false);
    });
  });
});
