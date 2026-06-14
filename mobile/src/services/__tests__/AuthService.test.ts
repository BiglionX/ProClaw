/// <reference types="jest" />

/**
 * AuthService 单元测试
 * 测试认证、配对、token 管理、demo 模式
 */

// Mock SecureConfig（AuthService 的依赖）
jest.mock('../SecureConfig', () => ({
  secureGet: jest.fn(),
  secureSet: jest.fn(),
  secureDelete: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  post: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

declare const global: typeof globalThis;

import axios from 'axios';

import {
  saveToken,
  loadToken,
  saveRefreshToken,
  loadRefreshToken,
  clearTokens,
  saveServerUrl,
  loadServerUrl,
  getApiClient,
  resetApiClient,
  pairDevice,
  saveRoles,
  loadRoles,
  clearRoles,
  setDemoMode,
  isDemoMode,
} from '../AuthService';

import { secureGet, secureSet, secureDelete } from '../SecureConfig';

describe('AuthService', () => {
  const mockSecureGet = secureGet as jest.MockedFunction<typeof secureGet>;
  const mockSecureSet = secureSet as jest.MockedFunction<typeof secureSet>;
  const mockSecureDelete = secureDelete as jest.MockedFunction<typeof secureDelete>;
  const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置 apiClient 单例
    resetApiClient();
    // 默认 mock 实现
    mockSecureGet.mockResolvedValue(null);
    mockSecureSet.mockResolvedValue();
    mockSecureDelete.mockResolvedValue();
  });

  // ============================================================
  // Token 管理
  // ============================================================

  describe('Token 管理', () => {
    describe('saveToken / loadToken', () => {
      it('应能保存和加载 token', async () => {
        mockSecureGet.mockResolvedValueOnce('test_token_123');

        await saveToken('my_token');
        const token = await loadToken();

        expect(mockSecureSet).toHaveBeenCalledWith('proclaw_auth_token', 'my_token');
        expect(token).toBe('test_token_123');
      });

      it('loadToken 无 token 时返回 null', async () => {
        mockSecureGet.mockResolvedValueOnce(null);

        const token = await loadToken();
        expect(token).toBeNull();
      });

      it('loadToken 抛出异常时向上传播（AuthService 无 try-catch）', async () => {
        mockSecureGet.mockRejectedValueOnce(new Error('Storage error'));

        await expect(loadToken()).rejects.toThrow('Storage error');
      });
    });

    describe('saveRefreshToken / loadRefreshToken', () => {
      it('应能保存和加载 refresh token', async () => {
        mockSecureGet.mockResolvedValueOnce('refresh_token_abc');

        await saveRefreshToken('my_refresh_token');
        const token = await loadRefreshToken();

        expect(mockSecureSet).toHaveBeenCalledWith('proclaw_refresh_token', 'my_refresh_token');
        expect(token).toBe('refresh_token_abc');
      });
    });

    describe('clearTokens', () => {
      it('应删除 token 和 refresh token', async () => {
        await clearTokens();

        expect(mockSecureDelete).toHaveBeenCalledWith('proclaw_auth_token');
        expect(mockSecureDelete).toHaveBeenCalledWith('proclaw_refresh_token');
      });
    });
  });

  // ============================================================
  // Server URL 管理
  // ============================================================

  describe('Server URL 管理', () => {
    describe('saveServerUrl / loadServerUrl', () => {
      it('应能保存和加载服务器地址', async () => {
        mockSecureGet.mockResolvedValueOnce('http://192.168.1.100:8888');

        await saveServerUrl('http://192.168.1.100:8888');
        const url = await loadServerUrl();

        expect(mockSecureSet).toHaveBeenCalledWith('proclaw_server_url', 'http://192.168.1.100:8888');
        expect(url).toBe('http://192.168.1.100:8888');
      });

      it('loadServerUrl 无配置时返回 null', async () => {
        mockSecureGet.mockResolvedValueOnce(null);

        const url = await loadServerUrl();
        expect(url).toBeNull();
      });
    });
  });

  // ============================================================
  // 角色管理
  // ============================================================

  describe('角色管理', () => {
    describe('saveRoles / loadRoles', () => {
      it('应能保存和加载角色数组', async () => {
        mockSecureGet.mockResolvedValueOnce(JSON.stringify(['admin', 'user']));

        await saveRoles(['admin', 'user']);
        const roles = await loadRoles();

        expect(mockSecureSet).toHaveBeenCalledWith('proclaw_roles', '["admin","user"]');
        expect(roles).toEqual(['admin', 'user']);
      });

      it('loadRoles 无数据时返回空数组', async () => {
        mockSecureGet.mockResolvedValueOnce(null);

        const roles = await loadRoles();
        expect(roles).toEqual([]);
      });

      it('loadRoles JSON 解析失败时返回空数组', async () => {
        mockSecureGet.mockResolvedValueOnce('invalid json');

        const roles = await loadRoles();
        expect(roles).toEqual([]);
      });
    });

    describe('clearRoles', () => {
      it('应删除角色数据', async () => {
        await clearRoles();

        expect(mockSecureDelete).toHaveBeenCalledWith('proclaw_roles');
      });
    });
  });

  // ============================================================
  // getApiClient
  // ============================================================

  describe('getApiClient', () => {
    it('首次调用应创建 axios 实例', async () => {
      const client = await getApiClient();

      expect(client).toBeDefined();
      expect(axios.create).toHaveBeenCalled();
    });

    it('后续调用应返回同一实例（缓存）', async () => {
      const client1 = await getApiClient();
      const client2 = await getApiClient();

      expect(client1).toBe(client2);
      // axios.create 只应调用一次
      expect(axios.create).toHaveBeenCalledTimes(1);
    });

    it('resetApiClient 后应创建新实例', async () => {
      const client1 = await getApiClient();
      resetApiClient();
      const client2 = await getApiClient();

      expect(client1).not.toBe(client2);
      expect(axios.create).toHaveBeenCalledTimes(2);
    });

    it('无 serverUrl 时使用默认 localhost:8888', async () => {
      mockSecureGet.mockResolvedValueOnce(null);

      await getApiClient();

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://localhost:8888',
        })
      );
    });
  });

  // ============================================================
  // pairDevice
  // ============================================================

  describe('pairDevice', () => {
    const mockServerUrl = 'http://192.168.1.100:8888';
    const mockPairingCode = '123456';

    it('配对成功时应保存 token 和 serverUrl', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          access_token: 'token_abc',
          refresh_token: 'refresh_xyz',
          user: { name: '测试用户' },
        },
      });
      mockSecureGet.mockResolvedValue(null);

      const result = await pairDevice(mockServerUrl, mockPairingCode);

      expect(result.token).toBe('token_abc');
      expect(result.refresh_token).toBe('refresh_xyz');
      expect(result.user.name).toBe('测试用户');
      expect(mockSecureSet).toHaveBeenCalledWith('proclaw_auth_token', 'token_abc');
      expect(mockSecureSet).toHaveBeenCalledWith('proclaw_refresh_token', 'refresh_xyz');
      expect(mockSecureSet).toHaveBeenCalledWith('proclaw_server_url', mockServerUrl);
    });

    it('配对成功但无 server 返回的用户名时使用默认 "用户"', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          access_token: 'token_abc',
          refresh_token: 'refresh_xyz',
          user: {},
        },
      });
      mockSecureGet.mockResolvedValue(null);

      const result = await pairDevice(mockServerUrl, mockPairingCode);

      expect(result.user.name).toBe('用户');
    });

    it('请求超时时抛出 "请求超时" 错误', async () => {
      const error = new Error('timeout');
      (error as any).code = 'ECONNABORTED';
      mockAxiosPost.mockRejectedValueOnce(error);

      await expect(pairDevice(mockServerUrl, mockPairingCode))
        .rejects.toThrow('请求超时，请检查服务器是否可访问');
    });

    it('网络错误时抛出 "无法连接服务器" 错误', async () => {
      const error = new Error('network');
      (error as any).code = 'ERR_NETWORK';
      mockAxiosPost.mockRejectedValueOnce(error);

      await expect(pairDevice(mockServerUrl, mockPairingCode))
        .rejects.toThrow('无法连接服务器，请检查服务器地址和网络');
    });

    it('服务器返回 error 字段时抛出该错误信息', async () => {
      const error = new Error('server error');
      (error as any).code = 'ERR_BAD_REQUEST';
      (error as any).response = { data: { error: '配对码无效' } };
      mockAxiosPost.mockRejectedValueOnce(error);

      await expect(pairDevice(mockServerUrl, mockPairingCode))
        .rejects.toThrow('配对码无效');
    });

    it('其他错误使用 OUTBOUND_ERROR_MESSAGE 兑底（与桌面端一致）', async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error('Unknown error'));

      await expect(pairDevice(mockServerUrl, mockPairingCode))
        .rejects.toThrow('服务器有问题，请稍候再试');
    });
  });

  // ============================================================
  // Demo 模式
  // ============================================================

  describe('Demo 模式', () => {
    describe('setDemoMode', () => {
      it('应保存以 demo_ 开头的随机 token', async () => {
        await setDemoMode();

        // 验证保存的 token 以 demo_ 开头
        const savedCall = mockSecureSet.mock.calls.find(
          ([key]) => key === 'proclaw_auth_token'
        );
        expect(savedCall).toBeDefined();
        const savedToken = savedCall![1] as string;
        expect(savedToken.startsWith('demo_')).toBe(true);
      });

      it('应保存 https://demo.local 作为服务器地址', async () => {
        await setDemoMode();

        expect(mockSecureSet).toHaveBeenCalledWith('proclaw_server_url', 'https://demo.local');
      });
    });

    describe('isDemoMode', () => {
      it('token 以 demo_ 开头时应返回 true', async () => {
        mockSecureGet.mockResolvedValueOnce('demo_abc123');

        const result = await isDemoMode();
        expect(result).toBe(true);
      });

      it('token 不以 demo_ 开头时应返回 false', async () => {
        mockSecureGet.mockResolvedValueOnce('user_token_123');

        const result = await isDemoMode();
        expect(result).toBe(false);
      });

      it('无 token 时应返回 false', async () => {
        mockSecureGet.mockResolvedValueOnce(null);

        const result = await isDemoMode();
        expect(result).toBe(false);
      });
    });
  });
});