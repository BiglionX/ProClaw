/**
 * 统一响应工具
 */
import type { ApiResponse } from '../types/index.js';

export function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}
