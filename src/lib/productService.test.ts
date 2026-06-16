import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createProduct,
  getProducts,
  getProductSPUById,
  updateProduct,
  deleteProduct,
  getDatabaseStats,
  getPendingSyncRecords,
  markAsSynced,
} from '../lib/productService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('应该成功创建产品', async () => {
      const now = new Date().toISOString();
      const mockSPU = {
        id: '1',
        spu_code: 'SPU-TEST001',
        name: 'Test Product',
        unit: '个',
        status: 'on_sale',
        is_on_sale: true,
        is_featured: false,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        skus: [{
          id: 'sk1',
          spu_id: '1',
          sku_code: 'TEST001',
          specifications: {},
          spec_text: 'TEST001',
          cost_price: 100,
          sell_price: 150,
          current_stock: 0,
          min_stock: 0,
          max_stock: 999999,
          is_default: true,
          status: 'active' as const,
          created_at: now,
          updated_at: now,
        }],
      };

      (invoke as any).mockResolvedValue(mockSPU);

      const result = await createProduct({
        sku: 'TEST001',
        name: 'Test Product',
        cost_price: 100,
        sell_price: 150,
      });

      expect(result.sku).toBe('TEST001');
      expect(result.name).toBe('Test Product');
      expect(result.cost_price).toBe(100);
      expect(result.sell_price).toBe(150);
      expect(invoke).toHaveBeenCalledWith('create_product_spu', expect.objectContaining({
        spuData: expect.objectContaining({
          name: 'Test Product',
          is_on_sale: true,
        }),
        skusData: expect.any(Array),
        imagesData: expect.any(Array),
      }));
    });

    it('应该使用自定义参数创建产品', async () => {
      const now = new Date().toISOString();
      const mockSPU = {
        id: '2',
        spu_code: 'SPU-TEST002',
        name: 'Custom Product',
        unit: '件',
        status: 'on_sale',
        is_on_sale: true,
        is_featured: false,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        skus: [{
          id: 'sk2',
          spu_id: '2',
          sku_code: 'TEST002',
          specifications: {},
          spec_text: 'TEST002',
          cost_price: 200,
          sell_price: 300,
          current_stock: 50,
          min_stock: 10,
          max_stock: 100,
          is_default: true,
          status: 'active' as const,
          created_at: now,
          updated_at: now,
        }],
      };

      (invoke as any).mockResolvedValue(mockSPU);

      const result = await createProduct({
        sku: 'TEST002',
        name: 'Custom Product',
        cost_price: 200,
        sell_price: 300,
        current_stock: 50,
        min_stock: 10,
        max_stock: 100,
        unit: '件',
      });

      expect(result.sku).toBe('TEST002');
      expect(result.name).toBe('Custom Product');
      expect(result.cost_price).toBe(200);
      expect(result.sell_price).toBe(300);
      expect(invoke).toHaveBeenCalledWith('create_product_spu', expect.objectContaining({
        spuData: expect.objectContaining({
          name: 'Custom Product',
          is_on_sale: true,
        }),
        skusData: expect.any(Array),
        imagesData: expect.any(Array),
      }));
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));

      await expect(
        createProduct({
          sku: 'TEST003',
          name: 'Test Product',
          cost_price: 100,
          sell_price: 150,
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('getProducts', () => {
    it('应该获取产品列表', async () => {
      const now = new Date().toISOString();
      const mockSPUs = [
        {
          id: '1',
          spu_code: 'PROD001',
          name: 'Product 1',
          unit: '个',
          status: 'on_sale',
          is_on_sale: true,
          is_featured: false,
          sort_order: 0,
          created_at: now,
          updated_at: now,
          skus: [{
            id: 'sk1', spu_id: '1', sku_code: 'PROD001', specifications: {}, spec_text: 'PROD001',
            cost_price: 100, sell_price: 150, current_stock: 50, min_stock: 10, max_stock: 100,
            is_default: true, status: 'active' as const, created_at: now, updated_at: now,
          }],
        },
        {
          id: '2',
          spu_code: 'PROD002',
          name: 'Product 2',
          unit: '件',
          status: 'on_sale',
          is_on_sale: true,
          is_featured: false,
          sort_order: 0,
          created_at: now,
          updated_at: now,
          skus: [{
            id: 'sk2', spu_id: '2', sku_code: 'PROD002', specifications: {}, spec_text: 'PROD002',
            cost_price: 200, sell_price: 250, current_stock: 30, min_stock: 5, max_stock: 80,
            is_default: true, status: 'active' as const, created_at: now, updated_at: now,
          }],
        },
      ];

      (invoke as any).mockResolvedValue(mockSPUs);

      const result = await getProducts();

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Product 1');
      expect(result[1].name).toBe('Product 2');
      expect(invoke).toHaveBeenCalledWith('get_product_spus', expect.objectContaining({
        options: expect.objectContaining({}),
      }));
    });

    it('应该使用选项获取产品列表', async () => {
      const mockProducts: any[] = [];
      (invoke as any).mockResolvedValue(mockProducts);

      const options = {
        limit: 10,
        offset: 0,
        category_id: 'cat1',
        search: 'test',
      };

      await getProducts(options);

      expect(invoke).toHaveBeenCalledWith('get_product_spus', expect.objectContaining({
        options: expect.objectContaining({
          limit: 10,
          search: 'test',
          category_id: 'cat1',
        }),
      }));
    });

    it('应该返回空数组当没有产品时', async () => {
      (invoke as any).mockResolvedValue([]);

      const result = await getProducts();

      expect(result).toEqual([]);
    });
  });

  describe('getProductSPUById (SPU-SKU 架构)', () => {
    it('应该根据 ID 获取完整 SPU 详情（含 SKU 和图片）', async () => {
      const now = new Date().toISOString();
      const mockSPU = {
        id: 'spu-100',
        spu_code: 'SPU-DETAIL001',
        name: 'Detail Product',
        unit: '个',
        status: 'on_sale' as const,
        is_on_sale: true,
        is_featured: false,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        images: [
          { id: 'img1', spu_id: 'spu-100', image_url: 'https://example.com/1.jpg', image_type: 'main' as const, sort_order: 0 },
          { id: 'img2', spu_id: 'spu-100', image_url: 'https://example.com/2.jpg', image_type: 'gallery' as const, sort_order: 1 },
        ],
        skus: [
          {
            id: 'sku-1', spu_id: 'spu-100', sku_code: 'SKU-1', specifications: { 颜色: '红色' },
            spec_text: '红色', cost_price: 80, sell_price: 120, current_stock: 30,
            min_stock: 5, max_stock: 200, is_default: true, status: 'active' as const,
            created_at: now, updated_at: now,
          },
          {
            id: 'sku-2', spu_id: 'spu-100', sku_code: 'SKU-2', specifications: { 颜色: '蓝色' },
            spec_text: '蓝色', cost_price: 80, sell_price: 120, current_stock: 20,
            min_stock: 5, max_stock: 200, is_default: false, status: 'active' as const,
            created_at: now, updated_at: now,
          },
        ],
      };

      (invoke as any).mockResolvedValue(mockSPU);

      const result = await getProductSPUById('spu-100');

      // SPU 基本字段
      expect(result.id).toBe('spu-100');
      expect(result.spu_code).toBe('SPU-DETAIL001');
      expect(result.name).toBe('Detail Product');
      // SKU 数量及内容
      expect(result.skus).toHaveLength(2);
      expect(result.skus?.[0].spec_text).toBe('红色');
      expect(result.skus?.[1].spec_text).toBe('蓝色');
      // 图片
      expect(result.images).toHaveLength(2);
      // invoke 参数
      expect(invoke).toHaveBeenCalledWith('get_product_spu_by_id', { id: 'spu-100' });
    });

    it('应该在后端报错时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('SPU not found'));

      await expect(getProductSPUById('nonexistent')).rejects.toThrow('SPU not found');
      expect(invoke).toHaveBeenCalledWith('get_product_spu_by_id', { id: 'nonexistent' });
    });

    it('应该正确处理不含 SKU 的 SPU（仅基本信息）', async () => {
      const now = new Date().toISOString();
      const mockSPU = {
        id: 'spu-200',
        spu_code: 'SPU-NOSKU',
        name: 'No SKU Product',
        unit: '件',
        status: 'draft' as const,
        is_on_sale: false,
        is_featured: false,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        // skus/images 未返回
      };

      (invoke as any).mockResolvedValue(mockSPU);

      const result = await getProductSPUById('spu-200');

      expect(result.id).toBe('spu-200');
      expect(result.status).toBe('draft');
      expect(result.skus).toBeUndefined();
      expect(result.images).toBeUndefined();
    });
  });

  describe('updateProduct', () => {
    it('应该更新产品信息', async () => {
      const now = new Date().toISOString();
      const mockSPU = {
        id: '1',
        spu_code: 'SPU-PROD001',
        name: 'Updated Product',
        unit: '个',
        status: 'on_sale',
        is_on_sale: true,
        is_featured: false,
        sort_order: 0,
        created_at: now,
        updated_at: now,
        skus: [{
          id: 'sk1', spu_id: '1', sku_code: 'PROD001', specifications: {}, spec_text: 'PROD001',
          cost_price: 120, sell_price: 180, current_stock: 50, min_stock: 10, max_stock: 100,
          is_default: true, status: 'active' as const, created_at: now, updated_at: now,
        }],
      };

      (invoke as any).mockResolvedValue(mockSPU);

      const updates = {
        name: 'Updated Product',
        cost_price: 120,
        sell_price: 180,
      };

      const result = await updateProduct('1', updates);

      expect(result.name).toBe('Updated Product');
      expect(result.sell_price).toBe(180);
      expect(result.cost_price).toBe(120);
      expect(invoke).toHaveBeenCalledWith('update_product_spu', expect.objectContaining({
        id: '1',
        updates: expect.objectContaining({ name: 'Updated Product' }),
      }));
    });

    it('应该支持部分更新', async () => {
      const mockUpdatedProduct = {
        id: '1',
        sku: 'PROD001',
        name: 'Test Product',
        cost_price: 100,
        sell_price: 200,
        current_stock: 50,
        min_stock: 10,
        max_stock: 100,
        unit: '个',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (invoke as any).mockResolvedValue(mockUpdatedProduct);

      await updateProduct('1', { sell_price: 200 });

      expect(invoke).toHaveBeenCalledWith('update_product_spu', expect.objectContaining({
        id: '1',
        updates: expect.objectContaining({}),
      }));
    });
  });

  describe('deleteProduct', () => {
    it('应该删除产品（软删除）', async () => {
      (invoke as any).mockResolvedValue(undefined);

      await deleteProduct('1');

      expect(invoke).toHaveBeenCalledWith('delete_product_spu', { id: '1' });
    });
  });

  describe('getDatabaseStats', () => {
    it('应该获取数据库统计信息', async () => {
      const mockStats = {
        spu_count: 100,
        sku_count: 200,
        categories_count: 10,
        transactions_count: 500,
        pending_sync: 5,
      };

      (invoke as any).mockResolvedValue(mockStats);

      const result = await getDatabaseStats();

      expect(result).toEqual(mockStats);
      expect(invoke).toHaveBeenCalledWith('get_database_stats');
    });
  });

  describe('getPendingSyncRecords', () => {
    it('应该获取待同步记录', async () => {
      const mockRecords = [
        {
          id: '1',
          table_name: 'products',
          record_id: 'prod1',
          operation: 'create',
          sync_status: 'pending',
        },
      ];

      (invoke as any).mockResolvedValue(mockRecords);

      const result = await getPendingSyncRecords();

      expect(result).toEqual(mockRecords);
      expect(invoke).toHaveBeenCalledWith('get_pending_sync_records', {
        limit: undefined,
      });
    });

    it('应该支持限制记录数量', async () => {
      (invoke as any).mockResolvedValue([]);

      await getPendingSyncRecords(10);

      expect(invoke).toHaveBeenCalledWith('get_pending_sync_records', {
        limit: 10,
      });
    });
  });

  describe('markAsSynced', () => {
    it('应该标记记录为已同步', async () => {
      (invoke as any).mockResolvedValue(undefined);

      await markAsSynced('products', 'prod1');

      expect(invoke).toHaveBeenCalledWith('mark_as_synced', {
        tableName: 'products',
        recordId: 'prod1',
      });
    });
  });
});
