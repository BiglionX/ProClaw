/**
 * 统一日志工具
 * P1 任务：从 241 处散落的 console.* 收敛到统一 logger
 *
 * 用法：
 *   import { logger } from '@/utils/logger';
 *   logger.info('[Call] connected');
 *   logger.error('[ProfileManager] delete failed', err);
 *
 * 设计原则：
 *   1. dev 显示 log / info / debug / warn / error 全部级别
 *   2. prod 仅显示 warn / error，log / info / debug 静默（Metro 自动 dead-code-elimination）
 *   3. error 在 prod 自动加 [ProClaw] 前缀便于线上捞日志
 *   4. 保留原 [Call] [LanSync] 等模块前缀风格
 *   5. 零依赖，类型安全
 */

declare const __DEV__: boolean;

const isDev: boolean =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';

type Level = 'log' | 'info' | 'debug' | 'warn' | 'error';

const formatArgs = (level: Level, args: unknown[]): unknown[] => {
  if (level === 'error' && !isDev) {
    return ['[ProClaw]', ...args];
  }
  return args;
};

const shouldOutput = (level: Level): boolean => {
  if (isDev) return true;
  return level === 'warn' || level === 'error';
};

const makeMethod =
  (level: Level) =>
  (...args: unknown[]): void => {
    if (!shouldOutput(level)) return;
    const fn = (console as unknown as Record<Level, (...a: unknown[]) => void>)[level] ?? console.log;
    fn(...formatArgs(level, args));
  };

export const logger = {
  log: makeMethod('log'),
  info: makeMethod('info'),
  debug: makeMethod('debug'),
  warn: makeMethod('warn'),
  error: makeMethod('error'),
};

export type Logger = typeof logger;
export default logger;
