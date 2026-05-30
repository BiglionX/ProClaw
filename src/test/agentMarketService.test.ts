import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMarketService } from '../lib/agentMarketService';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();
vi.stubGlobal('window', { dispatchEvent: mockDispatchEvent });

describe('AgentMarketService.installTeamSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应当通过本地回退成功安装网站运营 AI Team（Nuwax 不可用时）', async () => {
    // 让 fetch 失败（模拟 Nuwax 不可用），触发本地回退
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    // 等待异步执行完成
    const result = await AgentMarketService.installTeamSkill('team-skill-site-ops-001');

    // 验证返回结果
    expect(result.success).toBe(true);
    expect(result.installedAgents.length).toBe(4);
    expect(result.installedAgents).toContain('ma_site_seo');
    expect(result.installedAgents).toContain('ma_content_gen');
    expect(result.installedAgents).toContain('ma_site_analytics');
    expect(result.installedAgents).toContain('ma_conversion');
    expect(result.message).toContain('成功安装 4/4 个 Agents');
    expect(result.message).toContain('网站运营 AI Team');
  });

  it('应当通过本地回退成功安装欧美社媒运营 Team', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    const result = await AgentMarketService.installTeamSkill('team-skill-social-us-eu-001');

    expect(result.success).toBe(true);
    expect(result.installedAgents.length).toBe(3);
    expect(result.installedAgents.filter(a => a === 'ma_social_us').length).toBe(3);
  });

  it('应当通过本地回退成功安装东南亚社媒运营 Team', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    const result = await AgentMarketService.installTeamSkill('team-skill-social-sea-001');

    expect(result.success).toBe(true);
    expect(result.installedAgents.length).toBe(3);
    expect(result.installedAgents).toContain('ma_social_sea');
  });

  it('应当通过本地回退成功安装国内社媒运营 Team', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    const result = await AgentMarketService.installTeamSkill('team-skill-social-cn-001');

    expect(result.success).toBe(true);
    expect(result.installedAgents.length).toBe(4);
    expect(result.installedAgents.every(a => a === 'ma_social_cn')).toBe(true);
  });

  it('当 Team Skill ID 不存在时应抛出错误', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    await expect(
      AgentMarketService.installTeamSkill('non-existent-id')
    ).rejects.toThrow('not found');
  });

  it('应当触发 agents-changed 事件通知前端刷新', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    await AgentMarketService.installTeamSkill('team-skill-site-ops-001');

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'proclaw:agents-changed'
      })
    );
  });

  it('当 Nuwax 在线时应优先使用在线数据', async () => {
    // 模拟 Nuwax 返回在线数据
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/team-skills/team-skill-site-ops-001')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'team-skill-site-ops-001',
              name: '网站运营 AI Team (online)',
              category: 'website_operations',
              roles: [
                { role: 'SEO 优化专家', specialty: 'SEO', agent_type: 'ma_site_seo' },
                { role: '内容生成专家', specialty: '内容', agent_type: 'ma_content_gen' }
              ]
            }
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    const result = await AgentMarketService.installTeamSkill('team-skill-site-ops-001');

    expect(result.success).toBe(true);
    expect(result.installedAgents.length).toBe(2);
    expect(result.message).toContain('网站运营 AI Team (online)');
  });

  it('当 invoke 安装 Agent 失败时应跳过该 Agent 继续安装其他 Agent', async () => {
    mockFetch.mockRejectedValue(new Error('Nuwax not available'));

    // 模拟 invoke 对 'ma_site_seo' 抛出错误
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    vi.mocked(tauriInvoke).mockImplementation(async (_cmd: string, args?: any) => {
      if (args?.name === 'SEO 优化专家') {
        throw new Error('Install failed');
      }
      return args?.name || 'agent_id';
    });

    const result = await AgentMarketService.installTeamSkill('team-skill-site-ops-001');

    // 3 个成功（跳过 ma_site_seo）
    expect(result.installedAgents.length).toBe(3);
    expect(result.installedAgents).not.toContain('ma_site_seo');
  });
});
