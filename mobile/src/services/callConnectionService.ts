// Mobile call connectivity — paired JWT only (no demo mode)
import { getApiClient, loadServerUrl, loadToken } from './AuthService';
import callManager from './CallManager';
import wsService from './WebSocketService';
import { logger } from '../utils/logger';

class CallConnectionService {
  private initialized = false;

  async connectIfPaired(): Promise<boolean> {
    const token = await loadToken();
    const serverUrl = await loadServerUrl();
    if (!token || !serverUrl) {
      return false;
    }

    try {
      const client = await getApiClient();
      const meRes = await client.get<{ data?: { id?: string } }>('/api/auth/me');
      const userId = meRes.data?.data?.id;
      if (!userId) {
        logger.warn('[CallConnection] /api/auth/me missing user id');
        return false;
      }

      await wsService.connect(serverUrl, userId, token);

      if (!this.initialized) {
        this.initialized = true;
      }
      return true;
    } catch (e) {
      logger.warn('[CallConnection] connectIfPaired failed:', e);
      return false;
    }
  }

  disconnect(): void {
    wsService.disconnect();
    this.initialized = false;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}

export const callConnectionService = new CallConnectionService();
export default callConnectionService;