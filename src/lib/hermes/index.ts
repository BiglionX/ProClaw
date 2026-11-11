/**
 * Hermes Skills - 模块入口
 *
 * P0-A 阶段提供:
 * - SkillStore / SkillRetriever 实例化工厂
 * - 默认 DatabaseExecutor(内存版,便于开发与单测)
 * - 预设技能导入
 *
 * P0-B 会追加 SkillEvolver;
 * P1-A 会追加 SelfHealingExecutor;
 * P1-B 会追加 MoAOrchestrator。
 */

import type { DatabaseExecutor } from './skillStore';
import { SkillStore } from './skillStore';
import { SkillRetriever } from './skillRetriever';
import { PRESET_SKILLS } from './presetSkills';

/* =========================== 类型导出 =========================== */
export type {
  Skill,
  SkillUpsertInput,
  SkillSource,
  SkillStatus,
  ToolTemplate,
  ToolCallRecord,
  ExecutionTrace,
  ScoredSkill,
  SkillRetrievalOptions,
  PresetSkillFactory,
} from './types';

/* =========================== 类导出 =========================== */
export { SkillStore } from './skillStore';
export type { DatabaseExecutor } from './skillStore';
export { SkillRetriever } from './skillRetriever';
export { PRESET_SKILLS, getPresetSkillIds } from './presetSkills';
export {
  SkillEvolver,
  skillIdsFromScored,
} from './skillEvolver';
export type { EvolverConfig, EvolutionLogEntry } from './skillEvolver';
export { HermesApi, setHermesApi, getHermesApi } from './hermesApi';
export { evaluateOutcome } from './feedbackSignals';
export type { FeedbackSignals } from './feedbackSignals';
export {
  TauriRpcExecutor,
  StandaloneSqliteExecutor,
  makeTauriRpcExecutor,
  makeStandaloneExecutor,
  fromBetterSqlite3,
  toSqlParam,
  toTauriParam,
} from './sqlCipherExecutor';
export type { TauriInvoke, TauriRpcExecutorOptions, SqliteClient, StandaloneSqliteExecutorOptions } from './sqlCipherExecutor';
export {
  MoASignalBus,
  getMoaSignalBus,
  setMoaSignalBus,
  textJaccardSimilarity,
  DEFAULT_SIGNAL_THRESHOLDS,
} from './moaSignal';
export type {
  MoASignalEvent,
  MoASignalKind,
  MoASignalThresholds,
} from './moaSignal';
export {
  bindEvolverToMoaSignals,
  decideEvolutionFromSignal,
} from './evolveFromMoaSignal';
export type {
  MoAEvolutionDecision,
  MoAEvolutionReason,
  EvolveFromMoaSignalOptions,
} from './evolveFromMoaSignal';
export {
  buildCreatePrompt,
  buildOptimizePrompt,
  buildMergePrompt,
  gateEvolution,
} from './reflectionPrompt';
export type {
  ReflectionResult,
  ReflectionAction,
  EvolutionGate,
} from './reflectionPrompt';
export {
  SelfHealingExecutor,
  SchemaRepairLoop,
  SchemaRepairFailedError,
  DefaultErrorClassifier,
} from './selfHealingExecutor';
export type {
  SelfHealingConfig,
} from './selfHealingExecutor';
export type {
  HealingResult,
  LlmAttempt,
} from './healingTypes';
export { MoAOrchestrator } from './moa';
export type { MoAConfig } from './moa';
export type {
  ClassifiedError,
  ErrorCategory,
  ErrorClassifier,
  FallbackStrategy,
  MoAProposer,
  MoAAggregator,
  MoAProposal,
  MoAResult,
  MoATriggerCondition,
  ModelResolver,
  LlmInvokeRequest,
} from './healingTypes';

/* =========================== 内存版 DatabaseExecutor(开发/单测用) =========================== */

