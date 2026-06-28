/**
 * 重建 ProClips 数据库（应用 schema + seed）
 * 由 db_reset.mjs 调用
 */
import { config } from '../src/config.ts';
import { initDb, closeDb } from '../src/db/connection.ts';
import { logger } from '../src/logger.ts';

initDb();
closeDb();
logger.info({ dbPath: config.DB_PATH }, '[db_init] done');
