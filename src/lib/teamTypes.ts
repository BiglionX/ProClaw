/** AI 团队成员 */
export interface TeamMember {
  agent_id: string;
  role: string;
  responsibilities?: string;
  config?: Record<string, unknown>;
  sort_order?: number;
}

/** 完整的 AiTeam 模型 */
export interface AiTeam {
  id: string;
  name: string;
  description?: string;
  category?: string;
  config_json: string;
  source: string;
  version: string;
  publish_status: 'draft' | 'published' | 'private';
  tags: string[];
  members: TeamMember[];
  workflow: Record<string, unknown>;
  triggers: Record<string, unknown>;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

/** 创建 AiTeam 请求 */
export interface CreateTeamPayload {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  members?: TeamMember[];
  workflow?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
}

/** 更新 AiTeam 请求 */
export interface UpdateTeamPayload {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  members?: TeamMember[];
  workflow?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
  version?: string;
  publish_status?: 'draft' | 'published' | 'private';
  thumbnail_url?: string;
}

/** 导入团队的文件格式 */
export interface ImportTeamPayload {
  team_name: string;
  team_config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** 发布状态中文映射 */
export const PUBLISH_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  private: '私有',
};

/** 发布状态颜色 */
export const PUBLISH_STATUS_COLOR: Record<string, string> = {
  draft: '#f59e0b',
  published: '#10b981',
  private: '#6b7280',
};