/**
 * 一个最简的内存 SQL 子集,只支持 SkillStore 用到的语句:
 * - CREATE TABLE / CREATE INDEX / CREATE VIRTUAL TABLE
 * - CREATE TRIGGER
 * - INSERT / UPDATE / DELETE
 * - SELECT ... FROM ... [JOIN] [WHERE ...] [ORDER BY ...] [LIMIT ?] [OFFSET ?]
 * - COUNT(*)、bm25()、json_each() 不可用 → 仅供单测模拟字段返回
 *
 * 真实环境(Tauri 桌面)请注入 SQLCipher 适配器,本类不进入生产路径。
 */
export class InMemoryDatabase implements DatabaseExecutor {
  private tables = new Map<string, Map<number, Record<string, unknown>>>();
  private lastInsertRowid = 0;
  private fts = new Map<string, Map<number, Record<string, unknown>>>();

  exec(sql: string): void {
    const s = sql.trim();
    if (/^CREATE\s+(TABLE|INDEX|VIRTUAL\s+TABLE|TRIGGER)/i.test(s)) {
      // 仅记表名,不实际执行
      const m = s.match(/(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (m) {
        const name = m[1];
        if (!this.tables.has(name)) this.tables.set(name, new Map());
        if (/VIRTUAL\s+TABLE/i.test(s) && !this.fts.has(name)) this.fts.set(name, new Map());
      }
      return;
    }
    if (/^INSERT\s+INTO\s+hermes_schema_meta/i.test(s)) return;
    // 其余 exec 不实现
  }

  run(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
    const s = sql.trim();
    this.lastInsertRowid += 1;
    const rowid = this.lastInsertRowid;

    // INSERT INTO hermes_skills (...) VALUES (?, ..., 0, 0, 0, ?, ?, ?)
    // 注意:usage/success/failure_count 在 SQL 里硬编码为 0,params[10..12]
    // 是 created_at / updated_at / tags —— 早期版本误把 params[10] 塞进
    // usage_count,导致计数列变成时间字符串、综合评分出现 NaN。
    if (/^INSERT\s+INTO\s+hermes_skills\b/i.test(s)) {
      const tbl = this.tables.get('hermes_skills');
      if (!tbl) return { lastInsertRowid: rowid, changes: 0 };
      const rec: Record<string, unknown> = {
        id: params[0],
        name: params[1],
        description: params[2],
        trigger_phrases: params[3],
        tool_templates: params[4],
        system_prompt_addition: params[5],
        source: params[6],
        status: params[7],
        version: params[8],
        parent_version: params[9],
        usage_count: 0,
        success_count: 0,
        failure_count: 0,
        created_at: params[10],
        updated_at: params[11],
        tags: params[12],
      };
      tbl.set(rowid, rec);
      this.syncFts(rowid, rec);
      return { lastInsertRowid: rowid, changes: 1 };
    }

    // INSERT INTO hermes_evolution_log — id 自增,供 SkillEvolver 日志读取
    if (/^INSERT\s+INTO\s+hermes_evolution_log\b/i.test(s)) {
      const tbl = this.tables.get('hermes_evolution_log');
      if (!tbl) return { lastInsertRowid: rowid, changes: 0 };
      tbl.set(rowid, {
        id: rowid,
        timestamp: params[0],
        trace_query: params[1],
        agent_name: params[2],
        action: params[3],
        skill_id: params[4],
        source_skill_ids: params[5],
        reasoning: params[6],
        signals: params[7],
        error: params[8],
      });
      return { lastInsertRowid: rowid, changes: 1 };
    }

    if (/^INSERT\s+INTO\s+hermes_schema_meta\b/i.test(s)) {
      return { lastInsertRowid: rowid, changes: 1 };
    }

    // UPDATE hermes_skills SET ... WHERE id = ? — 解析 SET 子句,支持
    //   col = ?           (upsert 路径)
    //   col = col + 1     (recordUsage 路径,模拟 SQLite 的算术更新)
    if (/^UPDATE\s+hermes_skills\b/i.test(s)) {
      return this.updateSkills(s, params, rowid);
    }

    if (/^DELETE\s+FROM\s+hermes_skills\b/i.test(s)) {
      const tbl = this.tables.get('hermes_skills');
      if (!tbl) return { lastInsertRowid: rowid, changes: 0 };
      const id = params[0];
      const existing = Array.from(tbl.entries()).find(([, r]) => r.id === id);
      if (existing) {
        tbl.delete(existing[0]);
        this.fts.get('hermes_skills_fts')?.delete(existing[0]);
      }
      return { lastInsertRowid: rowid, changes: existing ? 1 : 0 };
    }

    return { lastInsertRowid: rowid, changes: 0 };
  }

  /** UPDATE hermes_skills:解析 SET 赋值并按 WHERE id 定位行 */
  private updateSkills(
    sql: string,
    params: unknown[],
    rowid: number,
  ): { lastInsertRowid: number; changes: number } {
    const tbl = this.tables.get('hermes_skills');
    if (!tbl) return { lastInsertRowid: rowid, changes: 0 };
    const whereM = sql.match(/WHERE\s+id\s*=\s*(\?|'([^']*)'|"([^"]*)"|([A-Za-z0-9_\-]+))/i);
    if (!whereM) return { lastInsertRowid: rowid, changes: 0 };
    // SET 子句里的 ? 先于 WHERE 的 ? 绑定,所以 WHERE id 参数永远在末尾
    const id = whereM[1] === '?' ? params[params.length - 1] : (whereM[2] ?? whereM[3] ?? whereM[4]);
    const entry = Array.from(tbl.entries()).find(([, r]) => r.id === id);
    if (!entry) return { lastInsertRowid: rowid, changes: 0 };
    const [rowKey, rec] = entry;
    // SET 子句是多行 SQL,必须用 dotall 模式让 . 跨过换行
    const setM = sql.match(/SET\s+(.+?)\s+WHERE/is);
    if (!setM) return { lastInsertRowid: rowid, changes: 0 };
    let p = 0;
    for (const part of setM[1].split(',')) {
      const am = part.match(/^\s*([a-z_]+)\s*=\s*(.+?)\s*$/i);
      if (!am) continue;
      rec[am[1]] = evalSetAssignment(rec, am[2], () => params[p++]);
    }
    this.syncFts(rowKey, rec);
    return { lastInsertRowid: rowid, changes: 1 };
  }

  all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const s = sql.trim();

    // SELECT * FROM hermes_evolution_log ORDER BY id DESC LIMIT ?
    if (/FROM\s+hermes_evolution_log\b/i.test(s)) {
      const tbl = this.tables.get('hermes_evolution_log');
      if (!tbl) return [];
      const limit = Number(params[0] ?? 50) || 50;
      return Array.from(tbl.values())
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, limit) as unknown as T[];
    }

    // SELECT s.id, bm25(...) FROM hermes_skills_fts JOIN hermes_skills s ...
    // 单测环境无 bm25:用「全部 token 命中」模拟 FTS5 的隐式 AND,
    // 分数与命中 token 数负相关(bm25 越小越相关)。
    if (/FROM\s+hermes_skills_fts/i.test(s) && /JOIN\s+hermes_skills/i.test(s)) {
      const tbl = this.tables.get('hermes_skills') ?? new Map();
      // params: [ftsQuery, ...tags?, candidateLimit]
      const tokens = parseFtsTokens(String(params[0] ?? ''));
      if (tokens.length === 0) return [];
      const statusM = s.match(/s\.status\s*=\s*'(\w+)'/i);
      const requiredStatus = statusM ? statusM[1] : null;
      const rows: Array<{ id: string; bm25: number }> = [];
      for (const rec of tbl.values()) {
        if (requiredStatus && rec.status !== requiredStatus) continue;
        const hay = `${rec.name} ${rec.description} ${rec.trigger_phrases} ${rec.tags}`.toLowerCase();
        const matched = tokens.filter((t) => hay.includes(t.toLowerCase()));
        if (matched.length !== tokens.length) continue; // FTS5 隐式 AND:一个没命中就整行出局
        rows.push({ id: rec.id as string, bm25: -matched.length });
      }
      rows.sort((a, b) => a.bm25 - b.bm25);
      const limit = Number(params[params.length - 1]) || rows.length;
      return rows.slice(0, limit) as unknown as T[];
    }

    // SELECT * FROM hermes_skills [WHERE status = ?] ORDER BY updated_at DESC LIMIT ? OFFSET ?
    if (/FROM\s+hermes_skills\b/i.test(s) && !/JOIN\s+hermes_skills_fts/i.test(s)) {
      const tbl = this.tables.get('hermes_skills');
      if (!tbl) return [];
      let rows = Array.from(tbl.values());
      let p = 0;
      const whereM = s.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereM) {
        const col = whereM[1];
        rows = rows.filter((r) => r[col] === params[p]);
        p += 1;
      }
      const limit = Number(params[p] ?? 100) || 100;
      const offset = Number(params[p + 1] ?? 0) || 0;
      rows = [...rows].sort((a, b) =>
        String(b.updated_at).localeCompare(String(a.updated_at)),
      );
      return rows.slice(offset, offset + limit) as unknown as T[];
    }

