/**
 * 应用启动入口
 */
import { buildApp } from './app.js';
import { initDb, closeDb } from './db/connection.js';
import { startMixWorker, stopMixWorker } from './services/mixWorker.js';
import { config } from './config.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  // 1. 初始化数据库
  initDb();

  // 2. 启动混剪 Worker
  startMixWorker();

  // 3. 构建 Fastify
  const app = await buildApp();

  // 4. 启动 HTTP 服务
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(
      { port: config.PORT, host: config.HOST, env: config.NODE_ENV },
      '✅ ProClips Backend listening'
    );
  } catch (err) {
    logger.fatal({ err }, 'failed to start HTTP server');
    process.exit(1);
  }

  // 5. 优雅关闭
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      stopMixWorker();
      closeDb();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal startup error:', err);
  process.exit(1);
});
