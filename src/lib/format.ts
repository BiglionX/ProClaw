/**
 * ProClaw 集中式安全格式化工具
 *
 * **设计目标**：
 * - 消除 `Cannot read properties of undefined (reading 'toLocaleString')` 类崩溃
 * - 所有数字/日期格式化统一走这个文件，便于审计和替换
 * - 默认值兜底，永远返回字符串（不抛异常）
 *
 * **使用规范**：
 * - ✅ `import { safeNumber, safeCurrency, safeDate } from '../lib/format';`
 * - ❌ `value.toLocaleString()`（裸调用，value 为 undefined 时崩溃）
 *
 * **审计标记**（v1.0.0+tray+db+contacts+msgs+safety 增量补丁）：
 * 修复桌面端 `Cannot read properties of undefined (reading 'toLocaleString')` 崩溃
 * 修复 `value.toFixed is not a function` 类崩溃
 * 修复 `new Date(undefined).toLocaleString` 崩溃
 */

/**
 * 安全地把任意值格式化为带千分位的数字字符串
 * @param value 数字/字符串/null/undefined
 * @param fallback 兜底字符串（默认 '-'）
 * @returns 字符串
 */
export function safeNumber(
  value: number | string | null | undefined,
  fallback: string = '-',
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  try {
    return n.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * 安全地把任意值格式化为固定小数位字符串（替代 value.toFixed(n)）
 * @param value 数字/字符串/null/undefined
 * @param digits 小数位数（默认 2）
 * @param fallback 兜底字符串
 */
export function safeFixed(
  value: number | string | null | undefined,
  digits: number = 2,
  fallback: string = '-',
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  try {
    return n.toFixed(digits);
  } catch {
    return fallback;
  }
}

/**
 * 安全地把数字格式化为人民币货币字符串
 * @param value 数字/null/undefined
 * @param options 配置
 */
export interface SafeCurrencyOptions {
  /** 是否带 ¥ 符号（默认 true） */
  symbol?: boolean;
  /** 数字过大时自动用"万"为单位（默认 true） */
  autoWan?: boolean;
  /** 兜底字符串（默认 '-'） */
  fallback?: string;
  /** 小数位数（autoWan=false 时生效，默认 2） */
  digits?: number;
}

export function safeCurrency(
  value: number | string | null | undefined,
  options: SafeCurrencyOptions = {},
): string {
  const { symbol = true, autoWan = true, fallback = '-', digits = 2 } = options;
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const prefix = symbol ? '¥' : '';
  try {
    if (autoWan && Math.abs(n) >= 10000) {
      return `${prefix}${(n / 10000).toFixed(1)}万`;
    }
    return `${prefix}${n.toFixed(digits)}`;
  } catch {
    return fallback;
  }
}

/**
 * 安全地把任意时间值格式化为本地化日期字符串
 * @param value Date/数字(时间戳)/字符串/null/undefined
 * @param locale 默认 'zh-CN'
 * @param fallback 兜底字符串
 */
export function safeDate(
  value: Date | number | string | null | undefined,
  locale: string = 'zh-CN',
  fallback: string = '-',
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  let d: Date;
  try {
    d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
      return fallback;
    }
    return d.toLocaleString(locale);
  } catch {
    return fallback;
  }
}

/**
 * 安全地把时间戳格式化为短日期（"11/13 14:30"）
 * @param value Date/数字/字符串/null/undefined
 * @param locale
 * @param fallback
 */
export function safeShortDate(
  value: Date | number | string | null | undefined,
  locale: string = 'zh-CN',
  fallback: string = '-',
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  let d: Date;
  try {
    d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
      return fallback;
    }
    return d.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}

/**
 * 安全地把字节数格式化为可读字符串（KB/MB/GB）
 * @param bytes
 * @param fallback
 */
export function safeBytes(
  bytes: number | null | undefined,
  fallback: string = '-',
): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return fallback;
  }
  try {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } catch {
    return fallback;
  }
}