    return [];
  }

  get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    const s = sql.trim();

    // hermes_schema_meta
    if (/FROM\s+hermes_schema_meta/i.test(s)) {
      const keyM = s.match(/key\s*=\s*'([^']+)'/i);
      const key = keyM ? keyM[1] : String(params[0] ?? '');
      if (key === 'schema_version') return { value: '1' } as unknown as T;
      return undefined;
    }

    // SELECT ... FROM hermes_skills WHERE id = ?
    if (/FROM\s+hermes_skills\b/i.test(s) && /WHERE\s+id\s*=/i.test(s)) {
      const id = params[0];
      const found = Array.from((this.tables.get('hermes_skills') ?? new Map()).values()).find(
        (r) => r.id === id,
      );
      return (found as unknown as T) ?? undefined;
    }

    // SELECT COUNT(*) AS c FROM hermes_skills [WHERE status = ?]
    if (/COUNT\(\*\)/i.test(s)) {
      const tbl = this.tables.get('hermes_skills') ?? new Map();
      let rows = Array.from(tbl.values());
      const statusM = s.match(/WHERE\s+status\s*=\s*\?/i);
      if (statusM) rows = rows.filter((r) => r.status === params[0]);
      return { c: rows.length } as unknown as T;
    }

    return undefined;
  }

  private syncFts(rowid: number, rec: Record<string, unknown>) {
    if (!this.fts.has('hermes_skills_fts')) this.fts.set('hermes_skills_fts', new Map());
    this.fts.get('hermes_skills_fts')!.set(rowid, {
      id: rec.id,
      name: rec.name,
      description: rec.description,
      trigger_phrases: rec.trigger_phrases,
      tags: rec.tags,
    });
  }
}

