import { invoke } from '@tauri-apps/api/core';

// 商品属性定义
export interface ProductAttribute {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: string[];
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * 获取所有商品属性
 */
export async function getProductAttributes(): Promise<ProductAttribute[]> {
  return await invoke<ProductAttribute[]>('get_product_attributes');
}

/**
 * 创建商品属性
 */
export async function createProductAttribute(
  attribute: Omit<ProductAttribute, 'id' | 'created_at'>
): Promise<ProductAttribute> {
  return await invoke<ProductAttribute>('create_product_attribute', { attribute });
}

/**
 * 更新商品属性
 */
export async function updateProductAttribute(
  id: string,
  updates: Partial<Omit<ProductAttribute, 'id' | 'created_at'>>
): Promise<ProductAttribute> {
  return await invoke<ProductAttribute>('update_product_attribute', { id, updates });
}

/**
 * 删除商品属性
 */
export async function deleteProductAttribute(id: string): Promise<void> {
  await invoke<void>('delete_product_attribute', { id });
}
