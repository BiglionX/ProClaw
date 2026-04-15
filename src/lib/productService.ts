import { invoke } from '@tauri-apps/api/core';

/**
 * 生成SPU编码
 * 格式: SPU-{YYYYMMDD}-{随机4位}
 * 示例: SPU-20260415-A3F7
 */
export function generateSPUCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SPU-${dateStr}-${randomStr}`;
}

/**
 * 生成SKU编码
 * 格式: SKU-{SPU_CODE后8位}-{规格哈希}
 * 示例: SKU-20260415-A3F7-R1
 */
export function generateSKUCode(spuCode: string, specIndex: number): string {
  const spuSuffix = spuCode.slice(-8); // 取SPU code后8位
  const indexStr = (specIndex + 1).toString().padStart(2, '0');
  return `SKU-${spuSuffix}-${indexStr}`;
}

/**
 * 根据规格生成可读的规格文本
 * 示例: {"颜色": "红色", "尺寸": "L"} -> "红色/L"
 */
export function generateSpecText(specifications: Record<string, string>): string {
  return Object.values(specifications).join('/');
}

/**
 * 生成简单商品库的SKU编码（兼容旧版）
 * 格式: SKU-{YYYYMMDD}-{随机4位}
 * 示例: SKU-20260415-A3F7
 */
export function generateSimpleSKU(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU-${dateStr}-${randomStr}`;
}

// SPU (标准产品单位)
export interface ProductSPU {
  id: string;
  spu_code: string;
  name: string;
  subtitle?: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  unit: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  is_on_sale: boolean;
  is_featured: boolean;
  sort_order: number;
  status: 'draft' | 'on_sale' | 'off_sale' | 'deleted';
  images?: ProductImage[];
  skus?: ProductSKU[];
  attributes?: SPUAttributeValue[];
  created_at: string;
  updated_at: string;
}

