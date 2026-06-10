import { Platform } from 'react-native';
import axios, { AxiosInstance } from 'axios';
import { secureGet, secureSet, secureDelete } from './SecureConfig';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

const TOKEN_KEY = 'proclaw_auth_token';
const REFRESH_TOKEN_KEY = 'proclaw_refresh_token';
const SERVER_URL_KEY = 'proclaw_server_url';

let apiClient: AxiosInstance | null = null;

export const saveToken = async (token: string): Promise<void> => {
  await secureSet(TOKEN_KEY, token);
  logger.log('Token saved');
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
  logger.log('Tokens cleared');
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

  // 审计 S3：回退到 localhost:8888 仅在开发环境安全
  // 生产环境 localhost 可能被恶意进程监听，用户应显式配置服务器地址
  const baseURL = await loadServerUrl() || 'https://localhost:8888';
  if (!await loadServerUrl()) {
    logger.warn('[AuthService] No server URL configured, using default localhost:8888 (insecure in production)');
  }
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
      const originalRequest = error.config;
      // 审计 H1：防止 token 刷新无限循环
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
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
            
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            // 审计 H1：添加 null 检查，防止并发 resetApiClient 导致崩溃
            if (!apiClient) {
              logger.warn('[AuthService] apiClient was reset during token refresh');
              return Promise.reject(error);
            }
            return apiClient.request(originalRequest);
          } catch (refreshError) {
            logger.warn('Token refresh failed');
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
): Promise<{ token: string; refresh_token: string; user: { name: string; roles?: string[] } }> => {
  try {
    logger.log('Pairing with server:', serverUrl); // 审计 S6：不输出配对码
    
    const response = await axios.post(
      `${serverUrl}/api/auth/pair`,
      { code: pairingCode },
      { timeout: 15000 }  // 15秒超时
    );

    logger.log('Pair response: token received, user:', response.data?.user?.name || 'unknown');

    const { access_token, refresh_token } = response.data;

    await saveToken(access_token);
    await saveRefreshToken(refresh_token);
    await saveServerUrl(serverUrl);

    resetApiClient();

    // 获取用户角色并保存
    let roles: string[] = [];
    try {
      const api = await getApiClient();
      const meRes = await api.get('/api/auth/me');
      const userData = meRes.data?.data;
      if (userData?.roles) {
        roles = userData.roles.map((r: any) => r.name);
        await saveRoles(roles);
      }
    } catch (e) {
      logger.warn('Failed to load roles after pairing:', e);
    }

    logger.log('Pairing successful, tokens saved, roles:', roles);
    // 审计 S4：优先使用服务器返回的真实用户名，回退到 "测试用户"
    const userName = response.data?.user?.name || '用户';
    return { token: access_token, refresh_token, user: { name: userName, roles } };
  } catch (error) {
    logger.error('Device pairing failed:', error);
    // axios 错误对象可能含 code（ECONNABORTED/ERR_NETWORK）和 response.data.error
    const axiosErr = error as { code?: string; response?: { data?: { error?: string } } };
    if (axiosErr.code === 'ECONNABORTED') {
      throw new Error('请求超时，请检查服务器是否可访问');
    }
    if (axiosErr.code === 'ERR_NETWORK') {
      throw new Error('无法连接服务器，请检查服务器地址和网络');
    }
    if (axiosErr.response?.data?.error) {
      throw new Error(axiosErr.response.data.error);
    }
    throw new Error(getErrorMessage(error, '配对失败，请检查配对码'));
  }
};

/** 保存用户角色 */
export const saveRoles = async (roles: string[]): Promise<void> => {
  await secureSet('proclaw_roles', JSON.stringify(roles));
};

/** 加载用户角色 */
export const loadRoles = async (): Promise<string[]> => {
  const data = await secureGet('proclaw_roles');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {}
  }
  return [];
};

/** 清除用户角色 */
export const clearRoles = async (): Promise<void> => {
  await secureDelete('proclaw_roles');
};

/** 演示模式：使用随机 token 跳过真实配对（审计 S8：不再使用可预测 token） */
export const setDemoMode = async (): Promise<void> => {
  const randomToken = 'demo_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12);
  await saveToken(randomToken);
  await saveServerUrl('https://demo.local'); // 审计 S9：使用 HTTPS
  logger.log('Demo mode activated');
};

export const isDemoMode = async (): Promise<boolean> => {
  const token = await loadToken();
  return token !== null && token.startsWith('demo_');
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
