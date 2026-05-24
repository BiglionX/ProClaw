import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBrand, getBrands } from '../lib/brandService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', () => ({ isTauri: () => true }));

describe('brandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBrand', () => {
    it('应该成功创建品牌', async () => {
      const mockBrand = { id: '1', name: 'Apple', slug: 'apple' };
      (invoke as any).mockResolvedValue(mockBrand);

      const result = await createBrand({ name: 'Apple' });
      expect(result).toEqual(mockBrand);
      expect(invoke).toHaveBeenCalledWith('create_brand', {
        brand: { name: 'Apple' },
      });
    });

    it('应该创建带完整信息的品牌', async () => {
      const mockBrand = { id: '2', name: 'Samsung', slug: 'samsung' };
      (invoke as any).mockResolvedValue(mockBrand);

      await createBrand({
        name: 'Samsung',
        logo_url: 'https://example.com/logo.png',
        website_url: 'https://samsung.com',
        description: '韩国电子品牌',
        sort_order: 1,
        is_active: true,
      });

      expect(invoke).toHaveBeenCalledWith('create_brand', {
        brand: expect.objectContaining({ name: 'Samsung' }),
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(createBrand({ name: 'Test' })).rejects.toThrow('API Error');
    });
  });

  describe('getBrands', () => {
    it('应该获取品牌列表', async () => {
      const mockBrands = [
        { id: '1', name: 'Apple', slug: 'apple', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
        { id: '2', name: 'Samsung', slug: 'samsung', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      ];
      (invoke as any).mockResolvedValue(mockBrands);

      const result = await getBrands();
      expect(result).toEqual(mockBrands);
      expect(invoke).toHaveBeenCalledWith('get_brands', { options: undefined });
    });

    it('应该使用搜索参数获取品牌', async () => {
      (invoke as any).mockResolvedValue([]);
      await getBrands({ search: 'Apple' });
      expect(invoke).toHaveBeenCalledWith('get_brands', { options: { search: 'Apple' } });
    });

    it('应该返回空数组当没有品牌时', async () => {
      (invoke as any).mockResolvedValue([]);
      const result = await getBrands();
      expect(result).toEqual([]);
    });
  });
});
