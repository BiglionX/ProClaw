/**
 * Agent 市场数据服务
 * 调用 Tauri 后端命令获取数据，Tauri 不可用时回退到 mock 数据
 */

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export interface MarketAgentItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  permissions: string[];
  price: number; // 0 为免费
  category: string;
  downloads: number;
  rating: number;
  screenshots: string[];
  homepage?: string;
  /** 可选：manifest 签名（十六进制） */
  signature?: string;
  /** 可选：签名密钥（十六进制） */
  secretKey?: string;
  /** 可选：包完整性校验和（SHA-256） */
  checksum?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Mock 市场数据 - Tauri 不可用时的回退 */
const mockAgents: MarketAgentItem[] = [
  {
    id: 'ma_task', name: '任务管理 Agent', version: '1.0.0',
    description: '看板式任务管理，支持任务分配、进度跟踪、优先级排序，适用于项目制团队协作。',
    author: 'ProClaw 官方', icon: 'assignment',
    permissions: ['read_user', 'send_message', 'show_notification'],
    price: 0, category: '协作', downloads: 1280, rating: 4.5, screenshots: [],
  },
  {
    id: 'ma_crm', name: '客户关系 Agent', version: '1.0.0',
    description: '管理客户联系人、沟通记录、商机跟踪，支持自定义字段和标签分类。',
    author: 'ProClaw 官方', icon: 'contacts',
    permissions: ['read_user', 'read_contacts', 'send_message'],
    price: 0, category: '销售', downloads: 960, rating: 4.3, screenshots: [],
  },
  {
    id: 'ma_doc', name: '文档协作 Agent', version: '1.0.0',
    description: 'Markdown 编辑器，支持版本历史、实时协作、文档分类归档。',
    author: 'ProClaw 官方', icon: 'description',
    permissions: ['read_user', 'read_files', 'write_files'],
    price: 0, category: '协作', downloads: 750, rating: 4.1, screenshots: [],
  },
  {
    id: 'ma_time', name: '时间追踪 Agent', version: '0.9.0',
    description: '记录工作耗时，生成时间报表，帮助团队分析效率瓶颈。',
    author: '第三方开发者', icon: 'timer',
    permissions: ['read_user', 'show_notification'],
    price: 19.9, category: '效率', downloads: 320, rating: 3.8, screenshots: [],
  },
  {
    id: 'ma_hr', name: '人事管理 Agent', version: '1.0.0',
    description: '员工信息管理、考勤记录、请假审批、工资单生成。',
    author: 'ProClaw 官方', icon: 'badge',
    permissions: ['read_user', 'send_message'],
    price: 0, category: '管理', downloads: 540, rating: 4.0, screenshots: [],
  },
];

const mockCategories = ['全部', '协作', '销售', '效率', '管理'];

/**
 * 本地已内置的 Agent bundle manifest 映射表
 * 用于 installTeamSkill 在 Nuwax 不可用时直接安装本地 Agent
 */
