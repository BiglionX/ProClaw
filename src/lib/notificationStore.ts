import { create } from 'zustand';
import { sendDesktopNotification, updateTrayTooltip, buildTrayTooltip } from './trayService';
import { desktopWsService } from '../services/WebSocketService';

// ==================== 类型定义 ====================

export type NotificationType =
  | 'invitation_accepted'
  | 'task_completed'
  | 'task_failed'
  | 'low_stock'
  | 'system'
  | 'finance'
  | 'agent_message'
  | 'order_status'
  | 'inventory_low_confidence' // 库存低置信度（PRD v12.0）
  | 'inventory_negative_aging' // 库存负库存老化（PRD v12.0）
  | 'inventory_calibration';   // 库存校准提醒（PRD v12.0）

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
  // PRD v12.0 灵活库存通知
  { type: 'inventory_low_confidence', title: '库存置信度低', message: 'iPhone 14 电池 15 天未校准，建议微盘点', actionPath: '/inventory', source: 'inventory' },
  { type: 'inventory_negative_aging', title: '负库存超期未冲销', message: '小米充电宝 库存 -3 已 5 天，建议立即进货冲销', actionPath: '/inventory', source: 'inventory' },
  { type: 'inventory_calibration', title: '建议微盘点', message: '销售/进货已完成，是否进行一次快速盘点？', actionPath: '/inventory', source: 'inventory' },
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
  /** 启动 WebSocket 实时推送监听 */
  startWebSocketListener: () => void;
  /** 停止 WebSocket 监听 */
  stopWebSocketListener: () => void;
}

// ==================== Store ====================

export const useNotificationStore = create<NotificationState>((set, get) => {
  let mockInterval: ReturnType<typeof setInterval> | null = null;
  // WebSocket 订阅取消函数
  let wsUnsubscribers: (() => void)[] = [];

  // ==================== WebSocket 消息转换 ====================

  /** 将 WebSocket 消息转换为 NotificationItem */
  function convertWsMessageToNotification(msg: any): NotificationItem | null {
    const now = Date.now();

    switch (msg.type) {
      case 'employee_invitation_accepted':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'invitation_accepted',
          title: '邀请已接受',
          message: `${msg.user_name || '新成员'}已接受您的团队邀请`,
          actionPath: '/contacts',
          refId: msg.invitation_id,
          isRead: false,
          createdAt: now,
          source: 'invitation',
        };

      case 'task_completed':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'task_completed',
          title: '任务完成',
          message: msg.message || 'AI 任务已完成',
          actionPath: '/teams',
          refId: msg.task_id,
          isRead: false,
          createdAt: now,
          source: 'ai_agent',
        };

      case 'task_failed':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'task_failed',
          title: '任务失败',
          message: msg.message || 'AI 任务执行失败',
          actionPath: '/teams',
          refId: msg.task_id,
          isRead: false,
          createdAt: now,
          source: 'ai_agent',
        };

      case 'low_stock_alert':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'low_stock',
          title: '库存预警',
          message: msg.message || '商品库存低于安全线',
          actionPath: '/inventory',
          refId: msg.product_id,
          isRead: false,
          createdAt: now,
          source: 'inventory',
        };

      case 'system_notification':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'system',
          title: msg.title || '系统通知',
          message: msg.message || '',
          actionPath: undefined,
          refId: undefined,
          isRead: false,
          createdAt: now,
          source: 'system',
        };

      case 'order_status_changed':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'order_status',
          title: '订单更新',
          message: msg.message || `订单状态变更为 ${msg.status || '未知'}`,
          actionPath: '/sales',
          refId: msg.order_id,
          isRead: false,
          createdAt: now,
          source: 'order',
        };

      // PRD v12.0 灵活库存通知类型
      case 'inventory_low_confidence':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'inventory_low_confidence',
          title: msg.title || '库存置信度低',
          message: msg.message || '该商品长期未校准，库存数据可能不准确',
          actionPath: '/inventory',
          refId: msg.product_id,
          isRead: false,
          createdAt: now,
          source: 'inventory',
        };

      case 'inventory_negative_aging':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'inventory_negative_aging',
          title: msg.title || '负库存超期未冲销',
          message: msg.message || '该商品库存已为负且超过 3 天未处理',
          actionPath: '/inventory',
          refId: msg.product_id,
          isRead: false,
          createdAt: now,
          source: 'inventory',
        };

      case 'inventory_calibration':
        return {
          id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'inventory_calibration',
          title: msg.title || '建议微盘点',
          message: msg.message || '销售/进货已完成，建议进行一次快速盘点',
          actionPath: '/inventory',
          refId: msg.product_id,
          isRead: false,
          createdAt: now,
          source: 'inventory',
        };

      default:
        // 通用的通知类型
        if (msg.notification_type) {
          return {
            id: `notif_${now}_${Math.random().toString(36).slice(2, 8)}`,
            type: (msg.notification_type as NotificationType) || 'system',
            title: msg.title || '新通知',
            message: msg.message || '',
            actionPath: msg.action_path,
            refId: msg.ref_id,
            isRead: false,
            createdAt: now,
            source: msg.source || 'system',
          };
        }
        return null;
    }
  }

  return {
    notifications: [],
    panelOpen: false,
    isLoading: false,

    // ---- Actions ----

    addNotification: (item: NotificationItem) => {
      set(state => ({
        notifications: [item, ...state.notifications].slice(0, 100),
      }));

      // 未读消息：同步系统托盘（OS 通知 + tooltip 未读数）
      if (!item.isRead) {
        const next = [item, ...get().notifications].slice(0, 100);
        const unread = next.filter(n => !n.isRead).length;
        sendDesktopNotification(item.title, item.message).catch(() => {});
        updateTrayTooltip(buildTrayTooltip(unread)).catch(() => {});
      }
    },

    markAsRead: (id: string) => {
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      }));
      // 同步托盘 tooltip 未读数
      const unread = get().notifications.filter(n => !n.isRead).length;
      updateTrayTooltip(buildTrayTooltip(unread)).catch(() => {});
    },

    markAllAsRead: () => {
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      }));
      // 全部已读：重置托盘 tooltip
      updateTrayTooltip(buildTrayTooltip(0)).catch(() => {});
    },

    clearAll: () => {
      set({ notifications: [] });
      // 清空后重置托盘 tooltip
      updateTrayTooltip(buildTrayTooltip(0)).catch(() => {});
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

    // ---- WebSocket 实时推送 ----

    startWebSocketListener: () => {
      // 避免重复订阅
      if (wsUnsubscribers.length > 0) return;

      // 订阅所有通知类型的 WebSocket 消息
      const handleNotification = (_type: string, data: any) => {
        const notification = convertWsMessageToNotification(data);
        if (notification) {
          get().addNotification(notification);
        }
      };

      // 订阅已知的通知类型
      wsUnsubscribers.push(
        desktopWsService.on('employee_invitation_accepted', handleNotification),
        desktopWsService.on('task_completed', handleNotification),
        desktopWsService.on('task_failed', handleNotification),
        desktopWsService.on('low_stock_alert', handleNotification),
        desktopWsService.on('system_notification', handleNotification),
        desktopWsService.on('order_status_changed', handleNotification),
        desktopWsService.on('notification', handleNotification),
        // 通配符订阅（兜底）
        desktopWsService.on('*', handleNotification)
      );
    },

    stopWebSocketListener: () => {
      // 取消所有订阅
      wsUnsubscribers.forEach(unsub => unsub());
      wsUnsubscribers = [];
    },
  };
});
