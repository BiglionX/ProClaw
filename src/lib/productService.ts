import { invoke } from '@tauri-apps/api/core';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  cost_price: number;
  sell_price: number;
  category_id?: string;
  brand_id?: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  image_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  cost_price: number;
  sell_price: number;
  category_id?: string;
  brand_id?: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  unit?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  cost_price?: number;
  sell_price?: number;
  category_id?: string;
  brand_id?: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  unit?: string;
  status?: string;
}

/**
 * 创建产品
 */
export async function createProduct(
  input: CreateProductInput
): Promise<Product> {
  const productData = {
    ...input,
    current_stock: input.current_stock || 0,
    min_stock: input.min_stock || 0,
    max_stock: input.max_stock || 999999,
    unit: input.unit || '个',
    status: 'active',
  };

  return await invoke<Product>('create_product', { product: productData });
}

/**
 * 获取产品列表
 */
export async function getProducts(options?: {
  limit?: number;
  offset?: number;
  category_id?: string;
  search?: string;
}): Promise<Product[]> {
  return await invoke<Product[]>('get_products', { options });
}

/**
 * 根据 ID 获取产品
 */
export async function getProductById(id: string): Promise<Product> {
  return await invoke<Product>('get_product_by_id', { id });
}

/**
 * 根据 SKU 获取产品
 */
export async function getProductBySku(sku: string): Promise<Product> {
  return await invoke<Product>('get_product_by_sku', { sku });
}

/**
 * 更新产品
 */
export async function updateProduct(
  id: string,
  updates: UpdateProductInput
): Promise<Product> {
  return await invoke<Product>('update_product', { id, updates });
}

/**
 * 删除产品 (软删除)
 */
export async function deleteProduct(id: string): Promise<void> {
  await invoke<void>('delete_product', { id });
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  products_count: number;
  categories_count: number;
  transactions_count: number;
  pending_sync: number;
}> {
  return await invoke<any>('get_database_stats');
}

/**
 * 获取待同步记录
 */
export async function getPendingSyncRecords(limit?: number): Promise<any[]> {
  return await invoke<any[]>('get_pending_sync_records', { limit });
}

/**
 * 标记记录为已同步
 */
export async function markAsSynced(
  tableName: string,
  recordId: string
): Promise<void> {
  await invoke<void>('mark_as_synced', { tableName, recordId });
}
