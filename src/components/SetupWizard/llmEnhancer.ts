/**
 * LLM 个性化扩展
 * 在关键对话节点调用 LLM 产生个性化回复，失败时回退到预设脚本
 */
import { getLLMProviderManager } from '../../lib/llmProvider';
import type { SetupContext } from './dialogueScript';

/** 需要 LLM 个性化的场景 */
export type LLMEnhancementPoint =
  | 'greeting'
  | 'company_response'
  | 'completion_summary';

/** 调用 LLM 生成个性化文本 */
export async function generatePersonalizedText(
  point: LLMEnhancementPoint,
  ctx: SetupContext
): Promise<string | null> {
  try {
    const manager = getLLMProviderManager();
    if (!manager.hasAvailableProviders()) {
      return null; // 无可用 LLM，回退到预设
    }

    const prompts: Record<LLMEnhancementPoint, string> = {
      greeting: `你是一个友好的 AI 助手 CEO Agent。请用简洁热情的语言（2-3句话）欢迎用户开始配置 ProClaw 系统。公司名称未确定。`,
      company_response: `用户为他们的公司起名为"${ctx.companyName || '未命名'}"。请用热情的语气（1-2句话）回应这个公司名，给出鼓励性评价。`,
      completion_summary: `用户的公司名为"${ctx.companyName || '未命名'}"。请总结安装完成（1-2句话），表达公司已经准备就绪。`,
    };

    const prompt = prompts[point];
    const provider = await manager.getProvider('business_insight');
    const response = await provider.invoke([
      { role: 'system', content: '你是一个友好的 CEO Agent 助手。请用简短的自然中文回复。不要使用表情符号。' },
      { role: 'user', content: prompt },
    ]);

    const text = typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? response.content.map(c => 'text' in c ? c.text : '').join('')
        : null;

    return text || null;
  } catch {
    // LLM 失败时静默回退到预设
    return null;
  }
}
