/**
 * SQLite 连接管理
 * - 单例连接
 * - 启动时应用 schema.sql
 * - 启用 WAL 模式提升并发
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { logger } from '../logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (!db) {
    ensureDir(config.DB_PATH);
    db = new Database(config.DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    logger.info({ dbPath: config.DB_PATH }, 'SQLite connected');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite closed');
  }
}

/**
 * 应用 Schema（幂等：所有 DDL 都用 IF NOT EXISTS）
 */
export function applySchema(): void {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const conn = getDb();
  conn.exec(sql);
  logger.info('Schema applied');
}

/**
 * 应用种子数据（幂等：使用 INSERT OR IGNORE）
 */
export function applySeed(): void {
  const seedPath = path.join(__dirname, 'seed.sql');
  if (!fs.existsSync(seedPath)) return;
  const sql = fs.readFileSync(seedPath, 'utf-8');
  const conn = getDb();
  conn.exec(sql);
  logger.info('Seed applied');
}

/**
 * 初始化数据库（schema + seed）
 */
export function initDb(): void {
  applySchema();
  applySeed();
}
