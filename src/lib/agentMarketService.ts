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
};
