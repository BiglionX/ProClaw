/**
 * CEO Agent 单聊回复。
 * 斜杠命令和确定性意图走 routeAssistantTurn；其余交给大模型。
 * 大模型不可用时仍返回一句中文说明，避免聊天气泡空白。
 */
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { routeAssistantTurn } from './assistantRouter';
import {
  getAssistantSystemPrompt,
  getBossProfile,
  submitDecisionProposal,
} from './assistantAgent';
import { getLLMForTask } from './llmProvider';
import { deductTokens, getTokenBalance, isDemoAccount } from './aiTeamTokenService';
import { estimateTokens } from './aiTools';
import {
  DEFAULT_OUTBOUND_TIMEOUT_MS,
  OUTBOUND_ERROR_MESSAGE,
  isAbortError,
  withTimeout,
} from './fetchWithTimeout';

export interface CeoChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

function assertNotAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  const err = new Error('aborted');
  err.name = 'AbortError';
  throw err;
}

function toPlainText(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

function readModelText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text?: unknown }).text ?? '');
        return '';
      })
      .join('')
      .trim();
  }
  return content == null ? '' : String(content).trim();
}

/**
 * 根据老板刚发出的一句话生成 CEO Agent 回复。
 * 用户主动取消时抛出 AbortError，调用方不应再写入气泡。
 */
export async function replyToCeoChat(
  input: string,
  options?: { signal?: AbortSignal; history?: CeoChatTurn[] },
): Promise<string> {
  const signal = options?.signal;
  assertNotAborted(signal);

  let routed: Awaited<ReturnType<typeof routeAssistantTurn>> = null;
  try {
    routed = await routeAssistantTurn(input, { secretaryName: 'CEO Agent' });
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
    return `这条指令暂时处理不了。${OUTBOUND_ERROR_MESSAGE}`;
  }
  assertNotAborted(signal);

  if (routed?.kind === 'message') {
    return toPlainText(routed.content);
  }

  if (routed?.kind === 'decision') {
    const proposal = await submitDecisionProposal(routed.proposal);
    return [
      `检测到「${proposal.intentSummary}」，这属于经营决策。`,
      `建议：${proposal.actionDescription}`,
      '已记入决策日志。可以点右上角时钟图标查看，确认或拒绝后再执行。',
    ].join('\n');
  }

  if (isDemoAccount() && getTokenBalance() <= 0) {
    return '演示 Token 已用完。上方的「任务列表」「公司目标」「今日简报」仍可使用。';
  }

  const profile = await getBossProfile().catch(() => undefined);
  const systemPrompt = getAssistantSystemPrompt('CEO Agent', profile);
  const history = (options?.history ?? []).slice(-8).filter((item) => item.content.trim());

  try {
    const llm = await getLLMForTask('ceo_decision');
    const { signal: timedSignal, dispose } = withTimeout(signal, DEFAULT_OUTBOUND_TIMEOUT_MS);
    try {
      const llmResponse = await llm.invoke(
        [
          new SystemMessage({ content: systemPrompt }),
          ...history.map((item) =>
            item.role === 'user'
              ? new HumanMessage({ content: item.content })
              : new AIMessage({ content: item.content }),
          ),
          new HumanMessage({ content: input }),
        ],
        { signal: timedSignal },
      );
      assertNotAborted(signal);

      let reply = readModelText(llmResponse.content);
      if (!reply) {
        reply = '我收到了，不过这次没有生成有效内容。可以换个说法，或先用「任务列表」「公司目标」「今日简报」。';
      }

      if (isDemoAccount()) {
        const outputTokens = (llmResponse.response_metadata as { tokenUsage?: { completionTokens?: number } } | undefined)
          ?.tokenUsage?.completionTokens ?? estimateTokens(reply);
        const totalUsed = estimateTokens(input + systemPrompt) + outputTokens;
        try {
          const remaining = deductTokens(totalUsed);
          reply += `\n\n本次消耗 ${totalUsed} PT，剩余 ${remaining} PT`;
        } catch {
          reply += `\n\nToken 余额不足（剩余 ${getTokenBalance()} PT）。`;
        }
      }

      return reply;
    } finally {
      dispose();
    }
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
    return `我这边暂时连不上大模型。${OUTBOUND_ERROR_MESSAGE}\n\n你的消息已经记下了。也可以先用「任务列表」「公司目标」或「今日简报」。`;
  }
}
