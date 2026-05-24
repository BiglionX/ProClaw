// WebSocket 客户端服务
// v4.1: 桌面端 WebSocket 连接和通话信令

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
  private onStatusChange: ((connected: boolean) => void) | null = null;

  connect(serverUrl: string, userId: string, token: string): void {
    this.url = serverUrl.replace(/^http/, 'ws') + '/ws/chat';
    this.userId = userId;
    this.token = token;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${this.url}?user_id=${encodeURIComponent(this.userId)}&token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.isConnected = true;
      this.startHeartbeat();
      this.onStatusChange?.(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.dispatchMessage(msg.type || 'unknown', msg);
      } catch {
        if (event.data === 'pong') {
          this.dispatchMessage('pong', {});
        }
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.isConnected = false;
      this.stopHeartbeat();
      this.onStatusChange?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const msg: any = { type };
    if (payload) msg.payload = payload;
    if (toUserId) msg.to = toUserId;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  sendRaw(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
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
  }

  get connected(): boolean { return this.isConnected; }
  get currentUserId(): string { return this.userId; }
}

export const desktopWsService = new DesktopWebSocketService();
export default desktopWsService;
