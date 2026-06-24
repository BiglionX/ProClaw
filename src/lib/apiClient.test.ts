import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import apiClient from '../lib/apiClient';

vi.mock('axios', () => {
  const mockAxios: any = {
    create: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  mockAxios.create = vi.fn(() => mockAxios);
  return { default: mockAxios };
});

describe('ApiClient', () => {
  const mock = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    interceptors: { request: { use: ReturnType<typeof vi.fn> }; response: { use: ReturnType<typeof vi.fn> } };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.setToken(null);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('token 管理', () => {
    it('应该设置和获取 token', () => {
      apiClient.setToken('test-token');
      expect(apiClient.getToken()).toBe('test-token');
    });

    it('setToken(null) 应清除 token', () => {
      apiClient.setToken('test-token');
      apiClient.setToken(null);
      expect(apiClient.getToken()).toBeNull();
    });

    it('setToken 应保存到 localStorage', () => {
      apiClient.setToken('test-token');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('setToken(null) 应从 localStorage 中移除', () => {
      localStorage.setItem('auth_token', 'test-token');
      apiClient.setToken(null);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('getToken 应从 localStorage 读取持久化的 token', () => {
      localStorage.setItem('auth_token', 'persisted-token');
      expect(apiClient.getToken()).toBe('persisted-token');
    });
  });

  describe('HTTP 方法', () => {
    beforeEach(() => {
      mock.get.mockResolvedValue({ data: { result: 'ok' } });
      mock.post.mockResolvedValue({ data: { created: true } });
      mock.put.mockResolvedValue({ data: { updated: true } });
      mock.delete.mockResolvedValue({ data: { deleted: true } });
    });

    it('get 方法应返回响应数据', async () => {
      const result = await apiClient.get('/test');
      expect(result).toEqual({ result: 'ok' });
    });

    it('post 方法应发送请求体并返回响应数据', async () => {
      const result = await apiClient.post('/test', { key: 'value' });
      expect(result).toEqual({ created: true });
    });

    it('put 方法应发送请求体并返回响应数据', async () => {
      const result = await apiClient.put('/test/1', { key: 'updated' });
      expect(result).toEqual({ updated: true });
    });

    it('delete 方法应返回响应数据', async () => {
      const result = await apiClient.delete('/test/1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('upload', () => {
    it('应使用 multipart/form-data 上传', async () => {
      mock.post.mockResolvedValue({ data: { file_id: 'f1' } });

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const result = await apiClient.upload('/files/upload', formData);
      expect(result).toEqual({ file_id: 'f1' });
    });
  });
});
