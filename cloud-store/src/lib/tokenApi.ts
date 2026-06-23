// 云商城 Token API 调用封装
// 对接 Supabase Token 计费系统

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * 创建 Supabase 客户端的工厂函数
 * 服务端操作使用 service role key 以绕过 RLS（token 扣费、余额查询等特权操作）
 * 避免跨请求复用单例导致的认证状态泄漏
 */
function createSupabaseClient(): SupabaseClient {
  const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!sbUrl || !sbKey) {
    throw new Error('Missing Supabase environment variables for token API');
  }
  return createClient(sbUrl, sbKey);
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
    const { data, error } = await createSupabaseClient().rpc('get_token_balance_summary', {
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
    const { data, error } = await createSupabaseClient()
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
    const { data, error } = await createSupabaseClient().rpc('get_token_pricing_rules');

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
    const { data, error } = await createSupabaseClient()
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
 * 使用数据库事务确保原子性
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

    // 3. 在同一个 RPC 调用中执行扣费和日志记录（事务保证原子性）
    const { error: deductError } = await createSupabaseClient().rpc('deduct_tokens_with_log', {
      p_user_id: userId,
      p_tokens: cost,
      p_resource_type: resourceType,
      p_endpoint: endpoint || null,
      p_metadata: metadata || null,
    });

    if (deductError) {
      // 如果复合 RPC 失败，尝试降级到旧的分别调用
      console.warn('deduct_tokens_with_log 不可用，降级到分别调用');
      const { error: fallbackDeductError } = await createSupabaseClient().rpc('deduct_tokens', {
        p_user_id: userId,
        p_tokens: cost,
      });

      if (fallbackDeductError) throw fallbackDeductError;

      // 记录消费日志（降级模式下可能记录失败）
      try {
        await createSupabaseClient().from('api_usage_logs').insert({
          user_id: userId,
          resource_type: resourceType,
          tokens_used: cost,
          endpoint: endpoint || null,
          metadata: metadata || null,
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('记录消费日志失败（余额已扣除）:', logError);
      }
    }

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
    const { data, error } = await createSupabaseClient().rpc('get_token_consumption', {
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
    const { error } = await createSupabaseClient().from('api_usage_logs').insert({
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
 * 创建 Token 购买订单（支持幂等性）
 * 真实支付将在后续迭代中集成支付宝/微信
 */
export async function createTokenPurchase(
  userId: string,
  packageId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    // 1. 检查幂等键是否已存在（防止重复购买）
    if (idempotencyKey) {
      const { data: existingSale } = await createSupabaseClient()
        .from('token_sales')
        .select('id, status')
        .eq('user_id', userId)
        .eq('metadata->>idempotency_key', idempotencyKey)
        .single();

      if (existingSale) {
        // 已有记录，直接返回
        if (existingSale.status === 'completed') {
          return { success: true, saleId: existingSale.id };
        }
        return { success: false, error: '订单正在处理中，请勿重复提交' };
      }
    }

    // 2. 获取套餐信息
    const { data: pkg, error: pkgError } = await createSupabaseClient()
      .from('token_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: '套餐不存在' };
    }

    if (!pkg.is_active) {
      return { success: false, error: '该套餐已下架' };
    }

    const finalPrice = pkg.price * (1 - (pkg.discount_percentage || 0) / 100);

    // 3. 生成唯一订单号（使用 UUID 确保唯一性）
    const orderNo = `TKN${Date.now()}${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // 4. 创建销售记录（带幂等键）
    const { data: sale, error: saleError } = await createSupabaseClient()
      .from('token_sales')
      .insert({
        user_id: userId,
        amount: pkg.token_amount,
        price: finalPrice,
        currency: 'CNY',
        status: 'pending',
        payment_method: 'mock',
        order_no: orderNo,
        metadata: {
          package_name: pkg.name,
          package_id: pkg.id,
          discount_percentage: pkg.discount_percentage,
          idempotency_key: idempotencyKey,
        },
      })
      .select()
      .single();

    if (saleError) {
      // 检查是否是唯一约束冲突（并发请求）
      if (saleError.code === '23505') {
        return { success: false, error: '订单创建冲突，请稍后重试' };
      }
      throw saleError;
    }

    // 5. 在 mock 模式下直接完成支付
    if (sale) {
      const { error: completeError } = await createSupabaseClient()
        .from('token_sales')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', sale.id);

      if (!completeError) {
        // 6. 增加 Token 余额
        const { error: addError } = await createSupabaseClient().rpc('add_tokens', {
          p_user_id: userId,
          p_tokens: pkg.token_amount,
        });

        if (addError) {
          console.error('增加 Token 余额失败:', addError);
          // 记录失败以便人工处理
          await createSupabaseClient().from('token_sales').update({
            status: 'failed',
            metadata: {
              ...sale.metadata,
              error: 'add_tokens_failed',
            },
          }).eq('id', sale.id);
          return { success: false, error: '充值成功但余额更新失败，请联系客服' };
        }
      }
    }

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
    const { data, error } = await createSupabaseClient()
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
    const { error } = await createSupabaseClient()
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
    const { data, error } = await createSupabaseClient().rpc('get_user_debt_status', {
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
    const { data, error } = await createSupabaseClient().rpc('check_daily_limit', {
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
    const { error } = await createSupabaseClient().rpc('record_insufficient_balance', {
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
