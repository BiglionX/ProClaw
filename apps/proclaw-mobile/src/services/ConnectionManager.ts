import { Platform } from 'react-native';
import { loadServerUrl } from './AuthService';
import { logger } from '../utils/logger';

// P4: 连接健康度评分接口
export interface ConnectionHealth {
  score: number;        // 0-100，健康度评分
  latency: number;       // 最近一次延迟 (ms)
  successCount: number;  // 连续成功次数
  failCount: number;     // 连续失败次数
  lastCheck: number;     // 上次检测时间戳
}

// P4: 默认健康度（离线状态）
const DEFAULT_HEALTH: ConnectionHealth = {
  score: 0,
  latency: -1,
  successCount: 0,
  failCount: 0,
  lastCheck: Date.now(),
};

// P4: 动态检测间隔配置（毫秒）
const HEALTH_INTERVALS = {
  HEALTHY: 60000,    // score >= 80：1 分钟检测一次
  FAIR: 30000,       // score >= 50：30 秒检测一次
  POOR: 10000,       // score < 50：10 秒检测一次
} as const;


// P4: 计算健康度评分
export const calculateHealthScore = (health: ConnectionHealth): number => {
  const { successCount, failCount, latency } = health;
  
  // 基础分：连续成功越多分数越高
  const successScore = Math.min(successCount * 10, 50);
  
  // 惩罚分：连续失败越多分数越低
  const failPenalty = Math.min(failCount * 20, 50);
  
  // 延迟惩罚：延迟越高分数越低
  let latencyPenalty = 0;
  if (latency > 0) {
    if (latency > 2000) latencyPenalty = 20;
    else if (latency > 1000) latencyPenalty = 10;
    else if (latency > 500) latencyPenalty = 5;
  }
  
  return Math.max(0, Math.min(100, 50 + successScore - failPenalty - latencyPenalty));
};

// P4: 根据健康度获取下次检测间隔
export const getCheckInterval = (health: ConnectionHealth): number => {
  const score = calculateHealthScore(health);
  if (score >= 80) return HEALTH_INTERVALS.HEALTHY;
  if (score >= 50) return HEALTH_INTERVALS.FAIR;
  return HEALTH_INTERVALS.POOR;
};

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

// P4: 连接健康度状态追踪
let connectionHealth: ConnectionHealth = { ...DEFAULT_HEALTH };

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

// P4: 获取当前连接健康度（供外部查询）
export const getConnectionHealth = (): ConnectionHealth => ({ ...connectionHealth });

export const startConnectionMonitor = async (): Promise<void> => {
  await checkConnection();
  
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  // P4: 根据当前健康度动态计算检测间隔
  const interval = getCheckInterval(connectionHealth);
  connectionCheckInterval = setInterval(async () => {
    await checkConnection();
    // P4: 每次检测后重新计算间隔并更新定时器
    const newInterval = getCheckInterval(connectionHealth);
    if (newInterval !== interval) {
      clearInterval(connectionCheckInterval!);
      connectionCheckInterval = setInterval(checkConnection, newInterval);
    }
  }, interval);
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
      // P4: 更新健康度状态
      connectionHealth = {
        score: calculateHealthScore({ ...connectionHealth, failCount: connectionHealth.failCount + 1 }),
        latency: -1,
        successCount: 0,
        failCount: connectionHealth.failCount + 1,
        lastCheck: Date.now(),
      };
      return { mode: 'offline', isConnected: false };
    }

    const isDirectAvailable = await testDirectConnection(serverUrl);
    
    if (isDirectAvailable) {
      currentMode = 'direct';
      notifyModeChange('direct');
      const latency = await measureLatency(serverUrl);
      // P4: 更新健康度状态（成功）
      connectionHealth = {
        score: calculateHealthScore({ ...connectionHealth, latency, successCount: connectionHealth.successCount + 1, failCount: 0 }),
        latency,
        successCount: connectionHealth.successCount + 1,
        failCount: 0,
        lastCheck: Date.now(),
      };
      return {
        mode: 'direct',
        isConnected: true,
        serverUrl,
        latency
      };
    }

    currentMode = 'offline';
    notifyModeChange('offline');
    // P4: 更新健康度状态（失败）
    connectionHealth = {
      score: calculateHealthScore({ ...connectionHealth, failCount: connectionHealth.failCount + 1 }),
      latency: -1,
      successCount: 0,
      failCount: connectionHealth.failCount + 1,
      lastCheck: Date.now(),
    };
    return { mode: 'offline', isConnected: false };
  } catch (error) {
    logger.warn('Connection check failed:', error);
    currentMode = 'offline';
    notifyModeChange('offline');
    // P4: 更新健康度状态（异常）
    connectionHealth = {
      score: calculateHealthScore({ ...connectionHealth, failCount: connectionHealth.failCount + 1 }),
      latency: -1,
      successCount: 0,
      failCount: connectionHealth.failCount + 1,
      lastCheck: Date.now(),
    };
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
