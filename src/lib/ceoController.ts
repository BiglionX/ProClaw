/**
 * CEO Agent 主框架控制器
 * 提供 PRD v6.2 定义的主框架 API，包括：
 * - 项目上下文操作 (PCP)
 * - 任务分派与跟踪
 * - 子 Agent 发现
 * - AI Team 群聊消息桥接
 */

import { pushAITeamTaskEvent, pushAITeamSystemEvent, buildGroupId, AI_TEAM_GROUPS } from './contactService';

// ==================== 类型定义 ====================

export interface PcpEntry {
  id: string;
  context_type: 'vision' | 'goal' | 'constraint' | 'milestone' | 'decision';
  title: string | null;
  description: string | null;
  priority: number | null;
  status: 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
  created_by: 'boss' | 'ceo_agent';
  metadata: string | null;
}

export interface PcpEntryInput {
  context_type: string;
  title?: string;
  description?: string;
  priority?: number;
  created_by?: string;
  metadata?: string;
}

export interface PcpEntryUpdate {
  title?: string;
  description?: string;
  priority?: number;
  status?: string;
  metadata?: string;
}

export interface Task {
  taskId: string;
  type: string;
  priority: number;
  description: string;
  expected_output: string;
  deadline: string;
  context_snapshot: string;
  assigned_to: string;
}

export interface TaskResult {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  output: string;
  error?: string;
  completedAt: number;
}

export interface CeoTaskRecord {
  id: string;
  task_id: string;
  assigned_agent_id: string;
  type: string | null;
  description: string | null;
  expected_output: string | null;
  priority: number;
  status: string;
  result: string | null;
  created_at: number;
  deadline: number | null;
  completed_at: number | null;
  metadata: string | null;
}

export interface CeoTaskInput {
  assigned_agent_id: string;
  type?: string;
  description?: string;
  expected_output?: string;
  priority?: number;
  deadline?: number;
  metadata?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface AgentCapability {
  agentId: string;
  agentName: string;
  capabilities: string[];
  enabled: boolean;
}

// ==================== Tauri 调用封装 ====================

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ==================== 项目上下文操作 (PCP) ====================

export const proclawContext = {
  /** 新增 PCP 条目 */
  async add(entry: PcpEntryInput): Promise<PcpEntry> {
    return invoke<PcpEntry>('pcp_add_entry', { entry });
  },

  /** 更新 PCP 条目 */
  async update(id: string, update: PcpEntryUpdate): Promise<void> {
    return invoke<void>('pcp_update_entry', { id, update });
  },

  /** 查询 PCP 条目 */
  async query(filter?: {
    context_type?: string;
    status?: string;
    limit?: number;
  }): Promise<PcpEntry[]> {
    return invoke<PcpEntry[]>('pcp_query_entries', {
      contextType: filter?.context_type ?? null,
      status: filter?.status ?? null,
      limit: filter?.limit ?? null,
    });
  },

  /** 软删除 PCP 条目 */
  async delete(id: string): Promise<void> {
    return invoke<void>('pcp_delete_entry', { id });
  },

  /** 获取当前活跃的目标列表 */
  async getActiveGoals(): Promise<PcpEntry[]> {
    return proclawContext.query({ status: 'active' });
  },

  /** 获取活跃的里程碑 */
  async getActiveMilestones(): Promise<PcpEntry[]> {
    return proclawContext.query({ context_type: 'milestone', status: 'active' });
  },
};

// ==================== 任务分派与跟踪 ====================

export const proclawTasks = {
  /** 分派任务给子 Agent */
  async dispatch(agentId: string, task: Task, teamId?: string): Promise<CeoTaskRecord> {
    const taskInput: CeoTaskInput = {
      assigned_agent_id: agentId,
      type: task.type,
      description: task.description,
      expected_output: task.expected_output,
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).getTime() : undefined,
      metadata: JSON.stringify({
        taskId: task.taskId,
        context_snapshot: task.context_snapshot,
      }),
    };
    
    // 🔗 桥接到 AI Team 群聊
    try {
      const groupId = teamId ? buildGroupId(teamId) : Object.keys(AI_TEAM_GROUPS)[0];
      if (groupId) {
        pushAITeamTaskEvent('ceo-agent', 'CEO Agent', {
          taskId: task.taskId,
          type: task.type,
          priority: task.priority,
          description: task.description,
          expected_output: task.expected_output,
          deadline: task.deadline,
          assigned_to: agentId,
        }, 'task_dispatch', groupId);
      }
    } catch { /* 非关键路径，静默失败 */ }
    
    return invoke<CeoTaskRecord>('ceo_create_task', { task: taskInput });
  },

