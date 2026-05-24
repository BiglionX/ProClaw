import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCategory, getCategories } from '../lib/categoryService';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
vi.mock('./tauri', () => ({ isTauri: () => true }));

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCategory', () => {
    it('应该成功创建分类', async () => {
      const mockCategory = { id: '1', name: '电子产品' };
      (invoke as any).mockResolvedValue(mockCategory);

      const result = await createCategory({ name: '电子产品' });
      expect(result).toEqual(mockCategory);
      expect(invoke).toHaveBeenCalledWith('create_category', {
        category: { name: '电子产品' },
      });
    });

    it('应该创建带描述的二级分类', async () => {
      const mockCategory = { id: '2', name: '手机' };
      (invoke as any).mockResolvedValue(mockCategory);

      const result = await createCategory({
        name: '手机',
        description: '手机类产品',
        parent_id: '1',
        sort_order: 1,
      });

      expect(result).toEqual(mockCategory);
      expect(invoke).toHaveBeenCalledWith('create_category', {
        category: {
          name: '手机',
          description: '手机类产品',
          parent_id: '1',
          sort_order: 1,
        },
      });
    });

    it('应该在 API 调用失败时抛出错误', async () => {
      (invoke as any).mockRejectedValue(new Error('API Error'));
      await expect(createCategory({ name: 'Test' })).rejects.toThrow('API Error');
    });
  });

  describe('getCategories', () => {
    it('应该获取分类列表', async () => {
      const mockCategories = [
        { id: '1', name: '电子产品', sort_order: 0, is_active: true, created_at: '', updated_at: '' },
        { id: '2', name: '食品', sort_order: 1, is_active: true, created_at: '', updated_at: '' },
      ];
      (invoke as any).mockResolvedValue(mockCategories);

      const result = await getCategories();
      expect(result).toEqual(mockCategories);
      expect(invoke).toHaveBeenCalledWith('get_categories');
    });

    it('应该返回空数组当没有分类时', async () => {
      (invoke as any).mockResolvedValue([]);

      const result = await getCategories();
      expect(result).toEqual([]);
    });
  });
});
