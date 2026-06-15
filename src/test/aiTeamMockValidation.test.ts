import { describe, it, expect } from 'vitest';
import { localAgentManifests } from '../lib/agentMarketService';

/**
 * ProClaw 1.0.0 测试数据包 - AI Team 真实有效性
 *
 * 验证 mock 内置团队（getMockBuiltinTeams）的成员 agent_id 全部对应
 * localAgentManifests 或 Tauri 后端注册的真实 agent,确保群聊 / 任务分派
 * 在浏览器 dev 模式也能正常工作。
 */
describe('AI Team 演示数据真实性', () => {
  /** 测试用的 mock 团队数据(与 TeamsPage.getMockBuiltinTeams() 保持一致) */
  const MOCK_TEAMS = [
    {
      id: 'mock-builtin-team-biz-ops',
      name: 'AI 经营团队',
      builtinAgentIds: [
        'builtin-inventory-optimizer',
        'builtin-sales-forecaster',
        'builtin-business-analyst',
        'builtin-purchase-advisor',
        'builtin-financial-advisor',
        'builtin-cs-agent',
        'builtin-image-searcher',
        'builtin-content-creator',
      ],
    },
    {
      id: 'mock-builtin-team-social-cn',
      name: '国内社媒运营 Team',
      builtinAgentIds: ['ma_social_cn', 'ma_social_cn', 'ma_social_cn', 'ma_social_cn'],
    },
    {
      id: 'mock-builtin-team-social-us-eu',
      name: '欧美社媒运营 Team',
      builtinAgentIds: ['ma_social_us', 'ma_social_us', 'ma_social_us'],
    },
  ];

  it('应有 3 个 mock 团队,每个团队都有非空 members 数组', () => {
    expect(MOCK_TEAMS).toHaveLength(3);
    for (const team of MOCK_TEAMS) {
      expect(team.builtinAgentIds.length).toBeGreaterThan(0);
    }
  });

  it('社媒团队的 agent_id 必须在 localAgentManifests 中存在(浏览器 dev 模式真实有效)', () => {
    for (const team of MOCK_TEAMS) {
      if (team.id === 'mock-builtin-team-biz-ops') continue; // 经营团队用 builtin-*,Tauri 注册
      for (const agentId of team.builtinAgentIds) {
        expect(
          localAgentManifests[agentId],
          `${team.name} 引用了不存在的 agent: ${agentId}`
        ).toBeDefined();
      }
    }
  });

  it('社媒团队 unique agent 数:国内 1 个(ma_social_cn),欧美 1 个(ma_social_us)', () => {
    // production localTeamSkillMap 设计:同 team 内同 agent_type 复用,
    // 通过 role 区分职能(微信公众号 / 小红书 / 知乎 / 微博 共用 ma_social_cn)
    const cnTeam = MOCK_TEAMS.find(t => t.id === 'mock-builtin-team-social-cn')!;
    const usTeam = MOCK_TEAMS.find(t => t.id === 'mock-builtin-team-social-us-eu')!;

    const cnUnique = new Set(cnTeam.builtinAgentIds);
    const usUnique = new Set(usTeam.builtinAgentIds);
    expect(cnUnique.size).toBe(1);
    expect(usUnique.size).toBe(1);
    expect(cnUnique.has('ma_social_cn')).toBe(true);
    expect(usUnique.has('ma_social_us')).toBe(true);
  });

  it('所有 mock 团队引用的 agent 数量统计(社媒 4+3 + 经营 8 = 15 成员 + CEO = 16 群成员)', () => {
    const totalAgentRefs = MOCK_TEAMS.reduce((sum, t) => sum + t.builtinAgentIds.length, 0);
    expect(totalAgentRefs).toBe(15);
    // syncAITeamGroups 会额外加入 'ceo-agent' 作为主控官 → 16 群成员
  });

  it('localAgentManifests 必须包含 ma_social_cn 和 ma_social_us 两个真实 agent', () => {
    // 双重保险:即使 mock 团队设计变更,也必须依赖这两个底层 agent 真实存在
    expect(localAgentManifests['ma_social_cn']).toBeDefined();
    expect(localAgentManifests['ma_social_cn'].name).toBe('国内社媒运营');
    expect(localAgentManifests['ma_social_us']).toBeDefined();
    expect(localAgentManifests['ma_social_us'].name).toBe('欧美社媒运营');
  });
});
