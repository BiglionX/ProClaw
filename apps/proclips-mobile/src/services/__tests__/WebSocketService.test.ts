/// <reference types="jest" />

jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

declare const global: typeof globalThis;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  onopen: ((...args: unknown[]) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((...args: unknown[]) => void) | null = null;
  onerror: ((...args: unknown[]) => void) | null = null;

  send = jest.fn();
  close = jest.fn();
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
  global.WebSocket = Ws as unknown as typeof WebSocket;
}

function simulateOpenAndAuth(type: 'auth_ok' | 'connection_status' = 'auth_ok') {
  expect(lastWs).not.toBeNull();
  lastWs!.onopen?.();
  lastWs!.onmessage?.({ data: JSON.stringify({ type }) });
}

import { wsService } from '../WebSocketService';

describe('WebSocketService auth flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wsService.disconnect();
    installMockWebSocket();
  });

  afterEach(() => {
    wsService.disconnect();
  });

  it('connect sends auth as first message', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth();
    expect(lastWs!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth', user_id: 'user123', token: 'token_abc' }),
    );
  });

  it('connected is false before auth_ok', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.onopen?.();
    expect(wsService.connected).toBe(false);
    expect(wsService.send('test_message')).toBe(false);
  });

  it('connected is true after auth_ok', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth('auth_ok');
    expect(wsService.connected).toBe(true);
    expect(wsService.send('chat', { text: 'hi' })).toBe(true);
  });

  it('connection_status also completes auth', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth('connection_status');
    expect(wsService.connected).toBe(true);
  });

  it('auth_error closes connection', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    lastWs!.onopen?.();
    lastWs!.onmessage?.({ data: JSON.stringify({ type: 'auth_error', error: 'bad token' }) });
    expect(wsService.connected).toBe(false);
    expect(lastWs!.close).toHaveBeenCalled();
  });

  it('disconnect clears connected', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    simulateOpenAndAuth();
    wsService.disconnect();
    expect(wsService.connected).toBe(false);
  });

  it('currentUserId returns user id', async () => {
    await wsService.connect('http://localhost:8888', 'user123', 'token_abc');
    expect(wsService.currentUserId).toBe('user123');
  });
});