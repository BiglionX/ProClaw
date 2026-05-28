/**
 * CEO Agent 对话脚本定义
 * 核心对话使用预设脚本（稳定可靠），关键节点可调用 LLM 产生个性化回复
 */

// ==================== 步骤定义 ====================

export type SetupStep =
  | 'greeting'
  | 'path'
  | 'company'
  | 'model'
  | 'completion';

// ==================== 对话引擎类型 ====================

export interface SetupContext {
  installPath?: string;
  companyName?: string;
  modelProvider?: string;
  modelPath?: string;
  totalSpaceGb?: number;
  freeSpaceGb?: number;
  appMode: 'inventory' | 'virtual_company';
}

export interface DialogueOption {
  id: string;
  label: string;
  action: 'next' | 'select' | 'confirm';
  payload?: unknown;
}

export interface DialogueNode {
  id: string;
  speaker: 'ceo' | 'user';
  text: string | ((ctx: SetupContext) => string);
  isTyping?: boolean;
  options?: DialogueOption[];
  avatar?: boolean;
}

// ==================== 预设对话脚本 ====================

export function getGreetingDialogue(ctx: SetupContext): DialogueNode[] {
  const isVirtual = ctx.appMode === 'virtual_company';
  return [
    {
      id: 'greeting-1',
      speaker: 'ceo',
      text: isVirtual
        ? '您好，老板！我是您的虚拟公司 CEO Agent。很高兴为您效劳。让我们一起把公司建立起来吧。'
        : '您好！我是 ProClaw 的智能助手。很高兴为您效劳。让我们一起完成初始配置吧。',
      avatar: true,
      isTyping: true,
    },
    {
      id: 'greeting-2',
      speaker: 'ceo',
      text: isVirtual
        ? '在开始之前，我需要了解一些基本信息，帮助我们为您打造最合适的虚拟公司。不会占用您太多时间。'
        : '首先，我们需要选择一个位置来存放您的业务数据。不用担心，整个过程非常简单。',
      avatar: false,
      isTyping: true,
      options: [
        {
          id: 'start-setup',
          label: '好的，开始吧',
          action: 'next',
        },
      ],
    },
  ];
}

export function getPathSelectionDialogue(ctx: SetupContext): DialogueNode[] {
  const freeGb = ctx.freeSpaceGb ?? 50;
  const enough = freeGb >= 1.0;

  const nodes: DialogueNode[] = [
    {
      id: 'path-1',
      speaker: 'ceo',
      text: ctx.installPath
        ? '好的，让我检查一下这个位置的可用空间。'
        : '老板，您希望把数据安装在哪个位置？请选择一个文件夹，我会为您检查可用空间。',
      avatar: true,
      isTyping: true,
    },
  ];

  if (ctx.installPath && enough) {
    nodes.push({
      id: 'path-2',
      speaker: 'ceo',
      text: `很好，这个位置有 ${freeGb.toFixed(1)} GB 可用，足够公司发展。我们就落户在这里。`,
      avatar: true,
      isTyping: true,
      options: [
        {
          id: 'path-confirm',
          label: '确认这个位置',
          action: 'confirm',
        },
      ],
    });
  } else if (ctx.installPath && !enough) {
    nodes.push({
      id: 'path-3',
      speaker: 'ceo',
      text: `这个位置空间有些紧张（${freeGb.toFixed(1)} GB 可用）。建议至少保留 1 GB 空闲。换个地方吧？`,
      avatar: true,
      isTyping: true,
    });
  }

  return nodes;
}

export function getCompanyNameDialogue(ctx: SetupContext): DialogueNode[] {
  const isVirtual = ctx.appMode === 'virtual_company';
  return [
    {
      id: 'company-1',
      speaker: 'ceo',
      text: isVirtual
        ? '数据位置已经确定了！现在，请给我们虚拟公司取个名字吧（可以是真实公司名或任何您喜欢的名字）。'
        : '很好！现在请给您的企业取个名字（可以随时在设置中修改）。',
      avatar: true,
      isTyping: true,
    },
    ...(ctx.companyName
      ? [
          {
            id: 'company-2',
            speaker: 'ceo' as const,
            text: (ctx: SetupContext) => {
              const name = ctx.companyName || '';
              return `"${name}"，寓意深远，是个好名字！公司注册成功。`;
            },
            avatar: true as const,
            isTyping: true as const,
            options: [
              {
                id: 'company-confirm',
                label: '确认',
                action: 'confirm' as const,
              },
            ],
          },
        ]
      : []),
  ];
}

