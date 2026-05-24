// 订阅服务封装层 (Phase 7)
// 封装 Tauri invoke 调用，提供类型安全的订阅操作

import { invoke } from '@tauri-apps/api/core';

export interface Plan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  token_quota: number;
  max_devices: number;
  features: string;
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string | null;
  plan_key: string | null;
  token_quota: number | null;
  status: string;
  billing_cycle: string;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  token_used_this_month: number | null;
}

export interface TokenUsageSummary {
  user_id: string;
  plan_name: string;
  plan_key: string;
  token_quota: number;
  token_used: number;
  token_remaining: number;
  usage_percent: number;
  subscription_status: string;
}

export interface TokenUsageEntry {
  id: string;
  tokens_consumed: number;
  action_type: string;
  resource_path: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  payment_method: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SubscribeParams {
  user_id: string;
  plan_id: string;
  billing_cycle: string;
}

// ========== 套餐 ==========

export async function getPlans(): Promise<Plan[]> {
  const result = await invoke<Plan[]>('get_plans_cmd');
  return result;
}

// ========== 订阅管理 ==========

export async function getMySubscription(userId: string): Promise<UserSubscription | null> {
  const result = await invoke<{ data: UserSubscription | null; message?: string }>('get_my_subscription_cmd', {
    user_id: userId,
  });
  return result.data;
}

export async function subscribePlan(params: SubscribeParams): Promise<{ subscription_id: string; message: string }> {
  return invoke('subscribe_plan_cmd', {
    ...params,
  });
}

export async function cancelSubscription(userId: string): Promise<{ message: string }> {
  return invoke('cancel_subscription_cmd', {
    user_id: userId,
  });
}

// ========== Token 用量 ==========

export async function getTokenSummary(userId: string): Promise<TokenUsageSummary> {
  const result = await invoke<{ data: TokenUsageSummary }>('get_token_summary_cmd', {
    user_id: userId,
  });
  return result.data;
}

export async function getTokenUsage(userId: string, limit: number = 50, offset: number = 0): Promise<TokenUsageEntry[]> {
  const result = await invoke<{ data: TokenUsageEntry[] }>('get_token_usage_cmd', {
    user_id: userId,
    limit,
    offset,
  });
  return result.data;
}

export async function recordToken(userId: string, actionType: string, resourcePath?: string): Promise<void> {
  await invoke('record_token_cmd', {
    user_id: userId,
    action_type: actionType,
    resource_path: resourcePath || '',
  });
}

// ========== 账单 ==========

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const result = await invoke<{ data: Invoice[] }>('get_invoices_cmd', {
    user_id: userId,
  });
  return result.data;
}
