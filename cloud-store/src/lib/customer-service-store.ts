// ProClaw Cloud 托管版 - AI 客服状态管理（Zustand Store）

import { create } from 'zustand';

// ===== 类型定义 =====

export interface CSMessage {
  id: string;
  role: 'customer' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'knowledge_base' | 'model' | 'manual';
}

export interface CSSettings {
  is_enabled: boolean;
  auto_greeting: string;
  transfer_mode: 'direct' | 'ai_judged';
  avatar_url: string | null;
  agent_name: string;
  business_hours: Record<string, unknown> | null;
}

interface CSState {
  // 状态
  messages: CSMessage[];
  sessionId: string | null;
  customerId: string;
  customerName: string;
  isOpen: boolean;
  unreadCount: number;
  isLoading: boolean;
  isTransferring: boolean;
  settings: CSSettings | null;
  tenantId: string | null;

  // 方法
  initialize: (tenantId: string) => Promise<void>;
  setCustomerInfo: (name: string) => void;
  sendMessage: (message: string) => Promise<void>;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  clearMessages: () => void;
  addTransferReply: (reply: string) => void;
}

function generateId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function getOrCreateCustomerId(): string {
  if (typeof window === 'undefined') return '';
  let cid = localStorage.getItem('cs_customer_id');
  if (!cid) {
    cid = `guest_${generateId()}`;
    localStorage.setItem('cs_customer_id', cid);
  }
  return cid;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('cs_session_id');
  if (!sid) {
    sid = generateId();
    sessionStorage.setItem('cs_session_id', sid);
  }
  return sid;
}

export const useCustomerServiceStore = create<CSState>((set, get) => ({
  // 初始状态
  messages: [],
  sessionId: null,
  customerId: '',
  customerName: '',
  isOpen: false,
  unreadCount: 0,
  isLoading: false,
  isTransferring: false,
  settings: null,
  tenantId: null,

  initialize: async (tenantId: string) => {
    const customerId = getOrCreateCustomerId();
    const sessionId = getOrCreateSessionId();

    set({ tenantId, customerId, sessionId });

    // 加载客服设置
    try {
      const res = await fetch(`/api/customer-service/settings?tenant_id=${tenantId}`);
      const result = await res.json();
      if (result.success && result.data) {
        set({ settings: result.data as CSSettings });

        // 添加欢迎消息
        const greeting = (result.data as CSSettings).auto_greeting || '您好，我是客服小如，请问有什么可以帮您？';
        set({
          messages: [{
            id: 'welcome',
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString(),
            source: 'model',
          }],
        });
      }
    } catch (err) {
      console.error('加载客服设置失败:', err);
      // 默认欢迎语
      set({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          content: '您好，我是客服小如，请问有什么可以帮您？',
          timestamp: new Date().toISOString(),
          source: 'model',
        }],
      });
    }
  },

  setCustomerInfo: (name: string) => {
    set({ customerName: name });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cs_customer_name', name);
    }
  },

  sendMessage: async (message: string) => {
    const { tenantId, sessionId, customerId, customerName } = get();

    if (!tenantId || !sessionId) return;

    const userMessage: CSMessage = {
      id: generateId(),
      role: 'customer',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set(state => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const res = await fetch(`/api/customer-service/chat?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message,
          customer_id: customerId,
          customer_name: customerName || undefined,
        }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        const reply: CSMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.data.reply,
          timestamp: result.data.timestamp || new Date().toISOString(),
          source: result.data.source,
        };

        set(state => ({
          messages: [...state.messages, reply],
          isLoading: false,
          isTransferring: result.data.needs_transfer || false,
        }));
      } else {
        // 错误回复
        const errorReply: CSMessage = {
          id: generateId(),
          role: 'assistant',
          content: '抱歉，我暂时无法回复，请稍后再试。',
          timestamp: new Date().toISOString(),
          source: 'model',
        };
        set(state => ({
          messages: [...state.messages, errorReply],
          isLoading: false,
        }));
      }
    } catch {
      const errorReply: CSMessage = {
        id: generateId(),
        role: 'assistant',
        content: '网络连接失败，请检查网络后重试。',
        timestamp: new Date().toISOString(),
        source: 'model',
      };
      set(state => ({
        messages: [...state.messages, errorReply],
        isLoading: false,
      }));
    }
  },

  toggleOpen: () => {
    set(state => ({
      isOpen: !state.isOpen,
      unreadCount: 0,
    }));
  },

  setOpen: (open: boolean) => {
    set({
      isOpen: open,
      unreadCount: 0,
    });
  },

  clearMessages: () => {
    set({
      messages: [],
      isTransferring: false,
    });
    // 生成新会话
    const newSessionId = generateId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cs_session_id', newSessionId);
    }
    set({ sessionId: newSessionId });
  },

  addTransferReply: (reply: string) => {
    const replyMsg: CSMessage = {
      id: generateId(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      source: 'manual',
    };
    set(state => ({
      messages: [...state.messages, replyMsg],
      isTransferring: false,
    }));
  },
}));