// SKU (库存量单位)
export interface ProductSKU {
  id: string;
  spu_id: string;
  sku_code: string;
  specifications: Record<string, string>;
  spec_text: string;
  cost_price: number;
  sell_price: number;
  market_price?: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  barcode?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// 商品图片
export interface ProductImage {
  id: string;
  spu_id: string;
  image_url: string;
  image_type: 'main' | 'gallery';
  sort_order: number;
  alt_text?: string;
}

// 商品属性定义
export interface ProductAttribute {
  id: string;
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: string[];
  is_required: boolean;
  sort_order: number;
}

// SPU属性值
export interface SPUAttributeValue {
  id: string;
  spu_id: string;
  attribute_id: string;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  attribute?: ProductAttribute;
}

export interface CreateProductSPUInput {
  spu_code?: string; // 可选,如果不提供则自动生成
  name: string;
  subtitle?: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  unit?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  is_on_sale?: boolean;
  is_featured?: boolean;
  sort_order?: number;
}

export interface CreateProductSKUInput {
  sku_code?: string; // 可选,如果不提供则自动生成
  specifications: Record<string, string>;
  spec_text?: string; // 可选,如果不提供则根据specifications自动生成
  cost_price: number;
  sell_price: number;
  market_price?: number;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  barcode?: string;
  is_default?: boolean;
}

/**
 * 创建商品SPU及其SKU
 * @param spuData SPU数据(spu_code可选,不提供则自动生成)
 * @param skus SKU数组(sku_code可选,不提供则根据spu_code自动生成)
 * @param images 图片URL数组
 */
export async function createProductSPU(
  spuData: CreateProductSPUInput,
  skus: CreateProductSKUInput[],
  images: string[]
): Promise<ProductSPU> {
  // 如果未提供SPU code,自动生成
  const finalSpuData = {
    ...spuData,
    spu_code: spuData.spu_code || generateSPUCode(),
  };

  // 如果SKU未提供code,根据SPU code自动生成
  const finalSkus = skus.map((sku, index) => ({
    ...sku,
    sku_code: sku.sku_code || generateSKUCode(finalSpuData.spu_code!, index),
    spec_text: sku.spec_text || generateSpecText(sku.specifications),
  }));

  return await invoke<ProductSPU>('create_product_spu', { 
    spuData: finalSpuData, 
    skusData: finalSkus,
    imagesData: images 
  });
}

/**
 * 获取商品SPU列表
 */
export async function getProductSPUs(options?: {
  limit?: number;
  offset?: number;
  category_id?: string;
  brand_id?: string;
  search?: string;
  status?: string;
}): Promise<ProductSPU[]> {
  return await invoke<ProductSPU[]>('get_product_spus', { options });
}

/**
 * 根据 ID 获取商品SPU详情(含SKU和图片)
 */
export async function getProductSPUById(id: string): Promise<ProductSPU> {
  return await invoke<ProductSPU>('get_product_spu_by_id', { id });
}

/**
 * 根据 SPU Code 获取商品
 */
export async function getProductSPUByCode(spuCode: string): Promise<ProductSPU> {
  return await invoke<ProductSPU>('get_product_spu_by_code', { spuCode });
}

/**
 * 更新商品SPU
 */
export async function updateProductSPU(
  id: string,
  updates: Partial<CreateProductSPUInput>
): Promise<ProductSPU> {
  return await invoke<ProductSPU>('update_product_spu', { id, updates });
}

/**
 * 删除商品SPU (软删除)
 */
export async function deleteProductSPU(id: string): Promise<void> {
  await invoke<void>('delete_product_spu', { id });
}

/**
 * 为SPU添加SKU
 */
export async function createProductSKU(
  spuId: string,
  skuData: CreateProductSKUInput
): Promise<ProductSKU> {
  return await invoke<ProductSKU>('create_product_sku', { 
    spuId, 
    sku: skuData 
  });
}

/**
 * 更新SKU
 */
export async function updateProductSKU(
  id: string,
  updates: Partial<CreateProductSKUInput>
): Promise<ProductSKU> {
  return await invoke<ProductSKU>('update_product_sku', { id, updates });
}

/**
 * 删除SKU
 */
export async function deleteProductSKU(id: string): Promise<void> {
  await invoke<void>('delete_product_sku', { id });
}

/**
 * 批量上传商品图片
 */
export async function uploadProductImages(
  spuId: string,
  imageUrls: string[]
): Promise<ProductImage[]> {
  return await invoke<ProductImage[]>('upload_product_images', { 
    spuId, 
    imageUrls 
  });
}

/**
 * 删除商品图片
 */
export async function deleteProductImage(imageId: string): Promise<void> {
  await invoke<void>('delete_product_image', { imageId });
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  spu_count: number;
  sku_count: number;
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

// ==================== 兼容性层 (临时方案) ====================

/**
 * @deprecated 使用 getProductSPUs 代替
 * 兼容旧代码,将SPU转换为旧的Product格式
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  image_url?: string;
  barcode?: string;
  is_active: boolean;
  status?: 'active' | 'inactive'; // 新增：状态字段
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  unit?: string;
  cost_price?: number;
  sell_price?: number;
  min_stock?: number;
  max_stock?: number;
  current_stock?: number; // 新增：当前库存字段
  image_url?: string;
  barcode?: string;
}

/**
 * @deprecated 使用 getProductSPUs 代替
 * 将SPU-SKU结构转换为旧的Product格式(取第一个SKU)
 */
function convertSPUToProduct(spu: ProductSPU): Product {
  const firstSku = spu.skus?.[0];
  const totalStock = spu.skus?.reduce((sum, sku) => sum + sku.current_stock, 0) || 0;
  const minStock = spu.skus?.reduce((sum, sku) => sum + sku.min_stock, 0) || 0;
  const maxStock = spu.skus?.reduce((sum, sku) => sum + sku.max_stock, 0) || 999999;
  
  return {
    id: spu.id,
    sku: firstSku?.sku_code || spu.spu_code,
    name: spu.name,
    description: spu.description,
    category_id: spu.category_id,
    unit: spu.unit,
    cost_price: firstSku?.cost_price || 0,
    sell_price: firstSku?.sell_price || 0,
    min_stock: minStock,
    max_stock: maxStock,
    current_stock: totalStock,
    image_url: spu.images?.[0]?.image_url,
    barcode: firstSku?.barcode,
    is_active: spu.status === 'on_sale',
    created_at: spu.created_at,
    updated_at: spu.updated_at,
  };
}

/**
 * @deprecated 使用 getProductSPUs 代替
 * 兼容旧的产品查询接口
 */
export async function getProducts(options?: {
  limit?: number;
  search?: string;
  category_id?: string;
  brand_id?: string;
}): Promise<Product[]> {
  try {
    const spus = await getProductSPUs({
      limit: options?.limit,
      search: options?.search,
      category_id: options?.category_id,
      brand_id: options?.brand_id,
    });
    return spus.map(convertSPUToProduct);
  } catch (error) {
    console.error('getProducts (compatibility layer) error:', error);
    return [];
  }
}

/**
 * @deprecated 使用 createProductSPU 代替
 * 兼容旧的产品创建接口
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  // 如果未提供SKU，自动生成
  const finalInput = {
    ...input,
    sku: input.sku || generateSimpleSKU(),
  };

  // 转换为新的SPU-SKU结构
  const spuData = {
    name: finalInput.name,
    description: finalInput.description,
    category_id: finalInput.category_id,
    unit: finalInput.unit || '件',
    is_on_sale: true,
  };

  const skuData = [{
    specifications: {},
    spec_text: finalInput.sku,
    cost_price: finalInput.cost_price || 0,
    sell_price: finalInput.sell_price || 0,
    current_stock: 0,
    min_stock: finalInput.min_stock || 0,
    max_stock: finalInput.max_stock || 999999,
    barcode: finalInput.barcode,
    is_default: true,
  }];

  const images = finalInput.image_url ? [finalInput.image_url] : [];

  const spu = await createProductSPU(spuData, skuData, images);
  return convertSPUToProduct(spu);
}

/**
 * @deprecated 使用 updateProductSPU 代替
 * 兼容旧的产品更新接口
 */
export async function updateProduct(id: string, updates: Partial<CreateProductInput>): Promise<Product> {
  // 简化实现:只更新基本信息
  const spuUpdates: any = {
    name: updates.name,
    description: updates.description,
    category_id: updates.category_id,
    unit: updates.unit,
  };

  await updateProductSPU(id, spuUpdates);
  const spu = await getProductSPUById(id);
  return convertSPUToProduct(spu);
}

/**
 * @deprecated 使用 deleteProductSPU 代替
 * 兼容旧的产品删除接口
 */
export async function deleteProduct(id: string): Promise<void> {
  await deleteProductSPU(id);
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

// ==================== 商品库模式迁移 API ====================

/**
 * 迁移结果统计
 */
export interface MigrationResult {
  migrated_products: number;
  created_spus: number;
  created_skus: number;
  migrated_images: number;
  duration_ms: number;
}

/**
 * 获取当前商品库模式
 * @returns 'simple' - 简单商品库模式, 'ecommerce' - 电商商品库模式
 */
export async function getLibraryMode(): Promise<'simple' | 'ecommerce'> {
  return await invoke<'simple' | 'ecommerce'>('get_library_mode');
}

/**
 * 升级到电商商品库模式
 * 将现有的简单商品(Product表)迁移到SPU-SKU结构
 * @returns 迁移结果统计
 */
export async function migrateToEcommerceMode(): Promise<MigrationResult> {
  return await invoke<MigrationResult>('migrate_to_ecommerce_mode');
}

/**
 * 降级回简单商品库模式
 * 警告：此操作会删除所有SPU、SKU和图片数据，但保留原Product数据
 */
export async function downgradeToSimpleMode(): Promise<void> {
  await invoke<void>('downgrade_to_simple_mode');
}
