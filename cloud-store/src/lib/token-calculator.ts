// ProClaw Shop - Token 消耗计算器
// 根据操作类型计算 Token 消耗

import { createClient } from '@supabase/supabase-js';

/**
 * Token 消费规则
 */
interface TokenRule {
  action: string;
  name: string;
  token_cost: number;
  cost_type: 'fixed' | 'per_unit' | 'tiered';
  daily_limit: number | null;
  monthly_limit: number | null;
}

/**
 * 消费上下文
 */
interface ConsumeContext {
  tenant_id: string;
  action: string;
  quantity?: number;  // 用于 per_unit 类型
  metadata?: Record<string, unknown>;
}

/**
 * 消费结果
 */
interface ConsumeResult {
  success: boolean;
  tokens_consumed: number;
  balance_before: number;
  balance_after: number;
  error?: string;
}

/**
 * Token 计算器类
 */
export class TokenCalculator {
  private supabase: ReturnType<typeof createClient>;
  private rules: Map<string, TokenRule> = new Map();
  private rulesLoaded = false;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    // 注意：不再在构造函数中同步调用 loadRules
  }
  
  /**
   * 初始化规则（异步）
   */
  async initialize(): Promise<void> {
    if (this.rulesLoaded) return;
    await this.loadRules();
    this.rulesLoaded = true;
  }
  
  /**
   * 加载消费规则
   */
  private async loadRules() {
    const { data } = await this.supabase
      .from('token_rules')
      .select('*')
      .eq('active', true);
    
    if (data) {
      data.forEach((rule: TokenRule) => {
        this.rules.set(rule.action, rule);
      });
    }
  }
  
  /**
   * 获取操作规则
   */
  getRule(action: string): TokenRule | undefined {
    return this.rules.get(action);
  }
  
  /**
   * 计算 Token 消耗
   */
  calculate(action: string, quantity = 1): number {
    const rule = this.rules.get(action);
    
    if (!rule) {
      // 默认消耗 1 Token
      return 1;
    }
    
    switch (rule.cost_type) {
      case 'fixed':
        return rule.token_cost;
      case 'per_unit':
        return rule.token_cost * quantity;
      case 'tiered':
        // TODO: 实现阶梯计费
        return rule.token_cost * quantity;
      default:
        return rule.token_cost;
    }
  }
  
  /**
   * 消费 Token（使用数据库事务防止竞态）
   */
  async consume(context: ConsumeContext): Promise<ConsumeResult> {
    // 确保规则已加载
    await this.initialize();
    
    const { tenant_id, action, quantity = 1, metadata } = context;
    
    // 计算消耗
    const tokens_consumed = this.calculate(action, quantity);
    
    // 使用 Supabase RPC 调用数据库函数执行原子操作
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data, error } = await (this.supabase as any)
      .rpc('consume_token', {
        p_tenant_id: tenant_id,
        p_amount: tokens_consumed,
        p_action: action,
        p_quantity: quantity,
        p_metadata: metadata || {},
      });
    
    if (error) {
      console.error('Token consume error:', error);
      // 回退到原来的非事务方式（仅用于没有 RPC 函数的情况）
      return this.consumeFallback(context);
    }
    
    const rpcData = data as any;
    return {
      success: rpcData.success,
      tokens_consumed: rpcData.tokens_consumed,
      balance_before: rpcData.balance_before,
      balance_after: rpcData.balance_after,
      error: rpcData.error,
    };
  }
  
  /**
   * 回退方案（非事务方式，仅用于兼容）
   */
  private async consumeFallback(context: ConsumeContext): Promise<ConsumeResult> {
    const { tenant_id, action, quantity = 1, metadata } = context;
    
    const tokens_consumed = this.calculate(action, quantity);
    
    // 获取当前余额
    const { data: tenant, error: tenantError } = await this.supabase
      .from('tenants')
      .select('token_balance, token_used')
      .eq('id', tenant_id)
      .single();
    
    if (tenantError || !tenant) {
      return {
        success: false,
        tokens_consumed: 0,
        balance_before: 0,
        balance_after: 0,
        error: '获取租户信息失败',
      };
    }
    
    const tenantData = tenant as { token_balance: number; token_used: number };
    const balance_before = tenantData.token_balance || 0;
    
    // 检查余额是否充足
    if (balance_before < tokens_consumed) {
      return {
        success: false,
        tokens_consumed,
        balance_before,
        balance_after: balance_before,
        error: 'Token 余额不足',
      };
    }
    
    const balance_after = balance_before - tokens_consumed;
    
    // 使用乐观锁更新（添加 token_balance 条件）
    const { error: updateError } = await (this.supabase as any)
      .from('tenants')
      .update({ 
        token_balance: balance_after,
        token_used: (tenantData.token_used || 0) + tokens_consumed,
      })
      .eq('id', tenant_id)
      .eq('token_balance', balance_before); // 乐观锁：只有余额未变时才更新
    
    if (updateError || updateError === null) {
      // 如果 updateError 是 null，说明没有行被更新（余额已变化）
      return {
        success: false,
        tokens_consumed,
        balance_before,
        balance_after: balance_before,
        error: '并发冲突，请重试',
      };
    }
    
    // 记录交易
    const { error: insertError } = await (this.supabase as any)
      .from('token_transactions')
      .insert({
        tenant_id,
        type: 'consume',
        amount: -tokens_consumed,
        balance_before,
        balance_after,
        details: {
          action,
          quantity,
          ...metadata,
        },
      });
    
    if (insertError) {
      console.error('Failed to record transaction:', insertError);
      // 交易记录失败意味着数据不一致，应该返回错误让调用方处理
      return {
        success: false,
        tokens_consumed,
        balance_before,
        balance_after: balance_before, // 回滚余额
        error: '交易记录失败，Token 可能已扣除但未记录',
      };
    }
    
    return {
      success: true,
      tokens_consumed,
      balance_before,
      balance_after,
    };
  }
  
  /**
   * 充值 Token
   */
  async recharge(tenant_id: string, amount: number, options?: {
    order_id?: string;
    payment_id?: string;
    note?: string;
    grant?: boolean;  // 是否为赠送
  }): Promise<ConsumeResult> {
    // 获取当前余额
    const { data: tenant, error: tenantError } = await this.supabase
      .from('tenants')
      .select('token_balance, token_total_purchased')
      .eq('id', tenant_id)
      .single();
    
    if (tenantError || !tenant) {
      return {
        success: false,
        tokens_consumed: 0,
        balance_before: 0,
        balance_after: 0,
        error: '获取租户信息失败',
      };
    }
    
    const tenantData = tenant as { token_balance: number; token_total_purchased: number };
    const balance_before = tenantData.token_balance || 0;
    const balance_after = balance_before + amount;
    
    // 更新余额
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { error: updateError } = await (this.supabase as any)
      .from('tenants')
      .update({ 
        token_balance: balance_after,
        token_total_purchased: (tenantData.token_total_purchased || 0) + amount,
      })
      .eq('id', tenant_id);
    
    if (updateError) {
      return {
        success: false,
        tokens_consumed: 0,
        balance_before,
        balance_after,
        error: '更新余额失败',
      };
    }
    
    // 记录交易
    const { error: insertError } = await (this.supabase as any)
      .from('token_transactions')
      .insert({
        tenant_id,
        type: options?.grant ? 'grant' : 'purchase',
        amount,
        balance_before,
        balance_after,
        order_id: options?.order_id,
        payment_id: options?.payment_id,
        note: options?.note,
      });
    
    if (insertError) {
      console.error('Failed to record recharge transaction:', insertError);
      // 注意：充值成功但记录失败，需要人工干预
    }
    
    return {
      success: true,
      tokens_consumed: amount,
      balance_before,
      balance_after,
    };
  }
  
  /**
   * 检查日限额
   */
  async checkDailyLimit(tenant_id: string, action: string): Promise<{
    allowed: boolean;
    used: number;
    limit: number | null;
  }> {
    await this.initialize();
    
    const rule = this.rules.get(action);
    if (!rule || !rule.daily_limit) {
      return { allowed: true, used: 0, limit: null };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await this.supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('type', 'consume')
      .eq('details->>action', action)
      .gte('created_at', today.toISOString());
    
    const used = count || 0;
    const allowed = used < rule.daily_limit;
    
    return {
      allowed,
      used,
      limit: rule.daily_limit,
    };
  }
}

/**
 * Token 操作类型枚举
 */
export enum TokenActions {
  // 商品操作
  VIEW_PRODUCT = 'view_product',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT = 'checkout',
  
  // AI 功能
  AI_THEME = 'ai_theme',
  AI_IMAGE_SEARCH = 'ai_image_search',
  
  // 订单操作
  CREATE_ORDER = 'create_order',
  ORDER_CREATE = 'order_create',
  VIEW_ORDER = 'view_order',
  
  // 同步操作
  SYNC_PRODUCTS = 'sync_products',
  PRODUCT_SYNC = 'product_sync',
  
  // 搜索操作
  SEARCH = 'search',
  
  // 默认
  DEFAULT = 'default',
}