  /** 获取任务状态 */
  async getStatus(taskId: string): Promise<CeoTaskRecord | null> {
    const tasks = await invoke<CeoTaskRecord[]>('ceo_get_tasks', {
      status: null,
      assignedAgentId: null,
      limit: null,
    });
    return tasks.find(t => t.task_id === taskId) || null;
  },

  /** 取消任务 */
  async cancel(taskId: string): Promise<void> {
    return invoke<void>('ceo_update_task_status', {
      taskId,
      status: 'cancelled',
      result: null,
    });
  },

  /** 更新任务状态（供子 Agent 调用） */
  async updateStatus(
    taskId: string,
    status: string,
    result?: string,
    agentId?: string,
    teamId?: string,
  ): Promise<void> {
    // 🔗 桥接到 AI Team 群聊
    try {
      const groupId = teamId ? buildGroupId(teamId) : Object.keys(AI_TEAM_GROUPS)[0];
      const agentName = agentId || '子 Agent';
      const statusCn: Record<string, string> = {
        pending: '待处理', in_progress: '进行中', completed: '已完成', failed: '失败', cancelled: '已取消',
      };
      if (groupId) {
        pushAITeamTaskEvent(agentId || 'ceo-agent', agentName, {
          taskId,
          status,
          description: `任务 ${taskId} 状态更新`,
          output: result || '',
        }, 'task_update', groupId);
        if (status === 'completed' || status === 'failed') {
          pushAITeamSystemEvent(
            `${status === 'completed' ? '✅' : '❌'} ${agentName} ${statusCn[status] || status}了任务: ${taskId}${result ? `\n结果：${result.slice(0, 100)}${result.length > 100 ? '...' : ''}` : ''}`,
            groupId,
            agentId || 'ceo-agent',
            agentName
          );
        }
      }
    } catch { /* 非关键路径，静默失败 */ }
    
    return invoke<void>('ceo_update_task_status', {
      taskId,
      status,
      result: result ?? null,
    });
  },

  /** 获取任务列表 */
  async list(filter?: {
    status?: string;
    assignedAgentId?: string;
    limit?: number;
  }): Promise<CeoTaskRecord[]> {
    return invoke<CeoTaskRecord[]>('ceo_get_tasks', {
      status: filter?.status ?? null,
      assignedAgentId: filter?.assignedAgentId ?? null,
      limit: filter?.limit ?? null,
    });
  },

  /** 获取任务统计 */
  async getStats(): Promise<TaskStats> {
    return invoke<TaskStats>('ceo_get_task_stats');
  },
};

// ==================== 子 Agent 发现 ====================

export const proclawAgents = {
  /** 列出所有已安装且有能力的 Agent */
  async list(): Promise<AgentCapability[]> {
    try {
      const agents = await invoke<any[]>('get_installed_agents');
      return agents.map(a => {
        const manifest = a.manifest || {};
        return {
          agentId: a.id,
          agentName: a.name,
          capabilities: manifest.capabilities || [],
          enabled: a.enabled,
        };
      });
    } catch {
      // 非 virtual_company 模式或无 Agent 时回退
      return [];
    }
  },

  /** 获取指定 Agent 的能力 */
  async getCapabilities(agentId: string): Promise<string[]> {
    const agents = await proclawAgents.list();
    const agent = agents.find(a => a.agentId === agentId);
    return agent?.capabilities || [];
  },
};

// ==================== CEO Agent 控制器 ====================

class CeoController {
  /**
   * 解析 Boss 消息并处理 CEO Agent 相关逻辑
   * @param message 用户消息内容
   * @returns 是否需要 CEO Agent 进行 AI 处理
   */
  async processBossMessage(message: string): Promise<boolean> {
    // 检查是否是快捷命令
    if (message.startsWith('/')) {
      await this.handleCommand(message);
      return false;
    }
    // 需要 CEO Agent AI 引擎处理
    return true;
  }

