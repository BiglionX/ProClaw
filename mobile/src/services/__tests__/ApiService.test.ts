/// <reference types="jest" />

/**
 * ApiService 单元测试
 * 测试数据访问、离线队列同步
 */

// Mock 依赖
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/errorUtils', () => ({
  getErrorMessage: jest.fn((err, fallback) => (err instanceof Error ? err.message : fallback)),
}));

jest.mock('../../utils/generateId', () => ({
  generateId: jest.fn((prefix) => `${prefix || 'id'}_${Date.now()}`),
}));

jest.mock('../AuthService', () => ({
  getApiClient: jest.fn(),
  getConnectionMode: jest.fn(),
}));

jest.mock('../ConnectionManager', () => ({
  getConnectionMode: jest.fn(),
}));

jest.mock('../ChangeLogManager', () => ({
  writeChangeLog: jest.fn(),
}));

jest.mock('../DatabaseFactory', () => ({
  getDatabase: jest.fn(),
}));

// Mock 数据库
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  execAsync: jest.fn(),
};

const { getDatabase } = require('../DatabaseFactory');
const { getApiClient } = require('../AuthService');
const { getConnectionMode } = require('../ConnectionManager');

import {
  getProducts,
  getCustomers,
  createSalesOrder,
  syncOfflineQueue,
} from '../ApiService';

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认 mock 实现
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
    mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });
    
    getDatabase.mockReturnValue(mockDb);
    getConnectionMode.mockReturnValue('offline');
    getApiClient.mockResolvedValue({
      get: jest.fn(),
      post: jest.fn(),
      request: jest.fn(),
    });
  });

  // ============================================================
  // getProducts
  // ============================================================

  describe('getProducts', () => {
    it('离线模式下应从本地数据库查询', async () => {
      const mockProducts = [
        { id: '1', name: '产品A', sku: 'SKU001', price: 100, stock_quantity: 50 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockProducts);
      getConnectionMode.mockReturnValue('offline');

      const products = await getProducts();

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(products).toEqual(mockProducts);
    });

    it('在线模式下应从服务器获取并同步到本地', async () => {
      const serverProducts = [
        { id: '1', name: '产品A', sku: 'SKU001', price: 100, stock_quantity: 50 },
      ];
      const mockClient = {
        get: jest.fn().mockResolvedValue({ data: serverProducts }),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      const products = await getProducts();

      expect(mockClient.get).toHaveBeenCalledWith('/api/products', expect.any(Object));
      expect(products).toEqual(serverProducts);
    });

    it('服务器失败时应回退到本地数据库', async () => {
      const mockProducts = [
        { id: '2', name: '产品B', sku: 'SKU002', price: 200, stock_quantity: 30 },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockProducts);
      
      const mockClient = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      const products = await getProducts();

      expect(products).toEqual(mockProducts);
    });

    it('应支持搜索参数', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      getConnectionMode.mockReturnValue('offline');

      await getProducts({ search: '测试', limit: 10 });

      // 验证 SQL 包含 LIKE 条件
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.any(Array)
      );
    });
  });

  // ============================================================
  // getCustomers
  // ============================================================

  describe('getCustomers', () => {
    it('离线模式下应从本地数据库查询', async () => {
      const mockCustomers = [
        { id: '1', name: '客户A', phone: '13800000001' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockCustomers);
      getConnectionMode.mockReturnValue('offline');

      const customers = await getCustomers();

      expect(mockDb.getAllAsync).toHaveBeenCalled();
      expect(customers).toEqual(mockCustomers);
    });

    it('服务器失败时应回退到本地数据库', async () => {
      const mockCustomers = [
        { id: '2', name: '客户B', phone: '13800000002' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockCustomers);
      
      const mockClient = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      const customers = await getCustomers();

      expect(customers).toEqual(mockCustomers);
    });
  });

  // ============================================================
  // createSalesOrder
  // ============================================================

  describe('createSalesOrder', () => {
    const orderData = {
      customer_id: 'customer_123',
      items: [
        { product_id: 'prod_1', product_name: '产品A', quantity: 2, unit_price: 100, subtotal: 200 },
      ],
      notes: '测试订单',
    };

    it('离线模式下应创建本地订单并加入离线队列', async () => {
      getConnectionMode.mockReturnValue('offline');
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const order = await createSalesOrder(orderData);

      expect(order.id).toBeDefined();
      expect(order.status).toBe('draft');
      // 验证 offline_queue 被写入
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_queue'),
        expect.any(Array)
      );
    });

    it('在线模式下应创建服务器订单', async () => {
      const serverOrder = {
        id: 'server_order_123',
        order_number: 'SO123',
        customer_id: 'customer_123',
        total_amount: 200,
        status: 'pending',
        items: orderData.items,
        created_at: '2026-06-10T00:00:00Z',
      };
      
      const mockClient = {
        post: jest.fn().mockResolvedValue({ data: serverOrder }),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      const order = await createSalesOrder(orderData);

      expect(mockClient.post).toHaveBeenCalledWith('/api/sales_orders', orderData);
      expect(order.id).toBe('server_order_123');
    });

    it('服务器失败时应回退到本地创建', async () => {
      const mockClient = {
        post: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      const order = await createSalesOrder(orderData);

      expect(order.id).toBeDefined();
      expect(order.status).toBe('draft');
      // 离线队列应被写入
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_queue'),
        expect.any(Array)
      );
    });

    it('应正确计算订单总额', async () => {
      getConnectionMode.mockReturnValue('offline');
      mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

      const order = await createSalesOrder(orderData);

      expect(order.total_amount).toBe(200);
    });
  });

  // ============================================================
  // syncOfflineQueue
  // ============================================================

  describe('syncOfflineQueue', () => {
    const queueItem = {
      id: 'queue_1',
      endpoint: '/api/sales_orders',
      method: 'POST',
      payload: JSON.stringify({ customer_id: 'c1', items: [] }),
      created_at: Date.now(),
    };

    it('离线模式下不应同步', async () => {
      getConnectionMode.mockReturnValue('offline');

      await syncOfflineQueue();

      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });

    it('在线模式下应同步队列项', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([queueItem]);
      
      const mockClient = {
        request: jest.fn().mockResolvedValue({}),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      await syncOfflineQueue();

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/sales_orders',
        data: expect.any(Object),
      });
      // 同步成功后应删除队列项
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM offline_queue'),
        ['queue_1']
      );
    });

    it('同步失败后应保留队列项', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([queueItem]);
      
      const mockClient = {
        request: jest.fn().mockRejectedValue(new Error('Server error')),
      };
      getApiClient.mockResolvedValue(mockClient);
      getConnectionMode.mockReturnValue('direct');

      await syncOfflineQueue();

      // 同步失败后不应删除队列项
      expect(mockDb.runAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Array)
      );
    });

    it('应限制每批处理数量（100条）', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      getConnectionMode.mockReturnValue('direct');

      await syncOfflineQueue();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        [100]
      );
    });
  });
});