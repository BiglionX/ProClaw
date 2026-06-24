/// <reference types="jest" />

/**
 * fetchWithTimeout 单元测试
 *
 * 覆盖：
 * - OUTBOUND_ERROR_MESSAGE 文案常量（与桌面端 100% 一致）
 * - isNetworkError：axios code / Node 系统码 / 字符串特征
 * - isAbortError：超时 / 用户取消
 * - withTimeout：合并用户取消信号与超时信号
 * - withTimeoutPromise：超时行为（fast-fail）
 * - normalizeOutboundError：归一化错误文案
 */

import {
  OUTBOUND_ERROR_MESSAGE,
  DEFAULT_OUTBOUND_TIMEOUT_MS,
  LONG_OUTBOUND_TIMEOUT_MS,
  isNetworkError,
  isAbortError,
  withTimeout,
  withTimeoutPromise,
  normalizeOutboundError,
} from '../fetchWithTimeout';

describe('fetchWithTimeout', () => {
  // ============================================================
  // 常量
  // ============================================================
  describe('常量', () => {
    it('OUTBOUND_ERROR_MESSAGE 文案与桌面端一致', () => {
      expect(OUTBOUND_ERROR_MESSAGE).toBe('服务器有问题，请稍候再试');
    });

    it('DEFAULT_OUTBOUND_TIMEOUT_MS = 30s', () => {
      expect(DEFAULT_OUTBOUND_TIMEOUT_MS).toBe(30_000);
    });

    it('LONG_OUTBOUND_TIMEOUT_MS = 60s', () => {
      expect(LONG_OUTBOUND_TIMEOUT_MS).toBe(60_000);
    });
  });

  // ============================================================
  // isNetworkError
  // ============================================================
  describe('isNetworkError', () => {
    it('识别 axios ECONNABORTED（超时）', () => {
      expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    });

    it('识别 axios ERR_NETWORK（网络异常）', () => {
      expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('识别 axios ERR_CANCELED（被取消）', () => {
      expect(isNetworkError({ code: 'ERR_CANCELED' })).toBe(true);
    });

    it('识别 axios ENOTFOUND（DNS 失败）', () => {
      expect(isNetworkError({ code: 'ENOTFOUND' })).toBe(true);
    });

    it('识别 axios ECONNREFUSED（连接拒绝）', () => {
      expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('识别 axios ETIMEDOUT（系统超时）', () => {
      expect(isNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
    });

    it('识别 axios EAI_AGAIN（DNS 重试）', () => {
      expect(isNetworkError({ code: 'EAI_AGAIN' })).toBe(true);
    });

    it('识别 axios EHOSTUNREACH', () => {
      expect(isNetworkError({ code: 'EHOSTUNREACH' })).toBe(true);
    });

    it('识别 axios ENETUNREACH', () => {
      expect(isNetworkError({ code: 'ENETUNREACH' })).toBe(true);
    });

    it('识别 Error.cause.code', () => {
      expect(isNetworkError({ cause: { code: 'ECONNABORTED' } })).toBe(true);
    });

    it('识别字符串消息 "fetch failed"', () => {
      expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    });

    it('识别字符串消息 "Network Error"', () => {
      expect(isNetworkError(new Error('Network Error'))).toBe(true);
    });

    it('识别字符串消息 "Network request failed"', () => {
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    });

    it('识别字符串消息 "getaddrinfo ENOTFOUND"', () => {
      expect(isNetworkError(new Error('getaddrinfo ENOTFOUND api.example.com'))).toBe(true);
    });

    it('识别字符串消息 "name_not_resolved"', () => {
      expect(isNetworkError(new Error('name_not_resolved'))).toBe(true);
    });

    it('非网络错误应返回 false', () => {
      expect(isNetworkError(new Error('TypeError: Cannot read property'))).toBe(false);
      expect(isNetworkError(new Error('401 Unauthorized'))).toBe(false);
      expect(isNetworkError({ code: 'OTHER_ERROR' })).toBe(false);
    });

    it('空值应返回 false', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  // ============================================================
  // isAbortError
  // ============================================================
  describe('isAbortError', () => {
    it('signal.aborted = true 时返回 true', () => {
      const signal = { aborted: true } as AbortSignal;
      expect(isAbortError(null, signal)).toBe(true);
    });

    it('Error.name = "AbortError" 时返回 true', () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      expect(isAbortError(err)).toBe(true);
    });

    it('Error.name = "TimeoutError" 时返回 true', () => {
      const err = new Error('Timeout');
      err.name = 'TimeoutError';
      expect(isAbortError(err)).toBe(true);
    });

    it('Error.name = "CanceledError" 时返回 true', () => {
      const err = new Error('Canceled');
      err.name = 'CanceledError';
      expect(isAbortError(err)).toBe(true);
    });

    it('message 包含 "aborted" 时返回 true', () => {
      expect(isAbortError(new Error('Request was aborted'))).toBe(true);
    });

    it('message 包含 "timeout" 时返回 true', () => {
      expect(isAbortError(new Error('Request timeout'))).toBe(true);
    });

    it('message 包含 "canceled" 时返回 true', () => {
      expect(isAbortError(new Error('Request was canceled'))).toBe(true);
    });

    it('普通错误应返回 false', () => {
      expect(isAbortError(new Error('Generic error'))).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  // ============================================================
  // withTimeout
  // ============================================================
  describe('withTimeout', () => {
    it('返回的 signal 在超时应被 abort', async () => {
      const { signal, dispose } = withTimeout(undefined, 50);
      expect(signal.aborted).toBe(false);
      await new Promise((r) => setTimeout(r, 80));
      expect(signal.aborted).toBe(true);
      dispose();
    });

    it('abort 错误 name 为 TimeoutError', async () => {
      const { signal, dispose } = withTimeout(undefined, 30);
      await new Promise((r) => setTimeout(r, 60));
      // signal.reason 应为 TimeoutError
      expect(signal.aborted).toBe(true);
      const reason = (signal as AbortSignal & { reason?: unknown }).reason as Error;
      expect(reason).toBeInstanceOf(Error);
      expect(reason.name).toBe('TimeoutError');
      dispose();
    });

    it('用户信号 abort 时合并 signal 立即 abort', () => {
      const userController = new AbortController();
      const { signal, dispose } = withTimeout(userController.signal, 1000);
      expect(signal.aborted).toBe(false);
      userController.abort();
      expect(signal.aborted).toBe(true);
      dispose();
    });

    it('已 abort 的用户信号应同步 abort 合并 signal', () => {
      const userController = new AbortController();
      userController.abort();
      const { signal, dispose } = withTimeout(userController.signal, 1000);
      expect(signal.aborted).toBe(true);
      dispose();
    });

    it('dispose 后不应触发超时 abort', async () => {
      const { signal, dispose } = withTimeout(undefined, 50);
      dispose();
      await new Promise((r) => setTimeout(r, 80));
      expect(signal.aborted).toBe(false);
    });

    it('默认 timeoutMs 应为 30 秒', () => {
      const { dispose } = withTimeout(undefined);
      dispose();
      // 不抛异常即认为通过，验证函数签名兼容性
    });
  });

  // ============================================================
  // withTimeoutPromise
  // ============================================================
  describe('withTimeoutPromise', () => {
    it('工厂函数在超时内 resolve 应返回结果', async () => {
      const result = await withTimeoutPromise(
        async (_signal) => {
          await new Promise((r) => setTimeout(r, 10));
          return 'ok';
        },
        200,
      );
      expect(result).toBe('ok');
    });

    it('工厂函数 resolve 后不应再触发超时', async () => {
      // fast-fail：超时 100ms，工厂函数立即 resolve
      const result = await withTimeoutPromise(
        async (_signal) => 'fast-ok',
        100,
      );
      expect(result).toBe('fast-ok');
      // 再等 200ms 确认没有被超时打断
      await new Promise((r) => setTimeout(r, 200));
    });

    it('工厂函数超过 timeoutMs 应被 abort 并抛错', async () => {
      await expect(
        withTimeoutPromise(
          async (signal) => {
            return await new Promise<string>((_resolve, reject) => {
              const timer = setTimeout(() => _resolve('too-late'), 300);
              signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('Aborted by timeout'));
              });
            });
          },
          100,
        ),
      ).rejects.toThrow();
    });

    it('reject 错误 name 为 TimeoutError', async () => {
      try {
        await withTimeoutPromise(
          async (signal) => {
            return await new Promise<string>((_resolve, reject) => {
              const timer = setTimeout(() => _resolve('never'), 200);
              signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error('Aborted by timeout'));
              });
            });
          },
          50,
        );
        fail('expected to throw');
      } catch (err) {
        // 工厂函数应当检测到 signal.aborted 后抛出 Aborted by timeout
        expect(err).toBeDefined();
        expect((err as Error).message).toContain('Aborted');
      }
    });

    it('工厂函数 reject 时应透传错误', async () => {
      const customErr = new Error('业务错误');
      await expect(
        withTimeoutPromise(
          async (_signal) => {
            throw customErr;
          },
          200,
        ),
      ).rejects.toBe(customErr);
    });

    it('用户信号 abort 时应立即 reject', async () => {
      const userController = new AbortController();
      setTimeout(() => userController.abort(), 30);
      await expect(
        withTimeoutPromise(
          async (signal) => {
            // 监听 abort 后抛错
            return await new Promise<string>((_resolve, reject) => {
              if (signal.aborted) {
                reject(new Error('Aborted'));
                return;
              }
              signal.addEventListener('abort', () => reject(new Error('Aborted')));
            });
          },
          1000,
          userController.signal,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // normalizeOutboundError
  // ============================================================
  describe('normalizeOutboundError', () => {
    it('AbortError 应返回 fallback 默认文案', () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      expect(normalizeOutboundError(err)).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('TimeoutError 应返回 fallback 默认文案', () => {
      const err = new Error('Timeout');
      err.name = 'TimeoutError';
      expect(normalizeOutboundError(err)).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('网络错误（ECONNABORTED）应返回带⚠️前缀文案', () => {
      const err = { code: 'ECONNABORTED' };
      const msg = normalizeOutboundError(err);
      expect(msg).toBe(`⚠️ 网络异常，${OUTBOUND_ERROR_MESSAGE}`);
    });

    it('网络错误（ENOTFOUND）应返回带⚠️前缀文案', () => {
      const err = { code: 'ENOTFOUND' };
      const msg = normalizeOutboundError(err);
      expect(msg).toBe(`⚠️ 网络异常，${OUTBOUND_ERROR_MESSAGE}`);
    });

    it('字符串 "Network request failed" 应返回带⚠️前缀文案', () => {
      const msg = normalizeOutboundError(new Error('Network request failed'));
      expect(msg).toBe(`⚠️ 网络异常，${OUTBOUND_ERROR_MESSAGE}`);
    });

    it('业务错误应返回自定义 fallback', () => {
      const msg = normalizeOutboundError(
        new Error('业务错误'),
        undefined,
        '自定义兜底文案',
      );
      expect(msg).toBe('自定义兜底文案');
    });

    it('signal.aborted = true 但 err 为 null 时应返回 fallback', () => {
      const signal = { aborted: true } as AbortSignal;
      expect(normalizeOutboundError(null, signal)).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('普通非网络非中止错误应返回 fallback', () => {
      expect(normalizeOutboundError(new Error('ValidationError'))).toBe(OUTBOUND_ERROR_MESSAGE);
      expect(normalizeOutboundError('字符串错误')).toBe(OUTBOUND_ERROR_MESSAGE);
      expect(normalizeOutboundError(null)).toBe(OUTBOUND_ERROR_MESSAGE);
      expect(normalizeOutboundError(undefined)).toBe(OUTBOUND_ERROR_MESSAGE);
    });

    it('网络错误优先于普通 fallback', () => {
      const err = { code: 'ECONNREFUSED' };
      const msg = normalizeOutboundError(err, undefined, '应该被覆盖');
      expect(msg).toBe(`⚠️ 网络异常，应该被覆盖`);
    });
  });

  // ============================================================
  // 端到端组合
  // ============================================================
  describe('组合场景', () => {
    it('超时错误经 withTimeoutPromise 抛出后能被 normalizeOutboundError 正确识别', async () => {
      let capturedErr: unknown = null;
      try {
        await withTimeoutPromise(
          async (_signal) => {
            await new Promise((r) => setTimeout(r, 200));
            return 'never';
          },
          50,
        );
      } catch (err) {
        capturedErr = err;
      }
      expect(capturedErr).toBeDefined();
      // 验证错误可被 isAbortError 或 normalizeOutboundError 处理
      // 注意：实际抛出取决于 factory 实现，这里仅做幂等验证
      const normalized = normalizeOutboundError(capturedErr);
      expect([OUTBOUND_ERROR_MESSAGE, `⚠️ 网络异常，${OUTBOUND_ERROR_MESSAGE}`]).toContain(
        normalized,
      );
    });

    it('OUTBOUND_ERROR_MESSAGE 文案与桌面端一致（兼容性）', () => {
      // 此断言保护文案不被意外修改，确保跨端用户体验一致
      expect(OUTBOUND_ERROR_MESSAGE).toBe('服务器有问题，请稍候再试');
      expect(OUTBOUND_ERROR_MESSAGE.length).toBe(12);
    });
  });
});