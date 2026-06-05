/**
 * NvwaX API 前端服务模块
 *
 * 封装所有 NvwaX Tauri IPC 命令调用，提供类型安全的前端 API。
 * 对接 Rust 侧 nvwax_commands.rs 中的 Tauri 命令。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { safeInvoke } from './tauri';
import type {
  AgentSummary,
  AgentDetail,
  AgentListResponse,
  AiTeamDetail,
  AiTeamListResponse,
  Category,
  Industry,
  PluginDetail,
  ExportResult,
  Skill,
  SearchResult,
  UsageStats,
  TokenBalance,
  NvwaXCmdResponse,
  SearchParams,
  ListParams,
  CreateAgentPayload,
  UpdateAgentPayload,
  CreateAiTeamPayload,
  UpdateAiTeamPayload,
  ExportItem,
} from '../types/nvwax';

/** 余额告警阈值（Token） */
export const BALANCE_WARN_THRESHOLD = 10000;

/** 余额告警事件名 */
export const BALANCE_ALERT_EVENT = 'nvwax:balance_low';

/**
 * 解析 Tauri 命令返回的 NvwaXCmdResponse
 * 如果 success=false 或 data 为空则 throw error
 */
function unwrap<T>(response: NvwaXCmdResponse<T> | null): T {
  if (!response || !response.success || response.data === undefined || response.data === null) {
    throw new Error(response?.error || 'NvwaX API 请求失败');
  }
  return response.data;
}

/**
 * NvwaX API 服务类
 * 所有方法均通过 Tauri IPC 调用 Rust 后端
 */
export class NvwaXService {
  // ============================================================
  // Marketplace
  // ============================================================

