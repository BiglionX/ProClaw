import { ipcInvoke as invoke } from './tauri';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  user_type: string;
  role: string;
  permissions: string[];
  created_at: string;
}

export interface Device {
  id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile';
  last_active_at?: number;
  is_revoked: boolean;
  created_at: string;
}

export interface PlanData {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  token_quota: number;
  max_devices: number;
  features: string;
}

export interface SubData {
  id: string;
  plan_key: string | null;
  plan_name: string | null;
  token_quota: number | null;
  status: string;
  billing_cycle: string;
  started_at: string;
  expires_at: string | null;
}

export interface TokenSummary {
  plan_name: string;
  plan_key: string;
  token_quota: number;
  token_used: number;
  token_remaining: number;
  usage_percent: number;
  subscription_status: string;
}

export interface UsageItem {
  id: string;
  tokens_consumed: number;
  action_type: string;
  resource_path: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export interface SubscriptionBundle {
  plans: PlanData[];
  sub: SubData | null;
  summary: TokenSummary | null;
  usageItems: UsageItem[];
  invoices: InvoiceItem[];
}

const DEMO_DEVICES: Device[] = [
  {
    id: '1',
    device_name: '我的 iPhone',
    device_type: 'mobile',
    last_active_at: Date.now() / 1000 - 120,
    is_revoked: false,
    created_at: '2026-01-15',
  },
  {
    id: '2',
    device_name: '办公室电脑',
    device_type: 'desktop',
    last_active_at: Date.now() / 1000 - 3600,
    is_revoked: false,
    created_at: '2026-03-20',
  },
];

export async function fetchUserProfile(
  userId: string,
  fallback?: { email?: string; created_at?: string },
): Promise<UserProfile> {
  try {
    const res = await invoke<any>('get_current_user_cmd');
    if (res && !res.error) {
      return {
        id: res.id,
        name: res.name || fallback?.email?.split('@')[0] || '用户',
        phone: res.phone,
        email: res.email || fallback?.email,
        user_type: res.user_type || 'internal',
        role: res.role || 'admin',
        permissions: res.permissions || [],
        created_at: res.created_at || fallback?.created_at || new Date().toISOString(),
      };
    }
  } catch {
    // fall through
  }
  return {
    id: userId,
    name: fallback?.email?.split('@')[0] || '用户',
    email: fallback?.email,
    user_type: 'internal',
    role: 'admin',
    permissions: ['*'],
    created_at: fallback?.created_at || new Date().toISOString(),
  };
}

export async function fetchUserDevices(userId: string): Promise<Device[]> {
  try {
    const res = await invoke<any>('get_devices_cmd', { userId });
    if (res?.data) return res.data;
  } catch {
    // demo fallback
  }
  return DEMO_DEVICES;
}

export async function fetchSubscriptionBundle(userId: string): Promise<SubscriptionBundle> {
  const [plansRes, subRes, summaryRes, usageRes, invoicesRes] = await Promise.all([
    invoke('get_plans_cmd').catch(() => ({ data: [] })),
    invoke('get_my_subscription_cmd', { userId }).catch(() => null),
    invoke('get_token_summary_cmd', { userId }).catch(() => null),
    invoke('get_token_usage_cmd', { userId, limit: 20, offset: 0 }).catch(() => ({ data: [] })),
    invoke('get_invoices_cmd', { userId }).catch(() => ({ data: [] })),
  ]);
  return {
    plans: (plansRes as any)?.data || [],
    sub: (subRes as any)?.data || null,
    summary: (summaryRes as any)?.data || null,
    usageItems: (usageRes as any)?.data || [],
    invoices: (invoicesRes as any)?.data || [],
  };
}