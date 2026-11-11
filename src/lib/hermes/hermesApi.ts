/**
 * Hermes Skills - 前端 API 封装层
 *
 * 把 SkillStore / SkillEvolver 的能力包装成纯异步 API,
 * UI 组件只需要调用这些函数,不用关心底层数据库/SQLite/FTS5。
 *
 * 关键原则:
 *  - 纯前端逻辑,不直接访问 SQLite;通过 bundle 实例转发
 *  - 所有方法返回 Promise,内部错误抛到调用方
 *  - 提供 React Query 风格的 query/mutation 模拟(返回稳定 Promise)
 *
 * 在生产环境,这些方法背后是 HermesBundle;在测试/Storybook,
 * 可以注入 InMemoryDatabase 的 bundle。
 */

import type { HermesBundle } from './index';
import type {
  Skill,
  SkillStatus,
  ScoredSkill,
  SkillRetrievalOptions,
  ExecutionTrace,
  EvolutionLogEntry,
} from './index';

/**
 * Hermes 前端 API。
 * 在 main.tsx 或初始化模块中创建一次,挂到 React Query 或 zustand。
 */
export class HermesApi {
  constructor(private readonly bundle: HermesBundle) {}

  /* =========================== Skill 列表与查询 =========================== */

  /** 列出全部技能(分页) */
  async listSkills(opts: { limit?: number; offset?: number; status?: SkillStatus } = {}): Promise<Skill[]> {
    return this.bundle.store.list(opts);
  }

  /** 检索最相关技能 */
  async retrieveSkills(query: string, options?: SkillRetrievalOptions): Promise<ScoredSkill[]> {
    return this.bundle.retriever.retrieve(query, options);
  }

  /** 详情 */
  async getSkill(id: string): Promise<Skill | null> {
    return this.bundle.store.getById(id);
  }

  /** 按 source 分组统计 */
  async statsBySource(): Promise<Record<string, number>> {
    const all = await this.bundle.store.list({ limit: 10_000 });
    const out: Record<string, number> = {};
    for (const s of all) {
      out[s.source] = (out[s.source] ?? 0) + 1;
    }
    return out;
  }

  /** 按 status 分组统计 */
  async statsByStatus(): Promise<Record<SkillStatus, number>> {
    const all = await this.bundle.store.list({ limit: 10_000 });
    const out: Record<string, number> = {};
    for (const s of all) {
      out[s.status] = (out[s.status] ?? 0) + 1;
    }
    return out as Record<SkillStatus, number>;
  }

