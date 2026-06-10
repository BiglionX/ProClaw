/**
 * SchemaManager - 核心业务表 Schema 管理
 * 为每个身份数据库创建完整的业务表结构（SQLite 版本）。
 * 包含：商品(SPU/SKU)、客户、订单、联系人、同步元数据、变更日志、插件注册表等。
 *
 * 参考:
 *   - database/spu_sku_schema_sqlite.sql
 *   - database/migrate_to_ecommerce.sql
 *   - PRD v11.0 第2节
 */

import type { IDatabase } from './DatabaseFactory';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

// ============================================
// Schema 版本管理
// ============================================

const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'schema_version';

/**
 * 获取当前身份数据库的 Schema 版本
 */
const getSchemaVersion = async (db: IDatabase): Promise<number> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = ?`,
      [SCHEMA_VERSION_KEY]
    );
    return row ? parseInt(String((row as any).value), 10) || 0 : 0;
  } catch {
    return 0;
  }
};

/**
 * 设置 Schema 版本
 */
const setSchemaVersion = async (db: IDatabase, version: number): Promise<void> => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
    [SCHEMA_VERSION_KEY, String(version)]
  );
};

/**
 * 对身份数据库应用所有 Schema 迁移
 * @param db 目标数据库实例
 */
export const applySchema = async (db: IDatabase): Promise<void> => {
  const currentVersion = await getSchemaVersion(db);
  if (currentVersion >= SCHEMA_VERSION) {
    logger.log('[SchemaManager] Schema is up to date (v' + currentVersion + ')');
    return;
  }

  logger.log('[SchemaManager] Applying schema from v' + currentVersion + ' to v' + SCHEMA_VERSION);

  // 第一阶段：创建系统表
  await createSystemTables(db);

  if (currentVersion < 1) {
    await createV1Tables(db);
  }

  if (currentVersion < 2) {
    // 审计 H2：捕获 V2 迁移异常，防止数据库进入半迁移状态
    try {
      await migrateToV2(db);
    } catch (migrationError) {
      logger.error('[SchemaManager] V2 migration failed, database may be in inconsistent state:', migrationError);
      // 不更新 schema version，下次启动可重试迁移
      throw new Error('V2 migration failed: ' + (migrationError instanceof Error ? migrationError.message : String(migrationError)));
    }
  }

  await setSchemaVersion(db, SCHEMA_VERSION);
  logger.log('[SchemaManager] Schema applied successfully (v' + SCHEMA_VERSION + ')');
};

// ============================================
// 系统表（所有版本共有的底层表，必须最先创建）
// ============================================

const createSystemTables = async (db: IDatabase): Promise<void> => {
  const queries = [
    // 1. sync_metadata - 同步元数据（PRD 2.2）
    // 采用 key-value 键值设计而非 PRD 的结构化表（id,last_sync_time,device_id,sync_token），
    // 提供更高的扩展性，允许插件添加自定义同步元数据而不需改表结构。
    // 关键字段通过 SyncMetadataManager 以约定 key 名读写：
    //   'device_id', 'last_sync_time', 'sync_token'
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,

    // 2. device_info - 本设备信息
    `CREATE TABLE IF NOT EXISTS device_info (
      device_id TEXT PRIMARY KEY,
      device_name TEXT,
      platform TEXT,
      created_at INTEGER NOT NULL,
      last_active INTEGER
    )`,

    // 3. change_log - 变更日志（PRD 2.3）
    `CREATE TABLE IF NOT EXISTS change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
      old_value TEXT,
      new_value TEXT,
      timestamp INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_changelog_status ON change_log(sync_status)`,
    `CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON change_log(timestamp)`,

    // 4. plugin_registry - 插件注册表
    `CREATE TABLE IF NOT EXISTS plugin_registry (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT DEFAULT 'installed' CHECK(status IN ('installed', 'updating', 'uninstalled')),
      manifest_json TEXT,
      installed_at INTEGER NOT NULL,
      updated_at INTEGER
    )`,

    // 5. conflict_records - 冲突记录表（PRD 3.4）
    `CREATE TABLE IF NOT EXISTS conflict_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      local_value TEXT,
      remote_value TEXT,
      local_timestamp INTEGER,
      remote_timestamp INTEGER,
      resolution TEXT DEFAULT 'pending' CHECK(resolution IN ('pending', 'local_win', 'remote_win', 'manual')),
      resolved_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_conflict_pending ON conflict_records(resolution)`,

    // 6. offline_queue - 离线请求队列（兼容旧版）
    `CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ];

  for (const query of queries) {
    await db.execAsync(query);
  }
  logger.log('[SchemaManager] System tables created');
};

