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
