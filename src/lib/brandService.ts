import { invoke } from '@tauri-apps/api/core';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandInput {
  name: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * 创建品牌
 */
export async function createBrand(input: CreateBrandInput): Promise<{ id: string; name: string; slug: string }> {
  return await invoke('create_brand', { brand: input });
}

/**
 * 获取品牌列表
 */
export async function getBrands(options?: { search?: string }): Promise<Brand[]> {
  return await invoke('get_brands', { options });
}