// ============================================
// V1 业务表
// ============================================

const createV1Tables = async (db: IDatabase): Promise<void> => {
  const queries = [
    // ===== 商品 SPU (Standard Product Unit) =====
    `CREATE TABLE IF NOT EXISTS product_spu (
      id TEXT PRIMARY KEY,
      spu_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      category_id TEXT,
      brand_id TEXT,
      unit TEXT DEFAULT '件',
      weight REAL,
      is_on_sale INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'on_sale', 'off_sale', 'deleted')),
      metadata TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_spu_code ON product_spu(spu_code)`,
    `CREATE INDEX IF NOT EXISTS idx_spu_status ON product_spu(status)`,
    `CREATE INDEX IF NOT EXISTS idx_spu_sync ON product_spu(sync_status)`,

    // ===== 商品 SKU (Stock Keeping Unit) =====
    `CREATE TABLE IF NOT EXISTS product_sku (
      id TEXT PRIMARY KEY,
      spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
      sku_code TEXT NOT NULL,
      specifications TEXT,
      spec_text TEXT,
      cost_price REAL DEFAULT 0,
      sell_price REAL DEFAULT 0,
      market_price REAL,
      current_stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER DEFAULT 999999,
      barcode TEXT,
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      UNIQUE(spu_id, sku_code)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sku_spu ON product_sku(spu_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sku_code ON product_sku(sku_code)`,
    `CREATE INDEX IF NOT EXISTS idx_sku_barcode ON product_sku(barcode)`,
    `CREATE INDEX IF NOT EXISTS idx_sku_sync ON product_sku(sync_status)`,

    // ===== 商品图片 =====
    `CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      image_type TEXT DEFAULT 'main' CHECK(image_type IN ('main', 'gallery', 'detail')),
      sort_order INTEGER DEFAULT 0,
      is_primary INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_images_spu ON product_images(spu_id)`,

    // ===== 商品分类 =====
    `CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id)`,

    // ===== 品牌 =====
    `CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      description TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,

    // ===== 客户 =====
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      company TEXT,
      position TEXT,
      department TEXT,
      contact_type TEXT DEFAULT 'customer' CHECK(contact_type IN ('customer', 'supplier', 'colleague')),
      notes TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(contact_type)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_sync ON customers(sync_status)`,

    // ===== 销售订单 =====
    `CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
      notes TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sales_orders_number ON sales_orders(order_number)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_orders_sync ON sales_orders(sync_status)`,

    // ===== 销售订单明细 =====
    `CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
      sku_id TEXT NOT NULL REFERENCES product_sku(id),
      sku_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      spec_text TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_order ON sales_order_items(order_id)`,

    // ===== 采购订单 =====
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES customers(id),
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'received', 'cancelled')),
      notes TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_orders_sync ON purchase_orders(sync_status)`,

    // ===== 采购订单明细 =====
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      sku_id TEXT NOT NULL REFERENCES product_sku(id),
      sku_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      received_quantity INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON purchase_order_items(order_id)`,

    // ===== 库存交易记录 =====
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      sku_id TEXT NOT NULL REFERENCES product_sku(id),
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase_in', 'sales_out', 'adjustment', 'transfer_in', 'transfer_out', 'return')),
      quantity INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_transactions(sku_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_transactions(transaction_type)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_sync ON inventory_transactions(sync_status)`,

    // ===== 消息表 =====
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`,

    // ===== 商品属性定义表 =====
    `CREATE TABLE IF NOT EXISTS product_attributes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'select' CHECK(type IN ('text', 'select', 'number', 'boolean')),
      options TEXT,
      is_required INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      last_modified INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
      created_at INTEGER NOT NULL
    )`,

    // ===== SPU-属性关联表 =====
    `CREATE TABLE IF NOT EXISTS product_spu_attributes (
      id TEXT PRIMARY KEY,
      spu_id TEXT NOT NULL REFERENCES product_spu(id) ON DELETE CASCADE,
      attribute_id TEXT NOT NULL REFERENCES product_attributes(id),
      value_text TEXT,
      value_number REAL,
      value_boolean INTEGER,
      created_at INTEGER NOT NULL,
      UNIQUE(spu_id, attribute_id)
    )`,
  ];

  for (const query of queries) {
    await db.execAsync(query);
  }
  logger.log('[SchemaManager] V1 business tables created');
};

