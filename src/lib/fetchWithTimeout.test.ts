import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OUTBOUND_ERROR_MESSAGE,
  DEFAULT_OUTBOUND_TIMEOUT_MS,
  LONG_OUTBOUND_TIMEOUT_MS,
  isNetworkError,
  isAbortError,
  withTimeout,
  withTimeoutPromise,
  normalizeOutboundError,
} from './fetchWithTimeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('OUTBOUND_ERROR_MESSAGE', () => {
    it('应包含 "服务器有问题"', () => {
      expect(OUTBOUND_ERROR_MESSAGE).toContain('服务器有问题');
      expect(OUTBOUND_ERROR_MESSAGE).toContain('稍候再试');
    });
  });

  describe('超时常量', () => {
    it('DEFAULT_OUTBOUND_TIMEOUT_MS = 30s', () => {
      expect(DEFAULT_OUTBOUND_TIMEOUT_MS).toBe(30_000);
    });
    it('LONG_OUTBOUND_TIMEOUT_MS = 60s', () => {
      expect(LONG_OUTBOUND_TIMEOUT_MS).toBe(60_000);
    });
  });

  describe('isNetworkError', () => {
    it('识别 fetch 错误', () => {
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    });
    it('识别 DNS 错误', () => {
      expect(isNetworkError(new Error('getaddrinfo ENOTFOUND'))).toBe(true);
    });
    it('识别连接拒绝', () => {
      expect(isNetworkError(new Error('connect ECONNREFUSED 127.0.0.1'))).toBe(true);
    });
    it('识别 cause.code', () => {
      const err = new Error('xxx') as Error & { cause: { code: string } };
      err.cause = { code: 'ETIMEDOUT' };
      expect(isNetworkError(err)).toBe(true);
    });
    it('业务错误不识别为网络错误', () => {
      expect(isNetworkError(new Error('permission denied'))).toBe(false);
    });
    it('处理字符串', () => {
      expect(isNetworkError('fetch failed')).toBe(true);
    });
  });

  describe('isAbortError', () => {
    it('signal.aborted = true 时返回 true', () => {
      const controller = new AbortController();
      controller.abort();
      expect(isAbortError(new Error('xxx'), controller.signal)).toBe(true);
    });
    it('识别 AbortError', () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      expect(isAbortError(err)).toBe(true);
    });
    it('识别 TimeoutError', () => {
      const err = new Error('timeout');
      err.name = 'TimeoutError';
      expect(isAbortError(err)).toBe(true);
    });
    it('业务错误返回 false', () => {
      expect(isAbortError(new Error('parse error'))).toBe(false);
    });
  });

  describe('withTimeout', () => {
    it('返回的 signal 不会自动 abort', () => {
      const { signal, dispose } = withTimeout(undefined, 1000);
      expect(signal.aborted).toBe(false);
      dispose();
    });

    it('到达超时后自动 abort', () => {
      const { signal, dispose } = withTimeout(undefined, 1000);
      expect(signal.aborted).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(signal.aborted).toBe(true);
      dispose();
    });

    it('用户信号 abort 后立即传播', () => {
      const userController = new AbortController();
      const { signal, dispose } = withTimeout(userController.signal, 10000);
      userController.abort();
      expect(signal.aborted).toBe(true);
      dispose();
    });

    it('dispose 后不再触发 abort', () => {
      const { signal, dispose } = withTimeout(undefined, 1000);
      dispose();
      vi.advanceTimersByTime(2000);
      expect(signal.aborted).toBe(false);
    });
  });

  describe('withTimeoutPromise', () => {
    it('正常完成时 resolve', async () => {
      const result = await withTimeoutPromise(
        async () => 'ok',
        1000,
      );
      expect(result).toBe('ok');
    });

    it('超时时 reject AbortError', async () => {
      let rejection: unknown = null;
      // factory 内部监听 abort 并 reject；不立即 attach 外层 catch 会导致
      // Node.js 的 unhandled rejection 警告（jsdom 在 abort 时是 microtask 调度的）
      const promise = withTimeoutPromise(
        (signal) => new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
        1000,
      );
      // 立即 attach 一个 swallow handler，避免 unhandled rejection 警告
      promise.catch((err) => {
        rejection = err;
      });

      // fake timers 下推进时间让 withTimeout 的 1000ms 计时器触发
      await vi.advanceTimersByTimeAsync(1000);

      // 等 microtask 队列清空，确保 catch handler 已执行
      await Promise.resolve();

      expect(rejection).toBeInstanceOf(DOMException);
      expect((rejection as DOMException).name).toBe('AbortError');
      // promise 最终状态确实是 rejected
      await expect(promise).rejects.toThrow();
    });
  });

  describe('normalizeOutboundError', () => {
    it('AbortError → fallbackMessage', () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      const result = normalizeOutboundError(err);
      expect(result).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('网络错误 → "网络异常" 前缀', () => {
      const result = normalizeOutboundError(new Error('fetch failed'));
      expect(result).toContain('网络异常');
      expect(result).toContain(OUTBOUND_ERROR_MESSAGE);
    });

    it('业务错误 → fallbackMessage', () => {
      expect(normalizeOutboundError(new Error('parse error'))).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('支持自定义 fallback', () => {
      const result = normalizeOutboundError(new Error('xxx'), undefined, '自定义错误');
      expect(result).toBe('自定义错误');
    });
  });
});
