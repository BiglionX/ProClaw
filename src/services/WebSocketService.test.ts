import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { desktopWsService } from './WebSocketService';

class MockWebSocket {
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

  it('auth_error closes connection', () => {
    desktopWsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.onopen?.();
    lastWs!.onmessage?.({ data: JSON.stringify({ type: 'auth_error', error: 'bad token' }) });
    expect(desktopWsService.connected).toBe(false);
    expect(lastWs!.close).toHaveBeenCalled();
  });
});