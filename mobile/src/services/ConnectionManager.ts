import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadServerUrl, getApiClient } from './AuthService';

export type ConnectionMode = 'direct' | 'cloud_relay' | 'offline' | 'checking';

interface ConnectionStatus {
  mode: ConnectionMode;
  isConnected: boolean;
  serverUrl?: string;
  latency?: number;
}

let currentMode: ConnectionMode = 'offline';
let connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

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
      return { mode: 'offline', isConnected: false };
    }

    const isDirectAvailable = await testDirectConnection(serverUrl);
    
    if (isDirectAvailable) {
      currentMode = 'direct';
      const latency = await measureLatency(serverUrl);
      return {
        mode: 'direct',
        isConnected: true,
        serverUrl,
        latency
      };
    }

    currentMode = 'offline';
    return { mode: 'offline', isConnected: false };
  } catch (error) {
    console.warn('Connection check failed:', error);
    currentMode = 'offline';
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

export const scanQRCode = async (): Promise<string> => {
  // TODO: implement QR code scanning
  return '';
};

export default {
  startConnectionMonitor,
  stopConnectionMonitor,
  checkConnection,
  getConnectionMode,
  getLocalIPAddress
};
