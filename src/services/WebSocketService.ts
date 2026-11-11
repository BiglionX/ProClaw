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
  private disposed: boolean = false;
  private pendingMessages: string[] = [];
  private onStatusChange: ((connected: boolean) => void) | null = null;

  connect(serverUrl: string, userId: string, token: string): void {
    this.disposed = false;
    this.url = serverUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://') + '/ws/chat';
    this.userId = userId;
    this.token = token;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.disposed) return;
    const state = this.ws?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

    const socket = new WebSocket(this.url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.disposed || this.ws !== socket) {
        socket.close();
        return;
      }
      if (socket.readyState !== WebSocket.OPEN) return;
      this.isAuthenticated = false;
      this.safeSend(JSON.stringify({
        type: 'auth',
        user_id: this.userId,
        token: this.token,
      }), socket);
      this.flushPending(socket);
    };

    socket.onmessage = (event) => {
      if (this.disposed || this.ws !== socket) return;
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
          this.ws?.close();
          return;
        }

        this.dispatchMessage(type, msg);
      } catch {
        if (event.data === 'pong') {
          this.dispatchMessage('pong', {});
        }
      }
    };

    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.ws = null;
      this.isConnected = false;
      this.isAuthenticated = false;
      this.stopHeartbeat();
      this.onStatusChange?.(false);
      if (!this.disposed) this.scheduleReconnect();
    };

    socket.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  /** 仅在 OPEN 时发送；否则进入队列，等本次连接 onopen 后再发。 */
  private safeSend(message: string, socket: WebSocket | null = this.ws): void {
    if (this.disposed) return;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      return;
    }
    this.pendingMessages.push(message);
  }

  private flushPending(socket: WebSocket): void {
    if (this.disposed || socket.readyState !== WebSocket.OPEN) return;
    const queued = this.pendingMessages.splice(0);
    let sent = 0;
    for (; sent < queued.length; sent++) {
      if (this.disposed || socket.readyState !== WebSocket.OPEN) break;
      socket.send(queued[sent]);
    }
    if (sent < queued.length) {
      this.pendingMessages.unshift(...queued.slice(sent));
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) return;
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
    if (this.disposed) return false;
    const msg: any = { type };
    if (payload) msg.payload = payload;
    if (toUserId) msg.to = toUserId;
    const text = JSON.stringify(msg);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push(text);
      return true;
    }
    if (!this.isAuthenticated) return false;
    this.ws.send(text);
    return true;
  }

  sendRaw(text: string): void {
    if (this.disposed) return;
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
    this.disposed = true;
    this.pendingMessages = [];
    this.stopHeartbeat();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const socket = this.ws;
    this.ws = null;
    socket?.close();
    this.isConnected = false;
    this.isAuthenticated = false;
  }

  get connected(): boolean { return this.isConnected && this.isAuthenticated; }
  get currentUserId(): string { return this.userId; }
}

export const desktopWsService = new DesktopWebSocketService();
export default desktopWsService;
