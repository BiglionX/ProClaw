import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../lib/authStore';
import { syncAITeamGroups } from '../lib/contactService';
import ChatPage from './ChatPage';

vi.mock('../lib/aiTeamChatService', () => ({
  generateGroupChatResponse: vi.fn(async () => ({
    replyContent: '收到',
    agentResponses: [],
    remainingTokens: -1,
    aborted: false,
  })),
}));

const BOSS_ID = 'boss-1';

function renderChat(contactId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/chat/${contactId}`]}>
        <Routes>
          <Route path="/chat/:contactId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function invokeCalls(command: string) {
  return vi.mocked(invoke).mock.calls.filter((call) => call[0] === command);
}

describe('ChatPage 发送身份', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'get_contacts') {
        return {
          data: [
            {
              id: 'contact-9',
              name: '库存助手',
              contact_type: 'external',
              is_active: true,
              created_at: '2026-01-01',
              updated_at: '2026-01-01',
            },
          ],
        };
      }
      if (command === 'get_messages') {
        return {
          data: [
            {
              id: 'existing-1',
              from_user: BOSS_ID,
              to_user: 'contact-9',
              content: '已有消息',
              content_type: 'text',
              is_read: true,
              created_at: 1,
            },
          ],
        };
      }
      if (command === 'send_message') {
        return {
          id: 'msg-new',
          from_user: BOSS_ID,
          to_user: 'contact-9',
          content: '今天库存怎么样',
          content_type: 'text',
          is_read: false,
          created_at: 2,
        };
      }
      return null;
    });
    useAuthStore.setState({
      user: {
        id: BOSS_ID,
        email: 'boss@example.com',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      session: null,
    });
  });

  it('单聊用登录用户 id 发给联系人，并先确保双方在 users 中', async () => {
    renderChat('contact-9');

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_messages', {
        params: { from_user: BOSS_ID, to_user: 'contact-9', limit: 50 },
      });
    });

    const input = await screen.findByPlaceholderText('输入消息...');
    fireEvent.change(input, { target: { value: '今天库存怎么样' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('send_message', {
        message: {
          from_user: BOSS_ID,
          to_user: 'contact-9',
          content: '今天库存怎么样',
          content_type: 'text',
        },
      });
    });

    const ensureCalls = invokeCalls('ensure_chat_user');
    const sendIndex = vi.mocked(invoke).mock.calls.findIndex((call) => call[0] === 'send_message');
    expect(ensureCalls.map((call) => call[1])).toEqual([
      { userId: BOSS_ID, displayName: null },
      { userId: 'contact-9', displayName: null },
    ]);
    expect(ensureCalls.every((call) => vi.mocked(invoke).mock.calls.indexOf(call) < sendIndex)).toBe(true);
  });

  it('群聊对端改为 ceo-agent，CEO 回复写给发送者', async () => {
    syncAITeamGroups([{ id: 'biz', name: '经营群' }]);
    renderChat('ai-team-group-biz');

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_messages', {
        params: { from_user: BOSS_ID, to_user: 'ceo-agent', limit: 50 },
      });
    });

    const input = await screen.findByPlaceholderText('在 AI Team 群聊中发号施令...');
    fireEvent.change(input, { target: { value: '今天库存怎么样' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('send_message', {
        message: {
          from_user: 'ceo-agent',
          to_user: BOSS_ID,
          content: '收到',
          content_type: 'text',
        },
      });
    });

    expect(invoke).toHaveBeenCalledWith('send_message', {
      message: {
        from_user: BOSS_ID,
        to_user: 'ceo-agent',
        content: '今天库存怎么样',
        content_type: 'text',
      },
    });
    expect(invoke).toHaveBeenCalledWith('ensure_chat_user', {
      userId: 'ceo-agent',
      displayName: 'CEO Agent',
    });
  });
});
