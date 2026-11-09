import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import pluginApi from './pluginApi';
import { agentRuntime, type QuickAction } from './agentRuntime';

vi.mock('./authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 'user-42' } }),
  },
}));

describe('send_message 参数形状', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue({ id: 'msg-1' });
  });

  it('pluginApi.sendToAgent 把接收者放进 message.to_user', async () => {
    await pluginApi.sendToAgent('agent-1', 'hello');

    expect(invoke).toHaveBeenCalledWith('send_message', {
      message: {
        from_user: 'user-42',
        to_user: 'agent-1',
        content: 'hello',
      },
    });
  });

  it('triggerQuickAction 把接收者放进 message.to_user', async () => {
    const action: QuickAction = {
      id: 'act-1',
      label: '打招呼',
      context: 'chat',
      triggerMessage: 'do it',
    };
    agentRuntime.registerQuickActions('agent-2', [action]);

    await agentRuntime.triggerQuickAction('agent-2', 'act-1');

    expect(invoke).toHaveBeenCalledWith('send_message', {
      message: {
        from_user: 'user-42',
        to_user: 'agent-2',
        content: 'do it',
      },
    });
  });

  it('Agent sendMessage 用调用方 agentId 作为 message.from_user', async () => {
    await (agentRuntime as unknown as {
      handleMessage: (instance: { id: string }, event: { data: unknown }) => Promise<void>;
    }).handleMessage(
      { id: 'agent-sender' },
      {
        data: {
          type: 'proclaw_request',
          id: 'req-1',
          method: 'sendMessage',
          params: ['agent-dest', 'ping'],
        },
      },
    );

    expect(invoke).toHaveBeenCalledWith('send_message', {
      message: {
        from_user: 'agent-sender',
        to_user: 'agent-dest',
        content: 'ping',
      },
    });
  });
});
