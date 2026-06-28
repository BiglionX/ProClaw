/**
 * vitest setup：在所有 test 文件加载前设置测试环境变量
 * （必须在 import config 之前，因为 ES Module 静态 import 会被 hoist）
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-for-prod-min-32-bytes-aaaaaaaaaaaa';
process.env.DB_PATH = './data/test.db.sqlite';
process.env.UPLOAD_DIR = './data/test-uploads';
process.env.RESULT_DIR = './data/test-results';
// 测试环境缩短 worker 间隔：默认 2000ms 在 polling=20*500ms 的窗口下临界
process.env.MIX_WORKER_INTERVAL_MS = '500';
process.env.MIX_TASK_MOCK_DURATION_SEC = '3';
// 测试环境用 'info' 让 worker 行为可见（'silent' 不在 zod enum 里）
process.env.LOG_LEVEL = 'info';