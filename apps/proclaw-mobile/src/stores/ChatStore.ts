/**
 * ChatStore - 消息会话状态管理 (Zustand)
 * PRD v11.2 Phase 2: 统一消息状态，消除各组件各自 useState 导致的数据不一致。
 *
 * 职责：
 * - 缓存会话列表（跨 MessagesTab / ChatDetail 共享）
 * - 提供 loadSessions / refreshSessions 方法
 * - 外部组件发送消息后调用 refreshSessions 即可让 MessagesTab 自动更新
 */
import { create } from 'zustand';
import {
  getSessions,
  markRead,
  type ChatSession,
} from '../services/ChatService';

export interface ChatStoreState {
  /** 会话列表缓存 */
  sessions: ChatSession[];
  /** 是否正在加载 */
  loading: boolean;

  /** 从 DB 全量加载会话列表 */
  loadSessions: () => Promise<void>;
  /** 强制刷新会话列表（发送消息后调用） */
  refreshSessions: () => Promise<void>;
  /** 标记某会话已读（同步更新 store） */
  markSessionRead: (sessionId: string) => Promise<void>;
  /** 切换会话已读/未读（同步更新 store） */
  toggleSessionRead: (sessionId: string, targetUnread: number) => Promise<void>;
  /** 重置状态（切换身份时调用） */
  reset: () => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  sessions: [],
  loading: false,

  loadSessions: async () => {
    const { loading } = get();
    if (loading) return;
    set({ loading: true });
    try {
      const data = await getSessions();
      set({ sessions: data, loading: false });
    } catch {
      set({ sessions: [], loading: false });
    }
  },

  refreshSessions: async () => {
    // 审计 C3：添加 loading 防重入，避免与 loadSessions 并行查询互相覆盖
    const { loading } = get();
    if (loading) return;
    set({ loading: true });
    try {
      const data = await getSessions();
      set({ sessions: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markSessionRead: async (sessionId: string) => {
    await markRead(sessionId);
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, unread_count: 0 } : s
      ),
    }));
  },

  toggleSessionRead: async (sessionId: string, targetUnread: number) => {
    const { getDatabase } = require('../services/DatabaseFactory');
    const db = getDatabase();
    await db.runAsync('UPDATE chat_sessions SET unread_count = ? WHERE id = ?', [targetUnread, sessionId]);
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, unread_count: targetUnread } : s
      ),
    }));
  },

  reset: () => {
    set({ sessions: [], loading: false });
  },
}));
