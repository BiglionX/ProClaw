import { ipcInvoke, ipcInvokeOrNull, isTauri } from './tauri';

export interface ManagedUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  user_type: 'internal' | 'external';
  external_type?: 'customer' | 'supplier' | 'both';
  roles: string[];
  created_at: string;
}

export interface ManagedRole {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

export interface UsersAndRoles {
  users: ManagedUser[];
  roles: ManagedRole[];
}

export interface CreateUserInput {
  name: string;
  phone?: string;
  email?: string;
  user_type: 'internal' | 'external';
  roles: string[];
}

export interface UpdateUserInput {
  name: string;
  phone?: string;
  email?: string;
  roles: string[];
}

export interface EmployeeInvitationResult {
  invite_code: string;
  qr_data: string;
  expires_at: number;
  role_ids: number[];
}

interface RawUserRow {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  user_type: string;
  external_type?: string | null;
  is_active?: boolean;
  created_at: string;
  role?: string;
}

interface RawRole {
  id: number;
  name: string;
  description?: string | null;
  permissions?: unknown;
}

function getMockUsersAndRoles(): UsersAndRoles {
  return {
    users: [
      {
        id: '1',
        name: '管理员',
        phone: '13800138000',
        email: 'admin@proclaw.com',
        user_type: 'internal',
        roles: ['admin'],
        created_at: '2024-01-01',
      },
      {
        id: '2',
        name: '张三',
        phone: '13900139000',
        user_type: 'internal',
        roles: ['sales'],
        created_at: '2024-01-15',
      },
    ],
    roles: [
      { id: 1, name: 'admin', description: '管理员', permissions: ['*'] },
      { id: 2, name: 'sales', description: '销售员', permissions: ['sales_order:create', 'sales_order:read'] },
      { id: 3, name: 'warehouse', description: '仓库员', permissions: ['inventory:read', 'inventory:update'] },
      { id: 4, name: 'finance', description: '财务', permissions: ['finance:read', 'report:read'] },
    ],
  };
}

function mapPermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((p): p is string => typeof p === 'string');
  }
  return [];
}

function aggregateUsers(rows: RawUserRow[]): ManagedUser[] {
  const map = new Map<string, ManagedUser>();
  for (const row of rows) {
    if (row.is_active === false) continue;
    const externalType = row.external_type as ManagedUser['external_type'] | undefined;
    const existing = map.get(row.id);
    if (existing) {
      if (row.role && !existing.roles.includes(row.role)) {
        existing.roles.push(row.role);
      }
      continue;
    }
    map.set(row.id, {
      id: row.id,
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      user_type: row.user_type === 'external' ? 'external' : 'internal',
      external_type: externalType,
      roles: row.role ? [row.role] : [],
      created_at: row.created_at,
    });
  }
  return Array.from(map.values());
}

async function fetchRoles(): Promise<ManagedRole[]> {
  const res = await ipcInvokeOrNull<{ data: RawRole[] }>('get_roles_cmd');
  if (!res?.data) {
    return getMockUsersAndRoles().roles;
  }
  return res.data.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    permissions: mapPermissions(role.permissions),
  }));
}

export async function fetchUsersAndRoles(): Promise<UsersAndRoles> {
  if (!isTauri()) {
    return getMockUsersAndRoles();
  }
  const [usersRes, roles] = await Promise.all([
    ipcInvoke<{ data: RawUserRow[] }>('get_users_cmd', {
      search: null,
      user_type: null,
      role: null,
    }),
    fetchRoles(),
  ]);
  return {
    users: aggregateUsers(usersRes.data ?? []),
    roles,
  };
}

export async function createManagedUser(input: CreateUserInput): Promise<void> {
  if (!isTauri()) return;
  await ipcInvoke('create_user_cmd', {
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    user_type: input.user_type,
    password: null,
    role: input.roles[0] || null,
  });
}

export async function updateManagedUser(id: string, input: UpdateUserInput): Promise<void> {
  if (!isTauri()) return;
  await ipcInvoke('update_user_cmd', {
    id,
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    is_active: null,
  });
  if (input.roles.length > 0) {
    await ipcInvoke('assign_user_role_cmd', {
      user_id: id,
      role_name: input.roles[0],
    });
  }
}

export async function deleteManagedUser(id: string): Promise<void> {
  if (!isTauri()) return;
  await ipcInvoke('delete_user_cmd', { id });
}

export async function createEmployeeInvitation(
  roleIds: number[],
  targetPhone?: string,
): Promise<EmployeeInvitationResult> {
  if (!isTauri()) {
    return {
      invite_code: 'mock-invite-code',
      qr_data: 'proclaw://invite?code=mock&type=employee',
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      role_ids: roleIds,
    };
  }
  const current = await ipcInvoke<{ id?: string; error?: string }>('get_current_user_cmd');
  if (!current?.id || current.error) {
    throw new Error('无法获取当前用户，请先登录');
  }
  return await ipcInvoke<EmployeeInvitationResult>('create_employee_invitation_cmd', {
    input: {
      role_ids: roleIds,
      target_phone: targetPhone || null,
      inviter_id: current.id,
    },
  });
}