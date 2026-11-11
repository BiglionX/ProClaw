/**
 * Hermes Skills - 检索器
 *
 * 用 SQLite FTS5 做关键词召回,再叠加 Skill 的历史成功率做加权排序。
 *
 * P0-A:仅 FTS5 + 加权。
 * P1+:可叠加本地 embedding 做语义召回(transformers.js / all-MiniLM-L6-v2),
 *      届时只需替换 retrieve() 的内部实现,对外接口不变。
 */

import type {
  ScoredSkill,
  Skill,
  SkillRetrievalOptions,
} from './types';
import type { DatabaseExecutor } from './skillStore';
import { SkillStore } from './skillStore';

interface FtsRow {
  id: string;
  /** FTS5 bm25() 返回越小越相关;我们取负数使其越大越相关 */
  bm25: number;
}

export class SkillRetriever {
  constructor(
    private readonly db: DatabaseExecutor,
    private readonly store: SkillStore,
  ) {}

  /**
   * 根据 query 检索最相关的 Skill。
   * 流程:query → FTS5 MATCH → 取 topK*3 候选 → 加载完整 row →
   *       计算 successRate 加权 → 返回 topK
   */
  async retrieve(query: string, options: SkillRetrievalOptions = {}): Promise<ScoredSkill[]> {
    await this.store.init();
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.05;
    const activeOnly = options.activeOnly ?? true;
    const tags = options.tags;

    const ftsQuery = buildFtsQuery(query);
    if (!ftsQuery) return [];

    const candidateLimit = Math.max(topK * 3, 15);
    const tagFilter = tags && tags.length > 0
      ? `AND EXISTS (SELECT 1 FROM json_each(s.tags) AS t WHERE t.value IN (${tags.map(() => '?').join(',')}))`
      : '';
    const statusFilter = activeOnly ? `AND s.status = 'active'` : '';

    let rows: Array<{ id: string; bm25: number }> = [];
    try {
      rows = await this.db.all<FtsRow>(
        `SELECT s.id, bm25(hermes_skills_fts, 0, 1.0, 2.0, 1.5, 1.0) AS bm25
         FROM hermes_skills_fts
         JOIN hermes_skills s ON s.id = hermes_skills_fts.id
         WHERE hermes_skills_fts MATCH ?
           ${statusFilter}
           ${tagFilter}
         ORDER BY bm25
         LIMIT ?`,
        tagFilter
          ? [ftsQuery, ...(tags ?? []), candidateLimit]
          : [ftsQuery, candidateLimit],
      );
    } catch (e) {
      // FTS5 查询语法错误时(空字符串、特殊字符)返回空集而不是崩溃
      console.warn('[SkillRetriever] FTS query failed:', e);
      return [];
    }

    if (rows.length === 0) return [];

    const scored: ScoredSkill[] = [];
    for (const row of rows) {
      const skill = await this.store.getById(row.id);
      if (!skill) continue;
      const relevance = -row.bm25; // bm25 越小越相关 → 越大越相关
      const successRate = computeSuccessRate(skill);
      const composite = relevance * (0.5 + successRate * 0.5);
      if (composite < minScore) continue;
      scored.push({
        skill,
        bm25Score: relevance,
        compositeScore: Number(composite.toFixed(4)),
      });
    }

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    return scored.slice(0, topK);
  }

  /**
   * 把检索到的 Skill 列表注入到 systemPrompt 中。
   * BaseAgent 在调用 LLM 前会用到。
   */
  buildSystemPromptAddition(skills: ScoredSkill[]): string {
    if (skills.length === 0) return '';
    const sections = skills.map((scored, idx) => {
      const s = scored.skill;
      const toolsDesc = s.toolTemplates
        .map(
          (t) =>
            `  - ${t.toolName}(${t.whenToUse ?? '通用'}):例 ${truncate(t.exampleInvocation, 120)}`,
        )
        .join('\n');
      return `### Skill #${idx + 1}:${s.name}(composite=${scored.compositeScore})
${s.description}
触发场景:${s.triggerPhrases.join('、')}
可用工具:\n${toolsDesc}`;
    });

    return [
      '\n\n<hermes_skills>',
      '以下 Skill 与当前用户问题相关,请优先按其描述使用对应工具:',
      '',
      ...sections,
      '</hermes_skills>',
    ].join('\n');
  }
}

/* =========================== 工具函数 =========================== */

/**
 * 把自然语言 query 转成 FTS5 MATCH 表达式。
 * - 拆词、去停用词、转义
 * - 中文按 Intl.Segmenter 拆字 + n-gram,英文按空格
 * - 每个词加前缀匹配(token*),支持中英文混合
 */
function buildFtsQuery(query: string): string {
  const cleaned = query
    .toLowerCase()
    .replace(/[\p{P}]/gu, ' ') // 去掉标点
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'what', 'how', 'why', 'when', 'where',
    '的', '了', '是', '在', '我', '你', '他', '她', '它', '我们', '你们',
    '什么', '怎么', '为什么', '请', '帮我',
  ]);

  // 中英文分词:有空格按空格,没有则尝试 Intl.Segmenter
  const tokens: string[] = [];
  for (const piece of cleaned.split(/\s+/)) {
    if (!piece) continue;
    if (/[a-z]/.test(piece) && piece.length > 2) {
      // 英文整词
      if (!STOP_WORDS.has(piece)) tokens.push(piece);
    } else {
      // 中文(或中英混合):Intl.Segmenter 按字
      try {
        // @ts-expect-error Intl.Segmenter 在 TS 老版本 lib 上未声明
        const seg = new Intl.Segmenter('zh', { granularity: 'word' });
        for (const s of seg.segment(piece)) {
          const w = s.segment.trim();
          if (w.length >= 2 && !STOP_WORDS.has(w)) tokens.push(w);
        }
      } catch {
        // 兜底:整段当 token
        if (piece.length >= 2 && !STOP_WORDS.has(piece)) tokens.push(piece);
      }
    }
  }

  if (tokens.length === 0) return '';

  // FTS5: 双引号包裹的字符串是短语,转义内部双引号,加前缀匹配
  const escaped = tokens
    .slice(0, 16) // 防止 query 过长拖慢 FTS5
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ');

  return escaped;
}

function computeSuccessRate(skill: Skill): number {
  // > 0 而不是 === 0:usageCount 为 undefined/NaN(历史脏数据)时同样走冷启动中性值
  if (!(skill.usageCount > 0)) return 0.5; // 冷启动给中性值
  return skill.successCount / skill.usageCount;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}