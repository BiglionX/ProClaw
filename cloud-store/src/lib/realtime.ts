// ProClaw Cloud 托管版 - 实时通信工具
// 使用 Supabase Realtime 实现 WebSocket 实时通信

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export interface RealtimeMessage {
  id: string;
  contact_id: string;
  direction: 'incoming' | 'outgoing';
  content: string;
  content_type: 'text' | 'image' | 'file' | 'voice';
  file_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface RealtimeNotification {
  id: string;
  type: 'inventory_alert' | 'order_update' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface RealtimePayload<T = unknown> {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'presence' | 'broadcast';
  table: string;
  record?: T;
  old_record?: T;
  timestamp?: string;
}

// 创建实时客户端（用于客户端组件）
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getRealtimeClient() {
  if (typeof window === 'undefined') return null;
  
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase 配置缺失，无法使用实时功能');
      return null;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  
  return supabaseClient;
}

/**
 * 订阅聊天消息实时更新
 */
export function subscribeToMessages(
  userId: string,
  contactId: string,
  onMessage: (message: RealtimeMessage) => void,
  onError?: (error: Error) => void
): () => void {
  const client = getRealtimeClient();
  if (!client) {
    console.warn('Supabase 客户端不可用');
    return () => {};
  }

  const schema = getTenantSchema(userId);
  const channelName = `messages:${schema}:${contactId}`;
  
  const channel = client.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema,
        table: 'messages',
        filter: `contact_id=eq.${contactId}`,
      },
      (payload) => {
        const message = payload.new as RealtimeMessage;
        // 只处理新消息（不是自己发送的）
        if (message.direction === 'incoming') {
          onMessage(message);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema,
        table: 'messages',
        filter: `contact_id=eq.${contactId}`,
      },
      (payload) => {
        const message = payload.new as RealtimeMessage;
        // 消息已读状态更新
        if (message.is_read) {
          onMessage(message);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`已订阅消息频道: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('订阅消息频道失败'));
      }
    });

  // 返回取消订阅函数
  return () => {
    client.removeChannel(channel);
  };
}

/**
 * 订阅库存预警通知
 */
export function subscribeToInventoryAlerts(
  userId: string,
  onAlert: (alert: RealtimeNotification) => void,
  onError?: (error: Error) => void
): () => void {
  const client = getRealtimeClient();
  if (!client) {
    console.warn('Supabase 客户端不可用');
    return () => {};
  }

  const schema = getTenantSchema(userId);
  const channelName = `inventory_alerts:${schema}`;
  
  const channel = client.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema,
        table: 'inventory_alerts',
      },
      (payload) => {
        onAlert({
          id: payload.new.id,
          type: 'inventory_alert',
          title: '库存预警',
          message: payload.new.message || '库存不足',
          data: payload.new,
          created_at: payload.new.created_at,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`已订阅库存预警频道: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('订阅库存预警频道失败'));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * 订阅订单状态更新
 */
export function subscribeToOrderUpdates(
  userId: string,
  orderType: 'purchase' | 'sales',
  onUpdate: (update: { id: string; status: string; data: Record<string, unknown> }) => void,
  onError?: (error: Error) => void
): () => void {
  const client = getRealtimeClient();
  if (!client) {
    console.warn('Supabase 客户端不可用');
    return () => {};
  }

  const schema = getTenantSchema(userId);
  const tableName = orderType === 'purchase' ? 'purchase_orders' : 'sales_orders';
  const channelName = `order_updates:${schema}:${tableName}`;
  
  const channel = client.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema,
        table: tableName,
      },
      (payload) => {
        onUpdate({
          id: payload.new.id,
          status: payload.new.status,
          data: payload.new,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`已订阅订单更新频道: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('订阅订单更新频道失败'));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * 订阅在线状态（Presence）
 */
export function subscribeToPresence(
  userId: string,
  onSync: (state: Record<string, unknown>) => void,
  onJoin?: (key: string, currentState: unknown) => void,
  onLeave?: (key: string, currentState: unknown) => void
): () => void {
  const client = getRealtimeClient();
  if (!client) {
    console.warn('Supabase 客户端不可用');
    return () => {};
  }

  const channelName = `presence:${userId}`;
  
  const channel = client.channel(channelName, {
    config: {
      presence: {
        key: userId,
      },
    },
  })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onSync(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      onJoin?.(key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      onLeave?.(key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // 设置在线状态
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          status: 'online',
        });
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * 广播消息（用于实时通知）
 */
export async function broadcastMessage(
  userId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const client = getRealtimeClient();
  if (!client) return false;

  const channelName = `broadcast:${userId}`;
  const channel = client.channel(channelName);

  try {
    channel.send({
      type: 'broadcast',
      event: type,
      payload,
    });
    return true;
  } catch (error) {
    console.error('广播消息失败:', error);
    return false;
  } finally {
    client.removeChannel(channel);
  }
}

/**
 * 获取用户在线状态
 */
export async function getOnlineStatus(userId: string): Promise<boolean> {
  const client = getRealtimeClient();
  if (!client) return false;

  try {
    const channelName = `presence:${userId}`;
    const channel = client.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    await channel.subscribe();
    const state = channel.presenceState();
    
    // 清理频道
    client.removeChannel(channel);
    
    return Object.keys(state).length > 0;
  } catch (error) {
    console.error('获取在线状态失败:', error);
    return false;
  }
}

/**
 * 获取 tenant schema 名称
 */
function getTenantSchema(userId: string): string {
  const shortId = userId.replace(/-/g, '').substring(0, 8).toLowerCase();
  return `tenant_${shortId}`;
}

// 导出类型
export type { RealtimeChannel };
