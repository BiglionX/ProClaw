/**
 * Hermes Skills - 反思提示词模板
 *
 * 这是 SkillEvolver 的核心,提示词质量直接决定进化质量。
 * 4 个 prompt 对应 4 种决策:
 *  1. CREATE:失败 trace → 是否需要新建技能
 *  2. OPTIMIZE:已有技能失败率高 → 是否需要优化
 *  3. MERGE:多条相似 trace → 是否合并为通用技能
 *  4. NOOP:无需动作
 *
 * 设计原则:
 *  - 强 schema 约束:输出 JSON,LlmReflector 校验后入库
 *  - 少思考空间:不让 LLM 自由发挥,只让其在固定选项里挑
 *  - 引用具体 Tool 名:LlM 必须用现有 Tool,不能发明
 */

import type { ExecutionTrace, Skill } from './types';

export type ReflectionAction = 'create' | 'optimize' | 'merge' | 'noop';

export interface ReflectionResult {
  action: ReflectionAction;
  /** action=create / optimize / merge 时必填 */
  skill?: {
    name: string;
    description: string;
    triggerPhrases: string[];
    toolTemplates: Array<{
      toolName: string;
      inputSchema: Record<string, unknown>;
      exampleInvocation: string;
      whenToUse?: string;
      order?: number;
    }>;
    systemPromptAddition: string;
    tags: string[];
  };
  /** action=optimize 时必填 */
  targetSkillId?: string;
  /** action=merge 时必填,源 skill id 列表 */
  sourceSkillIds?: string[];
  /** 必填,让后续调试能追溯 */
  reasoning: string;
}

/* ============================================================
 * 1. CREATE 提示词 — 失败 trace 是否值得新建技能
 * ============================================================ */
export function buildCreatePrompt(
  trace: ExecutionTrace,
  availableTools: string[],
  existingSkills: Skill[],
): { system: string; user: string } {
  const existingSummary = existingSkills
    .slice(0, 50)
    .map((s) => `- ${s.id}: ${s.name} (触发:${s.triggerPhrases.slice(0, 5).join('/')})`)
    .join('\n');

  const system = `你是一个 Hermes 技能反思引擎,负责从失败/部分成功的任务执行中提炼可复用的"技能"。

技能定义:Agent 在执行某类任务时沉淀的可复用经验包,包括:
  - name:技能简称
  - description:什么场景下使用
  - triggerPhrases:用户会怎么说才会触发
  - toolTemplates:调用哪些 Tool、按什么顺序调用
  - systemPromptAddition:对 system prompt 的补充说明
  - tags:用于检索的标签

你的职责:判断本次失败 trace 是否值得新建一个技能。

判断标准:
  1. 如果失败原因是「用户问了一个我们根本没覆盖的场景」→ 值得新建
  2. 如果失败原因是「已有技能没接好/参数错了」→ 不新建,后面用 optimize
  3. 如果失败是「网络/超时/数据库锁」等基础设施问题 → 不新建
  4. 如果失败是「用户问得太模糊,信息不足」→ 不新建

严格约束:
  - 只输出 JSON,不要解释
  - toolTemplates 中只能使用 availableTools 列出的 Tool 名
  - 不超过 3 个 triggerPhrases,每个 2~6 字
  - description 不超过 80 字
  - action 只能是 "create" 或 "noop"`;

  const user = JSON.stringify(
    {
      trace: {
        agentName: trace.agentName,
        query: trace.query,
        toolCalls: trace.toolCalls.map((c) => ({
          tool: c.toolName,
          input: c.input,
          output: c.output.slice(0, 200),
          error: c.error,
        })),
        failureReason: trace.failureReason,
        finalOutput: trace.finalOutput.slice(0, 300),
      },
      availableTools,
      existingSkills: existingSummary,
      outputSchema: {
        action: '"create" | "noop"',
        skill: {
          name: 'string',
          description: 'string',
          triggerPhrases: 'string[]',
          toolTemplates: [
            {
              toolName: 'string(必须来自 availableTools)',
              inputSchema: 'object',
              exampleInvocation: 'string',
              whenToUse: 'string?',
              order: 'number?',
            },
          ],
          systemPromptAddition: 'string',
          tags: 'string[]',
        },
        reasoning: 'string',
      },
    },
    null,
    2,
  );

  return { system, user };
}

/* ============================================================
 * 2. OPTIMIZE 提示词 — 已有技能失败率高
 * ============================================================ */
