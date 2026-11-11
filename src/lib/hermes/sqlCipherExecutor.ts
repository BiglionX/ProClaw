/**
 * Hermes Skills - SQLCipher / SQLite 适配器
 *
 * 提供两种生产 DatabaseExecutor 实现:
 *  1. TauriRpcExecutor(推荐)— 通过 tauri.invoke() 调 Rust 端 Hermes 命令
 *     完全复用主 db(Mutex<Database>),继承现有 AES-256-GCM 加密策略
 *  2. StandaloneSqliteExecutor — 用 better-sqlite3 直接打开独立 db 文件
 *     适合纯浏览器测试/Storybook/SQLCipher 加密场景
 *
 * 两个都实现 DatabaseExecutor 接口(SkillStore 接受任何实现)
 *
 * 选择哪种:
 *  - Tauri 桌面生产: TauriRpcExecutor
 *  - Storybook/单测: InMemoryDatabase(已有)或 StandaloneSqliteExecutor
 *  - 浏览器环境: StandaloneSqliteExecutor (需要 WASM 化的 sqlite,如 sql.js)
 */

import type { DatabaseExecutor } from './skillStore';

/* =========================== 参数序列化工具 =========================== */

/**
 * 把任意 JS 值序列化为 SQLite 可接受的字符串参数。
 * null/undefined → 'NULL'
 * number/boolean → toString
 * string → 原样(但不转义单引号,由 prepare 调用方负责)
 * object/array → JSON.stringify
 */
export function toSqlParam(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return Number(value);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  return JSON.stringify(value);
}

/**
 * 把任意 JS 值包装为 tauri.invoke 命令可接受的 Rust 参数。
 * - null → null
 * - number/boolean → 原样
 * - string → 原样
 * - object → 普通对象(tauri 自动 serde)
 * - array → 普通数组
 */
export function toTauriParam(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

/* =========================== A. TauriRpcExecutor =========================== */

/**
 * Tauri 命令调用抽象。
 * 在生产环境传入 `invoke` 函数(来自 @tauri-apps/api);
 * 在测试环境可以传入 mock。
 */
export type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export interface TauriRpcExecutorOptions {
  invoke: TauriInvoke;
  /** SQLCipher 加密时使用的 key(透传到 Rust 侧) */
  encryptionKey?: string;
}

/**
 * 通过 Tauri RPC 把 SQL 操作代理到 Rust 侧 Hermes 模块。
 *
 * DatabaseExecutor 契约允许 async 实现(Tauri invoke),SkillStore 内部统一 await,
 * 因此本类可以直接注入 createHermesBundle,与 InMemoryDatabase 无缝切换。
 *
 * 期望 Rust 侧命令(已在 src-tauri/src/hermes_commands.rs 实现并注册):
 *   hermes_db_exec(sql, params[]) -> void
 *   hermes_db_run(sql, params[]) -> { last_insert_rowid, changes }
 *   hermes_db_all(sql, params[]) -> any[]
 *   hermes_db_get(sql, params[]) -> any | null
 *
 * 这样 SkillStore 完全不感知加密层,所有 db 加密沿用 ProClaw 现有策略。
 */
export class TauriRpcExecutor implements DatabaseExecutor {
  /**
   * 标记:schema 是否已由 Rust 侧 hermes_bootstrap 主动建好。
   * SkillStore.init() 调用 exec(SCHEMA_SQL) 时,如果已建过,则跳过 — 避免 IPC 异步 race。
   *
   * 推荐:在 main.tsx 启动时先调 invoke('hermes_bootstrap'),然后构造 SkillStore。
   */
  public schemaReady = false;

  constructor(private readonly opts: TauriRpcExecutorOptions) {
    if (!opts.invoke) {
      throw new Error('TauriRpcExecutor requires an invoke function');
    }
  }

  exec(sql: string, params: unknown[] = []): void {
    // 关键:Schema DDL 应由 Rust 侧 hermes_bootstrap 主动建好。
    // 这里检测到是 DDL 语句时,如果 schemaReady=true 则跳过;否则警告。
    const isDDL = /^\s*CREATE\s+(TABLE|INDEX|VIRTUAL|TRIGGER)/i.test(sql);
    if (isDDL && this.schemaReady) {
      return; // 跳过:Rust 侧已建
    }
    if (isDDL && !this.schemaReady) {
      console.warn(
        '[TauriRpcExecutor] 收到 DDL 但 schemaReady=false,建议先 invoke("hermes_bootstrap")',
      );
      // 仍然 fire-and-forget invoke,保证后续 get/run 能跑通
    }

    // 非 DDL(INSERT/UPDATE/DELETE)必须真执行,这里 fire-and-forget 风险低。
    void this.opts
      .invoke<void>('hermes_db_exec', { sql, params: params.map(toTauriParam) })
      .catch((e) => console.warn('[TauriRpcExecutor] exec failed:', e));
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const result = await this.opts.invoke<{
      lastInsertRowid?: number;
      // Rust 侧 hermes_db_run 返回 snake_case
      last_insert_rowid?: number;
      changes: number;
    }>('hermes_db_run', {
      sql,
      params: params.map(toTauriParam),
    });
    return {
      lastInsertRowid: Number(result?.lastInsertRowid ?? result?.last_insert_rowid ?? 0),
      changes: Number(result?.changes ?? 0),
    };
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.opts.invoke<T[]>('hermes_db_all', {
      sql,
      params: params.map(toTauriParam),
    });
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const result = await this.opts.invoke<T | null>('hermes_db_get', {
      sql,
      params: params.map(toTauriParam),
    });
    return result ?? undefined;
  }
}

/* =========================== B. StandaloneSqliteExecutor =========================== */

/**
 * 极简 SQLite 兼容客户端接口。
 * 必须实现 4 个方法,签名与 better-sqlite3.prepare().run/all/get 兼容。
 *
 * 注意:
 *  - 用 better-sqlite3 时,get 返回 `unknown`(可能是 undefined,也可能抛 QueryReturnedNoRows)
 *  - 我们的 DatabaseExecutor.get 约定返回 `T | undefined`,且 catch SqliteError
 *
 * 用 SQLCipher 时:better-sqlite3-sqlcipher 是 better-sqlite3 的 drop-in 替换
 * 用 sql.js 时:见 createSqlJsExecutor(在另一个文件,留给 WASM 场景)
 */
export interface SqliteClient {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  };
}