  /** 搜索 Agent 市场 */
  static async searchAgents(params: SearchParams = {}): Promise<AgentListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentListResponse>>('nvwax_search_agents', {
      q: params.q || null,
      category: params.category || null,
      tags: params.tags || null,
      page: params.page || null,
      limit: params.limit || null,
    });
    return unwrap(resp);
  }

  /** 获取 Agent 详情（市场） */
  static async getAgentDetail(id: string): Promise<AgentDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentDetail>>('nvwax_get_agent_detail', { id });
    return unwrap(resp);
  }

  /** 获取分类列表 */
  static async getCategories(): Promise<Category[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<Category[]>>('nvwax_get_categories');
    return unwrap(resp);
  }

  /** 搜索 AiTeam 市场 */
  static async searchAiTeams(params: SearchParams = {}): Promise<AiTeamListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamListResponse>>('nvwax_search_aiteams', {
      q: params.q || null,
      industry: params.industry || null,
      page: params.page || null,
      limit: params.limit || null,
    });
    return unwrap(resp);
  }

  /** 获取 AiTeam 详情（市场） */
  static async getAiTeamDetail(id: string): Promise<AiTeamDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamDetail>>('nvwax_get_aiteam_detail', { id });
    return unwrap(resp);
  }

  /** 获取行业列表 */
  static async getIndustries(): Promise<Industry[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<Industry[]>>('nvwax_get_industries');
    return unwrap(resp);
  }

  /** 获取插件详情 */
  static async getPluginDetail(id: string): Promise<PluginDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<PluginDetail>>('nvwax_get_plugin_detail', { id });
    return unwrap(resp);
  }

  // ============================================================
  // Agents CRUD
  // ============================================================

  /** 创建 Agent */
  static async createAgent(payload: CreateAgentPayload): Promise<AgentDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentDetail>>('nvwax_create_agent', {
      name: payload.name,
      description: payload.description || null,
      config: payload.config || null,
    });
    return unwrap(resp);
  }

  /** 获取 Agent 列表 */
  static async getAgents(params: ListParams = {}): Promise<AgentListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentListResponse>>('nvwax_get_agents', {
      page: params.page || null,
      limit: params.limit || null,
      status: params.status || null,
    });
    return unwrap(resp);
  }

  /** 获取自己的 Agent 详情 */
  static async getMyAgentDetail(id: string): Promise<AgentDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentDetail>>('nvwax_get_my_agent_detail', { id });
    return unwrap(resp);
  }

  /** 更新 Agent */
  static async updateAgent(id: string, payload: UpdateAgentPayload): Promise<AgentDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentDetail>>('nvwax_update_agent', {
      id,
      name: payload.name || null,
      description: payload.description || null,
      config: payload.config || null,
    });
    return unwrap(resp);
  }

  /** 删除 Agent */
  static async deleteAgent(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_delete_agent', { id });
    return unwrap(resp);
  }

  /** 发布 Agent */
  static async publishAgent(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_publish_agent', { id });
    return unwrap(resp);
  }

  /** 取消发布 Agent */
  static async unpublishAgent(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_unpublish_agent', { id });
    return unwrap(resp);
  }

  // ============================================================
  // AiTeams CRUD
  // ============================================================

  /** 创建 AiTeam */
  static async createAiTeam(payload: CreateAiTeamPayload): Promise<AiTeamDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamDetail>>('nvwax_create_aiteam', {
      name: payload.name,
      description: payload.description || null,
      members: payload.members || null,
    });
    return unwrap(resp);
  }

  /** 获取 AiTeam 列表 */
  static async getAiTeams(params: ListParams = {}): Promise<AiTeamListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamListResponse>>('nvwax_get_aiteams', {
      page: params.page || null,
      limit: params.limit || null,
    });
    return unwrap(resp);
  }

  /** 获取自己的 AiTeam 详情 */
  static async getMyAiTeamDetail(id: string): Promise<AiTeamDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamDetail>>('nvwax_get_my_aiteam_detail', { id });
    return unwrap(resp);
  }

  /** 更新 AiTeam */
  static async updateAiTeam(id: string, payload: UpdateAiTeamPayload): Promise<AiTeamDetail> {
    const resp = await safeInvoke<NvwaXCmdResponse<AiTeamDetail>>('nvwax_update_aiteam', {
      id,
      name: payload.name || null,
      members: payload.members || null,
    });
    return unwrap(resp);
  }

  /** 删除 AiTeam */
  static async deleteAiTeam(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_delete_aiteam', { id });
    return unwrap(resp);
  }

  /** 发布 AiTeam */
  static async publishAiTeam(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_publish_aiteam', { id });
    return unwrap(resp);
  }

  /** 取消发布 AiTeam */
  static async unpublishAiTeam(id: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_unpublish_aiteam', { id });
    return unwrap(resp);
  }

  // ============================================================
  // Search
  // ============================================================

  /** 跨平台搜索 Agent */
  static async searchAgentsGlobal(q: string, page?: number, limit?: number): Promise<AgentSummary[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentSummary[]>>('nvwax_search_agents_global', { q, page: page || null, limit: limit || null });
    return unwrap(resp);
  }

  /** 搜索技能 */
  static async searchSkills(q: string, page?: number, limit?: number): Promise<Skill[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<Skill[]>>('nvwax_search_skills', { q, page: page || null, limit: limit || null });
    return unwrap(resp);
  }

  /** 统一搜索 */
  static async unifiedSearch(q: string, searchType?: string, page?: number, limit?: number): Promise<SearchResult> {
    const resp = await safeInvoke<NvwaXCmdResponse<SearchResult>>('nvwax_unified_search', {
      q,
      search_type: searchType || null,
      page: page || null,
      limit: limit || null,
    });
    return unwrap(resp);
  }

  // ============================================================
  // Export
  // ============================================================

  /** 导出 Agent */
  static async exportAgent(id: string, format: string, includeMetadata?: boolean, includeImplementation?: boolean): Promise<ExportResult> {
    const resp = await safeInvoke<NvwaXCmdResponse<ExportResult>>('nvwax_export_agent', {
      id,
      format,
      include_metadata: includeMetadata ?? null,
      include_implementation: includeImplementation ?? null,
    });
    return unwrap(resp);
  }

  /** 导出 AiTeam */
  static async exportAiTeam(id: string, format: string, includeMetadata?: boolean): Promise<ExportResult> {
    const resp = await safeInvoke<NvwaXCmdResponse<ExportResult>>('nvwax_export_aiteam', {
      id,
      format,
      include_metadata: includeMetadata ?? null,
    });
    return unwrap(resp);
  }

  /** 批量导出 */
  static async batchExport(items: ExportItem[], format: string): Promise<ExportResult[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<ExportResult[]>>('nvwax_batch_export', { items, format });
    return unwrap(resp);
  }

  /** 获取导出历史 */
  static async getExportHistory(): Promise<ExportResult[]> {
    const resp = await safeInvoke<NvwaXCmdResponse<ExportResult[]>>('nvwax_get_export_history');
    return unwrap(resp);
  }

  // ============================================================
  // Usage & Billing
  // ============================================================

  /** 获取消耗统计 */
  static async getUsageStats(period: string = 'month'): Promise<UsageStats> {
    const resp = await safeInvoke<NvwaXCmdResponse<UsageStats>>('nvwax_get_usage_stats', { period });
    return unwrap(resp);
  }

  /** 获取当前用户 Token 余额 */
  static async getTokenBalance(): Promise<TokenBalance> {
    const resp = await safeInvoke<NvwaXCmdResponse<TokenBalance>>('nvwax_get_token_balance');
    return unwrap(resp);
  }

  /** 记录 Token 消耗 */
  static async recordConsumption(tokens: number, endpoint: string, model?: string, source?: string): Promise<boolean> {
    const resp = await safeInvoke<NvwaXCmdResponse<boolean>>('nvwax_record_consumption', {
      tokens,
      endpoint,
      model: model || null,
      source: source || null,
    });
    return unwrap(resp);
  }

  /** 同步 NvwaX 消耗数据（对账） */
  static async syncUsage(): Promise<{
    local_records: number;
    nvwax_records: number;
    matched: number;
    discrepancies: string[];
  }> {
    const resp = await safeInvoke<NvwaXCmdResponse<{
      local_records: number;
      nvwax_records: number;
      matched: number;
      discrepancies: string[];
    }>>('nvwax_sync_usage');
    return unwrap(resp);
  }

  // ============================================================
  // 用量告警
  // ============================================================

  /**
   * 检查 Token 余额并触发告警
   * 在每次重要的 API 调用后调用此方法
   * 如果余额低于阈值，触发 custom event 供 UI 组件捕获
   */
  static async checkBalanceAndAlert(): Promise<void> {
    try {
      const balance = await this.getTokenBalance();
      if (balance.balance < BALANCE_WARN_THRESHOLD) {
        // 发送告警事件
        const event = new CustomEvent(BALANCE_ALERT_EVENT, {
          detail: {
            balance: balance.balance,
            threshold: BALANCE_WARN_THRESHOLD,
            message: `Token 余额不足（${balance.balance}），请尽快充值`,
          },
        });
        window.dispatchEvent(event);
      }
    } catch {
      // 静默失败，不中断主流程
    }
  }

  /**
   * 获取余额告警阈值
   */
  static getWarnThreshold(): number {
    return BALANCE_WARN_THRESHOLD;
  }
}
