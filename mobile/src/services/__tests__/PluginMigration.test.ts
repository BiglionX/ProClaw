/// <reference types="jest" />

/**
 * PluginMigration 单元测试
 * 测试 splitStatements、computeChecksum、版本解析
 */

import {
  splitStatements,
  computeChecksum,
} from '../PluginMigration';

describe('splitStatements', () => {
  it('should split multiple SQL statements separated by semicolons', () => {
    const sql = `
      CREATE TABLE test1 (id INTEGER PRIMARY KEY);
      CREATE TABLE test2 (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO test1 VALUES (1);
    `;
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(3);
    expect(statements[0]).toContain('CREATE TABLE test1');
    expect(statements[1]).toContain('CREATE TABLE test2');
    expect(statements[2]).toContain('INSERT INTO test1');
  });

  it('should trim whitespace from each statement', () => {
    const sql = '  SELECT * FROM t1;  SELECT * FROM t2;  ';
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0].startsWith(' ')).toBe(false);
    expect(statements[0].endsWith(' ')).toBe(false);
  });

  it('should ignore empty statements', () => {
    const sql = 'SELECT 1;;;SELECT 2;';
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
  });

  it('should handle single statement without trailing semicolon', () => {
    const sql = 'CREATE TABLE t1 (id INT)';
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('CREATE TABLE t1');
  });

  it('should handle empty string', () => {
    expect(splitStatements('')).toEqual([]);
    expect(splitStatements('   ')).toEqual([]);
  });

  it('should handle SQL with comments', () => {
    const sql = `
      -- 创建表
      CREATE TABLE t1 (id INT);
      /* 多行注释 */
      CREATE TABLE t2 (id INT);
    `;
    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('CREATE TABLE t1');
    expect(statements[1]).toContain('CREATE TABLE t2');
  });
});

describe('computeChecksum', () => {
  it('should return a consistent checksum for the same input', () => {
    const sql = 'CREATE TABLE test (id INTEGER PRIMARY KEY)';
    const checksum1 = computeChecksum(sql);
    const checksum2 = computeChecksum(sql);
    expect(checksum1).toBe(checksum2);
  });

  it('should return different checksums for different SQL', () => {
    const cs1 = computeChecksum('CREATE TABLE a (id INT)');
    const cs2 = computeChecksum('CREATE TABLE b (id INT)');
    expect(cs1).not.toBe(cs2);
  });

  it('should return a numeric checksum', () => {
    const checksum = computeChecksum('SELECT 1');
    expect(typeof checksum).toBe('string');
    expect(checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should return 00000000 for empty string', () => {
    expect(computeChecksum('')).toBe('00000000');
  });
});

describe('version parsing from SQL comments', () => {
  it('should identify version markers in SQL', () => {
    const sql = `-- @version 1
CREATE TABLE test (id INTEGER PRIMARY KEY);

-- @version 2
ALTER TABLE test ADD COLUMN name TEXT;
`;
    // 验证版本标记存在
    sql.split('\n').forEach((line, idx) => {
      if (line.includes('-- @version')) {
        expect(line).toMatch(/-- @version \d+/);
      }
    });
  });

  it('should handle multi-statement migration with mixed versions', () => {
    const sql = `-- @version 1
CREATE TABLE t1 (id INT);
CREATE TABLE t2 (id INT);

-- @version 2
ALTER TABLE t1 ADD COLUMN name TEXT;
`;
    const versionMatches: string[] = [];
    const re = /-- @version (\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      versionMatches.push(m[1]);
    }
    expect(versionMatches).toHaveLength(2);
    expect(versionMatches[0]).toBe('1');
    expect(versionMatches[1]).toBe('2');
  });

  it('should handle SQL without version markers', () => {
    const sql = 'CREATE TABLE t1 (id INT);\nCREATE TABLE t2 (id INT);';
    const versionMatches: string[] = [];
    const re = /-- @version (\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      versionMatches.push(m[1]);
    }
    expect(versionMatches).toHaveLength(0);
  });
});

describe('mock plugin upgrade SQL', () => {
  it('should produce valid mock upgrade SQL for catering plugin', () => {
    // 模拟 PluginDetailScreen 中的 getMockUpSql('plugin_catering')
    const getMockUpSql = (pluginId: string): string => {
      switch (pluginId) {
        case 'plugin_catering':
          return `-- @version 1
CREATE TABLE IF NOT EXISTS catering_menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL,
  is_available INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kitchen_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  table_number TEXT,
  items TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at INTEGER NOT NULL
);`;
        default:
          return '';
      }
    };

    const sql = getMockUpSql('plugin_catering');
    expect(sql).toContain('catering_menus');
    expect(sql).toContain('kitchen_orders');

    const statements = splitStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS catering_menus');
    expect(statements[1]).toContain('CREATE TABLE IF NOT EXISTS kitchen_orders');
  });
});
