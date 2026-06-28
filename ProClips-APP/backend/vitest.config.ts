import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: 'forks', // better-sqlite3 是 native 模块，避免 worker 线程问题
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./test/setup.ts'],
  },
});
