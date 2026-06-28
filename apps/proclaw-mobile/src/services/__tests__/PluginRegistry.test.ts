/// <reference types="jest" />

/**
 * PluginRegistry 单元测试
 * 测试插件注册、查询、路由事件等核心功能
 */
import type { IDatabase } from '../DatabaseFactory';
import type { PluginManifest, InstalledPlugin } from '../PluginRegistry';

// In-memory mock database for PluginRegistry tests
class MockPluginDB implements IDatabase {
  private tables: Map<string, any[]> = new Map();

  constructor() {
    this.tables.set('plugin_registry', []);
  }

  async execAsync(sql: string, _params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      if (match && !this.tables.has(match[1])) {
        this.tables.set(match[1], []);
      }
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return [];
    const tableName = match[1];
    const table = this.tables.get(tableName) || [];

    let rows = [...table];

    // WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i);
    if (whereMatch) {
      // Handle != with literal values (e.g. status != 'uninstalled')
      const neqMatch = whereMatch[1].match(/(\w+)\s*!=\s*'([^']+)'/i);
      if (neqMatch) {
        rows = rows.filter((r: any) => r[neqMatch[1]] !== neqMatch[2]);
      }
      // Handle = with parameter (e.g. id = ?)
      if (params && params.length > 0) {
        const eqMatch = whereMatch[1].match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          rows = rows.filter((r: any) => String(r[eqMatch[1]]) === String(params[0]));
        }
      }
    }

    return rows;
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    const rows = await this.getAllAsync(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith('INSERT')) {
      const match = sql.trim().match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.tables.get(tableName) || [];

      const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
      const cols = colMatch
        ? colMatch[1].split(',').map((c: string) => c.trim())
            .filter((c: string) => !c.toUpperCase().startsWith('PRIMARY') && !c.toUpperCase().startsWith('UNIQUE'))
        : [];

      const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
      if (!valuesMatch) {
        // Fallback: all params are values
        if (params && cols.length > 0) {
          const row: any = {};
          cols.forEach((col, i) => {
            if (i < params.length) row[col] = params[i];
          });
          const replaceMode = sql.toUpperCase().includes('OR REPLACE');
          if (replaceMode && row.id) {
            const idx = table.findIndex((r: any) => r.id === row.id);
            if (idx >= 0) {
              table[idx] = { ...table[idx], ...row };
            } else {
              table.push(row);
            }
          } else {
            table.push(row);
          }
        }
        return { rowsAffected: 1 };
      }

      // Parse VALUES with mixed literals and ? placeholders
      const valueParts = valuesMatch[1].split(',').map((v: string) => v.trim());
      let paramIndex = 0;
      const row: any = {};
      cols.forEach((col, i) => {
        if (i < valueParts.length) {
          if (valueParts[i] === '?') {
            row[col] = params?.[paramIndex] ?? null;
            paramIndex++;
          } else {
            row[col] = valueParts[i].replace(/^['"]|['"]$/g, '');
          }
        }
      });

      const replaceMode = sql.toUpperCase().includes('OR REPLACE');
      if (replaceMode && row.id) {
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
      const match = sql.trim().match(/UPDATE\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.tables.get(tableName) || [];

      const whereIdx = sql.trim().indexOf('WHERE');
      if (whereIdx < 0) return { rowsAffected: 0 };

      const field = sql.trim().match(/WHERE\s+(\w+)/i)?.[1] || 'id';
      const val = params?.[params.length - 1];

      const setPart = sql.trim().substring(sql.trim().toUpperCase().indexOf('SET') + 3, whereIdx).trim();
      const setClauses = setPart.split(',').map((s: string) => {
        const eqIdx = s.trim().indexOf('=');
        if (eqIdx < 0) return null;
        const col = s.trim().substring(0, eqIdx).trim();
        const valuePart = s.trim().substring(eqIdx + 1).trim();
        return { col, isParam: valuePart === '?', literalValue: valuePart.replace(/^['"]|['"]$/g, '') };
      }).filter(Boolean);

      for (const row of table) {
        if (String(row[field]) === String(val)) {
          setClauses.forEach((clause: any) => {
            row[clause.col] = clause.isParam ? params?.[0] : clause.literalValue;
          });
        }
      }
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }

  reset(): void {
    this.tables.clear();
    this.tables.set('plugin_registry', []);
  }
}

// Mock PluginManifest for testing
const testManifest: PluginManifest = {
  id: 'test_plugin',
  name: '测试插件',
  version: '1.0.0',
  description: 'A test plugin',
  author: 'Test Author',
  icon: '🧪',
  permissions: ['test:read'],
  minAppVersion: '1.0.0',
  upSql: 'CREATE TABLE test_data (id TEXT PRIMARY KEY);',
  downSql: 'DROP TABLE IF EXISTS test_data;',
  entryPoint: 'index.js',
  routes: [{ path: '/test', component: 'TestComponent', title: '测试' }],
};

describe('PluginRegistry', () => {
  let db: MockPluginDB;

  beforeEach(() => {
    db = new MockPluginDB();
  });

  describe('getInstalledPlugins', () => {
    it('should return empty array when no plugins installed', async () => {
      const { getInstalledPlugins } = await import('../PluginRegistry');
      const plugins = await getInstalledPlugins(db);
      expect(plugins).toEqual([]);
    });

    it('should return installed plugins', async () => {
      const { registerPlugin, getInstalledPlugins } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);

      const plugins = await getInstalledPlugins(db);
      expect(plugins).toHaveLength(1);
      expect(plugins[0].id).toBe('test_plugin');
      expect(plugins[0].name).toBe('测试插件');
    });

    it('should not return uninstalled plugins', async () => {
      const { registerPlugin, unregisterPlugin, getInstalledPlugins } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);
      await unregisterPlugin(db, 'test_plugin');

      const plugins = await getInstalledPlugins(db);
      expect(plugins).toHaveLength(0);
    });
  });

  describe('getPlugin', () => {
    it('should return null for non-existent plugin', async () => {
      const { getPlugin } = await import('../PluginRegistry');
      const plugin = await getPlugin(db, 'nonexistent');
      expect(plugin).toBeNull();
    });

    it('should return plugin details by id', async () => {
      const { registerPlugin, getPlugin } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);

      const plugin = await getPlugin(db, 'test_plugin');
      expect(plugin).not.toBeNull();
      expect(plugin!.id).toBe('test_plugin');
      expect(plugin!.name).toBe('测试插件');
      expect(plugin!.version).toBe('1.0.0');
      expect(plugin!.status).toBe('installed');
    });
  });

  describe('registerPlugin', () => {
    it('should register a plugin with installed status', async () => {
      const { registerPlugin, getPlugin } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);

      const plugin = await getPlugin(db, 'test_plugin');
      expect(plugin).not.toBeNull();
      expect(plugin!.status).toBe('installed');
      expect((plugin as any)['installed_at']).toBeGreaterThan(0);
      expect((plugin as any)['manifest_json']).toBeDefined();
      const manifest = JSON.parse((plugin as any)['manifest_json']);
      expect(manifest.name).toBe('测试插件');
      expect(manifest.routes).toHaveLength(1);
    });
  });

  describe('unregisterPlugin', () => {
    it('should mark plugin as uninstalled', async () => {
      const { registerPlugin, unregisterPlugin, getPlugin } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);
      await unregisterPlugin(db, 'test_plugin');

      const plugin = await getPlugin(db, 'test_plugin');
      expect(plugin).not.toBeNull();
      expect(plugin!.status).toBe('uninstalled');
    });
  });

  describe('markPluginUpdating', () => {
    it('should mark plugin as updating', async () => {
      const { registerPlugin, markPluginUpdating, getPlugin } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);
      await markPluginUpdating(db, 'test_plugin');

      const plugin = await getPlugin(db, 'test_plugin');
      expect(plugin!.status).toBe('updating');
    });
  });

  describe('updatePluginVersion', () => {
    it('should update plugin version and manifest', async () => {
      const { registerPlugin, updatePluginVersion, getPlugin } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);

      const newManifest = { ...testManifest, version: '2.0.0' };
      await updatePluginVersion(db, 'test_plugin', '2.0.0', JSON.stringify(newManifest));

      const plugin = await getPlugin(db, 'test_plugin');
      expect(plugin!.version).toBe('2.0.0');
      expect(plugin!.status).toBe('installed');
    });
  });

  describe('parseManifest', () => {
    it('should parse valid manifest JSON', async () => {
      const { parseManifest } = await import('../PluginRegistry');
      const manifest = parseManifest(JSON.stringify(testManifest));
      expect(manifest).not.toBeNull();
      expect(manifest!.id).toBe('test_plugin');
    });

    it('should return null for invalid JSON', async () => {
      const { parseManifest } = await import('../PluginRegistry');
      const manifest = parseManifest('invalid json');
      expect(manifest).toBeNull();
    });
  });

  describe('isPluginInstalled', () => {
    it('should return false for non-existent plugin', async () => {
      const { isPluginInstalled } = await import('../PluginRegistry');
      const installed = await isPluginInstalled(db, 'nonexistent');
      expect(installed).toBe(false);
    });

    it('should return true after registration', async () => {
      const { registerPlugin, isPluginInstalled } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);
      const installed = await isPluginInstalled(db, 'test_plugin');
      expect(installed).toBe(true);
    });

    it('should return false after unregistration', async () => {
      const { registerPlugin, unregisterPlugin, isPluginInstalled } = await import('../PluginRegistry');
      await registerPlugin(db, testManifest);
      await unregisterPlugin(db, 'test_plugin');
      const installed = await isPluginInstalled(db, 'test_plugin');
      expect(installed).toBe(false);
    });
  });

  describe('isUpdateAvailable', () => {
    it('should return true when latest version is higher', async () => {
      const { isUpdateAvailable } = await import('../PluginRegistry');
      expect(isUpdateAvailable('1.0.0', '2.0.0')).toBe(true);
      expect(isUpdateAvailable('1.0.0', '1.1.0')).toBe(true);
    });

    it('should return false when versions are equal', async () => {
      const { isUpdateAvailable } = await import('../PluginRegistry');
      expect(isUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
    });

    it('should return false when current version is higher', async () => {
      const { isUpdateAvailable } = await import('../PluginRegistry');
      expect(isUpdateAvailable('2.0.0', '1.0.0')).toBe(false);
    });
  });

  describe('dynamic routes', () => {
    it('should register and retrieve dynamic routes', async () => {
      const { registerPluginRoutes, getDynamicRoutes } = await import('../PluginRegistry');
      const routes = [{ path: '/test', title: '测试', component: 'TestComponent' }];
      registerPluginRoutes('test_plugin', routes);

      const registered = getDynamicRoutes();
      expect(registered).toHaveLength(1);
      expect(registered[0].pluginId).toBe('test_plugin');
      expect(registered[0].path).toBe('/test');
    });

    it('should unregister routes when plugin is uninstalled', async () => {
      const { registerPluginRoutes, unregisterPluginRoutes, getDynamicRoutes } = await import('../PluginRegistry');
      registerPluginRoutes('test_plugin', [{ path: '/test', title: '测试', component: 'TestComponent' }]);
      expect(getDynamicRoutes()).toHaveLength(1);

      unregisterPluginRoutes('test_plugin');
      expect(getDynamicRoutes()).toHaveLength(0);
    });

    it('should notify listeners on route change', async () => {
      const { registerPluginRoutes, onRoutesChanged } = await import('../PluginRegistry');
      const listener = jest.fn();
      const unsubscribe = onRoutesChanged(listener);

      registerPluginRoutes('test_plugin', [{ path: '/test', title: '测试', component: 'TestComponent' }]);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ pluginId: 'test_plugin' }),
      ]));

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const { registerPluginRoutes, onRoutesChanged } = await import('../PluginRegistry');
      const listener = jest.fn();
      const unsubscribe = onRoutesChanged(listener);
      unsubscribe();

      registerPluginRoutes('test_plugin', [{ path: '/test', title: '测试', component: 'TestComponent' }]);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