  /** 总体统计 */
  async stats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    byStatus: Record<SkillStatus, number>;
  }> {
    const [bySource, byStatus] = await Promise.all([
      this.statsBySource(),
      this.statsByStatus(),
    ]);
    return {
      total: await this.bundle.store.count(),
      bySource,
      byStatus,
    };
  }

  /* =========================== Skill 操作 =========================== */

  /** 审核通过(pending_review → active) */
  async approveSkill(id: string): Promise<Skill | null> {
    const skill = await this.bundle.store.getById(id);
    if (!skill) return null;
    return this.bundle.store.upsert({ ...skill, status: 'active' });
  }

  /** 拒绝(pending_review → archived) */
  async rejectSkill(id: string): Promise<Skill | null> {
    const skill = await this.bundle.store.getById(id);
    if (!skill) return null;
    return this.bundle.store.upsert({ ...skill, status: 'archived' });
  }

  /** 归档一个已激活的技能 */
  async archiveSkill(id: string): Promise<Skill | null> {
    const skill = await this.bundle.store.getById(id);
    if (!skill) return null;
    return this.bundle.store.upsert({ ...skill, status: 'archived' });
  }

  /** 重新激活一个归档的技能 */
  async reactivateSkill(id: string): Promise<Skill | null> {
    const skill = await this.bundle.store.getById(id);
    if (!skill) return null;
    return this.bundle.store.upsert({ ...skill, status: 'active' });
  }

  /** 手动新建技能(无需 LLM 反思) */
  async createSkillManually(input: Omit<Skill, 'id' | 'version' | 'usageCount' | 'successCount' | 'failureCount' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    return this.bundle.store.upsert({
      ...input,
      source: 'learned',
      status: input.status ?? 'active',
      version: 1, // 手动新建永远是 v1(入参类型已排除 version)
      tags: input.tags ?? [],
    });
  }

  /** 测试检索(query → 命中技能) */
  async testRetrieval(query: string, topK = 5): Promise<ScoredSkill[]> {
    return this.bundle.retriever.retrieve(query, { topK, activeOnly: true });
  }

  /* =========================== 进化日志 =========================== */

  async listEvolutionLog(limit = 50): Promise<EvolutionLogEntry[]> {
    if (!this.bundle.evolver) return [];
    return this.bundle.evolver.listEvolutionLog(limit);
  }

  /** 按 action 分组统计 */
  async statsEvolutionByAction(): Promise<Record<EvolutionLogEntry['action'], number>> {
    const log = await this.listEvolutionLog(1000);
    const out: Record<string, number> = {};
    for (const e of log) {
      out[e.action] = (out[e.action] ?? 0) + 1;
    }
    return out as Record<EvolutionLogEntry['action'], number>;
  }

  /** 进化成功率(成功数 / 总数) */
  async evolutionSuccessRate(): Promise<number> {
    const log = await this.listEvolutionLog(1000);
    if (log.length === 0) return 0;
    const success = log.filter(
      (e) => e.action === 'create' || e.action === 'optimize' || e.action === 'merge',
    ).length;
    return success / log.length;
  }

  /* =========================== 反馈模拟(用于 Storybook / Demo) =========================== */

  /**
   * 模拟一次失败执行(给 demo 用,不真正调 LLM)
   * 触发 evolver 后 flush,产出一条 evolution_log + 可能生成 pending_review 技能
   */
  async simulateFailureEvolution(opts: {
    agentName: string;
    query: string;
    failureReason: string;
  }): Promise<EvolutionLogEntry[]> {
    if (!this.bundle.evolver) return [];
    const trace: ExecutionTrace = {
      agentName: opts.agentName,
      query: opts.query,
      toolCalls: [],
      outcome: 'failure',
      finalOutput: '',
      failureReason: opts.failureReason,
      skillIdsUsed: [],
      durationMs: 5_000,
      timestamp: new Date().toISOString(),
    };
    await this.bundle.evolver.recordExecution(trace);
    return this.bundle.evolver.flush();
  }

  /* =========================== MoA 模拟(给 demo 用) =========================== */

  /** MoA 的演示数据 */
  async demoMoAResult(): Promise<{
    triggered: boolean;
    finalOutput: string;
    confidence: number;
    proposals: Array<{ provider: string; role: string; output: string; durationMs: number }>;
    verdictScores: Array<{ providerId: string; score: number }>;
    totalDurationMs: number;
  }> {
    return {
      triggered: true,
      finalOutput:
        '综合 fast(简洁) + thorough(深度) + creative(创意) 三方观点,推荐聚焦在第三季度客户复购率提升,优先推送生日/节日优惠活动。',
      confidence: 0.87,
      proposals: [
        { provider: 'fast', role: 'fast', output: '建议本月发 5 张优惠券,目标复购。', durationMs: 380 },
        { provider: 'thorough', role: 'thorough', output: '基于近 3 个月数据,生日月客户复购率 +18%,建议聚焦生日营销。', durationMs: 920 },
        { provider: 'creative', role: 'creative', output: '可以试试"老带新裂变券",把复购率提升和新客拉新合并。', durationMs: 1100 },
      ],
      verdictScores: [
        { providerId: 'fast', score: 6 },
        { providerId: 'thorough', score: 9 },
        { providerId: 'creative', score: 8 },
      ],
      totalDurationMs: 1200,
    };
  }
}

/* =========================== 全局单例 =========================== */

let _api: HermesApi | null = null;

export function setHermesApi(api: HermesApi): void {
  _api = api;
}

export function getHermesApi(): HermesApi {
  if (!_api) {
    throw new Error('HermesApi 未初始化。请在 main.tsx 调用 setHermesApi(api)');
  }
  return _api;
}