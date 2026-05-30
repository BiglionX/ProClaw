// 云商城 Token API 调用封装
// 对接 Supabase Token 计费系统

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    supabaseClientInstance = createClient(sbUrl, sbKey);
  }
  return supabaseClientInstance;
}

// ========== 类型定义 ==========

export interface TokenPricingRule {
  id: string;
  resource_type: string;
  action_name: string;
  description: string | null;
  pt_cost: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
}

export interface TokenBalanceSummary {
  balance: number;
  today_used: number;
  daily_avg_30d: number;
  estimated_days: number;
}

export interface TokenConsumptionItem {
  id: string;
  resource_type: string;
  tokens_used: number;
  endpoint: string | null;
  created_at: string;
}

export interface TokenConsumptionResult {
  items: TokenConsumptionItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TokenPackage {
  id: string;
  name: string;
  description: string | null;
  token_amount: number;
  price: number;
  discount_percentage: number;
  is_active: boolean;
  sort_order: number;
}

// ========== Token 余额查询 ==========

/**
 * 获取用户 Token 余额摘要
 */
export async function getTokenBalanceSummary(userId: string): Promise<TokenBalanceSummary | null> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_token_balance_summary', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取 Token 余额摘要失败:', error);
    return null;
  }
}

/**
 * 获取 Token 余额（简单版）
 */
export async function getTokenBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('token_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data?.balance || 0;
  } catch (error) {
    console.error('获取 Token 余额失败:', error);
    return 0;
  }
}

// ========== Token 定价查询 ==========

/**
 * 获取 Token 定价规则列表
 */
export async function getTokenPricing(): Promise<TokenPricingRule[]> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_token_pricing_rules');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取 Token 定价失败:', error);
    return [];
  }
}

/**
 * 获取 Token 充值套餐列表
 */
export async function getTokenPackages(): Promise<TokenPackage[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取 Token 套餐失败:', error);
    return [];
  }
}

// ========== Token 消耗 ==========

/**
 * 估算操作消耗
 */
export function estimateTokenCost(resourceType: string, quantity: number, pricingRules: TokenPricingRule[]): number {
  const rule = pricingRules.find(r => r.resource_type === resourceType);
  if (!rule) return 0;
  return rule.pt_cost * quantity;
}

/**
 * 检查并扣除 Token（核心计费函数）
 * 返回: { success: boolean, error?: string }
 */
export async function checkAndDeductToken(
  userId: string,
  resourceType: string,
  quantity: number,
  endpoint?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 获取定价
    const pricing = await getTokenPricing();
    const rule = pricing.find(r => r.resource_type === resourceType);
    if (!rule) {
      return { success: false, error: `未知资源类型: ${resourceType}` };
    }

    const cost = rule.pt_cost * quantity;

    // 2. 检查余额
    const balance = await getTokenBalance(userId);
    if (balance < cost) {
      return {
        success: false,
        error: `Token 余额不足。需要 ${cost} PT，当前余额 ${balance} PT。请前往用户中心充值。`,
      };
    }

    // 3. 扣除 Token
    const { error: deductError } = await getSupabaseClient().rpc('deduct_tokens', {
      p_user_id: userId,
      p_tokens: cost,
    });

    if (deductError) throw deductError;

    // 4. 记录消费日志
    await getSupabaseClient().from('api_usage_logs').insert({
      user_id: userId,
      resource_type: resourceType,
      tokens_used: cost,
      endpoint: endpoint || null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Token 扣费失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '扣费失败' };
  }
}

// ========== 消费明细 ==========

/**
 * 获取用户 Token 消费明细（分页）
 */
export async function getTokenConsumption(
  userId: string,
  resourceType?: string,
  page = 1,
  pageSize = 20
): Promise<TokenConsumptionResult | null> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_token_consumption', {
      p_user_id: userId,
      p_resource_type: resourceType || null,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取消费明细失败:', error);
    return null;
  }
}

/**
 * 记录 Token 使用（仅记录，不扣费）
 */
export async function recordTokenUsage(
  userId: string,
  resourceType: string,
  tokensUsed: number,
  endpoint?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient().from('api_usage_logs').insert({
      user_id: userId,
      resource_type: resourceType,
      tokens_used: tokensUsed,
      endpoint: endpoint || null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('记录 Token 使用失败:', error);
    return false;
  }
}

// ========== Token 购买 ==========

/**
 * 创建 Token 购买订单（模拟支付）
 * 真实支付将在后续迭代中集成支付宝/微信
 */
export async function createTokenPurchase(
  userId: string,
  packageId: string
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    // 1. 获取套餐信息
    const { data: pkg, error: pkgError } = await getSupabaseClient()
      .from('token_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: '套餐不存在' };
    }

    const finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);

    // 2. 创建销售记录
    const { data: sale, error: saleError } = await getSupabaseClient()
      .from('token_sales')
      .insert({
        user_id: userId,
        amount: pkg.token_amount,
        price: finalPrice,
        currency: 'CNY',
        status: 'completed',
        payment_method: 'mock',
        metadata: { package_name: pkg.name, package_id: pkg.id },
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 3. 增加 Token 余额
    const { error: addError } = await getSupabaseClient().rpc('add_tokens', {
      p_user_id: userId,
      p_tokens: pkg.token_amount,
    });

    if (addError) throw addError;

    return { success: true, saleId: sale?.id };
  } catch (error: unknown) {
    console.error('Token 购买失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '购买失败' };
  }
}

// ========== Token 配置 ==========

export interface UserTokenConfig {
  user_id: string;
  low_balance_threshold: number;
  daily_limit: number;
  auto_recharge_package_id: string | null;
  auto_recharge_enabled: boolean;
  notification_email: boolean;
  notification_wechat: boolean;
}

export interface DebtStatus {
  user_id: string;
  status: 'normal' | 'warning' | 'readonly' | 'suspended' | 'archived';
  balance: number;
  threshold: number;
  days_overdue: number;
  last_deduction_fail: string | null;
}

export interface DailyLimitCheck {
  allowed: boolean;
  daily_limit: number;
  today_used: number;
  request_tokens: number;
  remaining: number;
}

/**
 * 获取用户 Token 配置
 */
export async function getUserTokenConfig(userId: string): Promise<UserTokenConfig | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_token_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取 Token 配置失败:', error);
    return null;
  }
}

/**
 * 更新用户 Token 配置
 */
export async function updateUserTokenConfig(
  userId: string,
  config: Partial<UserTokenConfig>
): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient()
      .from('user_token_config')
      .upsert({
        user_id: userId,
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('更新 Token 配置失败:', error);
    return false;
  }
}

// ========== 欠费保护 & 日上限 (PRD v8.0 5.3节) ==========

/**
 * 获取用户欠费状态
 */
export async function getDebtStatus(userId: string): Promise<DebtStatus | null> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_user_debt_status', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取欠费状态失败:', error);
    return null;
  }
}

/**
 * 检查日消耗上限
 */
export async function checkDailyLimit(userId: string, tokens: number): Promise<DailyLimitCheck | null> {
  try {
    const { data, error } = await getSupabaseClient().rpc('check_daily_limit', {
      p_user_id: userId,
      p_tokens: tokens,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('检查日消耗上限失败:', error);
    return null;
  }
}

/**
 * 记录余额不足事件
 */
export async function recordInsufficientBalance(
  userId: string,
  requestedTokens: number,
  resourceType?: string
): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient().rpc('record_insufficient_balance', {
      p_user_id: userId,
      p_requested_tokens: requestedTokens,
      p_resource_type: resourceType || 'other',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('记录余额不足事件失败:', error);
    return false;
  }
}
