/**
 * 环境配置（zod 校验，启动即失败优于运行中崩溃）
 */
import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // 测试环境下放宽 JWT_SECRET 要求（CI / 本地测试友好）
  JWT_SECRET: process.env.NODE_ENV === 'test'
    ? z.string().default('test-secret-not-for-prod-min-32-bytes-aaaaaaaaaaaa')
    : z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_ISSUER: z.string().default('proclips-backend'),

  DB_PATH: z.string().default('./data/db.sqlite'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
  RESULT_DIR: z.string().default('./data/results'),
  LOG_DIR: z.string().default('./data/logs'),

  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),

  MIX_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  MIX_TASK_MOCK_DURATION_SEC: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
});

export type Config = z.infer<typeof ConfigSchema>;

function resolveDir(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(ROOT_DIR, p);
}

function parseConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('[config] invalid environment variables:');
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const c = parsed.data;
  return {
    ...c,
    DB_PATH: resolveDir(c.DB_PATH),
    UPLOAD_DIR: resolveDir(c.UPLOAD_DIR),
    RESULT_DIR: resolveDir(c.RESULT_DIR),
    LOG_DIR: resolveDir(c.LOG_DIR),
  };
}

export const config: Config = parseConfig();