export function getModelConfigDialogue(_ctx: SetupContext): DialogueNode[] {
  return [
    {
      id: 'model-1',
      speaker: 'ceo',
      text: '为了增强公司的 AI 能力，下面需要配置大模型。如果现在不设置，也可以先直接使用 Pro Cloud 提供的自选大模型，以后再设置也可以。请选择：',
      avatar: true,
      isTyping: true,
      options: [
        {
          id: 'model-procloud',
          label: '使用 Pro Cloud 模型（推荐，无需配置）',
          action: 'select',
          payload: { provider: 'procloud' },
        },
        {
          id: 'model-local',
          label: '本地部署模型（需要已有 Ollama/llama.cpp）',
          action: 'select',
          payload: { provider: 'local' },
        },
      ],
    },
  ];
}

export function getProCloudConfirmDialogue(): DialogueNode[] {
  return [
    {
      id: 'model-procloud-1',
      speaker: 'ceo',
      text: '已选择 Pro Cloud 模型。后续 AI 功能将默认使用云端 API，您可以随时在设置中切换。',
      avatar: true,
      isTyping: true,
      options: [
        {
          id: 'model-procloud-confirm',
          label: '确认',
          action: 'confirm',
        },
      ],
    },
  ];
}

export function getCompletionDialogue(ctx: SetupContext): DialogueNode[] {
  const isVirtual = ctx.appMode === 'virtual_company';
  return [
    {
      id: 'completion-1',
      speaker: 'ceo',
      text: isVirtual
        ? '老板，一切就绪！虚拟公司已启动。您可以在聊天窗口随时找到我。现在，让我们开始工作吧！'
        : '一切就绪！ProClaw 已完成初始化配置。您可以在聊天窗口找到我，随时为您提供帮助。',
      avatar: true,
      isTyping: true,
      options: [
        {
          id: 'enter-workspace',
          label: '进入工作区',
          action: 'confirm',
        },
      ],
    },
  ];
}

export function getLocalModelConfigDialogue(_ctx: SetupContext): DialogueNode[] {
  return [
    {
      id: 'model-local-1',
      speaker: 'ceo',
      text: '请指定 Ollama 或 llama.cpp 的地址或可执行文件路径。默认为 http://localhost:11434（Ollama 默认端口）。',
      avatar: true,
      isTyping: true,
    },
  ];
}

export function getModelTestResultDialogue(success: boolean, message: string): DialogueNode[] {
  return [
    {
      id: 'model-test-result',
      speaker: 'ceo',
      text: success
        ? '大模型已就绪！连接测试通过。'
        : `连接测试未通过：${message}。请检查路径后重试，或切换到 Pro Cloud 模式。`,
      avatar: true,
      isTyping: true,
      options: success
        ? [
            {
              id: 'model-test-success',
              label: '确认使用此配置',
              action: 'confirm',
            },
          ]
        : [
            {
              id: 'model-test-retry',
              label: '重新配置',
              action: 'select',
              payload: { provider: 'local' },
            },
            {
              id: 'model-test-switch',
              label: '改用 Pro Cloud',
              action: 'select',
              payload: { provider: 'procloud' },
            },
          ],
    },
  ];
}

export function getErrorDialogue(errorMsg: string): DialogueNode[] {
  return [
    {
      id: 'error',
      speaker: 'ceo',
      text: `抱歉，遇到了一个小问题：${errorMsg}。别担心，我们重新来一次。`,
      avatar: true,
      isTyping: true,
      options: [
        {
          id: 'error-retry',
          label: '重试',
          action: 'next',
        },
      ],
    },
  ];
}