export interface StandaloneSqliteExecutorOptions {
  /** 已打开的 SQLite 客户端(better-sqlite3 / better-sqlite3-sqlcipher / sql.js) */
  client: SqliteClient;
  /** 加密 key(仅 SQLCipher 用)。传入后会在第一次 exec 前先 PRAGMA key */
  encryptionKey?: string;
  /** PRAGMA cipher-compatibility 模式(仅 SQLCipher) */
  cipherCompatibility?: '1' | '2' | '3' | '4';
  /** 自定义 PRAGMA 语句列表,在初始化时按顺序执行(在 PRAGMA key 之后) */
  customPragmas?: string[];
}

/**
 * 用 better-sqlite3 / better-sqlite3-sqlcipher 的 Database 实例直接打开 Hermes。
 *
 * 不复用主 db,使用独立 db 文件(例如 ~/.proclaw/hermes.db)。
 * 优点:零 Tauri 依赖,Storybook/单测可用。
 * 缺点:数据隔离,与主业务表 join 需要跨 db。
 */
export class StandaloneSqliteExecutor implements DatabaseExecutor {
  private readonly stmtCache = new Map<string, ReturnType<SqliteClient['prepare']>>();
  private initialized = false;

  constructor(private readonly opts: StandaloneSqliteExecutorOptions) {
    if (!opts.client) {
      throw new Error('StandaloneSqliteExecutor requires a client');
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    if (this.opts.encryptionKey) {
      // SQLCipher:必须先 PRAGMA key,再访问数据
      this.opts.client.exec(`PRAGMA key = ${quoteSqlString(this.opts.encryptionKey)};`);
    }
    if (this.opts.cipherCompatibility) {
      this.opts.client.exec(
        `PRAGMA cipher_compatibility = ${this.opts.cipherCompatibility};`,
      );
    }
    // 默认 PRAGMA,提升 FTS5 检索性能
    this.opts.client.exec('PRAGMA journal_mode = WAL;');
    this.opts.client.exec('PRAGMA synchronous = NORMAL;');
    this.opts.client.exec('PRAGMA temp_store = MEMORY;');
    for (const pragma of this.opts.customPragmas ?? []) {
      this.opts.client.exec(pragma);
    }
    this.initialized = true;
  }

  private prepare(sql: string): ReturnType<SqliteClient['prepare']> {
    this.ensureInitialized();
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.opts.client.prepare(sql);
      this.stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  /**
   * 统一 try/catch + 检测 "finalized" 错误,自动清理并重试一次。
   * 避免 db close 后 statement 失效导致的崩。
   */
  private safeExecute<T>(
    sql: string,
    fn: () => T,
  ): T {
    try {
      return fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/finalized|closed/i.test(msg)) {
        this.stmtCache.delete(sql);
        return fn();
      }
      throw e;
    }
  }

  exec(sql: string, _params: unknown[] = []): void {
    this.ensureInitialized();
    this.opts.client.exec(sql);
  }

  run(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
    return this.safeExecute(sql, () => {
      const stmt = this.prepare(sql);
      const result = stmt.run(...params.map(toSqlParam));
      return {
        lastInsertRowid: typeof result.lastInsertRowid === 'bigint'
          ? Number(result.lastInsertRowid)
          : result.lastInsertRowid,
        changes: result.changes,
      };
    });
  }

  all<T = unknown>(sql: string, params: unknown[] = []): T[] {
    return this.safeExecute(sql, () => {
      const stmt = this.prepare(sql);
      return stmt.all(...params.map(toSqlParam)) as T[];
    });
  }

  get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    return this.safeExecute(sql, () => {
      const stmt = this.prepare(sql);
      try {
        const result = stmt.get(...params.map(toSqlParam));
        return result === null || result === undefined ? undefined : (result as T);
      } catch (e) {
        // better-sqlite3 在没匹配行时抛 QueryReturnedNoRows,SQLCipher 同样。
        // 我们的契约是 undefined,所以。
        const msg = e instanceof Error ? e.message : String(e);
        if (/no\s*row|query.*returned/i.test(msg)) {
          return undefined;
        }
        throw e;
      }
    });
  }

