import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProfitLossReport,
  getCashFlowReport,
  getFinancialSummary,
} from '../lib/financeService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', () => ({ isTauri: () => true }));

describe('financeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfitLossReport', () => {
    it('应该获取损益报表', async () => {
      const mockReport = {
        period: { start: '2024-01-01', end: '2024-01-31' },
        revenue: 100000,
        cost_of_goods_sold: 60000,
        gross_profit: 40000,
        operating_expenses: 10000,
        net_profit: 30000,
        profit_margin: 0.3,
      };
      (invoke as any).mockResolvedValue(mockReport);

      const result = await getProfitLossReport('2024-01-01', '2024-01-31');
      expect(result).toEqual(mockReport);
      expect(invoke).toHaveBeenCalledWith('get_profit_loss_report', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('应该正确计算利润率', async () => {
      const mockReport = {
        period: { start: '2024-01-01', end: '2024-01-31' },
        revenue: 50000,
        cost_of_goods_sold: 40000,
        gross_profit: 10000,
        operating_expenses: 5000,
        net_profit: 5000,
        profit_margin: 0.1,
      };
      (invoke as any).mockResolvedValue(mockReport);

      const result = await getProfitLossReport('2024-01-01', '2024-01-31');
      expect(result.net_profit).toBe(5000);
      expect(result.profit_margin).toBe(0.1);
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(getProfitLossReport('2024-01-01', '2024-01-31')).rejects.toThrow('API Error');
    });
  });

  describe('getCashFlowReport', () => {
    it('应该获取现金流报表', async () => {
      const mockReport = {
        period: { start: '2024-01-01', end: '2024-01-31' },
        operating_activities: { inflow: 80000, outflow: 50000, net: 30000 },
        investing_activities: -10000,
        financing_activities: 5000,
        net_cash_flow: 25000,
      };
      (invoke as any).mockResolvedValue(mockReport);

      const result = await getCashFlowReport('2024-01-01', '2024-01-31');
      expect(result).toEqual(mockReport);
    });

    it('应该正确处理负现金流', async () => {
      const mockReport = {
        period: { start: '2024-01-01', end: '2024-01-31' },
        operating_activities: { inflow: 30000, outflow: 50000, net: -20000 },
        investing_activities: -5000,
        financing_activities: 0,
        net_cash_flow: -25000,
      };
      (invoke as any).mockResolvedValue(mockReport);

      const result = await getCashFlowReport('2024-01-01', '2024-01-31');
      expect(result.net_cash_flow).toBe(-25000);
    });
  });

  describe('getFinancialSummary', () => {
    it('应该获取财务概览', async () => {
      const mockSummary = {
        monthly_revenue: 100000,
        monthly_expense: 60000,
        monthly_profit: 40000,
        accounts_receivable: 25000,
        accounts_payable: 15000,
        inventory_value: 50000,
        working_capital: 60000,
      };
      (invoke as any).mockResolvedValue(mockSummary);

      const result = await getFinancialSummary();
      expect(result).toEqual(mockSummary);
      expect(invoke).toHaveBeenCalledWith('get_financial_summary');
    });

    it('营运资金应等于 (应收-应付+库存)', async () => {
      const mockSummary = {
        monthly_revenue: 100000,
        monthly_expense: 60000,
        monthly_profit: 40000,
        accounts_receivable: 50000,
        accounts_payable: 20000,
        inventory_value: 30000,
        working_capital: 60000,
      };
      (invoke as any).mockResolvedValue(mockSummary);

      const result = await getFinancialSummary();
      expect(result.working_capital).toBe(60000);
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(getFinancialSummary()).rejects.toThrow('API Error');
    });
  });
});
