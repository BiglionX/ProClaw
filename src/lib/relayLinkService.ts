/**
 * Supabase 中继链路服务（任务 #9：Supabase 中继链路）
 *
 * 桌面端 ↔ 移动端 中继服务（PRD v4.0 §3.2）
 * 1. 直连失败时启用 Supabase Realtime channel
 * 2. 离线消息暂存到 offline_tasks 表
 * 3. 桌面端在线后批量重放离线任务
 *
 * 三种模式自动切换：
 * - 直连：移动端在同一局域网
 * - 中继：直连失败，经 Supabase 转发
 * - 离线：操作暂存到队列
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ==================== 类型定义 ====================

export type ConnectionMode = 'direct' | 'relay' | 'offline';

export interface RelayMessage {
  id: string;
  channel: string;
  payload: any;
  senderId: string;
  receiverId?: string;
  timestamp: number;
}

export interface OfflineTask {
  id: string;
  taskType: 'send_message' | 'create_order' | 'sync_data' | 'heartbeat';
  targetDeviceId: string;
  payload: any;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  status: 'pending' | 'in_flight' | 'completed' | 'failed';
}

interface Subscription {
  unsubscribe: () => void;
}

// ==================== 状态管理 ====================

const STORAGE_KEY = 'proclaw:relay:offline_tasks';
const MAX_RETRY = 5;
const BASE_RETRY_DELAY = 1000; // 1 秒

let activeSubscriptions: Map<string, Subscription> = new Map();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ==================== 离线任务队列（localStorage 兜底）====================

function loadOfflineTasks(): OfflineTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineTasks(tasks: OfflineTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* ignore */
  }
}

// ==================== 中继通道 ====================

/**
 * 订阅一个 channel，接收中继消息
 */
