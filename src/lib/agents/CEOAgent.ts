/**
 * CEO Agent 决策引擎
 * 作为虚拟公司主控官，解析 Boss 意图、更新 PCP、分派任务、审查结果
 * 基于 LangChain ReAct Agent 模式
 */

import { BaseAgent, AgentConfig, AgentResponse } from './BaseAgent';
import { Tool } from '@langchain/core/tools';
import { proclawContext, proclawTasks, proclawAgents, proclawDecision, proclawLearning, DecisionLogInput } from '../ceoController';
import { agentRuntime } from '../agentRuntime';

export interface CEODecision {
  action: 'update_pcp' | 'dispatch_task' | 'query_status' | 'generate_report' | 'inform_boss';
  reasoning: string;
  details: Record<string, unknown>;
}

export interface CEOAnalysisResult {
  intent: string;
  confidence: number;
  decision: CEODecision;
  needsConfirmation: boolean;
}

// ==================== CEO Agent 专用 Tools ====================

/** 工具：添加 PCP 条目 */
class PCPAddEntryTool extends Tool {
  name = 'pcp_add_entry';
  description = '根据对话内容向项目上下文协议(PCP)添加新的条目，如愿景、目标、约束等。输入格式: {"context_type":"goal|vision|constraint|milestone|decision", "title":"条目标题", "description":"详细描述", "priority":1-5}';

