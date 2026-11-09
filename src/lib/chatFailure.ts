import { OUTBOUND_ERROR_MESSAGE } from './fetchWithTimeout';
import { UNCONFIGURED_MODEL_MESSAGE } from './aiTeamChatService';

export const MODEL_UNAVAILABLE_MESSAGE = '模型服务不可用';
export const NOT_LOGGED_IN_MESSAGE = '未登录';

export function visibleChatError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (!raw.trim() || raw.includes('缺少发送者') || raw.includes('未登录')) {
    return NOT_LOGGED_IN_MESSAGE;
  }
  if (raw.includes('未配置模型') || raw.includes('没有可用的 LLM')) {
    return UNCONFIGURED_MODEL_MESSAGE;
  }
  if (
    raw.includes('MODEL_NOT_FOUND') ||
    raw.includes('404') ||
    raw.includes('无法连接到 AI') ||
    raw.includes(OUTBOUND_ERROR_MESSAGE)
  ) {
    return MODEL_UNAVAILABLE_MESSAGE;
  }
  return raw;
}

export function isChatFailureText(text: string): boolean {
  return (
    text.includes('未配置模型') ||
    text.includes('未登录') ||
    text.includes(MODEL_UNAVAILABLE_MESSAGE) ||
    text.includes('没有可用的 LLM') ||
    text.includes(OUTBOUND_ERROR_MESSAGE) ||
    text.includes('无法连接到 AI') ||
    text.includes('MODEL_NOT_FOUND')
  );
}