const localAgentManifests: Record<string, {
  id: string;
  name: string;
  version: string;
  entry: string;
  permissions: string[];
  capabilities?: string[];
  icon?: string;
  description?: string;
  author?: string;
  homepage?: string;
}> = {
  'ma_site_seo': {
    id: 'ma_site_seo', name: 'SEO 优化专家', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['seo_analysis', 'keyword_tracking', 'site_audit'],
    icon: 'icon.svg',
    description: '监控官网关键词排名，自动建议优化标题、元描述、内部链接，检测死链和加载速度问题',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_site_seo'
  },
  'ma_content_gen': {
    id: 'ma_content_gen', name: '内容生成专家', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'send_message', 'show_notification'],
    capabilities: ['content_generation', 'deepseek_integration', 'boss_confirmation'],
    icon: 'icon.svg',
    description: '根据 SEO 关键词生成技术博客，使用 DeepSeek 大模型，支持 Boss 确认后自动发布',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_content_gen'
  },
  'ma_site_analytics': {
    id: 'ma_site_analytics', name: '数据分析专家', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['data_analytics', 'ga4_integration', 'trend_detection'],
    icon: 'icon.svg',
    description: '整合 Google Analytics 4 数据，生成日报/周报，发现异常趋势并发出预警',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_site_analytics'
  },
  'ma_conversion': {
    id: 'ma_conversion', name: '转化优化专家', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'send_message', 'show_notification'],
    capabilities: ['conversion_optimization', 'ab_testing', 'funnel_analysis'],
    icon: 'icon.svg',
    description: '分析用户行为漏斗，建议 A/B 测试方案，自动调整网站弹窗和 CTA 按钮',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_conversion'
  },
  'ma_social_bind': {
    id: 'ma_social_bind', name: '社媒账号绑定', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['social_account_binding', 'oauth_flow'],
    icon: 'icon.svg',
    description: '多平台社交账号 OAuth 绑定，支持 Twitter、Facebook、Instagram、TikTok、微信、小红书等',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_social_bind'
  },
  'ma_social_publisher': {
    id: 'ma_social_publisher', name: '社媒内容发布', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification', 'send_message'],
    capabilities: ['content_publishing', 'schedule_management', 'engagement_tracking'],
    icon: 'icon.svg',
    description: '社媒内容发布队列管理，支持定时发布、互动数据追踪和多平台分发',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_social_publisher'
  },
  'ma_social_us': {
    id: 'ma_social_us', name: '欧美社媒运营', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['social_media_management', 'us_eu_market'],
    icon: 'icon.svg',
    description: '欧美市场社媒运营，覆盖 Twitter/X、Facebook、Instagram、LinkedIn，英语内容，美西/美东时区',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_social_us'
  },
  'ma_social_sea': {
    id: 'ma_social_sea', name: '东南亚社媒运营', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['social_media_management', 'sea_market'],
    icon: 'icon.svg',
    description: '东南亚市场社媒运营，覆盖 TikTok、Instagram、Facebook，支持泰语/印尼语/越南语',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_social_sea'
  },
  'ma_social_cn': {
    id: 'ma_social_cn', name: '国内社媒运营', version: '1.0.0',
    entry: 'index.html',
    permissions: ['read_user', 'http_request', 'show_notification'],
    capabilities: ['social_media_management', 'cn_market'],
    icon: 'icon.svg',
    description: '国内市场社媒运营，覆盖微信公众号、小红书、知乎、微博，简体中文，合规审查',
    author: 'ProClaw 官方',
    homepage: 'https://nvwa.proclaw.cc/agents/ma_social_cn'
  },
};

/**
 * 从 Tauri 获取市场 Agent 列表（支持分页）
 */
