import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderDetail,
  generateSupplierCode,
  generatePurchaseOrderNumber,
} from '../lib/purchaseService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', async () => {
  const core = await import('@tauri-apps/api/core');
  return {
    isTauri: () => true,
    ipcInvoke: core.invoke,
    ipcInvokeOrNull: core.invoke,
    safeInvoke: core.invoke,
    openExternalUrl: vi.fn(),
  };
});

describe('purchaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSupplierCode', () => {
    it('应该生成 SUP- 前缀的编码', () => {
      const code = generateSupplierCode();
      expect(code).toMatch(/^SUP-\d{8}-[A-Z0-9]{4}$/);
    });

    it('每次调用应生成不同编码', () => {
      const code1 = generateSupplierCode();
      const code2 = generateSupplierCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('generatePurchaseOrderNumber', () => {
    it('应该生成 PO- 前缀的订单号', () => {
      const code = generatePurchaseOrderNumber();
      expect(code).toMatch(/^PO-\d{8}-[A-Z0-9]{4}$/);
    });

    it('每次调用应生成不同订单号', () => {
      const code1 = generatePurchaseOrderNumber();
      const code2 = generatePurchaseOrderNumber();
      expect(code1).not.toBe(code2);
    });
  });

  describe('createSupplier', () => {
    it('应该成功创建供应商', async () => {
      const mockSupplier = { id: '1', name: 'Test Supplier', code: 'SUP-20240101-A001' };
      (invoke as any).mockResolvedValue(mockSupplier);

      const result = await createSupplier({ name: 'Test Supplier' });
      expect(result).toEqual(mockSupplier);
      expect(invoke).toHaveBeenCalledWith('create_supplier', {
        supplier: expect.objectContaining({
          name: 'Test Supplier',
          code: expect.any(String),
        }),
      });
    });

    it('应该使用自定义编码创建供应商', async () => {
      const mockSupplier = { id: '2', name: 'Custom Supplier', code: 'SUP-CUSTOM' };
      (invoke as any).mockResolvedValue(mockSupplier);

      await createSupplier({ name: 'Custom Supplier', code: 'SUP-CUSTOM' });
      expect(invoke).toHaveBeenCalledWith('create_supplier', {
        supplier: expect.objectContaining({ code: 'SUP-CUSTOM' }),
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(createSupplier({ name: 'Test' })).rejects.toThrow('API Error');
    });
  });

  describe('getSuppliers', () => {
    it('应该获取供应商列表', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', code: 'SUP001', is_active: true, created_at: '', updated_at: '' },
      ];
      (invoke as any).mockResolvedValue(mockSuppliers);

      const result = await getSuppliers();
      expect(result).toEqual(mockSuppliers);
    });

    it('应该使用搜索选项获取供应商', async () => {
      (invoke as any).mockResolvedValue([]);
      await getSuppliers({ search: 'test' });
      expect(invoke).toHaveBeenCalledWith('get_suppliers', { options: { search: 'test' } });
    });
  });

  describe('createPurchaseOrder', () => {
    it('应该成功创建采购订单', async () => {
      const mockOrder = { id: '1', po_number: 'PO-20240101-A001', total_amount: 1500 };
      (invoke as any).mockResolvedValue(mockOrder);

      const result = await createPurchaseOrder({
        supplier_id: 'sup1',
        items: [{ product_id: 'prod1', quantity: 10, unit_price: 150 }],
      });

      expect(result).toEqual(mockOrder);
      expect(invoke).toHaveBeenCalledWith('create_purchase_order', {
        order: expect.objectContaining({
          supplier_id: 'sup1',
          po_number: expect.any(String),
          items: [{ product_id: 'prod1', quantity: 10, unit_price: 150 }],
        }),
      });
    });

    it('应该使用自定义订单号创建采购订单', async () => {
      const mockOrder = { id: '2', po_number: 'PO-CUSTOM', total_amount: 3000 };
      (invoke as any).mockResolvedValue(mockOrder);

      await createPurchaseOrder({
        po_number: 'PO-CUSTOM',
        supplier_id: 'sup2',
        items: [{ product_id: 'prod2', quantity: 20, unit_price: 150 }],
      });

      expect(invoke).toHaveBeenCalledWith('create_purchase_order', {
        order: expect.objectContaining({ po_number: 'PO-CUSTOM' }),
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(
        createPurchaseOrder({
          supplier_id: 'sup1',
          items: [{ product_id: 'prod1', quantity: 1, unit_price: 100 }],
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getPurchaseOrders', () => {
    it('应该获取采购订单列表', async () => {
      const mockOrders = [
        { id: '1', po_number: 'PO001', supplier_id: 'sup1', status: 'confirmed', total_amount: 1000, paid_amount: 0, payment_status: 'unpaid', order_date: '', created_at: '', updated_at: '' },
      ];
      (invoke as any).mockResolvedValue(mockOrders);

      const result = await getPurchaseOrders();
      expect(result).toEqual(mockOrders);
    });

    it('应该使用状态过滤获取订单', async () => {
      (invoke as any).mockResolvedValue([]);
      await getPurchaseOrders({ status: 'confirmed' });
      expect(invoke).toHaveBeenCalledWith('get_purchase_orders', { options: { status: 'confirmed' } });
    });
  });

  describe('getPurchaseOrderDetail', () => {
    it('应该获取采购订单详情', async () => {
      const mockDetail = {
        order: { id: '1', po_number: 'PO001', supplier_id: 'sup1', status: 'confirmed' as const, total_amount: 1000, paid_amount: 0, payment_status: 'unpaid' as const, order_date: '', created_at: '', updated_at: '' },
        items: [{ id: '1', product_id: 'prod1', quantity: 10, unit_price: 100, total_price: 1000 }],
      };
      (invoke as any).mockResolvedValue(mockDetail);

      const result = await getPurchaseOrderDetail('1');
      expect(result).toEqual(mockDetail);
      expect(invoke).toHaveBeenCalledWith('get_purchase_order_detail', { orderId: '1' });
    });
  });
});
