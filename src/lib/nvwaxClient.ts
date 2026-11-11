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
  VirtualCompanyPackage,
  VirtualCompanyTemplateListResponse,
  VirtualCompanyImportResult,
  VirtualCompanyLocalStatePayload,
  VirtualCompanyLocalStatePushResult,
  SetAgentLocalStateParams,
  SetAgentLocalStateResult,
  SetAgentLocalStateResultNew,
  AgentStateHistoryList,
  UndoAgentStateChangeResult,
  PublishMarketplaceResult,
  StreamSessionResponse,
  VirtualCompanyLocalStateResponse,
  VirtualCompanySessionListResponse,
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
   * 检查 NvwaX 服务是否已配置 API Key
   */
  static async isConfigured(): Promise<boolean> {
    try {
      const key = await safeInvoke<string | null>('get_nvwax_api_key');
      return !!key;
    } catch {
      return false;
    }
  }

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

  // ============================================================
  // 虚拟公司（Virtual Company）API
  // 由 virtual-company 插件调用：浏览模板、拉取并导入导出包
  // ============================================================

  /** 浏览 NvwaX 上的虚拟公司模板 */
  static async searchVirtualCompanyTemplates(params: {
    q?: string;
    industry?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<VirtualCompanyTemplateListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<VirtualCompanyTemplateListResponse>>(
      'nvwax_search_vc_templates',
      {
        q: params.q || null,
        industry: params.industry || null,
        page: params.page || null,
        limit: params.limit || null,
      }
    );
    return unwrap(resp);
  }

  /**
   * 从 URL 拉取虚拟公司导出包并导入到本地 SQLite
   * @param downloadUrl NvwaX 返回的下载 URL（绝对 URL 或相对路径均可）
   * @returns 导入结果摘要（含 team_id、agents_imported 等）
   */
  static async importVirtualCompanyFromUrl(
    downloadUrl: string
  ): Promise<VirtualCompanyImportResult> {
    const resp = await safeInvoke<NvwaXCmdResponse<VirtualCompanyImportResult>>(
      'nvwax_import_virtual_company_from_url',
      { downloadUrl }
    );
    const result = unwrap(resp);
    // 成功后顺手检查余额告警
    void this.checkBalanceAndAlert();
    return result;
  }

  /**
   * 初始化虚拟公司本地 SQLite 表（幂等）
   * 插件加载时调用一次即可，后续重复调用 no-op
   */
  static async bootstrapVirtualCompanyTables(): Promise<boolean> {
    const result = await safeInvoke<boolean>('bootstrap_virtual_company_tables');
    return result === true;
  }

  /**
   * 便捷方法：先确保本地表存在，再导入
   * 通常在用户点击"导入"按钮时一次性调用
   */
  static async importVirtualCompanyPackage(
    downloadUrl: string
  ): Promise<VirtualCompanyImportResult> {
    await this.bootstrapVirtualCompanyTables();
    return this.importVirtualCompanyFromUrl(downloadUrl);
  }

  /**
   * 解析导出包内容（不下载，仅解析已有 JSON）
   * 用于客户端二次校验，例如从本地文件选择器读取用户已下载的 .nvwax-vc.json
   */
  static parseVirtualCompanyPackage(jsonText: string): VirtualCompanyPackage {
    const pkg = JSON.parse(jsonText) as VirtualCompanyPackage;
    // 基础结构校验
    if (!pkg.schemaVersion || !pkg.packageId || !pkg.team?.id) {
      throw new Error('Invalid VirtualCompanyPackage: missing required fields');
    }
    if (pkg.source?.platform !== 'nvwax') {
      throw new Error(
        `Unsupported source platform: ${pkg.source?.platform} (expected 'nvwax')`
      );
    }
    if (!Array.isArray(pkg.agents)) {
      throw new Error('Invalid VirtualCompanyPackage: agents must be an array');
    }
    return pkg;
  }

  /**
   * 把 ProClaw 本地状态推送到 NvWaX 云端
   *
   * 适用场景：用户在 ProClaw 端启用/停用了某个 Agent、修改了别名、暂停了团队等。
   * NvWaX 接收后写入 aiteam_creation_sessions.local_state，用于后续分析/同步/审计。
   *
   * 注意：该接口是 fire-and-forget 友好的。即使 NvWaX 不可达，本地状态也不受影响。
   *
   * @param sessionId NvWaX 侧的 aiteam_creation_session ID
   *                  （首次导入虚拟公司时由 NvWaX 返回，ProClaw 需保存到本地 metadata）
   * @param payload 本地状态变更
   */
  static async pushVirtualCompanyLocalState(
    sessionId: string,
    payload: VirtualCompanyLocalStatePayload,
  ): Promise<VirtualCompanyLocalStatePushResult> {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    const resp = await safeInvoke<NvwaXCmdResponse<VirtualCompanyLocalStatePushResult>>(
      'nvwax_push_virtual_company_state',
      {
        sessionId,
        importedPackageId: payload.importedPackageId,
        schemaVersion: payload.schemaVersion || '1.0.0',
        proclawVersion: payload.proclawVersion || null,
        teamStatus: payload.teamStatus || 'active',
        agents: payload.agents,
      }
    );
    const result = unwrap(resp);
    void this.checkBalanceAndAlert();
    return result;
  }

  /**
   * 发送用户消息到虚拟公司创建会话，并通过 SSE 流拉取 NvWaX 响应。
   *
   * 这是 ProClaw 端 wizard 页的核心 API，让用户在本地完成"和 NvWaX 对话 →
   * 拉取流式回复 → 反馈到 UI"的闭环，不再需要跳转到 Web。
   *
   * @param sessionId NvWaX 侧 aiteam_creation_session ID（先用 createSession 创建）
   * @param message 用户回复内容
   */
  static async streamVirtualCompanySession(
    sessionId: string,
    message: string,
  ): Promise<StreamSessionResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    const resp = await safeInvoke<NvwaXCmdResponse<StreamSessionResponse>>(
      'nvwax_stream_session',
      { sessionId, message }
    );
    void this.checkBalanceAndAlert();
    return unwrap(resp);
  }

  /**
   * v1.4.0 (Sprint 2.16)：把单个 Agent 的本地状态（启停 / 别名 / 角色）持久化到本地 SQLite
   *
   * 该命令不会触发 NvWaX 网络请求（纯本地写）。前端 Companies 页的
   * toggleAgent / setAgentAlias / setAgentOwnerRole 都会调此方法，
   * 让用户的状态变更在刷新页面后仍然保留。
   *
   * @returns 返回 lastModifiedAt（ISO 8601 UTC），调用方可用于显示"上次修改时间"
   */
  static async setAgentLocalState(
    params: SetAgentLocalStateParams,
  ): Promise<SetAgentLocalStateResult> {
    // v1.5.0 兼容层：调用方既可能消费 `lastModifiedAt` 也可能消费 `lastModifiedAt + historyId`
    // 实际 Rust 端返回的 `data` 同时带两个字段。TS 端取并集类型即可避免破坏调用方
    const resp = await safeInvoke<NvwaXCmdResponse<SetAgentLocalStateResultNew>>(
      'nvwax_set_agent_local_state',
      {
        packageId: params.packageId,
        agentId: params.agentId,
        enabled: params.enabled === undefined ? null : params.enabled,
        alias: params.alias === undefined ? null : params.alias,
        ownerRole: params.ownerRole === undefined ? null : params.ownerRole,
      }
    );
    const data = unwrap(resp);
    return { lastModifiedAt: data.lastModifiedAt };
  }

  /**
   * v1.5.0 (Sprint 2.18)：列出 agent 最近 N 条状态变更历史
   *
   * Companies 页 "↩ 撤销" 按钮的入口：先 `listAgentStateHistory` 取最近一条，
   * 显示 "恢复上次状态：xxx" 确认框，确认后 `undoAgentStateChange` 恢复。
   */
  static async listAgentStateHistory(
    packageId: string,
    agentId: string,
    limit: number = 20,
  ): Promise<AgentStateHistoryList> {
    const resp = await safeInvoke<NvwaXCmdResponse<AgentStateHistoryList>>(
      'nvwax_list_agent_state_history',
      { packageId, agentId, limit }
    );
    return unwrap(resp);
  }

  /**
   * v1.5.0 (Sprint 2.18)：按 historyId 撤销单个 Agent 的状态变更
   *
   * 后端会读历史记录的 old_value，写回主表对应字段，并写一条新历史（链式可撤销）。
   */
  static async undoAgentStateChange(
    packageId: string,
    agentId: string,
    historyId: number,
  ): Promise<UndoAgentStateChangeResult> {
    const resp = await safeInvoke<NvwaXCmdResponse<UndoAgentStateChangeResult>>(
      'nvwax_undo_agent_state_change',
      { packageId, agentId, historyId }
    );
    return unwrap(resp);
  }

  /**
   * v1.4.0 (Sprint 2.16)：把虚拟公司发布到 NvWaX 市场
   *
   * 用户在 ProClaw Companies 页点击「📤 发布到 NvWaX 市场」按钮后调用。
   * NvWaX 端会创建一行 `team_skills`（category='virtual-company', is_public=true），
   * 公开后可被其他用户搜索/导入。
   *
   * @param sessionId  NvWaX 侧 aiteam_creation_session ID
   * @returns 含 teamSkillId / teamName / message
   */
  static async publishVirtualCompanyToMarketplace(
    sessionId: string,
  ): Promise<PublishMarketplaceResult> {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    const resp = await safeInvoke<NvwaXCmdResponse<PublishMarketplaceResult>>(
      'nvwax_publish_to_marketplace',
      { sessionId }
    );
    void this.checkBalanceAndAlert();
    return unwrap(resp);
  }

  /**
   * Sprint 2.15 多设备同步：从 NvWaX 拉取单个 session 的最新 local_state
   *
   * @param sessionId  NvWaX 侧 aiteam_creation_session ID
   * @returns 含 localState JSONB + fetchedAt 时间戳
   */
  static async fetchVirtualCompanyLocalState(
    sessionId: string,
  ): Promise<VirtualCompanyLocalStateResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    const resp = await safeInvoke<NvwaXCmdResponse<VirtualCompanyLocalStateResponse>>(
      'nvwax_fetch_local_state',
      { sessionId }
    );
    return unwrap(resp);
  }

  /**
   * Sprint 2.15 多设备同步：列出用户最近的虚拟公司会话（含 local_state）
   *
   * 用于 ProClaw 启动时同步 / 「立即同步」按钮的全量对账
   *
   * @param limit 默认30条
   * @param offset 默认0
   */
  static async listVirtualCompanySessionsWithState(
    limit: number = 30,
    offset: number = 0,
  ): Promise<VirtualCompanySessionListResponse> {
    const resp = await safeInvoke<NvwaXCmdResponse<VirtualCompanySessionListResponse>>(
      'nvwax_list_sessions_with_state',
      { limit, offset }
    );
    return unwrap(resp);
  }
}