  /**
   * 处理快捷命令
   */
  private async handleCommand(command: string): Promise<void> {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/task':
        if (parts[1] === 'list') {
          const tasks = await proclawTasks.list({ limit: 10 });
          const msg = tasks.length === 0
            ? '当前没有任务记录。'
            : `最近 ${tasks.length} 条任务：\n${tasks
                .map(t => `  - [${t.status}] ${t.description || t.type || '未命名任务'} (分配给: ${t.assigned_agent_id})`)
                .join('\n')}`;
          // 发送到 chat 窗口
          await this.sendBossMessage(msg);
        } else {
          await this.sendBossMessage('用法：/task list - 查看最近任务');
        }
        break;

      case '/context':
        if (parts[1] === 'show') {
          const entries = await proclawContext.query({ status: 'active' });
          const msg = entries.length === 0
            ? '当前没有活跃的项目上下文。'
            : `项目上下文（${entries.length} 条活跃）：\n${entries
                .map(e => `  [${e.context_type}] ${e.title || '无标题'} (优先级: ${e.priority ?? '-'})`)
                .join('\n')}`;
          await this.sendBossMessage(msg);
        } else {
          await this.sendBossMessage('用法：/context show - 查看项目上下文');
        }
        break;

      case '/report':
        // 报告功能由 CEO Agent AI 引擎处理
        await this.sendBossMessage('正在生成项目报告，请稍候...');
        break;

      default:
        await this.sendBossMessage(`未知命令：${cmd}。支持的命令：/task list, /context show, /report`);
    }
  }

  /**
   * 向 Boss 发送消息（通过 Tauri 消息系统）
   */
  private async sendBossMessage(content: string): Promise<void> {
    try {
      const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
      await tauriInvoke('send_message', {
        message: {
          from_user: 'ceo-agent',
          to_user: 'self',  // 实际场景中从 authStore 获取当前用户
          content,
          content_type: 'text',
        },
      });
    } catch (e) {
      console.error('Failed to send CEO message:', e);
    }
  }
}

// ==================== 决策日志操作 (PRD v6.3) ====================

export interface DecisionLogInput {
  decision_type: string;
  proposed_content: string;
  boss_decision?: string;
  boss_feedback?: string;
  final_content?: string;
  context_snapshot?: string;
  estimated_risk?: string;
  metadata?: string;
}

export interface DecisionLogEntry {
  id: string;
  decision_type: string;
  proposed_content: string;
  boss_decision: string | null;
  boss_feedback: string | null;
  final_content: string | null;
  context_snapshot: string;
  estimated_risk: string | null;
  created_at: number;
  approved_at: number | null;
  metadata: string | null;
}

export interface DecisionStats {
  total: number;
  approved: number;
  rejected: number;
  edited: number;
  snoozed: number;
  pending: number;
  approval_rate: number;
  most_rejected_type: string | null;
}

export interface PreferenceEntry {
  key: string;
  value: string;
  updated_at: number;
}

export interface CompanyConfigPackage {
  version: string;
  exported_at: number;
  anonymized: boolean;
  pcp_entries: Record<string, unknown>[];
  decision_log_summary: Record<string, unknown>[];
  preferences: PreferenceEntry[];
  installed_agents: Record<string, unknown>[];
}

/** 决策日志操作 */
export const proclawDecision = {
  /** 添加决策日志 */
  async addLog(logEntry: DecisionLogInput): Promise<DecisionLogEntry> {
    return invoke<DecisionLogEntry>('ceo_add_decision_log', { logEntry });
  },

  /** 查询决策日志 */
  async queryLogs(filter?: {
    decisionType?: string;
    bossDecision?: string;
    limit?: number;
    offset?: number;
    daysBack?: number;
  }): Promise<DecisionLogEntry[]> {
    return invoke<DecisionLogEntry[]>('ceo_query_decision_logs', {
      decisionType: filter?.decisionType ?? null,
      bossDecision: filter?.bossDecision ?? null,
      limit: filter?.limit ?? null,
      offset: filter?.offset ?? null,
      daysBack: filter?.daysBack ?? null,
    });
  },

  /** 获取决策统计 */
  async getStats(): Promise<DecisionStats> {
    return invoke<DecisionStats>('ceo_get_decision_stats');
  },

  /** 更新决策日志状态 */
  async updateStatus(
    id: string,
    bossDecision: string,
    bossFeedback?: string,
    finalContent?: string,
  ): Promise<void> {
    return invoke<void>('ceo_update_decision_log', {
      id,
      bossDecision,
      bossFeedback: bossFeedback ?? null,
      finalContent: finalContent ?? null,
    });
  },
};

/** 偏好管理 */
export const proclawLearning = {
  /** 获取所有偏好配置 */
  async getPreferences(): Promise<PreferenceEntry[]> {
    return invoke<PreferenceEntry[]>('ceo_get_learning_preferences');
  },

  /** 更新偏好配置 */
  async updatePreference(key: string, value: string): Promise<void> {
    return invoke<void>('ceo_update_preference', { key, value });
  },
};

/** 公司配置包操作 */
export const proclawCompany = {
  /** 导出公司发展配置包 */
  async exportConfig(anonymized?: boolean): Promise<CompanyConfigPackage> {
    return invoke<CompanyConfigPackage>('ceo_export_company_config', {
      anonymized: anonymized ?? null,
    });
  },

  /** 导入公司发展配置包 */
  async importConfig(config: CompanyConfigPackage): Promise<string> {
    return invoke<string>('ceo_import_company_config', { config });
  },
};

/** 全局单例 */
export const ceoController = new CeoController();

export default CeoController;
