import { create } from 'zustand';

// ==================== 类型定义 ====================

export type NotificationType =
  | 'invitation_accepted'
  | 'task_completed'
  | 'task_failed'
  | 'low_stock'
  | 'system'
  | 'finance'
  | 'agent_message'
  | 'order_status';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionPath?: string;
  refId?: string;
  isRead: boolean;
  createdAt: number; // ms 时间戳
  source: string;
}

// ==================== 模拟数据模板 ====================

const MOCK_TEMPLATES: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>[] = [
  { type: 'task_completed', title: '任务完成', message: 'AI 小如已生成小红书种草文案', actionPath: '/teams', source: 'ai_agent' },
  { type: 'task_failed', title: '任务失败', message: '库存分析任务执行异常，请检查数据源', actionPath: '/teams', source: 'ai_agent' },
  { type: 'invitation_accepted', title: '邀请已接受', message: '张三已接受您的团队邀请，角色：销售专员', actionPath: '/contacts', source: 'invitation' },
  { type: 'low_stock', title: '库存预警', message: '5 个商品库存低于安全线，请及时补货', actionPath: '/inventory', source: 'inventory' },
  { type: 'system', title: '系统通知', message: '系统已自动备份今日数据', source: 'system' },
  { type: 'finance', title: '财务提醒', message: '本月应收账款到期提醒，共 3 笔', actionPath: '/supplychain', source: 'finance' },
  { type: 'agent_message', title: 'Agent 消息', message: 'CEO Agent 已完成日报生成', actionPath: '/teams', source: 'ai_agent' },
  { type: 'order_status', title: '订单更新', message: '订单 #20260606 状态变更为已发货', actionPath: '/sales', source: 'order' },
];

// ==================== 工具函数 ====================

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return `notif_${Date.now()}_${_idCounter}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== Store 类型定义 ====================

interface NotificationState {
  notifications: NotificationItem[];
  panelOpen: boolean;
  isLoading: boolean;

  // Actions
  addNotification: (item: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  fetchNotifications: () => Promise<void>;
  pushMockNotification: (type?: NotificationType) => void;
  /** 启动模拟自动推送（每 30 秒一条） */
  startMockAutoPush: () => void;
  /** 停止模拟自动推送 */
  stopMockAutoPush: () => void;
}

// ==================== Store ====================

export const useNotificationStore = create<NotificationState>((set, get) => {
  let mockInterval: ReturnType<typeof setInterval> | null = null;

  return {
    notifications: [],
    panelOpen: false,
    isLoading: false,

    // ---- Actions ----

    addNotification: (item: NotificationItem) => {
      set(state => ({
        notifications: [item, ...state.notifications].slice(0, 100),
      }));
    },

    markAsRead: (id: string) => {
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      }));
    },

    markAllAsRead: () => {
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      }));
    },

    clearAll: () => {
      set({ notifications: [] });
    },

    setPanelOpen: (open: boolean) => {
      set({ panelOpen: open });
    },

    togglePanel: () => {
      set(state => ({ panelOpen: !state.panelOpen }));
    },

    fetchNotifications: async () => {
      set({ isLoading: true });
      try {
        // Phase 1: 生成模拟历史数据
        // Phase 2: 替换为 Tauri 后端请求
        const mockItems: NotificationItem[] = [];
        const now = Date.now();
        for (let i = 0; i < 10; i++) {
          const template = MOCK_TEMPLATES[i % MOCK_TEMPLATES.length];
          // 时间分布在过去 7 天内
          const daysAgo = Math.floor(i / 2);
          const hoursAgo = randomInt(0, 23);
          mockItems.push({
            ...template,
            id: generateId(),
            createdAt: now - daysAgo * 86400000 - hoursAgo * 3600000,
            isRead: i >= 5, // 前 5 条未读，后 5 条已读
          });
        }
        set({ notifications: mockItems, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    pushMockNotification: (type?: NotificationType) => {
      const template = type
        ? MOCK_TEMPLATES.find(t => t.type === type) || MOCK_TEMPLATES[0]
        : MOCK_TEMPLATES[randomInt(0, MOCK_TEMPLATES.length - 1)];

      const item: NotificationItem = {
        ...template,
        id: generateId(),
        createdAt: Date.now(),
        isRead: false,
      };
      get().addNotification(item);
    },

    startMockAutoPush: () => {
      if (mockInterval) return;
      // 首次加载调用 fetchNotifications 初始化历史数据
      get().fetchNotifications();
      // 每 30 秒自动推送一条新通知
      mockInterval = setInterval(() => {
        get().pushMockNotification();
      }, 30000);
    },

    stopMockAutoPush: () => {
      if (mockInterval) {
        clearInterval(mockInterval);
        mockInterval = null;
      }
    },
  };
});
