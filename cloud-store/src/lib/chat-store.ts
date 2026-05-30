// ProClaw Cloud 托管版 - 聊天状态管理 (Zustand)
// 基于 Supabase Realtime 实现实时消息

import { create } from 'zustand';
import { getSupabaseClient, type Session } from './supabase';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar_url: string;
  notes: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  contact_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  content_type: 'text' | 'image' | 'file';
  file_url: string;
  is_read: boolean;
  created_at: string;
}

const PAGE_SIZE = 50;

interface ChatPagination {
  page: number;
  hasMore: boolean;
}

interface ChatState {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  activeContactId: string | null;
  loadingContacts: boolean;
  loadingMessages: boolean;
  loadingMore: boolean;
  pagination: Record<string, ChatPagination>;

  fetchContacts: () => Promise<void>;
  fetchMessages: (contactId: string) => Promise<void>;
  loadMoreMessages: (contactId: string) => Promise<void>;
  sendMessage: (contactId: string, content: string, contentType?: 'text' | 'image' | 'file', fileUrl?: string) => Promise<boolean>;
  setActiveContact: (contactId: string | null) => void;
  subscribeToMessages: (contactId: string) => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  messages: {},
  activeContactId: null,
  loadingContacts: false,
  loadingMessages: false,
  loadingMore: false,
  pagination: {},

  fetchContacts: async () => {
    set({ loadingContacts: true });
    try {
      // 获取当前用户的 tenant schema
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/contacts');
      const result = await res.json();
      if (result.data) {
        set({ contacts: result.data, loadingContacts: false });
      }
    } catch (err) {
      console.error('获取联系人失败:', err);
      set({ loadingContacts: false });
    }
  },

  fetchMessages: async (contactId: string) => {
    set({ loadingMessages: true });
    try {
      const res = await fetch(`/api/chat?contactId=${contactId}&page=1`);
      const result = await res.json();
      if (result.data) {
        set(state => ({
          messages: { ...state.messages, [contactId]: result.data },
          pagination: {
            ...state.pagination,
            [contactId]: { page: 1, hasMore: (result.total || 0) > PAGE_SIZE },
          },
          loadingMessages: false,
        }));
      } else {
        set({ loadingMessages: false });
      }
    } catch (err) {
      console.error('获取消息失败:', err);
      set({ loadingMessages: false });
    }
  },

  loadMoreMessages: async (contactId: string) => {
    const { pagination, loadingMore } = get();
    const p = pagination[contactId];
    if (loadingMore || !p?.hasMore) return;

    set({ loadingMore: true });
    try {
      const nextPage = (p?.page || 1) + 1;
      const res = await fetch(`/api/chat?contactId=${contactId}&page=${nextPage}`);
      const result = await res.json();
      if (result.data) {
        set(state => ({
          messages: {
            ...state.messages,
            [contactId]: [...result.data.reverse(), ...(state.messages[contactId] || [])],
          },
          pagination: {
            ...state.pagination,
            [contactId]: {
              page: nextPage,
              hasMore: (result.total || 0) > nextPage * PAGE_SIZE,
            },
          },
          loadingMore: false,
        }));
      } else {
        set({ loadingMore: false });
      }
    } catch (err) {
      console.error('加载更多消息失败:', err);
      set({ loadingMore: false });
    }
  },

  sendMessage: async (contactId: string, content: string, contentType: 'text' | 'image' | 'file' = 'text', fileUrl = '') => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, content, contentType, fileUrl }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const newMsg = result.data;
        set(state => ({
          messages: {
            ...state.messages,
            [contactId]: [...(state.messages[contactId] || []), newMsg],
          },
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setActiveContact: (contactId: string | null) => {
    set({ activeContactId: contactId });
    if (contactId) {
      get().fetchMessages(contactId);
    }
  },

  subscribeToMessages: (contactId: string) => {
    // 使用 Supabase Realtime 订阅
    // 创建 channel 引用，在异步获取 session 后赋值
    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (cancelled) return; // 组件已卸载，不再创建订阅
      const session = data?.session;
      if (!session) return;
      const schema = `tenant_${session.user.id.replace(/-/g, '').substring(0, 8).toLowerCase()}`;
      channel = supabase
        .channel(`messages:${contactId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema,
            table: 'messages',
            filter: `contact_id=eq.${contactId}`,
          },
          (payload: { new: Message }) => {
            const newMsg = payload.new;
            set(state => ({
              messages: {
                ...state.messages,
                [contactId]: [...(state.messages[contactId] || []), newMsg],
              },
            }));
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  },
}));
