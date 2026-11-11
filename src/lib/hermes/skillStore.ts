/**
 * Hermes Skills - SQLite + FTS5 存储层
 *
 * 设计要点:
 * - 依赖最小:不假设 SQLCipher,接受任何实现 DatabaseExecutor 的连接
 *   (better-sqlite3 / SQLCipher / LibSQL / 内存 mock 均可)
 * - FTS5 虚表用于全文检索,P95 延迟 < 50ms
 * - 所有写入都有 schema 版本号,方便未来 migration
 *
 * P0-A 范围:仅实现「预设技能导入 + 读取 + FTS5 检索」三件事。
 * P0-B 会在这里叠加 SkillEvolver 的写入与 version 链追踪。
 */

import type {
  Skill,
  SkillUpsertInput,
  SkillStatus,
  SkillSource,
  ToolTemplate,
} from './types';

/**
 * 数据库执行器抽象。
 * ProClaw 已有 Tauri + SQLCipher,这里只定义最小契约,
 * 让上层注入实际连接,避免 SkillStore 与具体 ORM 耦合。
 */
/**
 * 数据库执行器抽象。
 * 方法返回 sync 值或 Promise 均可(await 对两者都安全):
 * - InMemoryDatabase / StandaloneSqliteExecutor:同步实现
 * - TauriRpcExecutor:异步实现(Tauri IPC)
 * SkillStore 内部一律 await,因此换执行器无需改业务代码。
 */
export interface DatabaseExecutor {
  exec(sql: string, params?: unknown[]): void | Promise<void>;
  run(
    sql: string,
    params?: unknown[],
  ):
    | { lastInsertRowid: number | bigint; changes: number }
    | Promise<{ lastInsertRowid: number | bigint; changes: number }>;
  all<T = unknown>(sql: string, params?: unknown[]): T[] | Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): T | undefined | Promise<T | undefined>;
}

