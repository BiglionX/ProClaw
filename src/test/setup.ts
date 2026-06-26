import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock import.meta.env for all tests
Object.defineProperty(globalThis, 'importMeta', {
  value: { env: { VITE_MOCK_PASSWORD: 'IamBigBoss' } },
  writable: true,
});

// jsdom 中 Blob/File 的 text() / arrayBuffer() 在某些版本下未实现或对 File 退化为 "[object File]"。
// 改为在测试中用纯字符串/字节缓冲直接覆盖，并提供一个简单 polyfill 作 fallback。
function polyfillBlobText(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BlobProto = (globalThis as any).Blob?.prototype as Record<string, unknown> | undefined;
  if (!BlobProto) return;
  if (typeof BlobProto.text !== 'function') {
    // eslint-disable-next-line no-extend-native
    BlobProto.text = function text(this: Blob): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (): void => resolve(String(reader.result ?? ''));
        reader.onerror = (): void => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsText(this);
      });
    };
  }
  if (typeof BlobProto.arrayBuffer !== 'function') {
    // eslint-disable-next-line no-extend-native
    BlobProto.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (): void => {
          const result = reader.result;
          if (result instanceof ArrayBuffer) {
            resolve(result);
            return;
          }
          resolve(new TextEncoder().encode(String(result ?? '')).buffer as ArrayBuffer);
        };
        reader.onerror = (): void => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsArrayBuffer(this);
      });
    };
  }
}
polyfillBlobText();

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri Event
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn(),
}));

// ipcInvoke 委托给 @tauri-apps/api/core 的 mock，与现有 service 测试兼容
vi.mock('../lib/tauri', async () => {
  const core = await import('@tauri-apps/api/core');
  return {
    isTauri: vi.fn(() => true),
    ipcInvoke: core.invoke,
    ipcInvokeOrNull: core.invoke,
    safeInvoke: core.invoke,
    openExternalUrl: vi.fn(),
  };
});

// 抑制 jsdom 中 AbortController.abort() 内部产生的已知 unhandled rejection 误报。
// 当测试代码已经显式 catch 了用户层面的 rejection（例如 expect(promise).rejects.toThrow）
// 时，jsdom 的 AbortSignal 实现仍会在内部触发一个 reject 事件，被 vitest 标记为
// unhandled rejection。这是 jsdom 的已知行为，不是真实问题。
function isKnownAbortLikeReason(reason: unknown): boolean {
  if (!reason) return false;
  // 优先从 name 属性匹配（DOMException 不一定是 Error 子类）
  const name = (reason as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TimeoutError' || name === 'DOMException') {
    return true;
  }
  // DOMException 的 message 通常以 "aborted" 开头
  const message = (reason as { message?: string })?.message;
  if (typeof message === 'string' && /aborted|timeout/i.test(message)) {
    return true;
  }
  return false;
}

process.on('unhandledRejection', (reason) => {
  if (isKnownAbortLikeReason(reason)) {
    return; // 静默忽略 jsdom 内部已知误报
  }
  // 其他 unhandled rejection 仍然抛给默认处理器
  console.warn('[unhandledRejection]', reason);
});

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {}
  }
}
