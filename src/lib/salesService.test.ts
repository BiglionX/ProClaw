import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCustomer,
  getCustomers,
  createSalesOrder,
  getSalesOrders,
} from '../lib/salesService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('salesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('应该成功创建客户', async () => {
      const mockCustomer = {
        id: '1',
        name: 'Test Customer',
        code: 'CUST001',
      };

      (invoke as any).mockResolvedValue(mockCustomer);

      const result = await createCustomer({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
      });

      expect(result).toEqual(mockCustomer);
      expect(invoke).toHaveBeenCalledWith('create_customer', {
        customer: {
          name: 'Test Customer',
          phone: '1234567890',
          email: 'test@example.com',
        },
      });
    });

    it('应该使用完整参数创建客户', async () => {
      const mockCustomer = {
        id: '2',
        name: 'Company ABC',
        code: 'COMP001',
      };

      (invoke as any).mockResolvedValue(mockCustomer);

      const result = await createCustomer({
        name: 'Company ABC',
        code: 'COMP001',
        contact_person: 'John Doe',
        phone: '1234567890',
        email: 'contact@company.com',
        address: '123 Main St',
        website: 'www.company.com',
        customer_type: 'company',
        tax_number: 'TAX123456',
        credit_limit: 10000,
        notes: 'VIP customer',
        is_active: true,
      });

      expect(result).toEqual(mockCustomer);
      expect(invoke).toHaveBeenCalledWith('create_customer', {
        customer: {
          name: 'Company ABC',
          code: 'COMP001',
          contact_person: 'John Doe',
          phone: '1234567890',
          email: 'contact@company.com',
          address: '123 Main St',
          website: 'www.company.com',
          customer_type: 'company',
          tax_number: 'TAX123456',
          credit_limit: 10000,
          notes: 'VIP customer',
          is_active: true,
        },
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));

      await expect(
        createCustomer({
          name: 'Test Customer',
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getCustomers', () => {
    it('应该获取客户列表', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'Customer 1',
          code: 'CUST001',
          customer_type: 'individual' as const,
          credit_limit: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Customer 2',
          code: 'CUST002',
          customer_type: 'company' as const,
          credit_limit: 5000,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (invoke as any).mockResolvedValue(mockCustomers);

      const result = await getCustomers();

      expect(result).toEqual(mockCustomers);
      expect(invoke).toHaveBeenCalledWith('get_customers', {
        options: undefined,
      });
    });

    it('应该使用搜索选项获取客户', async () => {
      const mockCustomers: any[] = [];
      (invoke as any).mockResolvedValue(mockCustomers);

      await getCustomers({ search: 'test' });

      expect(invoke).toHaveBeenCalledWith('get_customers', {
        options: { search: 'test' },
      });
    });

    it('应该返回空数组当没有客户时', async () => {
      (invoke as any).mockResolvedValue([]);

      const result = await getCustomers();

      expect(result).toEqual([]);
    });
  });

  describe('createSalesOrder', () => {
    it('应该成功创建销售订单', async () => {
      const mockOrder = {
        id: '1',
        so_number: 'SO-2024-001',
        total_amount: 1500,
      };

      (invoke as any).mockResolvedValue(mockOrder);

      const result = await createSalesOrder({
        customer_id: 'cust1',
        items: [
          {
            product_id: 'prod1',
            quantity: 10,
            unit_price: 150,
          },
        ],
      });

      expect(result).toEqual(mockOrder);
      expect(invoke).toHaveBeenCalledWith('create_sales_order', {
        order: {
          customer_id: 'cust1',
          items: [
            {
              product_id: 'prod1',
              quantity: 10,
              unit_price: 150,
            },
          ],
        },
      });
    });

    it('应该使用完整参数创建销售订单', async () => {
      const mockOrder = {
        id: '2',
        so_number: 'SO-2024-002',
        total_amount: 3000,
      };

      (invoke as any).mockResolvedValue(mockOrder);

      const result = await createSalesOrder({
        so_number: 'SO-2024-002',
        customer_id: 'cust2',
        order_date: '2024-01-15',
        expected_delivery_date: '2024-01-20',
        shipping_address: '123 Delivery St',
        notes: 'Rush order',
        created_by: 'user1',
        items: [
          {
            product_id: 'prod1',
            quantity: 10,
            unit_price: 150,
            notes: 'Item 1',
          },
          {
            product_id: 'prod2',
            quantity: 5,
            unit_price: 300,
            notes: 'Item 2',
          },
        ],
      });

      expect(result).toEqual(mockOrder);
      expect(invoke).toHaveBeenCalledWith('create_sales_order', {
        order: {
          so_number: 'SO-2024-002',
          customer_id: 'cust2',
          order_date: '2024-01-15',
          expected_delivery_date: '2024-01-20',
          shipping_address: '123 Delivery St',
          notes: 'Rush order',
          created_by: 'user1',
          items: [
            {
              product_id: 'prod1',
              quantity: 10,
              unit_price: 150,
              notes: 'Item 1',
            },
            {
              product_id: 'prod2',
              quantity: 5,
              unit_price: 300,
              notes: 'Item 2',
            },
          ],
        },
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));

      await expect(
        createSalesOrder({
          customer_id: 'cust1',
          items: [
            {
              product_id: 'prod1',
              quantity: 1,
              unit_price: 100,
            },
          ],
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getSalesOrders', () => {
    it('应该获取销售订单列表', async () => {
      const mockOrders = [
        {
          id: '1',
          so_number: 'SO-2024-001',
          customer_id: 'cust1',
          order_date: '2024-01-15',
          status: 'confirmed' as const,
          total_amount: 1500,
          paid_amount: 0,
          payment_status: 'unpaid' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (invoke as any).mockResolvedValue(mockOrders);

      const result = await getSalesOrders();

      expect(result).toEqual(mockOrders);
      expect(invoke).toHaveBeenCalledWith('get_sales_orders', {
        options: undefined,
      });
    });

    it('应该使用状态过滤获取订单', async () => {
      const mockOrders: any[] = [];
      (invoke as any).mockResolvedValue(mockOrders);

      await getSalesOrders({ status: 'confirmed' });

      expect(invoke).toHaveBeenCalledWith('get_sales_orders', {
        options: { status: 'confirmed' },
      });
    });

    it('应该使用搜索获取订单', async () => {
      const mockOrders: any[] = [];
      (invoke as any).mockResolvedValue(mockOrders);

      await getSalesOrders({ search: 'SO-2024' });

      expect(invoke).toHaveBeenCalledWith('get_sales_orders', {
        options: { search: 'SO-2024' },
      });
    });

    it('应该返回空数组当没有订单时', async () => {
      (invoke as any).mockResolvedValue([]);

      const result = await getSalesOrders();

      expect(result).toEqual([]);
    });
  });
});
