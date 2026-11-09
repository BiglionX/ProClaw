import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createManagedUser, fetchUsersAndRoles, updateManagedUser } from './userManagementService';
import { invoke } from '@tauri-apps/api/core';

describe('userManagementService invoke 参数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createManagedUser 以 userType 传给 create_user_cmd', async () => {
    (invoke as any).mockResolvedValue({ id: 'u1' });

    await createManagedUser({
      name: '张三',
      phone: '13800000000',
      email: 'a@b.c',
      user_type: 'external',
      roles: ['sales'],
    });

    expect(invoke).toHaveBeenCalledWith('create_user_cmd', {
      name: '张三',
      phone: '13800000000',
      email: 'a@b.c',
      userType: 'external',
      password: null,
      role: 'sales',
    });
  });

  it('updateManagedUser 以 userId / roleName 传给 assign_user_role_cmd', async () => {
    (invoke as any).mockResolvedValue({ message: 'ok' });

    await updateManagedUser('user-1', {
      name: '张三',
      phone: '13800000000',
      email: 'a@b.c',
      roles: ['manager'],
    });

    expect(invoke).toHaveBeenCalledWith('assign_user_role_cmd', {
      userId: 'user-1',
      roleName: 'manager',
    });
  });

  it('fetchUsersAndRoles 以 userType 传给 get_users_cmd', async () => {
    (invoke as any).mockImplementation(async (cmd: string) => {
      if (cmd === 'get_users_cmd') return { data: [] };
      if (cmd === 'get_roles_cmd') return { data: [] };
      return {};
    });

    await fetchUsersAndRoles();

    expect(invoke).toHaveBeenCalledWith('get_users_cmd', {
      search: null,
      userType: null,
      role: null,
    });
  });
});
