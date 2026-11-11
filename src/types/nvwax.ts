/**
 * NvwaX API 类型定义
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

// ============================================================
// 通用类型
// ============================================================

/** 通用 API 响应 */
export interface NvwaXApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
}

/** 通用列表响应 */
export interface NvwaXListResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: PaginationInfo;
  error?: ApiErrorDetail;
}

/** 分页信息 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** 错误详情 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

// ============================================================
// 参数类型
// ============================================================

/** 搜索参数 */
export interface SearchParams {
  q?: string;
  category?: string;
  tags?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

/** 列表参数 */
export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
}

/** 创建 Agent 请求 */
export interface CreateAgentPayload {
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}

/** 更新 Agent 请求 */
export interface UpdateAgentPayload {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

/** 创建 AiTeam 请求 */
export interface CreateAiTeamPayload {
  name: string;
  description?: string;
  members?: TeamMemberInput[];
}

/** 更新 AiTeam 请求 */
export interface UpdateAiTeamPayload {
  name?: string;
  members?: TeamMemberInput[];
}

/** 团队成员输入 */
export interface TeamMemberInput {
  agent_id: string;
  role?: string;
}

/** 导出请求 */
export interface ExportPayload {
  format: string;
  includeMetadata?: boolean;
  includeImplementation?: boolean;
}

/** 批量导出项 */
export interface ExportItem {
  type: 'agent' | 'aiteam';
  id: string;
}

/** 统一搜索参数 */
export interface UnifiedSearchParams {
  q: string;
  type?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// 响应数据类型
// ============================================================

/** Agent 摘要 */
export interface AgentSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  status?: string;
  version?: string;
  author?: string;
  created_at?: string;
}

/** Agent 详情 */
export interface AgentDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  status?: string;
  version?: string;
  author?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Agent 列表响应 */
export interface AgentListResponse {
  agents: AgentSummary[];
  pagination?: PaginationInfo;
}

/** AiTeam 摘要 */
export interface AiTeamSummary {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  member_count?: number;
  status?: string;
  created_at?: string;
}

/** AiTeam 详情 */
export interface AiTeamDetail {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  members: TeamMemberInfo[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/** 团队成员信息 */
export interface TeamMemberInfo {
  agent_id: string;
  agent_name?: string;
  role?: string;
}

/** AiTeam 列表响应 */
export interface AiTeamListResponse {
  aiteams: AiTeamSummary[];
  pagination?: PaginationInfo;
}

/** 分类 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  count?: number;
}

/** 行业 */
export interface Industry {
  id: string;
  name: string;
  description?: string;
  count?: number;
}

/** 插件详情 */
export interface PluginDetail {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  industry?: string;
  download_url?: string;
}

/** 导出结果 */
export interface ExportResult {
  id?: string;
  type?: string;
  format?: string;
  content?: Record<string, unknown>;
  url?: string;
  success: boolean;
  error?: string;
}

/** 技能 */
export interface Skill {
  id: string;
  name: string;
  description?: string;
  type?: string;
  tags: string[];
}

/** 统一搜索结果 */
export interface SearchResult {
  agents: AgentSummary[];
  skills: Skill[];
}

/** 消耗统计 */
export interface UsageStats {
  period: string;
  total_tokens: number;
  calls: number;
  by_model: ModelUsage[];
  daily: DailyUsage[];
}

/** 按模型统计 */
export interface ModelUsage {
  model: string;
  tokens: number;
  calls: number;
}

/** 按日统计 */
export interface DailyUsage {
  date: string;
  tokens: number;
  calls: number;
}

/** Token 余额摘要 */
export interface TokenBalance {
  user_id: string;
  total_consumed: number;
  monthly_consumed: number;
  balance: number;
  free_monthly_quota: number;
}

/** 命令响应（对应 Rust 侧 NvwaXCmdResponse） */
export interface NvwaXCmdResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// 虚拟公司（Virtual Company）相关类型
//
// 对应 docs/integration/virtual-company-package.schema.json (schemaVersion 1.0.0)。
// NvwaX 服务端按该 schema 生成导出包，ProClaw 桌面端按此 schema 导入。
// 任何字段增删必须同步更新 schema 文件，两端保持二进制兼容。
// ============================================================

/** 虚拟公司导出包（VirtualCompanyPackage） */
export interface VirtualCompanyPackage {
  schemaVersion: string;
  packageId: string;
  exportedAt: string;
  checksum?: string;
  source: {
    platform: 'nvwax';
    sessionId: string;
    userId?: string;
    aiteamId?: string;
  };
  team: {
    id: string;
    name: string;
    description?: string;
    industry?: string;
    tags?: string[];
    ceoConfig?: Record<string, unknown>;
    workflow?: Array<Record<string, unknown>>;
    bindingRules?: Array<Record<string, unknown>>;
  };
  agents: VirtualCompanyAgent[];
  skills?: VirtualCompanySkill[];
  metadata?: Record<string, unknown>;
}

/** 虚拟公司成员 Agent */
export interface VirtualCompanyAgent {
  id: string;
  name: string;
  description?: string;
  role: string;
  avatarUrl?: string;
  capabilities?: string[];
  permissions?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  modelConfig?: {
    provider?: 'openai' | 'anthropic' | 'ollama' | 'proclaw-local' | 'custom';
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  systemPrompt?: string;
}

/** 虚拟公司绑定技能 */
export interface VirtualCompanySkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  content?: string;
}

/** 虚拟公司模板摘要（来自 NvwaX 市场） */
export interface VirtualCompanyTemplateSummary {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  member_count?: number;
  author?: string;
  tags?: string[];
  rating?: number;
  install_count?: number;
  preview_image?: string;
}

/** 虚拟公司模板列表响应 */
export interface VirtualCompanyTemplateListResponse {
  templates: VirtualCompanyTemplateSummary[];
  pagination?: PaginationInfo;
}

/** 从 URL 导入虚拟公司包命令的返回结果 */
export interface VirtualCompanyImportResult {
  package_id: string;
  team_id: string;
  team_name: string;
  agents_imported: number;
  skills_imported: number;
  imported_at: string;
}

/** 单个 Agent 的本地状态（推送到 NvWaX） */
export interface VirtualCompanyAgentState {
  agentId: string;
  enabled?: boolean;
  alias?: string;
  /** owner | shared | reviewer */
  ownerRole?: string;
  lastRunAt?: string;
}

/** 推送到 NvWaX 的本地状态整体 */
export interface VirtualCompanyLocalStatePayload {
  importedPackageId: string;
  schemaVersion?: string;
  proclawVersion?: string;
  /** active | paused | archived */
  teamStatus?: string;
  agents: VirtualCompanyAgentState[];
}

/** 推送结果 */
export interface VirtualCompanyLocalStatePushResult {
  sessionId: string;
  lastSyncedAt: string;
  agentsCount: number;
  teamStatus: string;
}

/** v1.4.0：单个 Agent 本地状态设置参数 */
export interface SetAgentLocalStateParams {
  packageId: string;
  agentId: string;
  enabled?: boolean;
  alias?: string;
  ownerRole?: string;
}

/** v1.4.0：单个 Agent 本地状态设置返回值（lastModifiedAt ISO 8601 UTC） */
export interface SetAgentLocalStateResult {
  lastModifiedAt: string;
}

/** v1.5.0 (Sprint 2.18)：扩展 setAgentLocalState 返回值，新增 `historyId` 支持撤销 */
export interface SetAgentLocalStateResultNew {
  lastModifiedAt: string;
  /** 新写入的状态变更历史行 id（无字段变化时为 undefined） */
  historyId?: number;
}

/** v1.5.0：单条 Agent 状态变更历史记录 */
export interface AgentStateHistoryEntry {
  id: number;
  packageId: string;
  agentId: string;
  fieldName: 'enabled' | 'alias' | 'ownerRole' | 'localModifiedAt';
  oldValue?: string;
  newValue?: string;
  recordedAt: string;
}

/** v1.5.0：nvwax_list_agent_state_history 返回包装 */
export interface AgentStateHistoryList {
  entries: AgentStateHistoryEntry[];
}

/** v1.5.0：nvwax_undo_agent_state_change 返回 */
export interface UndoAgentStateChangeResult {
  /** 恢复后的最终值（已写入主表） */
  restoredValue?: string;
  /** 新生成的 historyId（记录这次撤销本身，便于无限次撤销链） */
  historyId: number;
}

/** v1.4.0：发布到 NvWaX 市场的结果 */
export interface PublishMarketplaceResult {
  teamSkillId: string;
  teamName: string;
  message?: string;
}

/** SSE 流式响应（前端 wizard 页用） */
export interface StreamSessionResponse {
  session_id: string;
  content: string;
  final_progress: number;
  done: boolean;
}

// ============================================================
// 多设备同步（Sprint 2.15）
// ============================================================

/** 远程 Agent 状态（从 NvWaX 拉取的 local_state.agents[] 单项） */
export interface VirtualCompanyAgentRemoteState {
  agentId: string;
  enabled?: boolean;
  alias?: string;
  ownerRole?: string;
  lastRunAt?: string;
}

/** 单个 session 的 local_state 拉取结果 */
export interface VirtualCompanyLocalStateResponse {
  sessionId: string;
  /** 即 NvWaX 数据库 aiteam_creation_sessions.local_state JSONB 字段 */
  localState: {
    schemaVersion?: string;
    lastSyncedAt?: string;
    proclawVersion?: string;
    importedPackageId?: string;
    teamStatus?: string;
    agents?: VirtualCompanyAgentRemoteState[];
  };
  fetchedAt: string;
}

/** 列出会话响应（每项带 local_state） */
export interface VirtualCompanySessionWithState {
  sessionId: string;
  status: string;
  finalTeamSkillId?: string;
  localState?: VirtualCompanyLocalStateResponse['localState'];
  localStateLastSyncedAt?: string;
  updatedAt: string;
}

export interface VirtualCompanySessionListResponse {
  sessions: VirtualCompanySessionWithState[];
  totalCount: number;
}
