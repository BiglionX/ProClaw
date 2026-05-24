import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

const TOKEN_KEY = 'proclaw_auth_token';
const REFRESH_TOKEN_KEY = 'proclaw_refresh_token';
const SERVER_URL_KEY = 'proclaw_server_url';

let apiClient: AxiosInstance | null = null;

// Use AsyncStorage for web, SecureStore for native
const secureGet = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const secureSet = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch {
    console.warn('Failed to save secure item');
  }
};

const secureDelete = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  } catch {
    console.warn('Failed to delete secure item');
  }
};

export const saveToken = async (token: string): Promise<void> => {
  await secureSet(TOKEN_KEY, token);
  console.log('Token saved');
};

export const loadToken = async (): Promise<string | null> => {
  return await secureGet(TOKEN_KEY);
};

export const saveRefreshToken = async (refreshToken: string): Promise<void> => {
  await secureSet(REFRESH_TOKEN_KEY, refreshToken);
};

export const loadRefreshToken = async (): Promise<string | null> => {
  return await secureGet(REFRESH_TOKEN_KEY);
};

export const clearTokens = async (): Promise<void> => {
  await secureDelete(TOKEN_KEY);
  await secureDelete(REFRESH_TOKEN_KEY);
  console.log('Tokens cleared');
};

export const saveServerUrl = async (url: string): Promise<void> => {
  await secureSet(SERVER_URL_KEY, url);
};

export const loadServerUrl = async (): Promise<string | null> => {
  return await secureGet(SERVER_URL_KEY);
};

export const getApiClient = async (): Promise<AxiosInstance> => {
  if (apiClient) {
    return apiClient;
  }

  const baseURL = await loadServerUrl() || 'http://localhost:8888';
  const token = await loadToken();

  apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  // Request interceptor
  apiClient.interceptors.request.use(
    async (config) => {
      const currentToken = await loadToken();
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const refreshToken = await loadRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(`${baseURL}/api/auth/token`, {
              refresh_token: refreshToken
            });
            
            const newToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token;
            
            await saveToken(newToken);
            await saveRefreshToken(newRefreshToken);
            
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return axios(error.config);
          } catch (refreshError) {
            console.warn('Token refresh failed');
            await clearTokens();
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const resetApiClient = (): void => {
  apiClient = null;
};

export const pairDevice = async (
  serverUrl: string,
  pairingCode: string
): Promise<{ token: string; refresh_token: string; user: { name: string } }> => {
  try {
    console.log('Pairing with server:', serverUrl, 'code:', pairingCode);
    
    const response = await axios.post(
      `${serverUrl}/api/auth/pair`,
      { code: pairingCode },
      { timeout: 15000 }  // 15秒超时
    );

    console.log('Pair response:', response.data);

    const { access_token, refresh_token } = response.data;

    await saveToken(access_token);
    await saveRefreshToken(refresh_token);
    await saveServerUrl(serverUrl);

    resetApiClient();

    console.log('Pairing successful, tokens saved');
    return { token: access_token, refresh_token, user: { name: '测试用户' } };
  } catch (error: any) {
    console.error('Device pairing failed:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请检查服务器是否可访问');
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('无法连接服务器，请检查服务器地址和网络');
    }
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || '配对失败，请检查配对码');
  }
};

/** 演示模式：保存虚拟 token 跳过真实配对 */
export const setDemoMode = async (): Promise<void> => {
  await saveToken('demo_token_skip_auth');
  await saveServerUrl('http://demo.local');
  console.log('Demo mode activated');
};

export const isDemoMode = async (): Promise<boolean> => {
  const token = await loadToken();
  return token === 'demo_token_skip_auth';
};

export default {
  saveToken,
  loadToken,
  clearTokens,
  getApiClient,
  saveServerUrl,
  loadServerUrl,
  pairDevice,
  setDemoMode,
  isDemoMode,
};
