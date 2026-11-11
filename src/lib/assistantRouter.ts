import { handleUserInput } from './aiGuide';
import {
  classifyAssistantIntent,
  dispatchAssistantTask,
  handleAssistantCommand,
  handleVirtualCompanyIntent,
  recordAssistantGoal,
  type DecisionProposal,
} from './assistantAgent';
import { executeCommand, parseCommand } from './commandParser';
import { saveUnrecognizedCommand } from './unrecognizedCommandService';
import { buildOperatingBriefing } from './secretaryBriefing';

export type AssistantRoute =
  | { kind: 'message'; content: string }
  | { kind: 'decision'; proposal: DecisionProposal };

function reportTypeFromText(text: string): 'daily' | 'weekly' | 'monthly' {
  if (/周报|本周/.test(text)) return 'weekly';
  if (/月报|本月/.test(text)) return 'monthly';
  return 'daily';
}

/**
 * 确定性指令路由。命中就返回；返回 null 才交给大模型或 Light 问答。
 * 顺序：斜杠命令 → 指令目录 → 决策/任务/目标/报告/虚拟公司 → 引导教程。
 */
export async function routeAssistantTurn(
  input: string,
  options?: { secretaryName?: string },
): Promise<AssistantRoute | null> {
  const text = input.trim();
  if (!text) return null;

  const secretaryName = options?.secretaryName || '小如';

  const slash = await handleAssistantCommand(text, secretaryName);
  if (slash) {
    return { kind: 'message', content: slash };
  }

  const command = parseCommand(text, { recordUnknown: false });
  if (command.action !== 'unknown') {
    const content = await executeCommand(command);
    return { kind: 'message', content };
  }

  const intent = classifyAssistantIntent(text);
  if (intent.type === 'decision') {
    return { kind: 'decision', proposal: intent.proposal };
  }
  if (intent.type === 'task') {
    return { kind: 'message', content: await dispatchAssistantTask(text) };
  }
  if (intent.type === 'context') {
    return { kind: 'message', content: await recordAssistantGoal(text) };
  }
  if (intent.type === 'report') {
    const content = await buildOperatingBriefing(secretaryName, reportTypeFromText(text));
    return { kind: 'message', content };
  }
  if (intent.type === 'virtual_company') {
    return { kind: 'message', content: await handleVirtualCompanyIntent(intent.target) };
  }

  const guide = await handleUserInput(text);
  if (guide.response) {
    return { kind: 'message', content: guide.response };
  }

  saveUnrecognizedCommand(text, {
    context: {
      currentPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  });
  return null;
}
