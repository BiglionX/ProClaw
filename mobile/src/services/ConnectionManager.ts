import { Platform } from 'react-native';
import { loadServerUrl, getApiClient } from './AuthService';
import { logger } from '../utils/logger';

// 审计 M4：统一 ConnectionMode 类型定义，与 AppStore 保持一致
export type ConnectionMode = 'direct' | 'cloud_relay' | 'lan' | 'offline' | 'checking';

/** P2 项 1：二维码扫码解析后的连接信息 */
export interface ParsedConnectionPayload {
  serverUrl: string;
  code: string;
}

interface ConnectionStatus {
  mode: ConnectionMode;
  isConnected: boolean;
  serverUrl?: string;
  latency?: number;
}

let currentMode: ConnectionMode = 'offline';
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

// 审计 I2：同步状态到 AppStore 的回调，确保 ConnectionManager 和 AppStore 状态一致
let appStoreSyncCallback: ((mode: ConnectionMode) => void) | null = null;

export const onConnectionModeChange = (callback: (mode: ConnectionMode) => void): () => void => {
  appStoreSyncCallback = callback;
  return () => { appStoreSyncCallback = null; };
};

const notifyModeChange = (mode: ConnectionMode): void => {
  if (appStoreSyncCallback) {
    try { appStoreSyncCallback(mode); } catch {}
  }
};

export const startConnectionMonitor = async (): Promise<void> => {
  await checkConnection();
  
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  connectionCheckInterval = setInterval(async () => {
    await checkConnection();
  }, 30000);
};

export const stopConnectionMonitor = (): void => {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
};

export const checkConnection = async (): Promise<ConnectionStatus> => {
  try {
    const serverUrl = await loadServerUrl();
    
    if (!serverUrl) {
      currentMode = 'offline';
      notifyModeChange('offline');
      return { mode: 'offline', isConnected: false };
    }

    const isDirectAvailable = await testDirectConnection(serverUrl);
    
    if (isDirectAvailable) {
      currentMode = 'direct';
      notifyModeChange('direct');
      const latency = await measureLatency(serverUrl);
      return {
        mode: 'direct',
        isConnected: true,
        serverUrl,
        latency
      };
    }

    currentMode = 'offline';
    notifyModeChange('offline');
    return { mode: 'offline', isConnected: false };
  } catch (error) {
    logger.warn('Connection check failed:', error);
    currentMode = 'offline';
    notifyModeChange('offline');
    return { mode: 'offline', isConnected: false };
  }
};

const testDirectConnection = async (serverUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

const measureLatency = async (serverUrl: string): Promise<number> => {
  try {
    const start = Date.now();
    await fetch(`${serverUrl}/api/health`);
    return Date.now() - start;
  } catch {
    return -1;
  }
};

export const getConnectionMode = (): ConnectionMode => {
  return currentMode;
};

export const setConnectionMode = (mode: ConnectionMode): void => {
  currentMode = mode;
};

export const getLocalIPAddress = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }
  try {
    const Network = await import('expo-network');
    return await Network.getIpAddressAsync();
  } catch {
    return null;
  }
};

/**
 * P2 项 1：解析二维码扫码原始字符串为连接信息。
 * 输入格式：JSON 对象 { serverUrl: string, code: string }
 * 校验：
 *  - 必须是合法 JSON
 *  - serverUrl 必须以 http:// 或 https:// 开头
 *  - code 必须为 6 位数字字符串
 * 返回 null 表示解析失败，调用方负责提示用户重新扫描。
 */
export const parseQRCodeData = (rawData: string): ParsedConnectionPayload | null => {
  if (!rawData || typeof rawData !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const serverUrl = typeof obj.serverUrl === 'string' ? obj.serverUrl.trim() : '';
  const codeRaw = obj.code;
  const code = typeof codeRaw === 'string'
    ? codeRaw.trim()
    : (typeof codeRaw === 'number' ? String(codeRaw) : '');

  if (!/^https?:\/\//i.test(serverUrl)) return null;
  if (!/^\d{6}$/.test(code)) return null;

  return { serverUrl, code };
};

/**
 * 检查局域网同步是否可用
 * 通过探测本地网络中的 ProClaw 同步服务实现
 */
export const isLanSyncAvailable = async (): Promise<boolean> => {
  try {
    const localIp = await getLocalIPAddress();
    if (!localIp) return false;

    const subnet = localIp.substring(0, localIp.lastIndexOf('.') + 1);
    // 审计 E9：扩展 LAN 扫描范围（常见网关 + 高位段）
    const testIps = [1, 2, 10, 20, 50, 100, 101, 102, 110, 150, 200, 254];

    const results = await Promise.all(
      testIps.map(async (last) => {
        try {
          const ip = `${subnet}${last}`;
          if (ip === localIp) return false;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1500);
          const response = await fetch(`http://${ip}:8889/proclaw/sync/info`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          return response.ok;
        } catch {
          return false;
        }
      })
    );

    return results.some(r => r);
  } catch {
    return false;
  }
};

export default {
  startConnectionMonitor,
  stopConnectionMonitor,
  checkConnection,
  getConnectionMode,
  setConnectionMode,
  onConnectionModeChange,
  getLocalIPAddress,
  isLanSyncAvailable,
  parseQRCodeData,
};
