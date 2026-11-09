import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateGroupChatResponse } from './aiTeamChatService';
import type { AITeamGroupConfig } from './contactService';

const GROUP: AITeamGroupConfig = {
  id: 'ai-team-group-biz',
  teamId: 'biz',
  name: '经营团队',
  icon: 'brain',
  description: '验证',
  color: '#ff6d00',
  members: {
    'ceo-agent': { name: 'CEO Agent', avatar: 'ceo', role: '主控官' },
  },
};

describe('CEO 群聊未配置模型', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('出厂默认空 key 不请求默认端点，并返回未配置模型', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('不应该发请求'));

    const result = await generateGroupChatResponse('今天库存怎么样', [], GROUP);

    expect(result.replyContent).toContain('未配置模型');
    expect(result.replyContent).not.toContain('服务器有问题');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('全部提供商关闭时返回未配置模型', async () => {
    localStorage.setItem(
      'proclaw-ai-config',
      JSON.stringify({
        defaultProvider: 'deepseek',
        temperature: 0.2,
        maxTokens: 200,
        providers: [
          {
            id: 'deepseek',
            name: 'DeepSeek',
            type: 'deepseek',
            endpoint: 'https://api.deepseek.com',
            apiKey: '',
            model: 'deepseek-chat',
            isActive: false,
          },
          {
            id: 'default-service',
            name: 'ProClaw 集成 LLM（默认）',
            type: 'default',
            endpoint: 'https://ai.proclaw.cc/api/v1',
            apiKey: '',
            model: 'proclaw-gpt-4',
            isActive: false,
          },
        ],
      }),
    );

    const result = await generateGroupChatResponse('今天库存怎么样', [], GROUP);

    expect(result.replyContent).toContain('未配置模型');
    expect(result.replyContent).not.toContain('服务器有问题');
  });
});
