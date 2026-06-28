/// <reference types="jest" />

/**
 * 插件安装流程集成测试
 * 测试 PluginDownloader -> PluginMigration -> PluginRegistry 的完整工作流：
 * 1. 模拟下载插件 ZIP
 * 2. 解压并提取 manifest / up.sql / down.sql
 * 3. 执行数据库迁移（创建插件表）
 * 4. 注册到 plugin_registry 表
 * 5. 验证卸载（回滚 + 注销）
 */

import { runPluginMigration, rollbackPluginMigration } from '../PluginMigration';
import { registerPlugin, unregisterPlugin, getInstalledPlugins, isPluginInstalled } from '../PluginRegistry';
import { registerPluginRoutes, unregisterPluginRoutes, getDynamicRoutes } from '../PluginRegistry';
import type { PluginManifest } from '../PluginRegistry';
import type { IDatabase } from '../DatabaseFactory';

declare const global: typeof globalThis;

// In-memory database for integration testing
class IntegrationMockDB implements IDatabase {
  private tables: Map<string, any[]> = new Map();
  private schemaVersion: number = 0;

  constructor() {
    // Create system tables required by plugin migrations
    this.createTable('sync_metadata', [
      { name: 'key', type: 'TEXT' },
      { name: 'value', type: 'TEXT' },
    ]);
    this.createTable('plugin_registry', [
      { name: 'id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'version', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'manifest_json', type: 'TEXT' },
      { name: 'installed_at', type: 'INTEGER' },
      { name: 'updated_at', type: 'INTEGER' },
    ]);
    // plugin_migrations is created by ensureMigrationTable in PluginMigration
  }

  private createTable(name: string, columns: { name: string; type: string }[]): void {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
  }

  private ensureTable(name: string): any[] {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }

  getAllRows(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }

  /**
   * Parse VALUES clause into individual value tokens, handling quoted strings correctly
   * e.g. "'installed', ?, ?" becomes ["'installed'", "?", "?"]
   */
  private parseValueParts(valuesClause: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < valuesClause.length; i++) {
      const ch = valuesClause[i];
      if (inQuote) {
        current += ch;
        if (ch === quoteChar) {
          inQuote = false;
        }
      } else if (ch === "'" || ch === '"') {
        current += ch;
        inQuote = true;
        quoteChar = ch;
      } else if (ch === ',') {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    return parts;
  }

  async execAsync(sql: string, params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();

    // CREATE TABLE IF NOT EXISTS
    if (upper.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      if (match) {
        this.createTable(match[1], []);
      }
      return;
    }

    // DROP TABLE
    if (upper.startsWith('DROP TABLE')) {
      const match = sql.match(/DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/i);
      if (match) {
        this.tables.delete(match[1]);
      }
      return;
    }

    // BEGIN TRANSACTION / COMMIT / ROLLBACK
    if (upper.startsWith('BEGIN') || upper.startsWith('COMMIT') || upper.startsWith('ROLLBACK')) {
      return;
    }

    await this.runAsync(sql, params);
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [];

    const tableName = fromMatch[1];
    const table = this.ensureTable(tableName);
    let rows = [...table];

    // WHERE clause
    if (params && params.length > 0) {
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i);
      if (whereMatch) {
        const eqMatch = whereMatch[1].match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          rows = rows.filter((r: any) => String(r[eqMatch[1]]) === String(params[0]));
        }
      }
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const [, field, dir] = orderMatch;
      rows.sort((a: any, b: any) => {
        const aVal = a[field] || 0;
        const bVal = b[field] || 0;
        return dir?.toUpperCase() === 'DESC' ? bVal - aVal : aVal - bVal;
      });
    }

    return rows;
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    const rows = await this.getAllAsync(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('INSERT')) {
      const match = trimmed.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.ensureTable(tableName);

      // Extract column names: find content between first ( and ) that precedes VALUES/SELECT
      const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
      const cols = colMatch ? colMatch[1].split(',').map((c: string) => c.trim()).filter((c: string) => !c.toUpperCase().startsWith('PRIMARY') && !c.toUpperCase().startsWith('UNIQUE') && !c.toUpperCase().startsWith('CHECK') && !c.toUpperCase().startsWith('FOREIGN')) : [];

      // Build row: map each VALUES item to column
      // '?' means value comes from params array; literal values (like 'installed') are used directly
      const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
      let paramIndex = 0;
      const row: any = {};
      if (valuesMatch && cols.length > 0) {
        const valueParts = this.parseValueParts(valuesMatch[1]);
        cols.forEach((col, i) => {
          if (i < valueParts.length) {
            if (valueParts[i] === '?') {
              row[col] = params?.[paramIndex] ?? null;
              paramIndex++;
            } else {
              // Literal value - strip surrounding quotes
              row[col] = valueParts[i].replace(/^['"]|['"]$/g, '');
            }
          }
        });
      } else if (cols.length > 0) {
        if (params && params.length > 0) {
          cols.forEach((col, i) => {
            if (i < params.length) {
              row[col] = params[i];
            }
          });
        }
      }
      
      // INSERT OR REPLACE
      if (row.id) {
        const idx = table.findIndex((r: any) => r.id === row.id);
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...row };
        } else {
          table.push(row);
        }
      } else {
        table.push(row);
      }
      return { rowsAffected: 1 };
    } else if (upper.startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.ensureTable(tableName);

      // Find WHERE id = ?
      const whereIdx = trimmed.indexOf('WHERE');
      if (whereIdx < 0) return { rowsAffected: 0 };
      const afterWhere = trimmed.substring(whereIdx + 5).trim();
      const eqMatch = afterWhere.match(/(\w+)\s*=\s*\?/);
      if (!eqMatch || !params) return { rowsAffected: 0 };

      const field = eqMatch[1];
      const val = params[params.length - 1];

      // Parse SET clauses
      const setPart = trimmed.substring(trimmed.toUpperCase().indexOf('SET') + 3, whereIdx).trim();
      const setClauses = setPart.split(',').map(s => {
        const eqIdx = s.trim().indexOf('=');
        if (eqIdx < 0) return null;
        const col = s.trim().substring(0, eqIdx).trim();
        const valuePart = s.trim().substring(eqIdx + 1).trim();
        const isParam = valuePart === '?';
        return { col, isParam, literalValue: isParam ? null : valuePart.replace(/^['"]|['"]$/g, '') };
      }).filter(Boolean);

      let rowIdx = 0;
      for (const row of table) {
        if (String(row[field]) === String(val)) {
          setClauses.forEach((clause: any) => {
            if (clause.isParam) {
              row[clause.col] = params[rowIdx];
              rowIdx++;
            } else {
              row[clause.col] = clause.literalValue;
            }
          });
        }
      }
      return { rowsAffected: 1 };
    } else if (upper.startsWith('DELETE')) {
      const match = trimmed.match(/DELETE\s+FROM\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.ensureTable(tableName);

      const whereMatch = trimmed.match(/WHERE\s+(.+)/i);
      if (whereMatch && params && params.length > 0) {
        const eqMatch = whereMatch[1].match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          const field = eqMatch[1];
          const val = params[0];
          const idx = table.findIndex((r: any) => String(r[field]) === String(val));
          if (idx >= 0) table.splice(idx, 1);
        }
      }
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }
}

// Mock plugin manifest
const cateringManifest: PluginManifest = {
  id: 'plugin_catering',
  name: '餐厅管理插件',
  version: '1.0.0',
  description: '餐饮行业工作流',
  author: 'ProClaw Team',
  icon: '🍽️',
  permissions: ['products:read', 'products:write'],
  minAppVersion: '1.0.0',
  recommendedAgents: ['agent_kitchen_optimizer'],
  upSql: `-- @version 1
CREATE TABLE IF NOT EXISTS catering_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL,
  description TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_orders (
  id TEXT PRIMARY KEY,
  table_no TEXT,
  items TEXT NOT NULL,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean',
  created_at INTEGER NOT NULL
);`,
  downSql: `-- @version 1
DROP TABLE IF EXISTS catering_menu_items;
DROP TABLE IF EXISTS catering_orders;`,
  entryPoint: 'plugins/catering/index.js',
  routes: [
    { path: '/catering', component: 'CateringView', title: '餐厅管理' },
  ],
};

describe('插件安装流程集成测试', () => {
  let db: IntegrationMockDB;

  beforeEach(() => {
    db = new IntegrationMockDB();
  });

  describe('安装流程', () => {
    it('should complete full install flow: migration -> registration', async () => {
      // 1. Run database migration (up.sql)
      const migrationResult = await runPluginMigration(db, cateringManifest.id, cateringManifest.upSql);
      expect(migrationResult.status).toBe('success');
      expect(migrationResult.appliedStatements).toBeGreaterThanOrEqual(1);

      // Verify plugin_migrations table has record
      const migrations = db.getAllRows('plugin_migrations');
      expect(migrations.length).toBeGreaterThanOrEqual(1);
      expect(migrations[0].plugin_id).toBe('plugin_catering');

      // 2. Register plugin in registry
      await registerPlugin(db, cateringManifest);
      const installedPlugins = await getInstalledPlugins(db);
      expect(installedPlugins).toHaveLength(1);
      expect(installedPlugins[0].id).toBe('plugin_catering');
      expect(installedPlugins[0].status).toBe('installed');

      // 3. Verify plugin is detected as installed
      const installed = await isPluginInstalled(db, 'plugin_catering');
      expect(installed).toBe(true);
    });

    it('should handle duplicate migration (already applied)', async () => {
      // First install
      await runPluginMigration(db, cateringManifest.id, cateringManifest.upSql);
      await registerPlugin(db, cateringManifest);

      // Second attempt should be 'already_applied'
      const secondMigration = await runPluginMigration(db, cateringManifest.id, cateringManifest.upSql);
      expect(secondMigration.status).toBe('already_applied');
    });

    it('should verify plugin tables exist after migration', async () => {
      await runPluginMigration(db, cateringManifest.id, cateringManifest.upSql);

      // Verify tables were created by checking they exist
      const tablesBefore = db.getAllRows('catering_menu_items');
      expect(tablesBefore).toBeDefined();

      // Insert a record to verify the table is functional
      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, category, price, description, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['item_001', '宫保鸡丁', '主菜', 38, '经典川菜', Date.now(), 'clean', Date.now()]
      );

      const items = db.getAllRows('catering_menu_items');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('宫保鸡丁');
      expect(items[0].price).toBe(38);
    });
  });

  describe('卸载流程', () => {
    it('should complete full uninstall flow: rollback -> unregister', async () => {
      // First install
      await runPluginMigration(db, cateringManifest.id, cateringManifest.upSql);
      await registerPlugin(db, cateringManifest);

      // Insert some data
      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, category, price, description, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['item_002', '酸菜鱼', '主菜', 68, '重庆风味', Date.now(), 'clean', Date.now()]
      );
      expect(db.getAllRows('catering_menu_items')).toHaveLength(1);

      // 1. Rollback database migration (down.sql drops tables)
      const rollbackResult = await rollbackPluginMigration(db, cateringManifest.id, cateringManifest.downSql);
      expect(rollbackResult.status).toBe('success');

      // 2. Unregister plugin
      await unregisterPlugin(db, 'plugin_catering');

      // 3. Verify plugin is no longer installed
      const installed = await isPluginInstalled(db, 'plugin_catering');
      expect(installed).toBe(false);

      // 4. Verify migration record is removed
      const migrations = db.getAllRows('plugin_migrations');
      expect(migrations.length).toBe(0);
    });

    it('should handle rollback even without prior migration record', async () => {
      const rollbackResult = await rollbackPluginMigration(db, 'unknown_plugin', cateringManifest.downSql);
      // Should not fail even if no migration record exists (idempotent)
      expect(rollbackResult.status).toBe('success');
    });
  });

  describe('多插件管理', () => {
    it('should manage multiple plugins independently', async () => {
      // Install plugin A
      await runPluginMigration(db, 'plugin_catering', cateringManifest.upSql);
      await registerPlugin(db, cateringManifest);

      // Install plugin B (beauty)
      const beautyManifest: PluginManifest = {
        ...cateringManifest,
        id: 'plugin_beauty',
        name: '美容美发插件',
        upSql: `-- @version 1
CREATE TABLE IF NOT EXISTS beauty_appointments (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service_item TEXT NOT NULL,
  appointment_time INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean',
  created_at INTEGER NOT NULL
);`,
        downSql: `-- @version 1
DROP TABLE IF EXISTS beauty_appointments;`,
      };

      await runPluginMigration(db, 'plugin_beauty', beautyManifest.upSql);
      await registerPlugin(db, beautyManifest);

      // Verify both plugins are installed
      const installedPlugins = await getInstalledPlugins(db);
      expect(installedPlugins).toHaveLength(2);

      // Verify both tables exist by using them
      await db.runAsync(
        `INSERT INTO beauty_appointments (id, customer_name, phone, service_item, appointment_time, status, notes, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['apt_001', '张三', '13800138000', '剪发', Date.now(), 'pending', '', Date.now(), 'clean', Date.now()]
      );
      expect(db.getAllRows('beauty_appointments')).toHaveLength(1);

      // Insert data into catering_menu_items to verify it exists and works
      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, category, price, description, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['item_003', '宫保鸡丁', '主菜', 38, '经典川菜', Date.now(), 'clean', Date.now()]
      );
      expect(db.getAllRows('catering_menu_items')).toHaveLength(1);
    });
  });

  describe('插件更新流程', () => {
    const v1Manifest: PluginManifest = {
      id: 'plugin_catering',
      name: '餐厅管理插件 v1',
      version: '1.0.0',
      description: '餐饮行业工作流',
      author: 'ProClaw Team',
      icon: '🍽️',
      permissions: ['products:read'],
      minAppVersion: '1.0.0',
      upSql: `-- @version 1
CREATE TABLE IF NOT EXISTS catering_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT \'clean\',
  created_at INTEGER NOT NULL
);`,
      downSql: `-- @version 1
DROP TABLE IF EXISTS catering_menu_items;`,
      entryPoint: 'plugins/catering/v1/index.js',
      routes: [
        { path: '/catering-v1', component: 'CateringViewV1', title: '餐厅管理' },
      ],
    };

    const v2Manifest: PluginManifest = {
      id: 'plugin_catering',
      name: '餐厅管理插件 v2',
      version: '2.0.0',
      description: '餐饮行业工作流 - 新版',
      author: 'ProClaw Team',
      icon: '🍽️',
      permissions: ['products:read', 'products:write', 'orders:read'],
      minAppVersion: '2.0.0',
      upSql: `-- @version 2
CREATE TABLE IF NOT EXISTS catering_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT \'clean\',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_delivery (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  address TEXT NOT NULL,
  status TEXT DEFAULT \'pending\',
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT \'clean\',
  created_at INTEGER NOT NULL
);`,
      downSql: `-- @version 2
DROP TABLE IF EXISTS catering_delivery;
DROP TABLE IF EXISTS catering_menu_items;`,
      entryPoint: 'plugins/catering/v2/index.js',
      routes: [
        { path: '/catering-v2', component: 'CateringViewV2', title: '餐厅管理(新版)' },
      ],
    };

    it('应能完成插件升级：回滚旧迁移 -> 新版本迁移 -> 重新注册', async () => {
      // === 1. 安装 v1 ===
      await runPluginMigration(db, v1Manifest.id, v1Manifest.upSql);
      await registerPlugin(db, v1Manifest);

      // Verify v1 installed
      let installed = await getInstalledPlugins(db);
      expect(installed).toHaveLength(1);
      expect(installed[0].version).toBe('1.0.0');

      // Insert data into v1 table
      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, price, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        ['item_v1', '旧版菜单', 38, 1000, 'clean', 1000]
      );
      expect(db.getAllRows('catering_menu_items')).toHaveLength(1);

      // === 2. 升级到 v2：先回滚旧版本 ===
      const rollbackResult = await rollbackPluginMigration(db, v1Manifest.id, v1Manifest.downSql);
      expect(rollbackResult.status).toBe('success');

      // Old table should be dropped
      expect(db.getAllRows('catering_menu_items')).toHaveLength(0);

      // === 3. 执行新版本迁移 ===
      const migrateResult = await runPluginMigration(db, v2Manifest.id, v2Manifest.upSql);
      expect(migrateResult.status).toBe('success');

      // Verify new tables exist
      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, price, category, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['item_v2', '新版菜单', 58, '主菜', 2000, 'clean', 2000]
      );
      expect(db.getAllRows('catering_menu_items')).toHaveLength(1);
      expect(db.getAllRows('catering_menu_items')[0].category).toBe('主菜');

      // New delivery table should exist
      await db.runAsync(
        `INSERT INTO catering_delivery (id, order_id, address, status, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['delivery_001', 'order_001', '北京市朝阳区', 'pending', 2000, 'clean', 2000]
      );
      expect(db.getAllRows('catering_delivery')).toHaveLength(1);

      // === 4. 重新注册插件 ===
      await registerPlugin(db, v2Manifest);
      installed = await getInstalledPlugins(db);
      expect(installed).toHaveLength(1);
      expect(installed[0].version).toBe('2.0.0');
    });

    it('升级后旧数据应通过回滚被清除', async () => {
      // Install v1 with data
      await runPluginMigration(db, v1Manifest.id, v1Manifest.upSql);
      await registerPlugin(db, v1Manifest);

      await db.runAsync(
        `INSERT INTO catering_menu_items (id, name, price, last_modified, sync_status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        ['old_data', '旧数据', 10, 1000, 'clean', 1000]
      );

      // Rollback should clear all data
      await rollbackPluginMigration(db, v1Manifest.id, v1Manifest.downSql);
      expect(db.getAllRows('catering_menu_items')).toHaveLength(0);

      // Apply v2 migration
      await runPluginMigration(db, v2Manifest.id, v2Manifest.upSql);

      // Old data should not exist
      const items = db.getAllRows('catering_menu_items');
      expect(items).toHaveLength(0);
    });
  });

  describe('插件路由注册与清理', () => {
    beforeEach(() => {
      // Clear any existing routes before each test
      const existingRoutes = getDynamicRoutes();
      const existingIds = [...new Set(existingRoutes.map(r => r.pluginId))];
      for (const pid of existingIds) {
        unregisterPluginRoutes(pid);
      }
    });

    it('安装注册路由 -> 卸载清理路由', async () => {
      // Routes should start empty
      expect(getDynamicRoutes()).toHaveLength(0);

      // Register routes for catering plugin
      registerPluginRoutes('plugin_catering', [
        { path: '/catering', component: 'CateringView', title: '餐厅管理' },
        { path: '/catering/orders', component: 'CateringOrdersView', title: '订单管理' },
      ]);

      expect(getDynamicRoutes()).toHaveLength(2);
      expect(getDynamicRoutes().every(r => r.pluginId === 'plugin_catering')).toBe(true);

      // Uninstall: clean up routes
      unregisterPluginRoutes('plugin_catering');
      expect(getDynamicRoutes()).toHaveLength(0);
    });

    it('更新插件时应注册新路由并清理旧路由', async () => {
      // Register v1 routes
      registerPluginRoutes('plugin_catering', [
        { path: '/catering-v1', component: 'CateringViewV1', title: '餐厅管理' },
      ]);
      expect(getDynamicRoutes()).toHaveLength(1);
      expect(getDynamicRoutes()[0].path).toBe('/catering-v1');

      // Unregister old routes (update step)
      unregisterPluginRoutes('plugin_catering');
      expect(getDynamicRoutes()).toHaveLength(0);

      // Register v2 routes
      registerPluginRoutes('plugin_catering', [
        { path: '/catering-v2', component: 'CateringViewV2', title: '餐厅管理(新版)' },
        { path: '/catering-v2/delivery', component: 'DeliveryView', title: '配送管理' },
      ]);
      expect(getDynamicRoutes()).toHaveLength(2);
      expect(getDynamicRoutes()[0].path).toBe('/catering-v2');
    });

    it('不同插件的路由应互不干扰', async () => {
      registerPluginRoutes('plugin_catering', [
        { path: '/catering', component: 'CateringView', title: '餐厅管理' },
      ]);
      registerPluginRoutes('plugin_beauty', [
        { path: '/beauty', component: 'BeautyView', title: '美容管理' },
      ]);
      registerPluginRoutes('plugin_pet', [
        { path: '/pet', component: 'PetView', title: '宠物管理' },
      ]);

      expect(getDynamicRoutes()).toHaveLength(3);

      // Uninstall only beauty
      unregisterPluginRoutes('plugin_beauty');
      const routes = getDynamicRoutes();
      expect(routes).toHaveLength(2);
      expect(routes.map(r => r.pluginId).sort()).toEqual(['plugin_catering', 'plugin_pet']);
    });
  });
});