const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS hermes_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_phrases TEXT NOT NULL,
  tool_templates TEXT NOT NULL,
  system_prompt_addition TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK(source IN ('preset','learned','optimized')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending_review','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_hermes_skills_source ON hermes_skills(source);
CREATE INDEX IF NOT EXISTS idx_hermes_skills_status ON hermes_skills(status);
CREATE INDEX IF NOT EXISTS idx_hermes_skills_updated ON hermes_skills(updated_at);

CREATE VIRTUAL TABLE IF NOT EXISTS hermes_skills_fts USING fts5(
  id UNINDEXED,
  name,
  description,
  trigger_phrases,
  tags,
  content='hermes_skills',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

-- FTS5 同步触发器:写入 skills 后同步 FTS
CREATE TRIGGER IF NOT EXISTS hermes_skills_ai AFTER INSERT ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(rowid, id, name, description, trigger_phrases, tags)
  VALUES (new.rowid, new.id, new.name, new.description, new.trigger_phrases, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS hermes_skills_ad AFTER DELETE ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(hermes_skills_fts, rowid, id, name, description, trigger_phrases, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.description, old.trigger_phrases, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS hermes_skills_au AFTER UPDATE ON hermes_skills BEGIN
  INSERT INTO hermes_skills_fts(hermes_skills_fts, rowid, id, name, description, trigger_phrases, tags)
  VALUES ('delete', old.rowid, old.id, old.name, old.description, old.trigger_phrases, old.tags);
  INSERT INTO hermes_skills_fts(rowid, id, name, description, trigger_phrases, tags)
  VALUES (new.rowid, new.id, new.name, new.description, new.trigger_phrases, new.tags);
END;

CREATE TABLE IF NOT EXISTS hermes_schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

interface SkillRow {
  id: string;
  name: string;
  description: string;
  trigger_phrases: string;
  tool_templates: string;
  system_prompt_addition: string;
  source: SkillSource;
  status: SkillStatus;
  version: number;
  parent_version: number | null;
  usage_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  tags: string;
}

export class SkillStore {
  private initialized = false;

  constructor(
    private readonly db: DatabaseExecutor,
    private readonly options: { skipSchemaInit?: boolean } = {},
  ) {}

  /** 初始化 schema(幂等) */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.options.skipSchemaInit) {
      // Schema 已在外部建好(Tauri Rust 侧 hermes_bootstrap),这里跳过。
      this.initialized = true;
      return;
    }
    await this.db.exec(SCHEMA_SQL);
    const existing = await this.db.get<{ value: string }>(
      `SELECT value FROM hermes_schema_meta WHERE key = 'schema_version'`,
    );
    if (!existing) {
      await this.db.run(
        `INSERT INTO hermes_schema_meta (key, value) VALUES ('schema_version', ?)`,
        [String(SCHEMA_VERSION)],
      );
    } else if (existing.value !== String(SCHEMA_VERSION)) {
      // P0-B 之后再加 migration 逻辑
      console.warn(
        `[SkillStore] schema_version mismatch: db=${existing.value} code=${SCHEMA_VERSION}, 继续运行但可能有兼容问题`,
      );
    }
    this.initialized = true;
  }

  /** 单条写入(插入或更新) */
  async upsert(input: SkillUpsertInput): Promise<Skill> {
    await this.init();
    const now = new Date().toISOString();
    const id = input.id ?? `sk_${cryptoRandom()}`;
    const existing = await this.db.get<{ id: string; version: number }>(
      `SELECT id, version FROM hermes_skills WHERE id = ?`,
      [id],
    );

    if (existing) {
      await this.db.run(
        `UPDATE hermes_skills
         SET name = ?, description = ?, trigger_phrases = ?, tool_templates = ?,
             system_prompt_addition = ?, source = ?, status = ?, version = ?,
             parent_version = ?, tags = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name,
          input.description,
          JSON.stringify(input.triggerPhrases),
          JSON.stringify(input.toolTemplates),
          input.systemPromptAddition ?? '',
          input.source ?? 'learned',
          input.status ?? 'active',
          input.version ?? existing.version + 1,
          input.parentVersion ?? null,
          JSON.stringify(input.tags ?? []),
          now,
          id,
        ],
      );
      return (await this.getById(id))!;
    }

    await this.db.run(
      `INSERT INTO hermes_skills
       (id, name, description, trigger_phrases, tool_templates, system_prompt_addition,
        source, status, version, parent_version, usage_count, success_count, failure_count,
        created_at, updated_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
      [
        id,
        input.name,
        input.description,
        JSON.stringify(input.triggerPhrases),
        JSON.stringify(input.toolTemplates),
        input.systemPromptAddition ?? '',
        input.source ?? 'preset',
        input.status ?? 'active',
        input.version ?? 1,
        input.parentVersion ?? null,
        now,
        now,
        JSON.stringify(input.tags ?? []),
      ],
    );
    return (await this.getById(id))!;
  }

  /** 批量 upsert,用于首次启动导入预设技能 */
  async upsertMany(inputs: SkillUpsertInput[]): Promise<Skill[]> {
    await this.init();
    const results: Skill[] = [];
    for (const input of inputs) {
      results.push(await this.upsert(input));
    }
    return results;
  }

  async getById(id: string): Promise<Skill | null> {
    await this.init();
    const row = await this.db.get<SkillRow>(`SELECT * FROM hermes_skills WHERE id = ?`, [id]);
    return row ? rowToSkill(row) : null;
  }

  /** 列出全部(分页) */
  async list(opts: { limit?: number; offset?: number; status?: SkillStatus } = {}): Promise<Skill[]> {
    await this.init();
    const limit = opts.limit ?? 100;
    const offset = opts.offset ?? 0;
    const where = opts.status ? `WHERE status = ?` : '';
    const params = opts.status ? [opts.status, limit, offset] : [limit, offset];
    const rows = await this.db.all<SkillRow>(
      `SELECT * FROM hermes_skills ${where}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      params,
    );
    return rows.map(rowToSkill);
  }

  /** 统计 */
  async count(status?: SkillStatus): Promise<number> {
    await this.init();
    if (status) {
      const row = await this.db.get<{ c: number }>(
        `SELECT COUNT(*) AS c FROM hermes_skills WHERE status = ?`,
        [status],
      );
      return row?.c ?? 0;
    }
    const row = await this.db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM hermes_skills`);
    return row?.c ?? 0;
  }

  /** 增加使用计数(P0-B 进化器会调) */
  async recordUsage(id: string, success: boolean): Promise<void> {
    await this.init();
    if (success) {
      await this.db.run(
        `UPDATE hermes_skills SET usage_count = usage_count + 1, success_count = success_count + 1 WHERE id = ?`,
        [id],
      );
    } else {
      await this.db.run(
        `UPDATE hermes_skills SET usage_count = usage_count + 1, failure_count = failure_count + 1 WHERE id = ?`,
        [id],
      );
    }
  }

  /** 删除(物理删除,仅供测试与手动清理) */
  async delete(id: string): Promise<void> {
    await this.init();
    await this.db.run(`DELETE FROM hermes_skills WHERE id = ?`, [id]);
  }
}

/* =========================== 工具函数 =========================== */

function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerPhrases: safeParseStringArray(row.trigger_phrases),
    toolTemplates: safeParseToolTemplates(row.tool_templates),
    systemPromptAddition: row.system_prompt_addition,
    source: row.source,
    status: row.status,
    version: row.version,
    parentVersion: row.parent_version ?? undefined,
    usageCount: row.usage_count,
    successCount: row.success_count,
    failureCount: row.failure_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: safeParseStringArray(row.tags),
  };
}

function safeParseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safeParseToolTemplates(raw: string): ToolTemplate[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ToolTemplate[]) : [];
  } catch {
    return [];
  }
}

function cryptoRandom(): string {
  // 浏览器与 Tauri WebView 都有 crypto.randomUUID;非安全环境下兜底
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}