/* 计算 UPDATE SET 赋值右侧的表达式:
 *   ?            → 按顺序取参数
 *   col + 1      → 数值自增(模拟 SQLite 的 usage_count = usage_count + 1)
 *   col + ? / -  → 数值加减参数
 *   数字          → 字面量数字
 *   '字符串'      → 字面量字符串
 *   col          → 复制另一列的值
 * 其余按字符串兜底。
 */
function evalSetAssignment(
  rec: Record<string, unknown>,
  rhs: string,
  nextParam: () => unknown,
): unknown {
  const t = rhs.trim();
  if (t === '?') return nextParam();
  const arith = t.match(/^([a-z_]+)\s*([+-])\s*(\?|\d+)$/i);
  if (arith) {
    const base = Number(rec[arith[1]] ?? 0);
    const delta = arith[3] === '?' ? Number(nextParam() ?? 0) : Number(arith[3]);
    return arith[2] === '+' ? base + delta : base - delta;
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const str = t.match(/^'((?:[^']|'')*)'$/);
  if (str) return str[1].replace(/''/g, "'");
  if (/^[a-z_]+$/i.test(t)) return rec[t];
  return String(t);
}

/* =========================== 单例工厂 =========================== */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
// 注意:这里必须是值导入 — bindLLMProvider() 会 new SkillEvolver()。
// 曾经写成 import type,导致运行时报 "SkillEvolver is not defined"。
import { SkillEvolver } from './skillEvolver';
import { bindEvolverToMoaSignals } from './evolveFromMoaSignal';
import type { MoASignalBus, MoASignalThresholds } from './moaSignal';

