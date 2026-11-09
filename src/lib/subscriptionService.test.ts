import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPlans,
  getMySubscription,
  subscribePlan,
  cancelSubscription,
  getTokenSummary,
  getTokenUsage,
  recordToken,
  getTokenBalance,
  estimateTokenCost,
  getInvoices,
} from '../lib/subscriptionService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlans', () => {
    it('应该获取套餐列表', async () => {
      const mockPlans = [
        {
          id: '1', plan_key: 'basic', name: '基础版', description: '基础套餐',
          monthly_price: 9.9, yearly_price: 99, token_quota: 10000,
          max_devices: 3, features: '基础功能', is_active: true, sort_order: 1,
        },
      ];
      (invoke as any).mockResolvedValue({ data: mockPlans });

      const result = await getPlans();
      expect(result).toEqual(mockPlans);
      expect(invoke).toHaveBeenCalledWith('get_plans_cmd');
    });
  });

  describe('getMySubscription', () => {
    it('应该获取当前订阅', async () => {
      const mockSub = {
        id: 'sub1', user_id: 'user1', plan_id: 'plan1', plan_name: '基础版',
        plan_key: 'basic', token_quota: 10000, status: 'active',
        billing_cycle: 'monthly', started_at: '2024-01-01', expires_at: '2024-02-01',
        auto_renew: true, token_used_this_month: 1000,
      };
      (invoke as any).mockResolvedValue({ data: mockSub });

      const result = await getMySubscription('user1');
      expect(result).toEqual(mockSub);
      expect(invoke).toHaveBeenCalledWith('get_my_subscription_cmd', { userId: 'user1' });
    });

    it('订阅不存在时应返回 null', async () => {
      (invoke as any).mockResolvedValue({ data: null });
      const result = await getMySubscription('user1');
      expect(result).toBeNull();
    });
  });

  describe('subscribePlan', () => {
    it('应该订阅套餐', async () => {
      const mockResult = { subscription_id: 'sub1', message: '订阅成功' };
      (invoke as any).mockResolvedValue(mockResult);

      const result = await subscribePlan({
        user_id: 'user1',
        plan_id: 'plan1',
        billing_cycle: 'monthly',
      });

      expect(result).toEqual(mockResult);
      expect(invoke).toHaveBeenCalledWith('subscribe_plan_cmd', {
        userId: 'user1',
        planId: 'plan1',
        billingCycle: 'monthly',
      });
    });
  });

  describe('cancelSubscription', () => {
    it('应该取消订阅', async () => {
      const mockResult = { message: '订阅已取消' };
      (invoke as any).mockResolvedValue(mockResult);

      const result = await cancelSubscription('user1');
      expect(result).toEqual(mockResult);
      expect(invoke).toHaveBeenCalledWith('cancel_subscription_cmd', { userId: 'user1' });
    });
  });

  describe('getTokenSummary', () => {
    it('应该获取 token 用量概览', async () => {
      const mockSummary = {
        user_id: 'user1', plan_name: '基础版', plan_key: 'basic',
        token_quota: 10000, token_used: 3000, token_remaining: 7000,
        usage_percent: 30, subscription_status: 'active',
      };
      (invoke as any).mockResolvedValue({ data: mockSummary });

      const result = await getTokenSummary('user1');
      expect(result).toEqual(mockSummary);
      expect(invoke).toHaveBeenCalledWith('get_token_summary_cmd', { userId: 'user1' });
    });
  });

  describe('getTokenUsage', () => {
    it('应该获取 token 使用记录', async () => {
      const mockEntries = [
        { id: '1', tokens_consumed: 10, action_type: 'api_call', resource_path: '/api/products', ip_address: null, created_at: '' },
      ];
      (invoke as any).mockResolvedValue({ data: mockEntries });

      const result = await getTokenUsage('user1');
      expect(result).toEqual(mockEntries);
      expect(invoke).toHaveBeenCalledWith('get_token_usage_cmd', {
        userId: 'user1',
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('recordToken', () => {
    it('应该记录 token 消耗', async () => {
      (invoke as any).mockResolvedValue(undefined);

      await recordToken('user1', 'api_call', '/api/products');
      expect(invoke).toHaveBeenCalledWith('record_token_cmd', {
        userId: 'user1',
        actionType: 'api_call',
        resourcePath: '/api/products',
      });
    });
  });

  describe('getInvoices', () => {
    it('应该获取账单列表', async () => {
      const mockInvoices = [
        { id: '1', invoice_number: 'INV-001', amount: 9.9, status: 'paid', payment_method: 'alipay', billing_period_start: '2024-01-01', billing_period_end: '2024-02-01', paid_at: '2024-01-01', created_at: '' },
      ];
      (invoke as any).mockResolvedValue({ data: mockInvoices });

      const result = await getInvoices('user1');
      expect(result).toEqual(mockInvoices);
      expect(invoke).toHaveBeenCalledWith('get_invoices_cmd', { userId: 'user1' });
    });
  });

  describe('getTokenBalance', () => {
    it('以 userId 传给 get_token_balance_cmd', async () => {
      (invoke as any).mockResolvedValue({ data: { user_id: 'user1', balance: 10 } });
      await getTokenBalance('user1');
      expect(invoke).toHaveBeenCalledWith('get_token_balance_cmd', { userId: 'user1' });
    });
  });

  describe('estimateTokenCost', () => {
    it('以 resourceType 传给 estimate_token_cost_cmd', async () => {
      (invoke as any).mockResolvedValue({ cost: 5, resource_type: 'ai_chat', quantity: 2 });
      await estimateTokenCost('ai_chat', 2);
      expect(invoke).toHaveBeenCalledWith('estimate_token_cost_cmd', {
        resourceType: 'ai_chat',
        quantity: 2,
      });
    });
  });
});
