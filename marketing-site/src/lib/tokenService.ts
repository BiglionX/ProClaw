// Token 计费服务 (营销网站 Vite)
// 封装 Supabase Token 相关操作

import { supabase } from './supabase';
import type {
  TokenSale, TokenPackage, ApiUsageLog,
  UserTokenConfig, TokenPricingRule, TokenBalanceSummary,
  TokenConsumptionResult,
} from '../types';

// ==========================================================
// Token 定价规则类型（扩展 types/index.ts）
// ==========================================================

export type { TokenPricingRule, TokenBalanceSummary, TokenConsumptionResult, UserTokenConfig };

export interface TokenConsumptionItem {
  id: string;
  resource_type: string;
  tokens_used: number;
  endpoint: string | null;
  created_at: string;
}

// ==========================================================
// 余额查询
// ==========================================================

/**
 * 获取 Token 余额摘要（RPC）
 */
export async function getTokenBalanceSummary(userId: string): Promise<TokenBalanceSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_token_balance_summary', {
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
 * 获取 Token 余额
 */
export async function getTokenBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
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

// ==========================================================
// 定价 & 套餐
// ==========================================================

/**
 * 获取 Token 定价规则
 */
export async function getTokenPricingRules(): Promise<TokenPricingRule[]> {
  try {
    const { data, error } = await supabase.rpc('get_token_pricing_rules');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取定价规则失败:', error);
    return [];
  }
}

/**
 * 获取 Token 套餐列表
 */
export async function getTokenPackages(): Promise<TokenPackage[]> {
  try {
    const { data, error } = await supabase
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    return [];
  }
}

// ==========================================================
// 消费明细
// ==========================================================

/**
 * 获取 Token 消费明细（RPC 分页）
 */
export async function getTokenConsumption(
  userId: string,
  resourceType?: string,
  page = 1,
  pageSize = 20
): Promise<TokenConsumptionResult | null> {
  try {
    const { data, error } = await supabase.rpc('get_token_consumption', {
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
 * 直接查询 api_usage_logs（当 RPC 不可用时备用）
 */
export async function getUsageLogsDirect(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ApiUsageLog[]> {
  try {
    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('查询用量日志失败:', error);
    return [];
  }
}

// ==========================================================
// Token 购买（模拟支付）
// ==========================================================

/**
 * 购买 Token（模拟支付）
 */
export async function purchaseToken(
  userId: string,
  packageId: string
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    // 1. 获取套餐信息
    const { data: pkg, error: pkgError } = await supabase
      .from('token_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: '套餐不存在' };
    }

    const finalPrice = pkg.price * (1 - pkg.discount_percentage / 100);

    // 2. 创建销售记录
    const { data: sale, error: saleError } = await supabase
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
    const { error: addError } = await supabase.rpc('add_tokens', {
      p_user_id: userId,
      p_tokens: pkg.token_amount,
    });

    if (addError) throw addError;

    return { success: true, saleId: sale?.id };
  } catch (error: any) {
    console.error('Token 购买失败:', error);
    return { success: false, error: error.message || '购买失败' };
  }
}

/**
 * 获取充值记录
 */
export async function getPurchaseHistory(userId: string): Promise<TokenSale[]> {
  try {
    const { data, error } = await supabase
      .from('token_sales')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取充值记录失败:', error);
    return [];
  }
}

// ==========================================================
// 用户 Token 配置
// ==========================================================

/**
 * 获取用户 Token 配置
 */
export async function getUserTokenConfig(userId: string): Promise<UserTokenConfig | null> {
  try {
    const { data, error } = await supabase
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
    const { error } = await supabase
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

// ==========================================================
// 免费额度查询
// ==========================================================

/**
 * 获取新用户免费额度信息
 */
export async function getFreeAllowance(userId: string): Promise<{
  free_token_used: number;
  free_products_used: number;
  free_storage_mb_used: number;
} | null> {
  try {
    // 查询用户注册时的初始余额为 50000
    const { data: balance } = await supabase
      .from('token_balances')
      .select('total_purchased, total_used')
      .eq('user_id', userId)
      .single();

    if (!balance) return null;

    // 免费额度 = 注册赠送 50000 PT
    const freeTokenUsed = Math.min(balance.total_used, 50000);

    return {
      free_token_used: freeTokenUsed,
      free_products_used: 0,
      free_storage_mb_used: 0,
    };
  } catch (error) {
    console.error('获取免费额度失败:', error);
    return null;
  }
}
