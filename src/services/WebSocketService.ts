// WebSocket 客户端服务
// v4.1: 桌面端 WebSocket 连接和通话信令
// SEC-P1-08: Token 通过连接后 auth 消息发送，不再放入 URL

type MessageHandler = (type: string, data: any) => void;

class DesktopWebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private userId: string = '';
  private token: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private onStatusChange: ((connected: boolean) => void) | null = null;

  connect(serverUrl: string, userId: string, token: string): void {
    this.url = serverUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://') + '/ws/chat';
    this.userId = userId;
    this.token = token;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // 使用局部变量捕获本次连接的 ws 实例。
    // 修复：React StrictMode 下 useEffect 会执行两次（挂载→卸载→再挂载），
    // 旧 ws 的 onopen 闭包若使用 this.ws!，可能指向被新连接替换且仍处于 CONNECTING 状态的实例，
    // 导致 ws.send 抛 InvalidStateError: Still in CONNECTING state。
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.isAuthenticated = false;
      ws.send(JSON.stringify({
        type: 'auth',
        user_id: this.userId,
        token: this.token,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.type || 'unknown';

        if (type === 'auth_ok' || type === 'connection_status') {
          if (!this.isAuthenticated) {
            this.isAuthenticated = true;
            this.isConnected = true;
            this.startHeartbeat();
            this.onStatusChange?.(true);
          }
        } else if (type === 'auth_error') {
          console.error('[WS] Auth failed:', msg.error);
          ws.close();
          return;
        }

        this.dispatchMessage(type, msg);
      } catch {
        if (event.data === 'pong') {
          this.dispatchMessage('pong', {});
        }
      }
    };

    ws.onclose = () => {
      this.isConnected = false;
      this.isAuthenticated = false;
      this.stopHeartbeat();
      this.onStatusChange?.(false);
      // 仅当当前活动连接仍是本实例时，才清空 this.ws，避免覆盖更新后的连接
      if (this.ws === ws) {
        this.ws = null;
      }
      this.scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, 5000);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendRaw('ping');
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private dispatchMessage(type: string, data: any): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((fn) => { try { fn(type, data); } catch {} });
    }
    const wildcards = this.messageHandlers.get('*');
    if (wildcards) {
      wildcards.forEach((fn) => { try { fn(type, data); } catch {} });
    }
  }

  send(type: string, payload?: any, toUserId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) return false;
    const msg: any = { type };
    if (payload) msg.payload = payload;
    if (toUserId) msg.to = toUserId;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  sendRaw(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(text);
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => { this.messageHandlers.get(type)?.delete(handler); };
  }

  setStatusCallback(callback: (connected: boolean) => void): void {
    this.onStatusChange = callback;
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  get connected(): boolean { return this.isConnected && this.isAuthenticated; }
  get currentUserId(): string { return this.userId; }
}

export const desktopWsService = new DesktopWebSocketService();
export default desktopWsService;
