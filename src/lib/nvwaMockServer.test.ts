/**
 * nvwaMockServer 单元测试（任务 #6：Agent 市场 mock）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nvwaMockServer } from './nvwaMockServer';
import type { ListParams } from '../types/nvwax';

describe('nvwaMockServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchAgents', () => {
    it('返回 Agent 列表', async () => {
      const result = await nvwaMockServer.searchAgents();
      expect(result.agents).toBeDefined();
      expect(result.agents.length).toBeGreaterThan(0);
      expect(result.pagination?.total ?? 0).toBeGreaterThan(0);
    });

    it('关键词搜索过滤结果', async () => {
      const result = await nvwaMockServer.searchAgents({ q: '财务' });
      expect(result.agents.length).toBeGreaterThan(0);
      // 所有结果应包含"财务"关键词
      const allMatch = result.agents.every(a =>
        a.name.includes('财务') ||
        (a.description ?? '').includes('财务') ||
        a.tags.some(t => t.includes('财务'))
      );
      expect(allMatch).toBe(true);
    });

    it('按分类过滤', async () => {
      const result = await nvwaMockServer.searchAgents({ category: 'cat-finance' });
      expect(result.agents.every(a => a.category === 'cat-finance')).toBe(true);
    });

    it('按 tags 过滤', async () => {
      const result = await nvwaMockServer.searchAgents({ tags: '客服' });
      expect(result.agents.every(a => a.tags.includes('客服'))).toBe(true);
    });

    it('分页参数生效', async () => {
      const result = await nvwaMockServer.searchAgents({ page: 1, limit: 2 });
      expect(result.agents.length).toBeLessThanOrEqual(2);
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(2);
    });
  });

  describe('getAgentDetail', () => {
    it('返回存在的 Agent 详情', async () => {
      const detail = await nvwaMockServer.getAgentDetail('ma-mock-001');
      expect(detail.id).toBe('ma-mock-001');
      expect(detail.name).toBeTruthy();
      expect(detail.tags).toBeDefined();
      expect(detail.config).toBeDefined();
    });

    it('不存在的 ID 抛错', async () => {
      await expect(
        nvwaMockServer.getAgentDetail('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('getCategories', () => {
    it('返回分类列表', async () => {
      const categories = await nvwaMockServer.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].id).toBeTruthy();
      expect(categories[0].name).toBeTruthy();
    });
  });

  describe('getIndustries', () => {
    it('返回行业列表', async () => {
      const industries = await nvwaMockServer.getIndustries();
      expect(industries.length).toBeGreaterThan(0);
      expect(industries[0]).toHaveProperty('agentCount');
    });
  });

  describe('searchAiTeams', () => {
    it('返回 AI Team 列表', async () => {
      const result = await nvwaMockServer.searchAiTeams();
      expect(result.aiteams.length).toBeGreaterThan(0);
      expect(result.pagination?.total ?? 0).toBeGreaterThan(0);
    });

    it('按 industry 过滤', async () => {
      const result = await nvwaMockServer.searchAiTeams({ industry: '社媒' } as ListParams);
      expect(result.aiteams.every(t => t.industry === '社媒')).toBe(true);
    });
  });

  describe('getAiTeamDetail', () => {
    it('返回 AI Team 详情', async () => {
      const detail = await nvwaMockServer.getAiTeamDetail('team-mock-001');
      expect(detail.id).toBe('team-mock-001');
      expect(detail.members).toBeDefined();
      expect(detail.members.length).toBeGreaterThan(0);
    });
  });

  describe('getTokenBalance', () => {
    it('返回 Token 余额信息', async () => {
      const balance = await nvwaMockServer.getTokenBalance();
      expect(balance.balance).toBeGreaterThan(0);
      expect(balance.total_consumed).toBeGreaterThanOrEqual(0);
      expect(balance.free_monthly_quota).toBeGreaterThan(0);
    });
  });

  describe('getUsageStats', () => {
    it('返回使用统计', async () => {
      const stats = await nvwaMockServer.getUsageStats();
      expect(stats.calls).toBeGreaterThanOrEqual(0);
      expect(stats.total_tokens).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.daily)).toBe(true);
      expect(stats.daily.length).toBe(7); // 7 天
    });
  });

  describe('search', () => {
    it('全局搜索返回综合结果', async () => {
      const result = await nvwaMockServer.search({ q: 'Agent' });
      expect(result.agents).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.agents.length + result.skills.length).toBeGreaterThan(0);
    });
  });

  describe('exportData', () => {
    it('返回导出 URL', async () => {
      const result = await nvwaMockServer.exportData([
        { type: 'agent', id: 'c1' },
        { type: 'aiteam', id: 'o1' },
      ]);
      expect(result.url).toMatch(/^https?:\/\//);
    });
  });
});
