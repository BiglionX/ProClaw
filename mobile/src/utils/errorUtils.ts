/**
 * 错误对象处理工具
 * P1.x 任务：替换 catch (xxx: any) 模式，统一 narrow 为 unknown
 *
 * 背景：
 *   TypeScript 4.4+ 的 catch 形参默认 unknown（strict 模式），但旧代码
 *   显式声明 `: any` 来绕过类型检查，破坏类型安全。本工具把"未知错误对象
 *   → 字符串/Error 实例"的安全 narrow 抽成两个纯函数，DRY 复用。
 *
 * 用法：
 *   try {
 *     await riskyCall();
 *   } catch (err) {
 *     logger.warn('failed:', getErrorMessage(err));
 *     showToast('error', '加载失败', getErrorMessage(err, '加载失败'));
 *   }
 */

import { logger } from './logger';

/**
 * 把 unknown 类型的错误对象安全转成可读字符串
 *
 * 规则：
 *   - Error 实例 → 取 .message
 *   - string 类型 → 原样返回
 *   - 其他类型 → String() 强转
 *   - null/undefined → 返回 fallback
 *
 * @param err catch 块捕获的未知对象
 * @param fallback 当 err 为 null/undefined/无法提取时的兜底文案
 */
export const getErrorMessage = (err: unknown, fallback = '未知错误'): string => {
  if (err === null || err === undefined) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  // 对象类型：尝试读取常见的 message/code 字段
  if (typeof err === 'object') {
    const obj = err as { message?: unknown; code?: unknown };
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.code === 'string' || typeof obj.code === 'number') return String(obj.code);
  }
  return fallback;
};

/**
 * 把 unknown 类型的错误对象尽量还原为 Error 实例
 *
 * 适用场景：需要传 Error 给 logger / Sentry / 上抛异常等需要 Error 实例的 API
 *
 * @param err catch 块捕获的未知对象
 * @param fallbackMessage 当 err 不是 Error 时合成 Error 用的 message
 */
export const toError = (err: unknown, fallbackMessage = 'Unknown error'): Error => {
  if (err instanceof Error) return err;
  return new Error(getErrorMessage(err, fallbackMessage));
};

/**
 * 一站式"记日志 + 返回安全字符串"：常用于 catch 块首行
 *
 * @param context 简短上下文（函数名 / 模块名）
 * @param err catch 块捕获的未知对象
 * @param fallback 兜底文案
 */
export const logError = (context: string, err: unknown, fallback?: string): string => {
  const message = getErrorMessage(err, fallback);
  logger.warn(`[${context}] ${message}`, err);
  return message;
};
