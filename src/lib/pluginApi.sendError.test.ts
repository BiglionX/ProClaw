import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import pluginApi from './pluginApi';

const auth = vi.hoisted(() => ({ user: { id: 'user-42' } as { id: string } | null }));

vi.mock('./authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: auth.user }),
  },
}));

describe('pluginApi.sendToAgent 错误可见', () => {
  beforeEach(() => {
    auth.user = { id: 'user-42' };
    vi.mocked(invoke).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('未登录时抛出未登录，不调用 send_message', async () => {
    auth.user = null;

    await expect(pluginApi.sendToAgent('ceo-agent', '你好')).rejects.toThrow('未登录');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('命令失败时抛出具体错误，不返回 null', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

    await expect(pluginApi.sendToAgent('ceo-agent', '你好')).rejects.toThrow(
      'FOREIGN KEY constraint failed',
    );
  });
});
