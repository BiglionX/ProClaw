/**
 * AI Team 群聊 LLM 服务
 * 通过 LLMProviderManager 统一管理体系接入大模型，CEO Agent 自动响应 Boss 消息
 */
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { estimateTokens } from './aiTools';
import { deductTokens, getTokenBalance, isDemoAccount } from './aiTeamTokenService';
import type { AITeamGroupConfig } from './contactService';
import { getLLMProviderManager } from './llmProvider';
import { getAIConfig, type AIProvider } from './aiConfig';
import {
  DEFAULT_OUTBOUND_TIMEOUT_MS,
  OUTBOUND_ERROR_MESSAGE,
  isAbortError,
  isNetworkError,
  withTimeout,
} from './fetchWithTimeout';

/** 兜底 LLM 配置（从 VITE_ 环境变量读取，用户可在 AI 设置页覆盖） */
const FALLBACK_API_KEY = import.meta.env.VITE_LLM_API_KEY as string | undefined;
const FALLBACK_API_BASE = import.meta.env.VITE_LLM_API_BASE as string | undefined;
const FALLBACK_MODEL = import.meta.env.VITE_LLM_MODEL as string | undefined;

/** 上次初始化时的 apiKey 指纹，用于检测用户是否在设置页更新了配置 */
let _lastConfigHash = '';

/** 懒加载 LLM 实例（优先使用 LLMProviderManager 体系，兜底用 DeepSeek） */
async function getLLM(): Promise<BaseChatModel> {
  const manager = getLLMProviderManager();

  // 检查是否需要重新初始化（用户可能在设置页更新了配置）
  let config = await getAIConfig();
  const configHash = JSON.stringify(config.providers.map(p => p.apiKey));
  
  if (configHash !== _lastConfigHash) {
    _lastConfigHash = configHash;

    // 注入环境变量兜底：如果所有 provider 的 apiKey 都为空，用 VITE_ env
    const hasAnyKey = config.providers.some(p => p.apiKey && p.isActive);
    if (!hasAnyKey && FALLBACK_API_KEY) {
      const fallbackProvider: AIProvider = {
        id: 'deepseek-fallback',
        name: 'DeepSeek（兜底）',
        type: 'deepseek',
        endpoint: FALLBACK_API_BASE || 'https://api.deepseek.com',
        apiKey: FALLBACK_API_KEY,
        model: FALLBACK_MODEL || 'deepseek-chat',
        isActive: true,
      };
      config = { ...config, providers: [...config.providers, fallbackProvider] };
    }

    await manager.initialize(config);
  }

  if (manager.hasAvailableProviders()) {
    return manager.getProvider('ceo_decision');
  }

  throw new Error('没有可用的 LLM 提供商。请在设置页配置 DeepSeek 或其他大模型 API。');
}

/** 聊天历史条目（简化版，供 LLM 使用） */
export interface ChatHistoryItem {
  role: 'user' | 'ceo' | 'agent' | 'system';
  name: string;
  content: string;
}

/** LLM 响应结果 */
export interface GroupChatResponse {
  replyContent: string;
  tokensUsed: number;
  remainingTokens: number;
  /** 是否被用户手动取消 */
  aborted?: boolean;
}

/**
 * 构建 system prompt
 * CEO Agent 角色设定 + 工作群上下文
 */
function buildSystemPrompt(config: AITeamGroupConfig): string {
  const memberList = Object.entries(config.members)
    .map(([_id, m]) => `- **${m.name}**（${m.role}）：${m.role}`)
    .join('\n');

  return `你是 ProClaw AI 经营系统的 **CEO Agent（主控官）**，负责在「${config.name}」工作群中协调所有 AI 成员的运作。

## 群组信息
- **团队名称**：${config.name}
- **团队描述**：${config.description}
- **Boss**：👑 Boss（最高决策者，你的老板，你需要向 TA 汇报工作进展）
- **成员列表**：
${memberList}

## 角色职责
1. 你是 Boss 和子 Agent 之间的桥梁，负责接收 Boss 的指令、分派任务、追踪进度、汇报结果
2. 用自然、专业、略带谦逊的语气与 Boss 沟通
3. 如果 Boss 询问某项工作的进展，实时反馈当前状态
4. 如果 Boss 下达新任务，分析可行性后给出执行计划
5. 涉及到多个 Agent 协作时，说明你准备如何协调

## 回复要求
1. 简短精炼，在 200 字以内
2. 如果有可执行的操作，给出具体步骤
3. 如果信息不足无法判断，请 Boss 补充细节
4. 使用中文回复`;
}

