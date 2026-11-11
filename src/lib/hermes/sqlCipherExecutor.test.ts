/**
 * Hermes Skills - SQLCipher / SQLite 适配器单测
 *
 * 覆盖:
 *  - TauriRpcExecutor:序列化 + invoke 协议
 *  - StandaloneSqliteExecutor:参数序列化 + PRAGMA key + prepared statement 缓存
 *  - toSqlParam / toTauriParam 边界
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { PRESET_SKILLS } from './presetSkills';
import {
  TauriRpcExecutor,
  StandaloneSqliteExecutor,
  makeStandaloneExecutor,
  makeTauriRpcExecutor,
  fromBetterSqlite3,
  toSqlParam,
  toTauriParam,
  type SqliteClient,
} from './sqlCipherExecutor';
import { createHermesBundle } from './index';

/* =========================== Mock SqliteClient =========================== */

function makeMockSqlite(): SqliteClient & { calls: Array<{ type: string; args: unknown[] }> } {
  const calls: Array<{ type: string; args: unknown[] }> = [];
  const rows: Array<Record<string, unknown>> = [];
  const stmtCache = new Map<string, ReturnType<SqliteClient['prepare']>>();

  const makeStmt = (sql: string) => {
    let inserted = 0;
    return {
      run: (...params: unknown[]) => {
        calls.push({ type: 'run', args: [sql, ...params] });
        inserted += 1;
        return { lastInsertRowid: inserted, changes: 1 };
      },
      all: (...params: unknown[]) => {
        calls.push({ type: 'all', args: [sql, ...params] });
        return rows;
      },
      get: (...params: unknown[]) => {
        calls.push({ type: 'get', args: [sql, ...params] });
        return rows[0];
      },
    };
  };

  return {
    calls,
    exec(sql: string) {
      calls.push({ type: 'exec', args: [sql] });
    },
    prepare(sql: string) {
      calls.push({ type: 'prepare', args: [sql] });
      let s = stmtCache.get(sql);
      if (!s) {
        s = makeStmt(sql);
        stmtCache.set(sql, s);
      }
      return s;
    },
  };
}

/* =========================== toSqlParam / toTauriParam =========================== */

describe('toSqlParam', () => {
  it('converts null/undefined to null', () => {
    expect(toSqlParam(null)).toBe(null);
    expect(toSqlParam(undefined)).toBe(null);
  });

  it('passes through numbers and booleans as numbers', () => {
    expect(toSqlParam(42)).toBe(42);
    expect(toSqlParam(3.14)).toBe(3.14);
    expect(toSqlParam(true)).toBe(1);
    expect(toSqlParam(false)).toBe(0);
  });

  it('keeps strings as-is', () => {
    expect(toSqlParam('hello')).toBe('hello');
    expect(toSqlParam('')).toBe('');
  });

  it('serializes objects and arrays to JSON', () => {
    expect(toSqlParam({ a: 1 })).toBe('{"a":1}');
    expect(toSqlParam([1, 2, 3])).toBe('[1,2,3]');
  });

  it('converts bigint to string', () => {
    expect(toSqlParam(BigInt(100))).toBe('100');
  });
});

describe('toTauriParam', () => {
  it('keeps primitives unchanged', () => {
    expect(toTauriParam(42)).toBe(42);
    expect(toTauriParam('hello')).toBe('hello');
    expect(toTauriParam(true)).toBe(true);
    expect(toTauriParam(null)).toBe(null);
  });

  it('passes objects as-is for serde', () => {
    const obj = { foo: 'bar' };
    expect(toTauriParam(obj)).toBe(obj);
  });

  it('converts bigint to string for serde compatibility', () => {
    expect(toTauriParam(BigInt(100))).toBe('100');
  });
});

/* =========================== TauriRpcExecutor =========================== */

