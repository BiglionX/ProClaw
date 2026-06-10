import { logger } from '../utils/logger';
// WebSocket 服务 - 管理后端连接和通话信令
// v4.1: 音视频通话信令处理

type MessageHandler = (type: string, data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private userId: string = '';
  private token: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private isIntentionalDisconnect: boolean = false; // 审计 H5：区分主动/被动断开
  private reconnectAttempts: number = 0; // 审计 E10：指数退避计数器
  private onStatusChange: ((connected: boolean) => void) | null = null;

  /** 连接到 WebSocket 服务器 */
  async connect(serverUrl: string, userId: string, token: string): Promise<void> {
    // 审计 D4：显式 HTTP→WS/HTTPS→WSS 映射
    this.url = serverUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://') + '/ws/chat';
    this.userId = userId;
    this.token = token;
    this.isIntentionalDisconnect = false;
    this.reconnectAttempts = 0;

    await this.doConnect();
  }

  private async doConnect(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;

    try {
      // 审计 S7：Token 不再通过 URL 传递，改为连接后首条消息发送
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.log('[WS] Connected');
        this.isConnected = true;
        this.isConnecting = false;
        // 通过首条消息发送认证信息（审计 S7）
        this.ws!.send(JSON.stringify({ type: 'auth', user_id: this.userId, token: this.token }));
        this.startHeartbeat();
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type || 'unknown';
          this.dispatchMessage(type, msg);
        } catch {
          // Non-JSON message (e.g., "pong")
          if (event.data === 'pong') {
            this.dispatchMessage('pong', {});
          }
        }
      };

      this.ws.onclose = () => {
        logger.log('[WS] Disconnected');
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.onStatusChange?.(false);
        // 审计 H5：主动断开不触发重连
        if (!this.isIntentionalDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        logger.error('[WS] Error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      logger.error('[WS] Connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // 审计 E10：指数退避重连（基础 1s，最大 30s，抖动 ±25%）
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = baseDelay * (0.75 + Math.random() * 0.5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.doConnect();
    }, jitter);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendRaw('ping');
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private dispatchMessage(type: string, data: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(type, data);
        } catch (e) {
          logger.error(`[WS] Handler error for ${type}:`, e);
        }
      });
    }
    // Also dispatch to wildcard handlers
    const wildcards = this.messageHandlers.get('*');
    if (wildcards) {
      wildcards.forEach((handler) => {
        try {
          handler(type, data);
        } catch (e) {
          logger.error('[WS] Wildcard handler error:', e);
        }
      });
    }
  }

  /** 发送 JSON 消息 */
  send(type: string, payload?: any, toUserId?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[WS] Cannot send, not connected');
      return false;
    }
    const msg: any = { type };
    if (payload) msg.payload = payload;
    if (toUserId) msg.to = toUserId;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  /** 发送原始文本 */
  sendRaw(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(text);
    }
  }

  /** 注册消息处理器 */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /** 设置连接状态回调 */
  setStatusCallback(callback: (connected: boolean) => void) {
    this.onStatusChange = callback;
  }

  /** 断开连接 */
  disconnect() {
    this.isIntentionalDisconnect = true; // 审计 H5：标记为主动断开
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  /** 是否已连接 */
  get connected(): boolean {
    return this.isConnected;
  }

  /** 获取当前用户ID */
  get currentUserId(): string {
    return this.userId;
  }
}

// 单例
export const wsService = new WebSocketService();
export default wsService;