/**
 * 将聊天历史转换为 LangChain 消息格式
 */
function buildMessageHistory(history: ChatHistoryItem[], limit = 10): BaseMessage[] {
  const recent = history.slice(-limit);
  return recent.map(item => {
    switch (item.role) {
      case 'user':
        return new HumanMessage({ content: `${item.name}: ${item.content}` });
      case 'ceo':
        return new AIMessage({ content: `${item.name}: ${item.content}` });
      case 'agent':
        return new AIMessage({ content: `[${item.name}]: ${item.content}` });
      case 'system':
        return new AIMessage({ content: `[系统]: ${item.content}` });
      default:
        return new HumanMessage({ content: item.content });
    }
  });
}

/**
 * 估算 LLM 交互总 token 消耗（输入 + 预估输出）
 */
function estimateTotalTokens(inputText: string, systemPrompt: string): number {
  const totalInput = systemPrompt + inputText;
  const inputTokens = estimateTokens(totalInput);
  // 预估输出约 200 字 ≈ 300 tokens
  const estimatedOutput = 300;
  return inputTokens + estimatedOutput;
}

/**
 * 调用 LLM 生成群聊回复
 * @param userMessage - Boss 发送的消息内容
 * @param chatHistory - 最近聊天历史（用于上下文）
 * @param groupConfig - AI Team 群组配置
 * @returns LLM 响应结果
 */
export async function generateGroupChatResponse(
  userMessage: string,
  chatHistory: ChatHistoryItem[],
  groupConfig: AITeamGroupConfig,
  signal?: AbortSignal,
): Promise<GroupChatResponse> {
  const systemPrompt = buildSystemPrompt(groupConfig);
  const estimatedTokens = estimateTotalTokens(userMessage, systemPrompt);

  // 演示账号 token 校验
  if (isDemoAccount()) {
    const balance = getTokenBalance();
    if (balance <= 0) {
      return {
        replyContent: '⚠️ 您的演示 Token 余额已用完（10,000 PT）。如需继续测试，请联系我们获取更多 Token。',
        tokensUsed: 0,
        remainingTokens: 0,
      };
    }
  }

  const systemMsg = new SystemMessage({ content: systemPrompt });
  const historyMsgs = buildMessageHistory(chatHistory, 10);
  const userMsg = new HumanMessage({ content: `Boss 👑: ${userMessage}` });

  // 合并用户取消信号与 30 秒超时信号
  const { signal: timedSignal, dispose } = withTimeout(signal, DEFAULT_OUTBOUND_TIMEOUT_MS);

  try {
    const llm = await getLLM();
    const response = await llm.invoke([systemMsg, ...historyMsgs, userMsg], { signal: timedSignal });
    const replyContent = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // 扣减 token（演示账号）
    let remainingTokens = -1;
    if (isDemoAccount()) {
      // 实际消耗 = 预估输入 + response_metadata 中的输出 token（或估算）
      const outputTokens = (response.response_metadata as any)?.tokenUsage?.completionTokens
        ?? estimateTokens(replyContent);
      const totalUsed = estimateTokens(userMessage + systemPrompt) + outputTokens;
      try {
        remainingTokens = deductTokens(totalUsed);
      } catch {
        // 余额不足，但本次已生成回复，仍返回结果
        remainingTokens = Math.max(0, getTokenBalance());
      }
    }

    return {
      replyContent,
      tokensUsed: estimatedTokens,
      remainingTokens,
    };
  } catch (error: any) {
    // 用户主动取消
    if (isAbortError(error, signal) && signal?.aborted) {
      return {
        replyContent: '',
        tokensUsed: 0,
        remainingTokens: isDemoAccount() ? getTokenBalance() : -1,
        aborted: true,
      };
    }
    console.error('[AI Team Chat] LLM 调用失败:', error);
    // 出站连接失败（超时或网络）→ 统一提示
    let errorMsg = OUTBOUND_ERROR_MESSAGE;
    if (isAbortError(error)) {
      // LLM 调用超时
      errorMsg = `⏱️ ${OUTBOUND_ERROR_MESSAGE}`;
    } else if (isNetworkError(error)) {
      // 网络/DNS/连接类错误
      errorMsg = `⚠️ 无法连接到 AI 服务，${OUTBOUND_ERROR_MESSAGE}`;
    }
    return {
      replyContent: errorMsg,
      tokensUsed: 0,
      remainingTokens: isDemoAccount() ? getTokenBalance() : -1,
    };
  } finally {
    dispose();
  }
}
