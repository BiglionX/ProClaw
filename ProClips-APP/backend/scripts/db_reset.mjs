#!/usr/bin/env node
/**
 * ProClips Backend 数据库 & 文件存储重置
 * 用法：npm run db:reset
 * 警告：会删除当前 DB_PATH 指向的 sqlite 文件以及 UPLOAD_DIR / RESULT_DIR 中所有内容
 */
import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');

const dbPath = resolve(backendRoot, process.env.DB_PATH ?? './data/db.sqlite');
const uploadDir = resolve(backendRoot, process.env.UPLOAD_DIR ?? './data/uploads');
const resultDir = resolve(backendRoot, process.env.RESULT_DIR ?? './data/results');

function rm(p) {
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log(`[reset] removed: ${p}`);
  } else {
    console.log(`[reset] skip (not found): ${p}`);
  }
}

console.log('[reset] this will delete DB / uploads / results, ctrl-c to abort in 2s...');
await new Promise((r) => setTimeout(r, 1500));

rm(dbPath);
rm(`${dbPath}-shm`);
rm(`${dbPath}-wal`);
rm(uploadDir);
rm(resultDir);

console.log('[reset] re-initializing DB via tsx...');
const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', 'scripts/db_init.ts'],
  { cwd: backendRoot, stdio: 'inherit' },
);
process.exit(r.status ?? 0);
