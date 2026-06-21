import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

// ============================================================
// 类型定义
// ============================================================

export interface CreateInvitationInput {
  invitation_type: string;  // "order_share" | "price_update"
  business_ref_id: string;  // 订单号或商品ID列表(JSON)
  target_phone?: string;
  inviter_id: string;
}

export interface InvitationData {
  id: string;
  invite_code: string;
  inviter_id: string;
  inviter_name?: string;
  target_phone?: string;
  invitation_type: string;
  business_ref_id: string;
  status: string;  // "active" | "used" | "expired" | "revoked"
  expires_at: number;
  created_at: number;
  used_at?: number;
  used_by?: string;
}

export interface AcceptInvitationInput {
  invite_code: string;
  new_user_name: string;
  new_user_phone?: string;
  new_user_password?: string;
}

export interface InvitationResult {
  invite_code: string;
  qr_data: string;
  expires_at: number;
}

// ============================================================
// 邀请服务
// ============================================================

const INVITATION_CMD = {
  CREATE: 'create_invitation_cmd',
  ACCEPT: 'accept_invitation_cmd',
  REVOKE: 'revoke_invitation_cmd',
  LIST: 'get_invitations_cmd',
} as const;

/**
 * 创建邀请
 * 返回邀请码和二维码数据
 */
export async function createInvitation(
  input: CreateInvitationInput
): Promise<InvitationResult> {
  if (!isTauri()) {
    // 浏览器模式：返回 mock 数据（使用 HMAC 签名格式）
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    const mockCode = `mock${now.toString(16).padStart(12, '0')}.a1b2c3d4e5f6a7b8`;
    return {
      invite_code: mockCode,
      qr_data: `proclaw://invite?code=${mockCode}&host=localhost:8888`,
      expires_at: expiresAt,
    };
  }
  return await invoke(INVITATION_CMD.CREATE, { input });
}

/**
 * 接受邀请（无需预先认证）
 */
export async function acceptInvitation(
  input: AcceptInvitationInput
): Promise<{ success: boolean; message: string; user_id: string }> {
  if (!isTauri()) {
    return { success: true, message: 'Mock: invitation accepted', user_id: `mock-user-${Date.now()}` };
  }
  return await invoke(INVITATION_CMD.ACCEPT, { input });
}

/**
 * 撤销邀请
 */
export async function revokeInvitation(
  invite_code: string,
  inviter_id: string
): Promise<{ message: string }> {
  if (!isTauri()) {
    return { message: 'Mock: invitation revoked' };
  }
  return await invoke(INVITATION_CMD.REVOKE, { input: { invite_code, inviter_id } });
}

/**
 * 查询邀请记录
 */
export async function getInvitations(
  inviter_id: string,
  status?: string
): Promise<InvitationData[]> {
  if (!isTauri()) {
    return getMockInvitations();
  }
  return await invoke(INVITATION_CMD.LIST, { input: { inviter_id, status } });
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 格式化剩余时间
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;
  if (diff <= 0) return '已过期';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}天${hours}小时`;
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

/**
 * 获取邀请类型标签
 */
export function getInvitationTypeLabel(type: string): string {
  switch (type) {
    case 'order_share': return '订单分享';
    case 'price_update': return '价格更新';
    default: return type;
  }
}

/**
 * 获取邀请状态标签
 */
export function getInvitationStatusLabel(status: string): string {
  switch (status) {
    case 'active': return '活跃';
    case 'used': return '已使用';
    case 'expired': return '已过期';
    case 'revoked': return '已撤销';
    default: return status;
  }
}

// ============================================================
// Mock 数据（浏览器模式）
// ============================================================

function getMockInvitations(): InvitationData[] {
  return [
    {
      id: 'mock-1',
      invite_code: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.88f3a2e1b0c4d5e7',
      inviter_id: 'mock-user',
      inviter_name: '当前用户',
      target_phone: '13800138000',
      invitation_type: 'order_share',
      business_ref_id: 'PO-20260520-001',
      status: 'active',
      expires_at: Date.now() + 3 * 24 * 60 * 60 * 1000,
      created_at: Date.now() - 2 * 60 * 60 * 1000,
      used_at: undefined,
      used_by: undefined,
    },
    {
      id: 'mock-2',
      invite_code: 'f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1.11a2b3c4d5e6f7a8',
      inviter_id: 'mock-user',
      inviter_name: '当前用户',
      target_phone: undefined,
      invitation_type: 'price_update',
      business_ref_id: 'SKU-001,SKU-002',
      status: 'used',
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      created_at: Date.now() - 5 * 24 * 60 * 60 * 1000,
      used_at: Date.now() - 3 * 24 * 60 * 60 * 1000,
      used_by: 'mock-user-2',
    },
  ];
}