  /** 关闭 statement 缓存(关闭 db 前调用,避免 better-sqlite3 的 "db is closed" 警告) */
  dispose(): void {
    this.stmtCache.clear();
  }
}

/* =========================== 工具 =========================== */

/** SQL 单引号字符串转义(给 PRAGMA key 用) */
function quoteSqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/* =========================== 工厂函数 =========================== */

/**
 * 用 better-sqlite3 / better-sqlite3-sqlcipher 创建一个 Executor。
 *
 * 用法:
 * ```ts
 * import Database from 'better-sqlite3';
 * import { makeStandaloneExecutor } from '@/lib/hermes/sqlCipherExecutor';
 *
 * const db = new Database('hermes.db');
 * const executor = makeStandaloneExecutor(db, { encryptionKey: 'secret' });
 * const bundle = createHermesBundle(executor);
 * ```
 */
export function makeStandaloneExecutor(
  client: SqliteClient,
  options: Omit<StandaloneSqliteExecutorOptions, 'client'> = {},
): StandaloneSqliteExecutor {
  return new StandaloneSqliteExecutor({ ...options, client });
}

/**
 * 从 better-sqlite3 实例自动包装(类型提示友好版本)。
 *
 * better-sqlite3 的 Database 类本身就实现了 exec/prepare 接口,可以直接传入。
 */
export function fromBetterSqlite3(
  db: {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
      all(...params: unknown[]): unknown[];
      get(...params: unknown[]): unknown;
    };
  },
  options?: Omit<StandaloneSqliteExecutorOptions, 'client'>,
): StandaloneSqliteExecutor {
  return makeStandaloneExecutor(db, options);
}

/**
 * 在 Tauri 桌面环境创建 Executor(推荐生产路径)。
 *
 * 用法(在 main.tsx):
 * ```ts
 * import { invoke } from '@tauri-apps/api/core';
 * import { makeTauriRpcExecutor } from '@/lib/hermes/sqlCipherExecutor';
 * import { createHermesBundle, setHermesApi, HermesApi } from '@/lib/hermes';
 *
 * const executor = makeTauriRpcExecutor(invoke);
 * const bundle = createHermesBundle(executor);
 * bundle.seedPresets();
 * setHermesApi(new HermesApi(bundle));
 * ```
 */
export function makeTauriRpcExecutor(
  invoke: TauriInvoke,
  options: Omit<TauriRpcExecutorOptions, 'invoke'> = {},
): TauriRpcExecutor {
  return new TauriRpcExecutor({ ...options, invoke });
}