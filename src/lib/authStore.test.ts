import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '../lib/authStore';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from '../lib/supabase';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 store 状态
    act(() => {
      useAuthStore.setState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('login', () => {
    it('应该使用模拟账号成功登录 (boss/IamBigBoss)', async () => {
      await act(async () => {
        await useAuthStore.getState().login('boss', 'IamBigBoss');
      });

      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe('boss@proclaw.demo');
      expect((state.user as any)?.role).toBe('admin');
      expect(state.session).not.toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('模拟账号登录失败应抛出错误', async () => {
      const mockError = new Error('Invalid credentials');
      (supabase.auth.signInWithPassword as any).mockRejectedValue(mockError);

      await act(async () => {
        try {
          await useAuthStore.getState().login('wrong', 'wrong');
        } catch (e) {}
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.error).toBeTruthy();
    });

    it('登录时应设置 isLoading 为 true', async () => {
      let loadingDuringCall = false;
      (supabase.auth.signInWithPassword as any).mockImplementation(async () => {
        loadingDuringCall = useAuthStore.getState().isLoading;
        return { data: { user: null, session: null }, error: new Error('fail') };
      });

      await act(async () => {
        try {
          await useAuthStore.getState().login('test@test.com', 'password');
        } catch (e) {}
      });

      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('register', () => {
    it('应该成功注册', async () => {
      const mockUser = {
        id: 'new-user-1',
        email: 'new@test.com',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const mockSession = { access_token: 'token-new', refresh_token: 'refresh' };
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await act(async () => {
        await useAuthStore.getState().register('new@test.com', 'password');
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it('注册失败时应设置 error', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Registration failed'),
      });

      await act(async () => {
        try {
          await useAuthStore.getState().register('existing@test.com', 'password');
        } catch (e) {}
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe('Registration failed');
    });
  });

  describe('logout', () => {
    it('应该成功登出', async () => {
      // 先登录
      await act(async () => {
        await useAuthStore.getState().login('boss', 'IamBigBoss');
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });

    it('登出失败时应设置 error', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({
        error: new Error('Network error'),
      });

      await act(async () => {
        try {
          await useAuthStore.getState().logout();
        } catch (e) {}
      });

      const state = useAuthStore.getState();
      expect(state.error).toBeTruthy();
    });
  });

  describe('checkAuth', () => {
    it('应该检查认证状态', async () => {
      const mockUser = { id: '1', email: 'test@test.com', role: 'user' };
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockUser } },
      });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('未登录时应设置 user 为 null', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
      });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('clearError', () => {
    it('应该清除错误状态', () => {
      act(() => {
        useAuthStore.setState({ error: 'some error' });
      });
      expect(useAuthStore.getState().error).toBe('some error');

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
