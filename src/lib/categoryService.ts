import { invoke } from '@tauri-apps/api/core';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * 创建分类
 */
export async function createCategory(
  input: CreateCategoryInput
): Promise<{ id: string; name: string }> {
  return await invoke('create_category', { category: input });
}

/**
 * 获取分类列表
 */
export async function getCategories(): Promise<Category[]> {
  return await invoke('get_categories');
}
