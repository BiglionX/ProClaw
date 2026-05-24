import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('proclaw_mobile.db');
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

const createTables = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  const queries = [
    `CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products_cache (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders_cache (
      id TEXT PRIMARY KEY,
      order_type TEXT NOT NULL,
      order_number TEXT NOT NULL,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_offline_queue_created ON offline_queue(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_products_cache_sku ON products_cache(sku)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_cache_status ON orders_cache(status)`
  ];

  for (const query of queries) {
    await db.execAsync(query);
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};

export const clearCache = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  const tables = ['offline_queue', 'products_cache', 'orders_cache', 'messages'];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table}`);
  }
};

export default { initDatabase, getDatabase, closeDatabase, clearCache };
