/**
 * 出站连接通用工具
 *
 * 提供：
 * - OUTBOUND_ERROR_MESSAGE：统一的失败提示文案
 * - isNetworkError(err)：识别网络/DNS/连接类错误
 * - withTimeout(signal, timeoutMs)：合并用户取消信号与超时信号
 *
 * 用于所有需要向后端 LLM / 远程 API 发起的请求，避免无限等待。
 */

/** 出站连接失败时的统一提示文案 */
export const OUTBOUND_ERROR_MESSAGE = '服务器有问题，请稍候再试';

/** 默认超时（30 秒），覆盖 LLM 长上下文场景 */
export const DEFAULT_OUTBOUND_TIMEOUT_MS = 30_000;

/** 长任务超时（60 秒），用于 AI 推荐/插件商店等较慢接口 */
export const LONG_OUTBOUND_TIMEOUT_MS = 60_000;

/**
 * 识别网络 / DNS / 连接类错误
 * 兼容字符串 message 与 Error.cause.code 两种形式
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const cause = (err as { cause?: { code?: string } })?.cause;
  const code = cause?.code;
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('dns') ||
    msg.includes('name_not_resolved') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('getaddrinfo') ||
    msg.includes('eai_again') ||
    msg.includes('failed to fetch') ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ETIMEDOUT'
  );
}

/**
 * 判断是否由 AbortController / 超时触发
 */
export function isAbortError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (err instanceof Error) {
    if (err.name === 'AbortError') return true;
    if (err.name === 'TimeoutError') return true;
    if (err.message?.toLowerCase().includes('aborted')) return true;
    if (err.message?.toLowerCase().includes('timeout')) return true;
  }
  return false;
}

/**
 * 合并用户取消信号与超时信号
 *
 * 浏览器可能不支持 `AbortSignal.any` / `AbortSignal.timeout`，
 * 因此采用手 setTimeout + controller.abort() 的实现，向下兼容。
 *
 * @param userSignal 业务方传入的 AbortSignal（可空）
 * @param timeoutMs 超时毫秒数
 * @returns { signal, dispose } 调用方需在 finally 中 dispose 清理 setTimeout
 */
export function withTimeout(
  userSignal: AbortSignal | undefined,
  timeoutMs: number = DEFAULT_OUTBOUND_TIMEOUT_MS,
): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let userAbortHandler: (() => void) | null = null;

  // 透传用户取消信号
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userAbortHandler = () => controller.abort(userSignal.reason);
      userSignal.addEventListener('abort', userAbortHandler);
    }
  }

  // 启动超时定时器
  timer = setTimeout(() => {
    controller.abort(new DOMException('Outbound request timeout', 'TimeoutError'));
  }, timeoutMs);

  const dispose = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (userSignal && userAbortHandler) {
      userSignal.removeEventListener('abort', userAbortHandler);
      userAbortHandler = null;
    }
  };

  return { signal: controller.signal, dispose };
}

/**
 * 包装一个 Promise，添加超时控制
 *
 * 用法：
 *   const result = await withTimeoutPromise(
 *     () => llm.invoke(messages, { signal: userSignal }),
 *     30_000,
 *     userSignal,
 *   );
 */
export async function withTimeoutPromise<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = DEFAULT_OUTBOUND_TIMEOUT_MS,
  userSignal?: AbortSignal,
): Promise<T> {
  const { signal, dispose } = withTimeout(userSignal, timeoutMs);
  try {
    return await factory(signal);
  } finally {
    dispose();
  }
}

/**
 * 把任意错误归一化为用户友好的消息
 * 优先识别超时、网络、用户主动取消，其他情况返回 OUTBOUND_ERROR_MESSAGE
 */
export function normalizeOutboundError(
  err: unknown,
  signal?: AbortSignal,
  fallbackMessage: string = OUTBOUND_ERROR_MESSAGE,
): string {
  if (isAbortError(err, signal)) {
    // 超时或用户取消都视作出站失败
    return fallbackMessage;
  }
  if (isNetworkError(err)) {
    return `⚠️ 网络异常，${fallbackMessage}`;
  }
  return fallbackMessage;
}