// ============================================
// V2 迁移 — 统一消息表体系（PRD v11.2）
// 替换旧 messages 表为 chat_sessions + chat_messages
// ============================================

const migrateToV2 = async (db: IDatabase): Promise<void> => {
  logger.log('[SchemaManager] Migrating to V2: unified message tables');

  // 1. 创建新消息表（含 sync_status 字段）
  const newTables = [
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      session_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      target_icon TEXT DEFAULT '',
      last_message TEXT DEFAULT '',
      last_message_time INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
      unread_count INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'local',
      created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER))
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sender_type TEXT NOT NULL DEFAULT 'other',
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
      sync_status TEXT DEFAULT 'local'
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)`,
  ];

  for (const query of newTables) {
    await db.execAsync(query);
  }

  // 2. 尝试从旧 messages 表迁移数据（幂等：不存在则跳过）
  try {
    const oldRows = await db.getAllAsync(`SELECT * FROM messages ORDER BY created_at ASC`) as any[];
    if (oldRows && oldRows.length > 0) {
      logger.log(`[SchemaManager] Migrating ${oldRows.length} rows from old messages table...`);
      for (const row of oldRows) {
        const senderId = row.sender_id || 'unknown';
        const receiverId = row.receiver_id || 'unknown';
        // 为每个 sender-receiver 对创建 session
        const targetId = `${senderId}_${receiverId}`;
        const sessionId = `session_${targetId}_migrated`;

        // 确保 session 存在
        await db.runAsync(
          `INSERT OR IGNORE INTO chat_sessions (id, session_type, target_id, target_name, target_icon, created_at, last_message_time)
           VALUES (?, 'personal', ?, ?, '', CAST(strftime('%s','now') AS INTEGER), ?)`,
          [sessionId, targetId, receiverId, row.created_at || Math.floor(Date.now() / 1000)]
        );

        // 插入消息
        const msgId = `msg_migrated_${row.id || Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const senderType = senderId === 'self' ? 'self' : 'other';
        await db.runAsync(
          `INSERT OR IGNORE INTO chat_messages (id, session_id, sender_type, content, created_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [msgId, sessionId, senderType, row.content || '', row.created_at || Math.floor(Date.now() / 1000), 'local']
        );
      }

      // 更新 session 的 last_message
      await db.execAsync(
        `UPDATE chat_sessions SET last_message = COALESCE(
          (SELECT content FROM chat_messages WHERE chat_messages.session_id = chat_sessions.id ORDER BY created_at DESC LIMIT 1),
          ''
        )`
      );
      logger.log('[SchemaManager] V2 migration complete');
    }
  } catch (e) {
    logger.warn('[SchemaManager] Old messages table not found or migration skipped:', e);
    // 审计 H2：迁移失败时不删除旧表，防止数据永久丢失
    logger.error('[SchemaManager] Migration failed, keeping old messages table for data safety');
    // 审计 W5：throw 而非 return，防止 applySchema 仍然更新 schema version 导致数据被孤立
    throw new Error('V2 migration failed: ' + getErrorMessage(e));
  }

  // 3. 删除旧 messages 表（仅在迁移成功后执行）
  try {
    await db.execAsync(`DROP TABLE IF EXISTS messages`);
    logger.log('[SchemaManager] Old messages table dropped');
  } catch (e) {
    logger.warn('[SchemaManager] Failed to drop old messages table:', e);
  }
};

/**
 * 删除身份数据库中的所有表（用于身份删除或重置）
 */
export const dropAllTables = async (db: IDatabase): Promise<void> => {
  const tableNames = [
    'product_spu_attributes', 'product_attributes', 'product_images', 'product_sku',
    'product_spu', 'product_categories', 'brands', 'customers',
    'sales_order_items', 'sales_orders', 'purchase_order_items', 'purchase_orders',
    'inventory_transactions', 'chat_messages', 'chat_sessions', 'messages',
    'plugin_registry', 'change_log', 'conflict_records', 'offline_queue', 'sync_metadata', 'device_info',
  ];

  for (const table of tableNames) {
    try {
      await db.execAsync(`DROP TABLE IF EXISTS ${table}`);
    } catch (e) {
      logger.warn(`[SchemaManager] Failed to drop table ${table}:`, e);
    }
  }
  logger.log('[SchemaManager] All tables dropped');
};

export default {
  applySchema,
  dropAllTables,
};
