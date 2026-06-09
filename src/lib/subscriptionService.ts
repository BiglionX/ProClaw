// 订阅服务封装层 (Phase 7)
// 封装 Tauri invoke 调用，提供类型安全的订阅操作
// 桌面端 Token 用量同时同步到 Supabase（平台统一统计）

import { invoke } from '@tauri-apps/api/core';
import { supabase } from './supabase';

// Supabase Token 用量同步（平台侧统一统计）
async function syncTokenToSupabase(
  userId: string,
  resourceType: string,
  tokensUsed: number,
  endpoint?: string
): Promise<void> {
  try {
    // @ts-expect-error - api_usage_logs 表类型未定义
    const { error } = await supabase.from('api_usage_logs').insert({
      user_id: userId,
      resource_type: resourceType,
      tokens_used: tokensUsed,
      endpoint: endpoint || null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Token Sync] Failed to sync to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('[Token Sync] Supabase sync error:', err);
  }
}

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

export async function recordToken(
  userId: string,
  actionType: string,
  resourcePath?: string,
  tokensUsed?: number
): Promise<void> {
  // 1. 记录到本地 SQLite
  await invoke('record_token_cmd', {
    user_id: userId,
    action_type: actionType,
    resource_path: resourcePath || '',
  });

  // 2. 同步到 Supabase（平台侧统一统计）
  // tokensUsed 未传入时使用默认值
  const tokens = tokensUsed ?? getDefaultTokenCost(actionType);
  await syncTokenToSupabase(userId, actionType, tokens, resourcePath);
}

// 根据 actionType 获取默认 Token 消耗
function getDefaultTokenCost(actionType: string): number {
  const costMap: Record<string, number> = {
    'ai_chat': 10,
    'ai_product_query': 5,
    'ai_order_ocr': 15,
    'ai_order_recognition': 10,
    'data_export': 20,
    'data_sync': 5,
    'chat_message': 2,
  };
  return costMap[actionType] ?? 1;
}

// ========== Token 新定价系统 (PRD v8.0) ==========

export interface TokenPricingRule {
  resource_type: string;
  action_name: string;
  description: string | null;
  pt_cost: number;
  unit: string;
  sort_order: number;
}

export interface TokenBalanceInfo {
  user_id: string;
  balance: number;
  today_used: number;
  daily_avg_30d: number;
  estimated_days: number;
  total_purchased: number;
  total_used: number;
}

export interface EstimateCostResult {
  cost: number;
  resource_type: string;
  quantity: number;
}

/**
 * 获取 Token 定价规则
 */
export async function getTokenPricing(): Promise<TokenPricingRule[]> {
  const result = await invoke<{ data: TokenPricingRule[] }>('get_token_pricing_cmd');
  return result.data;
}

/**
 * 获取 Token 余额摘要
 */
export async function getTokenBalance(userId: string): Promise<TokenBalanceInfo> {
  const result = await invoke<{ data: TokenBalanceInfo }>('get_token_balance_cmd', {
    user_id: userId,
  });
  return result.data;
}

/**
 * 估算 Token 消耗
 */
export async function estimateTokenCost(resourceType: string, quantity: number): Promise<EstimateCostResult> {
  return invoke('estimate_token_cost_cmd', {
    resource_type: resourceType,
    quantity,
  });
}

// ========== 账单 ==========

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const result = await invoke<{ data: Invoice[] }>('get_invoices_cmd', {
    user_id: userId,
  });
  return result.data;
}