export interface HermesBundle {
  store: SkillStore;
  retriever: SkillRetriever;
  /** P0-B:可选,提供后才能启用自进化 */
  evolver: SkillEvolver | null;
  /** P6:MoA → Evolover 绑定后的取消函数(用于卸载) */
  moaSignalUnbind: (() => void) | null;
  /** 把预设技能写入 store(幂等) */
  seedPresets(): Promise<number>;
  /** 注入 LLM Provider(进化器实际工作时必须) */
  bindLLMProvider(provider: () => Promise<BaseChatModel>): void;
  /** P6:绑定 MoA 信号,自动触发 Evolver 进化。返回 unsubscribe 函数 */
  bindMoASignals(options?: {
    bus?: MoASignalBus;
    thresholds?: Required<MoASignalThresholds>;
    verbose?: boolean;
  }): () => void;
}

let _bundle: HermesBundle | null = null;

/**
 * 创建一个 HermesBundle(传入数据库执行器)。
 *
 * 推荐用法:
 *   const bundle = createHermesBundle(mySqlCipherConn);
 *   bundle.seedPresets(); // 首次启动调用一次
 *   bundle.bindLLMProvider(() => getLLMForTask('skill_evolution')); // 可选,启用自进化
 */
export function createHermesBundle(
  db: DatabaseExecutor,
  options: { skipSchemaInit?: boolean } = {},
): HermesBundle {
  const store = new SkillStore(db, options);
  const retriever = new SkillRetriever(db, store);

  const bundle: HermesBundle = {
    store,
    retriever,
    evolver: null,
    moaSignalUnbind: null,
    seedPresets() {
      return store.upsertMany(PRESET_SKILLS).then((results) => results.length);
    },
    bindLLMProvider(provider) {
      if (!bundle.evolver) {
        bundle.evolver = new SkillEvolver(provider, store, db);
      }
    },
    bindMoASignals(opts = {}) {
      if (!bundle.evolver) {
        throw new Error('bindMoASignals 必须先调 bindLLMProvider 创建 evolver');
      }
      if (bundle.moaSignalUnbind) {
        // 已绑定过,先解绑
        bundle.moaSignalUnbind();
      }
      bundle.moaSignalUnbind = bindEvolverToMoaSignals({
        store,
        evolver: bundle.evolver,
        ...opts,
      });
      return bundle.moaSignalUnbind;
    },
  };
  return bundle;
}

/**
 * 默认单例(基于内存 DB,用于开发/Storybook/单测)。
 * 生产环境请用 createHermesBundle(你的真实 DatabaseExecutor)。
 */
export function getDefaultHermesBundle(): HermesBundle {
  if (!_bundle) {
    _bundle = createHermesBundle(new InMemoryDatabase());
    // 内存库的 seed 是微任务级延迟,不阻塞启动(页面首次拉取前已就绪)
    void _bundle.seedPresets();
  }
  return _bundle;
}

/**
 * 把 SkillRetriever 用的 FTS5 MATCH 表达式还原成 tokens。
 * 仅用于 InMemoryDatabase 的打分模拟。
 */
function parseFtsTokens(ftsQuery: string): string[] {
  // 形如: "查询"* "库存"* → ["查询", "库存"]
  return Array.from(ftsQuery.matchAll(/"([^"]+)"/g))
    .map((m) => m[1])
    .filter(Boolean);
}