async function subscribeChannel(
  channel: string,
  onMessage: (msg: RelayMessage) => void
): Promise<() => void> {
  if (!isSupabaseConfigured) {
    console.warn('[RelayLinkService] Supabase 未配置，无法订阅');
    return () => {};
  }

  try {
    const supabaseChannel = supabase.channel(channel);

    supabaseChannel
      .on('broadcast', { event: 'relay' }, (payload: any) => {
        try {
          const msg: RelayMessage = {
            id: payload.id || `relay-${Date.now()}-${Math.random()}`,
            channel,
            payload: payload.payload || payload,
            senderId: payload.sender_id || 'unknown',
            receiverId: payload.receiver_id,
            timestamp: payload.timestamp || Date.now(),
          };
          onMessage(msg);
        } catch (err) {
          console.error('[RelayLinkService] 消息处理错误：', err);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[RelayLinkService] 已订阅 ${channel}`);
          reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          scheduleReconnect(channel, onMessage);
        }
      });

    const unsubscribe = () => {
      supabase.removeChannel(supabaseChannel);
    };
    return unsubscribe;
  } catch (err) {
    console.error('[RelayLinkService] 订阅失败：', err);
    return () => {};
  }
}

function scheduleReconnect(channel: string, onMessage: (msg: RelayMessage) => void) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`[RelayLinkService] 超过最大重连次数 (${MAX_RECONNECT_ATTEMPTS})，停止重连`);
    return;
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);

  // 指数退避：1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, reconnectAttempts), 60000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(async () => {
    const unsub = await subscribeChannel(channel, onMessage);
    activeSubscriptions.set(channel, { unsubscribe: unsub });
  }, delay);
}

/**
 * 发布消息到 channel
 */
async function publishMessage(msg: RelayMessage): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('[RelayLinkService] Supabase 未配置，无法发布');
    return false;
  }
  try {
    const channel = supabase.channel(msg.channel);
    const result = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 5000);
      channel.send(
        {
          type: 'broadcast',
          event: 'relay',
          payload: {
            id: msg.id,
            payload: msg.payload,
            sender_id: msg.senderId,
            receiver_id: msg.receiverId,
            timestamp: msg.timestamp,
          },
        },
        (response: { error?: unknown } | null) => {
          clearTimeout(timer);
          resolve(!!response);
        }
      );
    });
    supabase.removeChannel(channel);
    return result;
  } catch (err) {
    console.error('[RelayLinkService] 发布失败：', err);
    return false;
  }
}

// ==================== 离线队列 ====================

/**
 * 添加离线任务
 */
function enqueueOfflineTask(task: Omit<OfflineTask, 'id' | 'retryCount' | 'nextRetryAt' | 'createdAt' | 'status'>): OfflineTask {
  const fullTask: OfflineTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    retryCount: 0,
    nextRetryAt: Date.now() + BASE_RETRY_DELAY,
    createdAt: Date.now(),
    status: 'pending',
  };
  const tasks = loadOfflineTasks();
  tasks.push(fullTask);
  saveOfflineTasks(tasks);
  return fullTask;
}

/**
 * 重放所有离线任务
 */
async function replayOfflineTasks(targetDeviceId?: string): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> {
  let tasks = loadOfflineTasks();
  if (targetDeviceId) {
    tasks = tasks.filter(t => t.targetDeviceId === targetDeviceId);
  }

  let success = 0;
  let failed = 0;
  const stillPending: OfflineTask[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') continue;
    if (Date.now() < task.nextRetryAt) {
      stillPending.push(task);
      continue;
    }

    try {
      // 尝试通过 Tauri 端命令重放（如有）或直接发布
      const ok = await publishMessage({
        id: task.id,
        channel: `device.${task.targetDeviceId}`,
        payload: task.payload,
        senderId: 'desktop',
        timestamp: Date.now(),
      });

      if (ok) {
        task.status = 'completed';
        success++;
      } else {
        task.retryCount++;
        if (task.retryCount >= MAX_RETRY) {
          task.status = 'failed';
          failed++;
        } else {
          task.nextRetryAt = Date.now() + BASE_RETRY_DELAY * Math.pow(2, task.retryCount);
          task.status = 'pending';
          stillPending.push(task);
        }
      }
    } catch (err) {
      console.warn('[RelayLinkService] 重放任务失败：', err);
      task.retryCount++;
      if (task.retryCount >= MAX_RETRY) {
        task.status = 'failed';
        failed++;
      } else {
        task.nextRetryAt = Date.now() + BASE_RETRY_DELAY * Math.pow(2, task.retryCount);
        stillPending.push(task);
      }
    }
  }

  saveOfflineTasks(stillPending);

  return {
    success,
    failed,
    remaining: stillPending.length,
  };
}

// ==================== 模式检测 ====================

/**
 * 检测当前连接模式
 * - 优先检测直连（局域网）
 * - 直连失败则检测 Supabase 中继
 * - 都不可用则为离线
 */
async function detectConnectionMode(
  directCheck?: () => Promise<boolean>
): Promise<ConnectionMode> {
  // 1. 检测直连
  if (directCheck) {
    try {
      const directOk = await Promise.race([
        directCheck(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
      ]);
      if (directOk) return 'direct';
    } catch {
      /* ignore */
    }
  }

  // 2. 检测 Supabase 中继
  if (isSupabaseConfigured) {
    try {
      // 简单 ping
      const { error } = await supabase.from('relay_health').select('*').limit(1);
      if (!error) return 'relay';
    } catch {
      /* ignore */
    }
  }

  return 'offline';
}

// ==================== 主 API ====================

export const relayLinkService = {
  /**
   * 启动中继监听（订阅 channel）
   */
  async start(
    channel: string,
    onMessage: (msg: RelayMessage) => void
  ): Promise<() => void> {
    // 如果已订阅，先取消
    if (activeSubscriptions.has(channel)) {
      activeSubscriptions.get(channel)!.unsubscribe();
    }

    const unsubscribe = await subscribeChannel(channel, onMessage);
    activeSubscriptions.set(channel, { unsubscribe });
    return () => {
      unsubscribe();
      activeSubscriptions.delete(channel);
    };
  },

  /**
   * 停止所有中继监听
   */
  stopAll(): void {
    activeSubscriptions.forEach(sub => sub.unsubscribe());
    activeSubscriptions.clear();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  },

  /**
   * 发送消息（自动选择中继或离线）
   */
  async send(
    targetDeviceId: string,
    payload: any,
    options?: { channel?: string; mode?: ConnectionMode }
  ): Promise<{ success: boolean; offlineQueued: boolean; mode: ConnectionMode }> {
    const channel = options?.channel || `device.${targetDeviceId}`;

    // 显式指定模式
    if (options?.mode === 'offline') {
      enqueueOfflineTask({
        taskType: 'send_message',
        targetDeviceId,
        payload,
      });
      return { success: false, offlineQueued: true, mode: 'offline' };
    }

    // 尝试中继发布
    if (isSupabaseConfigured) {
      const ok = await publishMessage({
        id: `relay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        channel,
        payload,
        senderId: 'desktop',
        receiverId: targetDeviceId,
        timestamp: Date.now(),
      });

      if (ok) {
        return { success: true, offlineQueued: false, mode: 'relay' };
      }
    }

    // 中继失败，加入离线队列
    enqueueOfflineTask({
      taskType: 'send_message',
      targetDeviceId,
      payload,
    });
    return { success: false, offlineQueued: true, mode: 'offline' };
  },

  /**
   * 检测当前连接模式
   */
  detectMode: detectConnectionMode,

  /**
   * 获取离线任务列表
   */
  getOfflineTasks(): OfflineTask[] {
    return loadOfflineTasks();
  },

  /**
   * 重放所有离线任务
   */
  async replayOffline(targetDeviceId?: string) {
    return replayOfflineTasks(targetDeviceId);
  },

  /**
   * 清空已失败的离线任务
   */
  clearFailedTasks(): number {
    const tasks = loadOfflineTasks();
    const remaining = tasks.filter(t => t.status !== 'failed');
    const cleared = tasks.length - remaining.length;
    saveOfflineTasks(remaining);
    return cleared;
  },
};

export default relayLinkService;