  async _call(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const entry = await proclawContext.add({
        context_type: parsed.context_type || 'goal',
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        created_by: 'ceo_agent',
      });
      return JSON.stringify({
        success: true,
        message: `已添加 ${entry.context_type} 条目: ${entry.title || '无标题'}`,
        entry,
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `添加失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

/** 工具：查询 PCP 条目 */
class PCPQueryTool extends Tool {
  name = 'pcp_query';
  description = '查询项目上下文协议(PCP)中的条目。可按类型和状态筛选。输入格式: {"context_type":"goal", "status":"active"}';

  async _call(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const entries = await proclawContext.query({
        context_type: parsed.context_type || undefined,
        status: parsed.status || 'active',
        limit: parsed.limit || 20,
      });
      return JSON.stringify({
        success: true,
        count: entries.length,
        entries,
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `查询失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

/** 工具：分派任务给子 Agent */
class DispatchTaskTool extends Tool {
  name = 'dispatch_task';
  description = '向指定的子 Agent 分派任务。输入格式: {"agentId":"agent_id", "type":"任务类型", "description":"任务描述", "expected_output":"预期输出", "priority":1-5, "deadline":"ISO日期"}';

  async _call(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 先在数据库中创建任务记录
      const ceoTask = await proclawTasks.dispatch(parsed.agentId, {
        taskId,
        type: parsed.type || 'general',
        priority: parsed.priority || 2,
        description: parsed.description || '',
        expected_output: parsed.expected_output || '',
        deadline: parsed.deadline || new Date(Date.now() + 86400000).toISOString(),
        context_snapshot: parsed.context_snapshot || '',
        assigned_to: parsed.agentId,
      });

      // 通过 AgentRuntime 向子 Agent 发送 onTask 通知
      const dispatched = await agentRuntime.dispatchTask(parsed.agentId, {
        taskId,
        type: parsed.type || 'general',
        priority: parsed.priority || 2,
        description: parsed.description || '',
        expected_output: parsed.expected_output || '',
        deadline: parsed.deadline || new Date(Date.now() + 86400000).toISOString(),
        context_snapshot: parsed.context_snapshot || '',
        assigned_to: parsed.agentId,
      });

      return JSON.stringify({
        success: true,
        taskId,
        agentNotified: dispatched,
        task: ceoTask,
        message: `任务已分派给 ${parsed.agentId}${dispatched ? '，Agent 已接收通知' : '，但 Agent 未在线'}`,
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `分派失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

/** 工具：查询任务状态 */
class GetTaskStatusTool extends Tool {
  name = 'get_task_status';
  description = '查询已分派任务的执行状态。输入格式: {"taskId":"任务ID"} 或留空查询所有任务';

  async _call(input: string): Promise<string> {
    try {
      const parsed = input ? JSON.parse(input) : {};
      if (parsed.taskId) {
        const task = await proclawTasks.getStatus(parsed.taskId);
        return JSON.stringify({
          success: true,
          task,
        });
      }
      // 查询所有任务
      const tasks = await proclawTasks.list({ limit: parsed.limit || 20 });
      const stats = await proclawTasks.getStats();
      return JSON.stringify({
        success: true,
        tasks,
        stats,
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `查询失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

/** 工具：列出可用 Agent */
class ListAgentsTool extends Tool {
  name = 'list_agents';
  description = '列出所有已安装且有能力的子 Agent。无需输入参数。';

  async _call(_input: string): Promise<string> {
    try {
      const agents = await proclawAgents.list();
      return JSON.stringify({
        success: true,
        count: agents.length,
        agents: agents.map(a => ({
          id: a.agentId,
          name: a.agentName,
          capabilities: a.capabilities,
          enabled: a.enabled,
        })),
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `查询失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

/** 工具：生成项目进展报告 */
class GenerateReportTool extends Tool {
  name = 'generate_report';
  description = '根据 PCP 和任务数据生成项目进展摘要报告。输入格式: {"type":"daily|weekly|custom"}';

  async _call(input: string): Promise<string> {
    try {
      const parsed = input ? JSON.parse(input) : {};
      const reportType = parsed.type || 'daily';

      // 获取活跃的 PCP 条目
      const goals = await proclawContext.getActiveGoals();
      const milestones = await proclawContext.getActiveMilestones();
      const tasks = await proclawTasks.list({ limit: 10 });
      const stats = await proclawTasks.getStats();

      const report = {
        type: reportType,
        generatedAt: new Date().toISOString(),
        overview: {
          activeGoals: goals.length,
          activeMilestones: milestones.length,
          totalTasks: stats.total,
          completedTasks: stats.completed,
          pendingTasks: stats.pending,
          failedTasks: stats.failed,
        },
        goals: goals.map(g => ({
          title: g.title,
          description: g.description,
          priority: g.priority,
        })),
        milestones: milestones.map(m => ({
          title: m.title,
          description: m.description,
        })),
        recentTasks: tasks.map(t => ({
          taskId: t.task_id,
          agentId: t.assigned_agent_id,
          description: t.description,
          status: t.status,
          createdAt: t.created_at,
        })),
      };

      return JSON.stringify({
        success: true,
        report,
      });
    } catch (e) {
      return JSON.stringify({
        success: false,
        message: `生成报告失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

// ==================== CEO Agent 主类 ====================

export class CEOAgent extends BaseAgent {
  private isAnalyzing = false;

  constructor(config?: Partial<AgentConfig>) {
    super({
      taskType: 'ceo_decision' as any,
      systemPrompt: getCEOSystemPrompt(),
      maxIterations: 8,
      enableMemory: true,
      temperature: 0.3,
      ...config,
    });
  }

  protected defineTools(): Tool[] {
    return [
      new PCPAddEntryTool(),
      new PCPQueryTool(),
      new DispatchTaskTool(),
      new GetTaskStatusTool(),
      new ListAgentsTool(),
      new GenerateReportTool(),
    ];
  }

  protected getDefaultSystemPrompt(): string {
    return getCEOSystemPrompt();
  }

  /**
   * 解析 Boss 消息并返回分析结果（包含是否需要确认）
   * (已由底部的偏好感知版本覆盖)
   */

  /**
   * 执行 CEO Agent 决策
   */
  async makeDecision(message: string): Promise<AgentResponse> {
    this.isAnalyzing = true;
    try {
      const response = await this.execute(message);
      return response;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * 生成项目进展摘要（面向 Boss 的汇报）
   */
  async generateSummary(): Promise<string> {
    try {
      // 获取数据
      const goals = await proclawContext.getActiveGoals();
      const milestones = await proclawContext.getActiveMilestones();
      const tasks = await proclawTasks.list({ limit: 5 });
      const stats = await proclawTasks.getStats();

      // 让 LLM 生成自然语言摘要
      const response = await this.execute(
        `根据以下数据生成一份面向公司老板的项目进展摘要（中文，简洁明了）:\n\n` +
        `活跃目标(${goals.length}): ${JSON.stringify(goals.map(g => ({ title: g.title, priority: g.priority })))}\n` +
        `里程碑(${milestones.length}): ${JSON.stringify(milestones.map(m => ({ title: m.title })))}\n` +
        `任务统计: 总数${stats.total}, 待处理${stats.pending}, 进行中${stats.in_progress}, 已完成${stats.completed}, 失败${stats.failed}\n` +
        `最近任务: ${JSON.stringify(tasks.map(t => ({ desc: t.description, status: t.status })))}\n\n` +
        '请分段描述：1) 项目总体进展 2) 关键目标进度 3) 风险和待办事项'
      );

      return response.output;
    } catch (e) {
      return `生成摘要失败: ${e instanceof Error ? e.message : '未知错误'}`;
    }
  }

  /** 当前是否正在分析 */
  get isBusy(): boolean {
    return this.isAnalyzing;
  }

  /**
   * 记录决策到日志 (PRD v6.3)
   */
  async recordDecision(input: {
    decisionType: string;
    proposedContent: string;
    bossDecision?: string;
    bossFeedback?: string;
    finalContent?: string;
    estimatedRisk?: string;
  }): Promise<void> {
    try {
      const logEntry: DecisionLogInput = {
        decision_type: input.decisionType,
        proposed_content: input.proposedContent,
        boss_decision: input.bossDecision,
        boss_feedback: input.bossFeedback,
        final_content: input.finalContent,
        estimated_risk: input.estimatedRisk,
      };
      await proclawDecision.addLog(logEntry);
    } catch (e) {
      console.error('[CEOAgent] Failed to record decision:', e);
    }
  }

  /**
   * 获取偏好感知的 Prompt 前缀 (PRD v6.3)
   * 注入历史决策摘要，让 AI 生成更符合 Boss 偏好的建议
   */
  async getPreferenceAwarePrompt(): Promise<string> {
    try {
      const [stats, prefs] = await Promise.all([
        proclawDecision.getStats(),
        proclawLearning.getPreferences(),
      ]);

      const parts: string[] = [];

      // 决策统计
      if (stats.total > 0) {
        parts.push(`- 历史决策: 共 ${stats.total} 次, 接受率 ${(stats.approval_rate * 100).toFixed(0)}%`);
        if (stats.most_rejected_type) {
          parts.push(`- 最常拒绝的类型: ${stats.most_rejected_type}`);
        }
      }

      // 偏好配置
      const prefMap = new Map(prefs.map(p => [p.key, p.value]));
      const budgetSensitivity = prefMap.get('budget_sensitivity') || '5';
      const riskTolerance = prefMap.get('risk_tolerance') || '5';
      const decisionStyle = prefMap.get('decision_style') || '"balanced"';

      parts.push(`- 预算敏感度: ${budgetSensitivity}/10`);
      parts.push(`- 风险偏好: ${riskTolerance}/10`);
      parts.push(`- 决策风格: ${decisionStyle.replace(/"/g, '')}`);

      if (parts.length > 0) {
        return `\n\n根据你的历史决策记录和偏好设置，请注意以下偏好特征:\n${parts.join('\n')}\n\n请根据这些偏好调整你的建议。`;
      }
    } catch {
      // 静默失败
    }
    return '';
  }

  /**
   * 批量确认同类决策 (PRD v6.3)
   */
  async batchConfirm(decisionType: string): Promise<number> {
    try {
      const pendingLogs = await proclawDecision.queryLogs({
        bossDecision: undefined,
        decisionType,
        limit: 50,
      });

      let confirmed = 0;
      for (const log of pendingLogs) {
        await proclawDecision.updateStatus(log.id, 'approved');
        confirmed++;
      }
      return confirmed;
    } catch (e) {
      console.error('[CEOAgent] Batch confirm failed:', e);
      return 0;
    }
  }

  /**
   * 覆盖 analyzeIntent 以集成偏好感知
   */
  async analyzeIntent(message: string): Promise<CEOAnalysisResult> {
    const prefPrompt = await this.getPreferenceAwarePrompt();

    const response = await this.execute(
      `分析以下Boss消息，识别意图并决定采取什么行动。消息: "${message}"${prefPrompt}\n\n` +
      '请按以下JSON格式回复（不要包含其他文字）：\n' +
      `{
        "intent": "意图简短描述",
        "confidence": 0.0-1.0,
        "decision": {
          "action": "update_pcp|dispatch_task|query_status|generate_report|inform_boss",
          "reasoning": "推理过程",
          "details": {}
        },
        "needsConfirmation": true/false
      }`
    );

    try {
      const jsonStr = response.output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: CEOAnalysisResult = JSON.parse(jsonStr);
      return parsed;
    } catch {
      return {
        intent: '无法解析意图',
        confidence: 0,
        decision: {
          action: 'inform_boss',
          reasoning: '无法理解您的意图，请重新描述',
          details: {},
        },
        needsConfirmation: false,
      };
    }
  }
}

// ==================== 系统提示词 ====================

function getCEOSystemPrompt(): string {
  return `你是 ProClaw 虚拟公司的 CEO Agent，作为公司主控官，你的职责是：

## 核心职责

1. **理解 Boss 意图**：解析自然语言对话，提取宏观决策，更新项目上下文协议(PCP)
2. **任务分派**：根据 PCP 中的目标和里程碑，向合适的子 Agent 分派任务
3. **任务审查**：接收子 Agent 的完成反馈，对比预期结果，判断是否合格
4. **进度汇报**：生成项目进展摘要，突出关键里程碑、风险和待办
5. **冲突协调**：当多个子 Agent 的需求冲突时，提出解决方案供 Boss 决策

## 工作原则

- 使用 PCP（项目上下文协议）记录所有重要的决策和目标
- 关键操作（更新 PCP、分派重要任务）需要先请求 Boss 确认
- 保持专业、简洁的沟通风格
- 主动汇报，不要等 Boss 问了才说

## 可用的工具

- pcp_add_entry: 添加项目上下文条目
- pcp_query: 查询项目上下文
- dispatch_task: 向子 Agent 分派任务
- get_task_status: 查询任务执行状态
- list_agents: 列出可用子 Agent
- generate_report: 生成项目进展报告

## 示例对话

Boss: "我们下个季度要主攻海外市场"
CEO: 分析意图 → 更新 PCP（goal）→ 请求确认 → 分派任务给营销 Agent → 汇报

Boss: "目前项目关键里程碑有哪些？"
CEO: 查询 PCP → 列出活跃里程碑 → 简明汇报`;
}

export default CEOAgent;