export function buildOptimizePrompt(
  target: Skill,
  failedTraces: ExecutionTrace[],
): { system: string; user: string } {
  const system = `你是一个 Hermes 技能优化引擎。

当某个技能失败率 >30% 或被用户多次反馈不准确时,需要反思是否优化。

可做的优化:
  1. 收窄 triggerPhrases:去除太宽泛的触发词,避免误命中
  2. 拓宽 triggerPhrases:增加遗漏的同义词
  3. 修正 systemPromptAddition:补充 LLM 容易犯错的边界条件
  4. 调整 toolTemplates 顺序/示例:让 LLM 知道先用哪个 Tool
  5. 删除冗余的 toolTemplates:避免 LLM 选错

不能做的:
  - 改名到完全不同的领域(那应该是新建,不是优化)
  - 删除所有 toolTemplates
  - 输出 action="merge"(那是另一个 prompt 的职责)

严格约束:只输出 JSON,toolTemplates 中的 toolName 必须保留原技能的 Tool,不能换。`;

  const user = JSON.stringify(
    {
      currentSkill: {
        id: target.id,
        name: target.name,
        description: target.description,
        triggerPhrases: target.triggerPhrases,
        toolTemplates: target.toolTemplates.map((t) => ({
          toolName: t.toolName,
          exampleInvocation: t.exampleInvocation,
          whenToUse: t.whenToUse,
        })),
        systemPromptAddition: target.systemPromptAddition,
        usageCount: target.usageCount,
        successCount: target.successCount,
        failureCount: target.failureCount,
        successRate:
          target.usageCount > 0
            ? Number((target.successCount / target.usageCount).toFixed(3))
            : null,
      },
      failedTraces: failedTraces.slice(0, 5).map((t) => ({
        query: t.query,
        failureReason: t.failureReason,
      })),
      outputSchema: {
        action: '"optimize" | "noop"',
        targetSkillId: target.id,
        skill: {
          name: 'string',
          description: 'string',
          triggerPhrases: 'string[]',
          toolTemplates: '与 currentSkill 保持结构,toolName 不变',
          systemPromptAddition: 'string',
          tags: 'string[]',
        },
        reasoning: 'string',
      },
    },
    null,
    2,
  );

  return { system, user };
}

/* ============================================================
 * 3. MERGE 提示词 — 多条 trace 模式相似
 * ============================================================ */
export function buildMergePrompt(
  candidates: Skill[],
  sampleTraces: ExecutionTrace[],
): { system: string; user: string } {
  const system = `你是一个 Hermes 技能合并引擎。

当多个技能触发场景重叠、调用 Tool 高度相似时,合并为通用技能,避免技能库膨胀。

合并原则:
  1. 至少 2 个候选技能
  2. 它们必须针对同一类业务问题(例如:都是"导出数据",只是格式不同)
  3. 合并后的 triggerPhrases 取并集
  4. 合并后的 toolTemplates 取并集去重
  5. 合并后的 description 概括所有场景
  6. 如果只是边缘相似,不要强行合并 → action=noop

严格约束:只输出 JSON。`;

  const user = JSON.stringify(
    {
      candidateSkills: candidates.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        triggerPhrases: s.triggerPhrases,
        toolNames: s.toolTemplates.map((t) => t.toolName),
        tags: s.tags,
      })),
      sampleTraces: sampleTraces.slice(0, 5).map((t) => ({
        query: t.query,
        toolCalls: t.toolCalls.map((c) => c.toolName),
      })),
      outputSchema: {
        action: '"merge" | "noop"',
        sourceSkillIds: 'string[]',
        skill: {
          name: 'string',
          description: 'string',
          triggerPhrases: 'string[]',
          toolTemplates: [
            {
              toolName: 'string',
              inputSchema: 'object',
              exampleInvocation: 'string',
              whenToUse: 'string?',
              order: 'number?',
            },
          ],
          systemPromptAddition: 'string',
          tags: 'string[]',
        },
        reasoning: 'string',
      },
    },
    null,
    2,
  );

  return { system, user };
}

/* ============================================================
 * 4. 通用:对单条 trace 评估是否值得进化(粗筛)
 * ============================================================ */
export interface EvolutionGate {
  shouldEvolve: boolean;
  reason: string;
  /** "create"=新建、"optimize"=优化已有、"merge"=合并、"skip"=不动 */
  suggested: ReflectionAction | 'skip';
}

export function gateEvolution(
  trace: ExecutionTrace,
  signals: { outcome: string; confidence: number },
  skillUsageStats: Array<{
    skillId: string;
    usageCount: number;
    successCount: number;
    failureCount: number;
  }>,
): EvolutionGate {
  // 场景 A:失败 → 触发 create 反思
  if (signals.outcome === 'failure' && signals.confidence >= 0.6) {
    return {
      shouldEvolve: true,
      reason: `失败 trace,confidence=${signals.confidence}`,
      suggested: 'create',
    };
  }

  // 场景 B:已有技能失败率超阈值 → 触发 optimize
  for (const stat of skillUsageStats) {
    if (stat.usageCount >= 5) {
      const rate = stat.failureCount / stat.usageCount;
      if (rate > 0.3) {
        return {
          shouldEvolve: true,
          reason: `技能 ${stat.skillId} 失败率 ${rate.toFixed(2)} 超过 0.3`,
          suggested: 'optimize',
        };
      }
    }
  }

  // 场景 C:多个候选技能在同一 query 上都被命中 → 触发 merge 评估
  // (此信号通常由 SkillRetriever 触发,这里仅占位)
  if (skillUsageStats.length >= 2 && skillUsageStats.every((s) => s.usageCount >= 3)) {
    const allHighUse = skillUsageStats.every((s) => s.usageCount >= 5);
    if (allHighUse) {
      return {
        shouldEvolve: true,
        reason: '多个高频技能,值得评估合并',
        suggested: 'merge',
      };
    }
  }

  return {
    shouldEvolve: false,
    reason: `outcome=${signals.outcome},confidence=${signals.confidence},无需进化`,
    suggested: 'skip',
  };
}