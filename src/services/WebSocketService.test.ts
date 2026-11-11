import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { desktopWsService } from './WebSocketService';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  onopen: ((...args: unknown[]) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((...args: unknown[]) => void) | null = null;
  onerror: ((...args: unknown[]) => void) | null = null;

  send = vi.fn();
  close = vi.fn();
  readyState = MockWebSocket.OPEN;
}

let lastWs: MockWebSocket | null = null;

function installMockWebSocket() {
  lastWs = null;
  class Ws extends MockWebSocket {
    constructor(_url: string) {
      super();
      lastWs = this;
    }
  }
  vi.stubGlobal('WebSocket', Ws as unknown as typeof WebSocket);
}

function simulateOpenAndAuth(type: 'auth_ok' | 'connection_status' = 'auth_ok') {
  expect(lastWs).not.toBeNull();
  lastWs!.onopen?.();
  lastWs!.onmessage?.({ data: JSON.stringify({ type }) });
}

describe('DesktopWebSocketService auth flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    desktopWsService.disconnect();
    installMockWebSocket();
  });

  afterEach(() => {
    desktopWsService.disconnect();
    vi.unstubAllGlobals();
  });

  it('connect sends auth as first message', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth();
    expect(lastWs!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth', user_id: 'user123', token: 'token_abc' }),
    );
  });

  it('connected is false before auth_ok', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.onopen?.();
    expect(desktopWsService.connected).toBe(false);
    expect(desktopWsService.send('ping')).toBe(false);
  });

  it('connected is true after auth_ok', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth('auth_ok');
    expect(desktopWsService.connected).toBe(true);
    expect(desktopWsService.send('chat', { text: 'hi' })).toBe(true);
  });

  it('connection_status also completes auth', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth('connection_status');
    expect(desktopWsService.connected).toBe(true);
  });

  it('queues a message while connecting and sends it after open', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.readyState = MockWebSocket.CONNECTING;
    expect(desktopWsService.send('chat', { text: 'hi' })).toBe(true);
    expect(lastWs!.send).not.toHaveBeenCalled();

    lastWs!.readyState = MockWebSocket.OPEN;
    lastWs!.onopen?.();

    expect(lastWs!.send).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({ type: 'auth', user_id: 'user123', token: 'token_abc' }),
    );
    expect(lastWs!.send).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({ type: 'chat', payload: { text: 'hi' } }),
    );
  });

  it('does not send after disconnect', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    const socket = lastWs!;
    socket.readyState = MockWebSocket.CONNECTING;
    desktopWsService.send('chat', { text: 'late' });
    desktopWsService.disconnect();
    socket.readyState = MockWebSocket.OPEN;
    socket.onopen?.();
    expect(socket.send).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
  });

  it('auth_error closes connection', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.onopen?.();
    lastWs!.onmessage?.({ data: JSON.stringify({ type: 'auth_error', error: 'bad token' }) });
    expect(desktopWsService.connected).toBe(false);
    expect(lastWs!.close).toHaveBeenCalled();
  });
});