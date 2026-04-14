import { vi } from 'vitest';
import * as core from '@tauri-apps/api/core';

/**
 * 创建 Tauri invoke 的 mock
 */
export function createMockInvoke() {
  const mockInvoke = vi.fn();
  vi.spyOn(core, 'invoke').mockImplementation(mockInvoke);
  return mockInvoke;
}

/**
 * 重置所有 mocks
 */
export function resetMocks() {
  vi.clearAllMocks();
}

/**
 * 模拟成功响应
 */
export function mockSuccessResponse<T>(data: T) {
  return Promise.resolve(data);
}

/**
 * 模拟错误响应
 */
export function mockErrorResponse(message: string) {
  return Promise.reject(new Error(message));
}
