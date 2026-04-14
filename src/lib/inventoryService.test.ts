import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInventoryTransaction,
  getInventoryTransactions,
  getInventoryStats,
} from '../lib/inventoryService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInventoryTransaction', () => {
    it('应该成功创建入库交易', async () => {
      const mockResult = {
        id: '1',
        message: '库存交易创建成功',
      };

      (invoke as any).mockResolvedValue(mockResult);

      const result = await createInventoryTransaction({
        product_id: 'prod1',
        transaction_type: 'inbound',
        quantity: 100,
        reference_no: 'REF001',
        reason: '采购入库',
        performed_by: 'user1',
        notes: 'Test inbound',
      });

      expect(result).toEqual(mockResult);
      expect(invoke).toHaveBeenCalledWith('create_inventory_transaction', {
        transaction: {
          product_id: 'prod1',
          transaction_type: 'inbound',
          quantity: 100,
          reference_no: 'REF001',
          reason: '采购入库',
          performed_by: 'user1',
          notes: 'Test inbound',
        },
      });
    });

    it('应该成功创建出库交易', async () => {
      const mockResult = {
        id: '2',
        message: '库存交易创建成功',
      };

      (invoke as any).mockResolvedValue(mockResult);

      const result = await createInventoryTransaction({
        product_id: 'prod2',
        transaction_type: 'outbound',
        quantity: 50,
        reference_no: 'REF002',
        reason: '销售出库',
      });

      expect(result).toEqual(mockResult);
      expect(invoke).toHaveBeenCalledWith('create_inventory_transaction', {
        transaction: {
          product_id: 'prod2',
          transaction_type: 'outbound',
          quantity: 50,
          reference_no: 'REF002',
          reason: '销售出库',
        },
      });
    });

    it('应该成功创建库存调整交易', async () => {
      const mockResult = {
        id: '3',
        message: '库存交易创建成功',
      };

      (invoke as any).mockResolvedValue(mockResult);

      const result = await createInventoryTransaction({
        product_id: 'prod3',
        transaction_type: 'adjustment',
        quantity: -10,
        reason: '盘点调整',
        notes: 'Found damaged goods',
      });

      expect(result).toEqual(mockResult);
      expect(invoke).toHaveBeenCalledWith('create_inventory_transaction', {
        transaction: {
          product_id: 'prod3',
          transaction_type: 'adjustment',
          quantity: -10,
          reason: '盘点调整',
          notes: 'Found damaged goods',
        },
      });
    });

    it('应该成功创建调拨交易', async () => {
      const mockResult = {
        id: '4',
        message: '库存交易创建成功',
      };

      (invoke as any).mockResolvedValue(mockResult);

      await createInventoryTransaction({
        product_id: 'prod4',
        transaction_type: 'transfer',
        quantity: 25,
        reference_no: 'TRF001',
        reason: '仓库调拨',
      });

      expect(invoke).toHaveBeenCalledWith('create_inventory_transaction', {
        transaction: {
          product_id: 'prod4',
          transaction_type: 'transfer',
          quantity: 25,
          reference_no: 'TRF001',
          reason: '仓库调拨',
        },
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));

      await expect(
        createInventoryTransaction({
          product_id: 'prod1',
          transaction_type: 'inbound',
          quantity: 100,
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getInventoryTransactions', () => {
    it('应该获取库存交易列表', async () => {
      const mockTransactions = [
        {
          id: '1',
          product_id: 'prod1',
          transaction_type: 'inbound' as const,
          quantity: 100,
          reference_no: 'REF001',
          reason: '采购入库',
          performed_by: 'user1',
          notes: 'Test',
          created_at: new Date().toISOString(),
          sync_status: 'synced',
        },
        {
          id: '2',
          product_id: 'prod2',
          transaction_type: 'outbound' as const,
          quantity: 50,
          reference_no: 'REF002',
          reason: '销售出库',
          created_at: new Date().toISOString(),
          sync_status: 'pending',
        },
      ];

      (invoke as any).mockResolvedValue(mockTransactions);

      const result = await getInventoryTransactions();

      expect(result).toEqual(mockTransactions);
      expect(invoke).toHaveBeenCalledWith('get_inventory_transactions', {
        options: undefined,
      });
    });

    it('应该使用产品 ID 过滤交易', async () => {
      const mockTransactions: any[] = [];
      (invoke as any).mockResolvedValue(mockTransactions);

      await getInventoryTransactions({ product_id: 'prod1' });

      expect(invoke).toHaveBeenCalledWith('get_inventory_transactions', {
        options: { product_id: 'prod1' },
      });
    });

    it('应该使用交易类型过滤', async () => {
      const mockTransactions: any[] = [];
      (invoke as any).mockResolvedValue(mockTransactions);

      await getInventoryTransactions({ transaction_type: 'inbound' });

      expect(invoke).toHaveBeenCalledWith('get_inventory_transactions', {
        options: { transaction_type: 'inbound' },
      });
    });

    it('应该使用日期范围过滤', async () => {
      const mockTransactions: any[] = [];
      (invoke as any).mockResolvedValue(mockTransactions);

      await getInventoryTransactions({
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(invoke).toHaveBeenCalledWith('get_inventory_transactions', {
        options: {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      });
    });

    it('应该支持多个过滤条件', async () => {
      const mockTransactions: any[] = [];
      (invoke as any).mockResolvedValue(mockTransactions);

      await getInventoryTransactions({
        product_id: 'prod1',
        transaction_type: 'inbound',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(invoke).toHaveBeenCalledWith('get_inventory_transactions', {
        options: {
          product_id: 'prod1',
          transaction_type: 'inbound',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      });
    });

    it('应该返回空数组当没有交易时', async () => {
      (invoke as any).mockResolvedValue([]);

      const result = await getInventoryTransactions();

      expect(result).toEqual([]);
    });
  });

  describe('getInventoryStats', () => {
    it('应该获取库存统计信息', async () => {
      const mockStats = {
        total_products: 100,
        low_stock_count: 10,
        zero_stock_count: 5,
        today_transactions: 25,
        total_value: 50000,
        low_stock_products: [
          {
            id: 'prod1',
            name: 'Product 1',
            sku: 'SKU001',
            current_stock: 5,
            min_stock: 10,
          },
          {
            id: 'prod2',
            name: 'Product 2',
            sku: 'SKU002',
            current_stock: 3,
            min_stock: 8,
          },
        ],
      };

      (invoke as any).mockResolvedValue(mockStats);

      const result = await getInventoryStats();

      expect(result).toEqual(mockStats);
      expect(invoke).toHaveBeenCalledWith('get_inventory_stats');
    });

    it('应该在所有产品库存充足时返回零低库存', async () => {
      const mockStats = {
        total_products: 50,
        low_stock_count: 0,
        zero_stock_count: 0,
        today_transactions: 10,
        total_value: 25000,
        low_stock_products: [],
      };

      (invoke as any).mockResolvedValue(mockStats);

      const result = await getInventoryStats();

      expect(result).toEqual(mockStats);
      expect(result.low_stock_count).toBe(0);
      expect(result.zero_stock_count).toBe(0);
      expect(result.low_stock_products).toEqual([]);
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));

      await expect(getInventoryStats()).rejects.toThrow('API Error');
    });
  });
});