describe('TauriRpcExecutor', () => {
  it('exec fires invoke without awaiting', async () => {
    const invoke = vi.fn(async () => undefined);
    const exec = new TauriRpcExecutor({ invoke });

    exec.exec('CREATE TABLE x (a INT)');
    // exec 是 fire-and-forget,要等 microtask
    await new Promise((r) => setTimeout(r, 0));

    expect(invoke).toHaveBeenCalledWith('hermes_db_exec', {
      sql: 'CREATE TABLE x (a INT)',
      params: [],
    });
  });

  it('run invokes hermes_db_run with serialized params', async () => {
    const invoke = vi.fn(async () => ({ lastInsertRowid: 7, changes: 1 }));
    const exec = new TauriRpcExecutor({ invoke });

    const result = await exec.run('INSERT INTO x VALUES (?)', [{ name: 'alice' }]);
    expect(invoke).toHaveBeenCalledWith('hermes_db_run', {
      sql: 'INSERT INTO x VALUES (?)',
      params: [{ name: 'alice' }],
    });
    expect(result).toEqual({ lastInsertRowid: 7, changes: 1 });
  });

  it('all invokes hermes_db_all', async () => {
    const invoke = vi.fn(async () => [{ id: 1 }]);
    const exec = new TauriRpcExecutor({ invoke });

    const rows = await exec.all<{ id: number }>('SELECT * FROM x', []);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('get returns undefined when result is null', async () => {
    const invoke = vi.fn(async () => null);
    const exec = new TauriRpcExecutor({ invoke });

    const row = await exec.get('SELECT * FROM x WHERE id = ?', [99]);
    expect(row).toBeUndefined();
  });

  it('converts bigint lastInsertRowid to number', async () => {
    const invoke = vi.fn(async () => ({ lastInsertRowid: 1234567890, changes: 1 }));
    const exec = new TauriRpcExecutor({ invoke });

    const result = await exec.run('INSERT INTO x VALUES (?)', []);
    expect(result.lastInsertRowid).toBe(1234567890);
    expect(typeof result.lastInsertRowid).toBe('number');
  });

  it('factory makeTauriRpcExecutor works', () => {
    const invoke = vi.fn();
    const exec = makeTauriRpcExecutor(invoke);
    expect(exec).toBeInstanceOf(TauriRpcExecutor);
  });
});

/* =========================== StandaloneSqliteExecutor =========================== */

describe('StandaloneSqliteExecutor', () => {
  let client: ReturnType<typeof makeMockSqlite>;
  let exec: StandaloneSqliteExecutor;

  beforeEach(() => {
    client = makeMockSqlite();
    exec = new StandaloneSqliteExecutor({ client });
  });

  it('runs PRAGMA statements on first use', () => {
    exec.exec('CREATE TABLE x (a INT)');
    const execCalls = client.calls.filter((c) => c.type === 'exec');
    expect(execCalls.length).toBeGreaterThan(0);
    expect(execCalls.some((c) => String(c.args[0]).includes('PRAGMA'))).toBe(true);
  });

  it('runs PRAGMA key when encryptionKey is set', () => {
    const encryptedExec = new StandaloneSqliteExecutor({
      client,
      encryptionKey: 'my-secret-key',
    });
    encryptedExec.exec('SELECT 1');
    const execCalls = client.calls.filter((c) => c.type === 'exec');
    const pragmas = execCalls.map((c) => String(c.args[0]));
    expect(pragmas.some((p) => p.includes("PRAGMA key = 'my-secret-key'"))).toBe(true);
  });

  it('escapes single quotes in encryptionKey', () => {
    const quotedExec = new StandaloneSqliteExecutor({
      client,
      encryptionKey: "it's a 'secret'",
    });
    quotedExec.exec('SELECT 1');
    const execCalls = client.calls.filter((c) => c.type === 'exec');
    const keyPragma = execCalls.find((c) => String(c.args[0]).includes('PRAGMA key'));
    expect(keyPragma).toBeDefined();
    // 单引号转义为两个
    expect(String(keyPragma!.args[0])).toContain("''");
  });

  it('caches prepared statements', () => {
    exec.run('INSERT INTO x VALUES (?)', ['a']);
    exec.run('INSERT INTO x VALUES (?)', ['b']);
    exec.all('SELECT * FROM x');
    exec.all('SELECT * FROM x');

    // prepare 应该只调用 2 次(INSERT 和 SELECT 各一次)
    const prepareCalls = client.calls.filter((c) => c.type === 'prepare');
    expect(prepareCalls.length).toBe(2);
  });

  it('serializes params via toSqlParam', () => {
    exec.run('INSERT INTO x VALUES (?, ?)', [42, { name: 'alice' }]);
    const runCall = client.calls.find(
      (c) => c.type === 'run' && String(c.args[0]).startsWith('INSERT'),
    );
    expect(runCall).toBeDefined();
    expect(runCall!.args[1]).toBe(42);
    expect(runCall!.args[2]).toBe('{"name":"alice"}');
  });

  it('get returns undefined on no match', () => {
    const result = exec.get('SELECT * FROM x WHERE id = ?', [99]);
    expect(result).toBeUndefined();
  });

  it('dispose clears cache', () => {
    exec.run('INSERT INTO x VALUES (?)', [1]);
    exec.dispose();
    exec.run('INSERT INTO x VALUES (?)', [2]);
    // dispose 后,prepare 被重新调用
    const prepareCalls = client.calls.filter((c) => c.type === 'prepare');
    expect(prepareCalls.length).toBe(2);
  });

  it('runs customPragmas after default ones', () => {
    const customExec = new StandaloneSqliteExecutor({
      client,
      customPragmas: ['PRAGMA cache_size = 10000;'],
    });
    customExec.exec('SELECT 1');
    const execCalls = client.calls.filter((c) => c.type === 'exec');
    const pragmas = execCalls.map((c) => String(c.args[0]));
    expect(pragmas.some((p) => p.includes('cache_size'))).toBe(true);
  });

  it('factory functions work', () => {
    expect(makeStandaloneExecutor(client)).toBeInstanceOf(StandaloneSqliteExecutor);
    expect(fromBetterSqlite3(client as any)).toBeInstanceOf(StandaloneSqliteExecutor);
  });
});

/* =========================== 端到端:SkillStore + StandaloneSqliteExecutor =========================== */

describe('StandaloneSqliteExecutor + SkillStore integration', () => {
  it('preserves every preset skill across the full pipeline', async () => {
    // 用真实 better-sqlite3 内存库验证整条链路 —— 早期版本用 makeMockSqlite()
    // 只记录调用、不存储任何行,断言必然失败。
    const db = new Database(':memory:');
    const executor = fromBetterSqlite3(db);

    const bundle = createHermesBundle(executor);
    await bundle.seedPresets();

    expect(await bundle.store.count()).toBe(PRESET_SKILLS.length);

    const all = await bundle.store.list({ limit: 100 });
    expect(all.length).toBe(PRESET_SKILLS.length);
    expect(all.find((s) => s.id === 'sk_preset_inventory_alert')).toBeTruthy();

    executor.dispose();
    db.close();
  });
});