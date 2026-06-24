// Desktop call connectivity — Tauri WS session (no demo/mock auth)
import { invoke } from '@tauri-apps/api/core';
import apiClient from '../lib/apiClient';
import desktopCallManager from './CallManager';
import desktopWsService from './WebSocketService';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8888';

interface WsSession {
  user_id: string;
  access_token: string;
}

class CallConnectionService {
  private initialized = false;

  async connect(): Promise<void> {
    const session = await invoke<WsSession>('get_ws_session_cmd');
    if (!session?.access_token || !session?.user_id) {
      console.warn('[CallConnection] No desktop WS session available');
      return;
    }

    apiClient.setToken(session.access_token);
    desktopWsService.connect(API_BASE, session.user_id, session.access_token);

    if (!this.initialized) {
      desktopCallManager.init();
      this.initialized = true;
    }
  }

  disconnect(): void {
    desktopWsService.disconnect();
    if (this.initialized) {
      desktopCallManager.destroy();
      this.initialized = false;
    }
  }
}

export const callConnectionService = new CallConnectionService();
export default callConnectionService;