export const AgentMarketService = {
  /** 获取 Agent 列表（分页） */
  async getAgents(category?: string, search?: string, page?: number, pageSize?: number): Promise<{ agents: MarketAgentItem[]; total: number }> {
    try {
      const result = await invoke<PaginatedResult<MarketAgentItem>>('get_market_agents', {
        category: category && category !== '全部' ? category : null,
        search: search || null,
        page: page || 1,
        pageSize: pageSize || 20,
      });
      // 转换后端字段格式
      const agents = result.data.map(a => ({
        ...a,
        icon: (a as any).icon || (a as any).icon_url || '',
        price: (a as any).price || 0,
      }));
      return { agents, total: result.total };
    } catch {
      // 回退到 mock 数据
      await new Promise(r => setTimeout(r, 300));
      let result = [...mockAgents];
      if (category && category !== '全部') {
        result = result.filter(a => a.category === category);
      }
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
      }
      return { agents: result, total: result.length };
    }
  },

  /** 获取市场分类 */
  async getCategories(): Promise<string[]> {
    try {
      const cats = await invoke<{ id: string; name: string; icon?: string }[]>('get_market_categories');
      return ['全部', ...cats.map(c => c.name)];
    } catch {
      return mockCategories;
    }
  },

  /** 获取 Agent 详情 */
  async getAgentDetail(agentId: string): Promise<MarketAgentItem | null> {
    try {
      return await invoke<MarketAgentItem>('get_market_agent_detail', { agentId });
    } catch {
      await new Promise(r => setTimeout(r, 200));
      return mockAgents.find(a => a.id === agentId) || null;
    }
  },

  /**
   * 检查 Agent 是否有更新可用
   * @param agentId 已安装 Agent 的 manifest.id
   * @param currentVersion 当前已安装版本
   * @returns 最新版本信息，无更新时返回 null
   */
  async checkAgentUpdate(agentId: string, currentVersion: string): Promise<{ latestVersion: string; marketAgent: MarketAgentItem } | null> {
    try {
      const detail = await this.getAgentDetail(agentId);
      if (!detail) return null;

      // 比较版本号（简单字符串比较，生产环境应使用 semver）
      if (detail.version !== currentVersion) {
        return { latestVersion: detail.version, marketAgent: detail };
      }
      return null;
    } catch {
      // 尝试 mock 数据
      const mockAgent = mockAgents.find(a => a.id === agentId);
      if (mockAgent && mockAgent.version !== currentVersion) {
        return { latestVersion: mockAgent.version, marketAgent: mockAgent };
      }
      return null;
    }
  },

  /** 批量检查所有已安装 Agent 的更新 */
  async checkAllAgentUpdates(installedAgents: { id: string; manifest: { id: string }; version: string }[]): Promise<{ agentId: string; latestVersion: string }[]> {
    const updates: { agentId: string; latestVersion: string }[] = [];
    for (const agent of installedAgents) {
      const marketId = agent.manifest.id || agent.id;
      const result = await this.checkAgentUpdate(marketId, agent.version);
      if (result) {
        updates.push({ agentId: agent.id, latestVersion: result.latestVersion });
      }
    }
    return updates;
  },

  /** 安装 Agent - 从市场下载包并安装 */
  async installAgent(agentId: string): Promise<{ success: boolean; agentId: string }> {
    // 先尝试从后端获取包信息
    try {
      const pkg = await invoke<{
        manifest: Record<string, unknown>;
        manifest_json: string;
        signature?: string;
        checksum?: string;
      }>('download_market_agent_package', { agentId });

      const installedId = await invoke<string>('install_agent', {
        name: pkg.manifest.name,
        version: pkg.manifest.version,
        manifestJson: pkg.manifest_json,
        dataDir: null,
      });

      return { success: true, agentId: installedId };
    } catch {
      // 回退：从 mock 数据安装
      const agent = mockAgents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found in market`);
      }

      const manifest = {
        id: agent.id,
        name: agent.name,
        version: agent.version,
        entry: 'index.html',
        permissions: agent.permissions,
        icon: agent.icon,
        description: agent.description,
        author: agent.author,
        homepage: agent.homepage || undefined,
      };

      const installedId = await invoke<string>('install_agent', {
        name: agent.name,
        version: agent.version,
        manifestJson: JSON.stringify(manifest),
        dataDir: null,
      });

      return { success: true, agentId: installedId };
    }
  },

  /**
   * 更新 Agent 到最新版本
   */
  async updateAgent(agentId: string, newManifestJson: string, newVersion: string): Promise<{ success: boolean }> {
    try {
      await invoke('update_agent', {
        agentId,
        newVersion,
        newManifestJson,
        newDataDir: null,
      });
      return { success: true };
    } catch {
      throw new Error('Failed to update agent');
    }
  },

  /**
   * 安装团队技能 Team Skill（从 Nuwax 或本地批量安装 Agents）
   */
  async installTeamSkill(teamSkillId: string): Promise<{ success: boolean; installedAgents: string[]; message: string }> {
    try {
      // 1. 调用 Nuwax API 获取团队模板详情
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      let teamSkill: any;
      
      try {
        const response = await fetch(`${API_URL}/team-skills/${teamSkillId}`);
        const data = await response.json();
        if (data.success && data.data) {
          teamSkill = data.data;
        }
      } catch {
        // Nuwax 不可用时，使用本地映射回退
        const localTeamSkill = localTeamSkillMap[teamSkillId];
        if (localTeamSkill) {
          teamSkill = localTeamSkill;
        }
      }
      
      if (!teamSkill) {
        throw new Error(`Team Skill ${teamSkillId} not found in Nuwax or locally`);
      }

      const roles = Array.isArray(teamSkill.roles) ? teamSkill.roles : [];

      // 2. 解析 roles 中的 agent_type 列表
      const agentTypes = roles
        .map((r: any) => r.agent_type)
        .filter((t: string) => t && t.startsWith('ma_'));

      if (agentTypes.length === 0) {
        throw new Error('No agent types found in team skill roles');
      }

      // 3. 批量安装所有 Agents
      const installedAgents: string[] = [];
      for (const agentType of agentTypes) {
        try {
          // 优先使用本地内置的 Agent manifest
          const localManifest = localAgentManifests[agentType];
          if (localManifest) {
            const installedId = await invoke<string>('install_agent', {
              name: localManifest.name,
              version: localManifest.version,
              manifestJson: JSON.stringify(localManifest),
              dataDir: null,
            });
            installedAgents.push(installedId || agentType);
          } else {
            // 无本地 manifest，尝试从 Nuwax 下载
            try {
              const bundleRes = await fetch(`${API_URL}/team-skills/${teamSkillId}/download-bundles?agent=${agentType}`);
              const bundleData = await bundleRes.json();
              if (bundleData.success && bundleData.data?.manifest) {
                const installedId = await invoke<string>('install_agent', {
                  name: bundleData.data.manifest.name,
                  version: bundleData.data.manifest.version,
                  manifestJson: JSON.stringify(bundleData.data.manifest),
                  dataDir: null,
                });
                installedAgents.push(installedId || agentType);
              }
            } catch {
              console.warn(`[installTeamSkill] Agent ${agentType} not found locally or in Nuwax`);
            }
          }
        } catch (err) {
          console.error(`[installTeamSkill] Failed to install agent ${agentType}:`, err);
        }
      }

      // 4. 触发 agents-changed 事件，让前端刷新列表
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('proclaw:agents-changed'));
      }

      return {
        success: installedAgents.length > 0,
        installedAgents,
        message: installedAgents.length > 0
          ? `成功安装 ${installedAgents.length}/${agentTypes.length} 个 Agents（团队：${teamSkill.name}）`
          : '未安装任何 Agent'
      };
    } catch (err) {
      console.error('[installTeamSkill] Failed:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to install team skill');
    }
  },
};

/**
 * 本地团队技能映射表（Nuwax 不可用时回退）
 */
const localTeamSkillMap: Record<string, any> = {
  'team-skill-site-ops-001': {
    id: 'team-skill-site-ops-001',
    name: '网站运营 AI Team',
    description: 'ProClaw 官网智能化自运营团队，包含 SEO、内容生成、数据分析和转化优化',
    category: 'website_operations',
    roles: [
      { role: 'SEO 优化专家', specialty: 'SEO 分析与关键词监控', agent_type: 'ma_site_seo' },
      { role: '内容生成专家', specialty: '博客与产品更新内容生成', agent_type: 'ma_content_gen' },
      { role: '数据分析专家', specialty: '流量分析、用户行为和转化率', agent_type: 'ma_site_analytics' },
      { role: '转化优化专家', specialty: 'A/B 测试和漏斗优化', agent_type: 'ma_conversion' }
    ]
  },
  'team-skill-social-us-eu-001': {
    id: 'team-skill-social-us-eu-001',
    name: '欧美社媒运营 Team',
    description: '欧美市场社交媒体运营团队，覆盖 Twitter/X、Facebook、Instagram、LinkedIn',
    category: 'social_media',
    roles: [
      { role: 'Twitter/X Manager', specialty: '实时互动与技术讨论', agent_type: 'ma_social_us' },
      { role: 'Facebook Manager', specialty: '社群建设与页面管理', agent_type: 'ma_social_us' },
      { role: 'Instagram Manager', specialty: '视觉内容与快拍', agent_type: 'ma_social_us' }
    ]
  },
  'team-skill-social-sea-001': {
    id: 'team-skill-social-sea-001',
    name: '东南亚社媒运营 Team',
    description: '东南亚市场社媒运营团队，覆盖 TikTok、Instagram、Facebook，支持多语言',
    category: 'social_media',
    roles: [
      { role: 'TikTok 运营', specialty: '短视频和话题挑战', agent_type: 'ma_social_sea' },
      { role: 'Instagram 运营', specialty: '视觉内容和快拍', agent_type: 'ma_social_sea' },
      { role: 'Facebook 运营', specialty: '社群运营和广告', agent_type: 'ma_social_sea' }
    ]
  },
  'team-skill-social-cn-001': {
    id: 'team-skill-social-cn-001',
    name: '国内社媒运营 Team',
    description: '国内市场社媒运营团队，覆盖微信公众号、小红书、知乎、微博',
    category: 'social_media',
    roles: [
      { role: '微信公众号运营', specialty: '深度文章和品牌建设', agent_type: 'ma_social_cn' },
      { role: '小红书运营', specialty: '种草笔记和好物推荐', agent_type: 'ma_social_cn' },
      { role: '知乎运营', specialty: '专业问答和技术分享', agent_type: 'ma_social_cn' },
      { role: '微博运营', specialty: '实时热点和话题营销', agent_type: 'ma_social_cn' }
    ]
  }
};
