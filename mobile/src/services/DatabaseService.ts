import { Platform } from 'react-native';

// ---- Web-only in-memory database ----
class WebDatabase {
  private tables: Map<string, any[]> = new Map();

  constructor() {
    this.tables.set('offline_queue', []);
    this.tables.set('products_cache', []);
    this.tables.set('customers_cache', []);
    this.tables.set('orders_cache', []);
    this.tables.set('messages', []);
  }

  async execAsync(sql: string, params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('CREATE TABLE')) {
      const match = sql.match(/IF NOT EXISTS\s+(\w+)/i);
      const name = match?.[1];
      if (name && !this.tables.has(name)) {
        this.tables.set(name, []);
      }
    } else if (upper.startsWith('INSERT')) {
      const match = sql.match(/INSERT OR REPLACE INTO\s+(\w+)/i);
      const table = match?.[1];
      if (table && params) {
        const row: any = {};
        const cols = sql.match(/\(([^)]+)\)/)?.[1]?.split(',').map(c => c.trim()) || [];
        cols.forEach((col, i) => { row[col] = params?.[i] ?? null; });
        const existing = this.tables.get(table) || [];
        const pkIdx = existing.findIndex((r: any) => r.id === row.id);
        if (pkIdx >= 0) existing[pkIdx] = row;
        else existing.push(row);
        this.tables.set(table, existing);
      }
    } else if (upper.startsWith('DELETE')) {
      const match = sql.match(/DELETE FROM\s+(\w+)/i);
      const table = match?.[1];
      if (table) this.tables.set(table, []);
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT')) {
      const match = sql.match(/FROM\s+(\w+)/i);
      const table = match?.[1];
      const t = table ?? '';
      const rows = [...(this.tables.get(t) || [])];
      if (params && params.length > 0 && upper.includes('LIKE')) {
        const term = String(params[0]).replace(/%/g, '');
        return rows.filter((r: any) =>
          Object.values(r).some(v => String(v).toLowerCase().includes(term.toLowerCase()))
        );
      }
      return rows;
    }
    return [];
  }

  async runAsync(sql: string, params?: any[]): Promise<void> {
    await this.execAsync(sql, params);
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }
}

let webDb: WebDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  webDb = new WebDatabase();
  console.log('Web database (in-memory mock) initialized');
};

export const getDatabase = (): WebDatabase => {
  if (!webDb) throw new Error('Database not initialized.');
  return webDb;
};

export const closeDatabase = async (): Promise<void> => {
  webDb?.closeAsync();
  webDb = null;
};

export const clearCache = async (): Promise<void> => {
  const d = getDatabase();
  for (const table of ['offline_queue', 'products_cache', 'customers_cache', 'orders_cache', 'messages']) {
    await d.execAsync(`DELETE FROM ${table}`);
  }
};

export default { initDatabase, getDatabase, closeDatabase, clearCache };
