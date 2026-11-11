import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAuthStore,
  deleteLocalAccount,
  ACTIVE_ACCOUNT_KEY,
} from '../lib/authStore';
// setup.ts 已全局 mock ../lib/tauri:ipcInvoke 是 vi.fn()
import { ipcInvoke } from '../lib/tauri';

const mockIpc = ipcInvoke as unknown as ReturnType<typeof vi.fn>;

/**
 * authStore v13.1.1 单测 — 本地账号无登录模式
 *
 * 覆盖:
 * - initialize:无账号访客态 / 活跃账号恢复 / 失效 id 清理 / IPC 失败
 * - registerLocal:注册即激活 / 失败抛错 / isLoading 时序
 * - switchAccount / refreshLocalUsers
 * - 兼容旧 API:login(存在→切换,不存在→注册)、register、logout、checkAuth
 * - deleteLocalAccount(含 keyring 清理)
 */
describe('authStore (v13.1.1 本地账号无登录模式)', () => {
  const alice = {
    id: 'u-1',
    name: 'Alice',
    email: 'alice@test.com',
    role: 'admin',
  };
  const bob = {
    id: 'u-2',
    name: 'Bob',
    email: 'bob@test.com',
    role: 'user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    act(() => {
      useAuthStore.setState({
        user: null,
        session: null,
        localUsers: [],
        hasInitialized: false,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('initialize', () => {
    it('无活跃账号时进入访客态(用户为空,列表已加载)', async () => {
      mockIpc.mockResolvedValueOnce({ data: [alice, bob] });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const s = useAuthStore.getState();
      expect(s.hasInitialized).toBe(true);
      expect(s.user).toBeNull();
      expect(s.session).toBeNull();
      expect(s.localUsers).toEqual([alice, bob]);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('有活跃账号时恢复会话', async () => {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, alice.id);
      mockIpc.mockResolvedValueOnce({ data: [alice, bob] });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const s = useAuthStore.getState();
      expect(s.user?.id).toBe(alice.id);
      expect(s.user?.email).toBe(alice.email);
      expect(s.session?.access_token).toBe(`local-access-${alice.id}`);
      expect(s.localUsers.length).toBe(2);
    });

    it('活跃账号 id 已失效时清空记录并保持访客态', async () => {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, 'stale-id');
      mockIpc.mockResolvedValueOnce({ data: [alice] });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBeNull();
    });

    it('IPC 失败时设置 error 且不崩溃', async () => {
      mockIpc.mockRejectedValueOnce(new Error('db locked'));

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const s = useAuthStore.getState();
      expect(s.hasInitialized).toBe(true);
      expect(s.error).toBe('db locked');
      expect(s.isLoading).toBe(false);
    });
  });

  describe('registerLocal', () => {
    it('注册成功自动激活账号并持久化活跃记录', async () => {
      mockIpc.mockResolvedValueOnce({
        id: alice.id,
        email: alice.email,
        name: alice.name,
        role: alice.role,
        is_first_user: false,
      });
      // register_local_cmd 之后的 list_local_users_cmd
      mockIpc.mockResolvedValueOnce({ data: [alice, bob] });

      const returned = await act(async () => {
        return useAuthStore.getState().registerLocal('alice@test.com', 'secret', 'Alice');
      });

      const s = useAuthStore.getState();
      expect(returned.id).toBe(alice.id);
      expect(s.user?.id).toBe(alice.id);
      expect(s.user?.email).toBe(alice.email);
      expect(s.user?.permissions).toEqual(['*']);
      expect(s.session).not.toBeNull();
      expect(s.localUsers).toEqual([alice, bob]);
      expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe(alice.id);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('注册失败设置 error 并抛出', async () => {
      mockIpc.mockRejectedValueOnce(new Error('email already taken'));

      await act(async () => {
        try {
          await useAuthStore.getState().registerLocal('x@test.com', 'pw');
        } catch (e) {
          expect((e as Error).message).toBe('email already taken');
        }
      });

      const s = useAuthStore.getState();
      expect(s.error).toBe('email already taken');
      expect(s.user).toBeNull();
      expect(s.isLoading).toBe(false);
    });

    it('注册过程中 isLoading 为 true', async () => {
      let loadingDuringCall = false;
      mockIpc.mockImplementationOnce(async () => {
        loadingDuringCall = useAuthStore.getState().isLoading;
        return { id: 'u-x', email: 'x@test.com', name: 'X', role: 'user', is_first_user: false };
      });

      await act(async () => {
        await useAuthStore.getState().registerLocal('x@test.com', 'pw');
      });

      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('switchAccount', () => {
    it('切换成功激活目标账号(无密码)', async () => {
      mockIpc.mockResolvedValueOnce(bob);

      await act(async () => {
        await useAuthStore.getState().switchAccount(bob.id);
      });

      const s = useAuthStore.getState();
      expect(s.user?.id).toBe(bob.id);
      expect(s.session?.refresh_token).toBe(`local-refresh-${bob.id}`);
      expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe(bob.id);
    });

    it('切换失败设置 error 并抛出', async () => {
      mockIpc.mockRejectedValueOnce(new Error('account not found'));

      await act(async () => {
        try {
          await useAuthStore.getState().switchAccount('ghost');
        } catch (e) {
          expect((e as Error).message).toBe('account not found');
        }
      });

      expect(useAuthStore.getState().error).toBe('account not found');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('refreshLocalUsers', () => {
    it('刷新本地账号列表', async () => {
      mockIpc.mockResolvedValueOnce({ data: [alice] });

      await act(async () => {
        await useAuthStore.getState().refreshLocalUsers();
      });

      expect(useAuthStore.getState().localUsers).toEqual([alice]);
    });

    it('IPC 失败时保留原列表不抛错', async () => {
      mockIpc.mockRejectedValueOnce(new Error('boom'));
      act(() => {
        useAuthStore.setState({ localUsers: [alice] });
      });

      await act(async () => {
        await useAuthStore.getState().refreshLocalUsers();
      });

      expect(useAuthStore.getState().localUsers).toEqual([alice]);
    });
  });

  describe('login (兼容旧 API)', () => {
    it('账号不存在时走注册并激活', async () => {
      mockIpc.mockResolvedValueOnce({
        id: alice.id,
        email: alice.email,
        name: alice.name,
        role: alice.role,
        is_first_user: false,
      });
      mockIpc.mockResolvedValueOnce({ data: [alice] });

      await act(async () => {
        await useAuthStore.getState().login('alice@test.com', 'secret');
      });

      const s = useAuthStore.getState();
      expect(s.user?.email).toBe(alice.email);
      expect(s.error).toBeNull();
    });

    it('账号已存在时切换(忽略密码参数)', async () => {
      act(() => {
        useAuthStore.setState({ localUsers: [alice] });
      });
      mockIpc.mockResolvedValueOnce(alice); // switch_local_account_cmd

      await act(async () => {
        await useAuthStore.getState().login('alice@test.com', 'any-password');
      });

      expect(useAuthStore.getState().user?.id).toBe(alice.id);
    });
  });

  describe('register (兼容旧 API)', () => {
    it('委托给 registerLocal', async () => {
      mockIpc.mockResolvedValueOnce({
        id: alice.id,
        email: alice.email,
        name: alice.name,
        role: 'user',
        is_first_user: false,
      });
      mockIpc.mockResolvedValueOnce({ data: [alice] });

      await act(async () => {
        await useAuthStore.getState().register('alice@test.com', 'pw');
      });

      expect(useAuthStore.getState().user?.id).toBe(alice.id);
    });
  });

  describe('logout', () => {
    it('退出后回到离线访客态并清空活跃记录', async () => {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, alice.id);
      act(() => {
        useAuthStore.setState({
          user: { ...alice, created_at: '', updated_at: '' },
          session: { access_token: 't', refresh_token: 'r', user: { ...alice, created_at: '', updated_at: '' } },
        });
      });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const s = useAuthStore.getState();
      expect(s.user).toBeNull();
      expect(s.session).toBeNull();
      expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBeNull();
      expect(s.error).toBeNull();
    });
  });

  describe('checkAuth (兼容旧 API)', () => {
    it('委托给 initialize 恢复会话', async () => {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, alice.id);
      mockIpc.mockResolvedValueOnce({ data: [alice] });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      expect(useAuthStore.getState().user?.email).toBe(alice.email);
    });

    it('未登录时 user 为 null', async () => {
      mockIpc.mockResolvedValueOnce({ data: [] });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('deleteLocalAccount', () => {
    it('删除账号并清理活跃记录与 keyring', async () => {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, alice.id);
      act(() => {
        useAuthStore.setState({
          user: { ...alice, created_at: '', updated_at: '' },
          session: { access_token: 't', refresh_token: 'r', user: { ...alice, created_at: '', updated_at: '' } },
        });
      });

      mockIpc.mockResolvedValueOnce(undefined); // delete_user_cmd
      mockIpc.mockResolvedValueOnce(undefined); // keyring_delete
      mockIpc.mockResolvedValueOnce({ data: [] }); // list_local_users_cmd

      await act(async () => {
        await deleteLocalAccount(alice.id);
      });

      const s = useAuthStore.getState();
      expect(s.user).toBeNull();
      expect(s.session).toBeNull();
      expect(s.localUsers).toEqual([]);
      expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBeNull();
    });
  });

  describe('clearError', () => {
    it('清除错误状态', () => {
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
