import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isTauri, safeInvoke } from '../tauri';
import { syncAITeamGroups } from '../contactService';
import type { AiTeam, TeamMember } from '../teamTypes';

export const teamsQueryKey = ['teams'] as const;

function getBuiltinTeamMembers(): TeamMember[] {
  return [
    { agent_id: 'builtin-inventory-optimizer', role: '库存优化师', responsibilities: '监控库存水平，预警低库存商品。', sort_order: 0 },
    { agent_id: 'builtin-sales-forecaster', role: '销售预测分析师', responsibilities: '分析历史销售趋势，预测未来销量。', sort_order: 1 },
    { agent_id: 'builtin-business-analyst', role: '业务分析师', responsibilities: '多维度业务分析，KPI 监控与解读。', sort_order: 2 },
    { agent_id: 'builtin-purchase-advisor', role: '采购顾问', responsibilities: '根据库存和销售数据生成采购建议。', sort_order: 3 },
    { agent_id: 'builtin-financial-advisor', role: '财务分析师', responsibilities: '监控现金流健康度，分析应收应付结构。', sort_order: 4 },
    { agent_id: 'builtin-cs-agent', role: '客户服务助手', responsibilities: '自动处理客户咨询、订单查询。', sort_order: 5 },
    { agent_id: 'builtin-image-searcher', role: 'AI智能找图', responsibilities: '根据商品名称和描述自动搜索高质量产品图片。', sort_order: 6 },
    { agent_id: 'builtin-content-creator', role: '自媒体运营官', responsibilities: '策划并生成社交媒体内容。', sort_order: 7 },
  ];
}

function getMockBuiltinTeams(): AiTeam[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'mock-builtin-team-biz-ops',
      name: 'AI 经营团队',
      description: 'ProClaw 内置的 AI 经营团队，包含 8 个专业 Agent。',
      category: '通用经营',
      config_json: '{}',
      source: 'builtin',
      version: '1.0.0',
      publish_status: 'draft',
      tags: ['库存管理', '销售预测', '数据分析'],
      members: getBuiltinTeamMembers(),
      workflow: { mode: 'sequential', steps: [], fallback_strategy: 'skip_on_error' },
      triggers: {},
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock-builtin-team-social-cn',
      name: '国内社媒运营 Team',
      description: '国内市场社媒运营团队。',
      category: '社媒运营',
      config_json: '{}',
      source: 'builtin',
      version: '1.0.0',
      publish_status: 'draft',
      tags: ['微信公众号', '小红书', '知乎', '微博'],
      members: [
        { agent_id: 'ma_social_cn', role: '微信公众号运营', responsibilities: '深度文章与品牌建设。', sort_order: 0 },
        { agent_id: 'ma_social_cn', role: '小红书运营', responsibilities: '种草笔记与好物推荐。', sort_order: 1 },
      ],
      workflow: { mode: 'sequential', steps: [], fallback_strategy: 'skip_on_error' },
      triggers: {},
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock-builtin-team-social-us-eu',
      name: '欧美社媒运营 Team',
      description: '欧美市场社媒运营团队。',
      category: '社媒运营',
      config_json: '{}',
      source: 'builtin',
      version: '1.0.0',
      publish_status: 'draft',
      tags: ['Twitter/X', 'Facebook', 'Instagram'],
      members: [
        { agent_id: 'ma_social_us', role: 'Twitter/X Manager', responsibilities: '实时互动与技术讨论。', sort_order: 0 },
        { agent_id: 'ma_social_us', role: 'Facebook Manager', responsibilities: '社群建设与页面管理。', sort_order: 1 },
      ],
      workflow: { mode: 'sequential', steps: [], fallback_strategy: 'skip_on_error' },
      triggers: {},
      created_at: now,
      updated_at: now,
    },
  ];
}

async function dedupeTeams(teams: AiTeam[]): Promise<{ teams: AiTeam[]; dupCount: number }> {
  const seen = new Map<string, AiTeam>();
  let dupCount = 0;
  for (const team of teams) {
    if (seen.has(team.name)) {
      dupCount += 1;
      safeInvoke('delete_team', { id: team.id }).catch(() => {});
    } else {
      seen.set(team.name, team);
    }
  }
  return { teams: Array.from(seen.values()), dupCount };
}

export async function fetchTeams(): Promise<{ teams: AiTeam[]; dupCount: number }> {
  const result = await safeInvoke<AiTeam[]>('get_teams');
  if (result) {
    const deduped = await dedupeTeams(result);
    syncAITeamGroups(deduped.teams);
    return deduped;
  }
  if (!isTauri()) {
    const mockTeams = getMockBuiltinTeams();
    syncAITeamGroups(mockTeams);
    return { teams: mockTeams, dupCount: 0 };
  }
  return { teams: [], dupCount: 0 };
}

export function useTeams() {
  return useQuery({
    queryKey: teamsQueryKey,
    queryFn: fetchTeams,
    select: (data) => data.teams,
  });
}

export function useInvalidateTeams() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: teamsQueryKey });
}