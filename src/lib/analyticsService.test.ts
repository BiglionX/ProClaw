import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSalesTrend, getProductAnalytics } from '../lib/analyticsService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', () => ({ isTauri: () => true }));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSalesTrend', () => {
    it('应该获取日销售趋势', async () => {
      const mockData = {
        period: 'day' as const,
        data: [
          { date: '2024-01-01', transaction_count: 10, outbound_qty: 50, inbound_qty: 30 },
          { date: '2024-01-02', transaction_count: 15, outbound_qty: 75, inbound_qty: 40 },
        ],
      };
      (invoke as any).mockResolvedValue(mockData);

      const result = await getSalesTrend('day');
      expect(result).toEqual(mockData);
      expect(invoke).toHaveBeenCalledWith('get_sales_trend', { period: 'day' });
    });

    it('应该获取周销售趋势', async () => {
      const mockData = { period: 'week' as const, data: [] };
      (invoke as any).mockResolvedValue(mockData);

      await getSalesTrend('week');
      expect(invoke).toHaveBeenCalledWith('get_sales_trend', { period: 'week' });
    });

    it('应该获取月销售趋势', async () => {
      const mockData = { period: 'month' as const, data: [] };
      (invoke as any).mockResolvedValue(mockData);

      await getSalesTrend('month');
      expect(invoke).toHaveBeenCalledWith('get_sales_trend', { period: 'month' });
    });

    it('默认应获取日趋势', async () => {
      const mockData = { period: 'day' as const, data: [] };
      (invoke as any).mockResolvedValue(mockData);

      await getSalesTrend();
      expect(invoke).toHaveBeenCalledWith('get_sales_trend', { period: undefined });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(getSalesTrend('day')).rejects.toThrow('API Error');
    });
  });

  describe('getProductAnalytics', () => {
    it('应该获取产品分析数据', async () => {
      const mockData = {
        best_selling: [
          { id: '1', name: '畅销产品', sku: 'SKU001', total_sold: 500 },
        ],
        slow_moving: [
          { id: '2', name: '滞销产品', sku: 'SKU002', current_stock: 100, stock_value: 5000 },
        ],
        turnover_by_category: [
          { category: '电子产品', product_count: 10, total_stock: 200, total_sold: 150, turnover_rate: '75%' },
        ],
      };
      (invoke as any).mockResolvedValue(mockData);

      const result = await getProductAnalytics();
      expect(result).toEqual(mockData);
      expect(invoke).toHaveBeenCalledWith('get_product_analytics');
    });

    it('应该处理空数据', async () => {
      const mockData = {
        best_selling: [],
        slow_moving: [],
        turnover_by_category: [],
      };
      (invoke as any).mockResolvedValue(mockData);

      const result = await getProductAnalytics();
      expect(result.best_selling).toEqual([]);
      expect(result.slow_moving).toEqual([]);
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(getProductAnalytics()).rejects.toThrow('API Error');
    });
  });
});
