/**
 * 云托管商城服务层
 * 处理云商城相关的 API 调用和数据同步
 */

import { safeInvoke, isTauri } from './tauri';
import { ProductSPU } from './productService';

// ========== 类型定义 ==========

export type StoreStatus = 'inactive' | 'active' | 'expired' | 'suspended';
export type PlanType = 'free' | 'basic' | 'professional' | 'enterprise';
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'wechat' | 'alipay';

export interface CloudStore {
  id: string;
  user_id: string;
  subdomain: string;
  custom_domain?: string;
  api_key: string;
  status: StoreStatus;
  plan_type: PlanType;
  created_at: string;
  expires_at?: string;
}

export interface StoreTheme {
  store_id: string;
  primary_color: string;
  secondary_color: string;
  layout_style: 'card' | 'list';
  font_family: string;
  logo_url?: string;
  banner_images: string[];
  theme_data: Record<string, unknown>;
  updated_at: string;
}

export interface CloudSyncLog {
  id: string;
  sync_type: 'full' | 'incremental';
  status: SyncStatus;
  message?: string;
  created_at: string;
}

export interface StoreProduct {
  id: string;
  local_spu_id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category?: string;
  is_on_sale: boolean;
  sync_version: number;
  cloud_sync_status: SyncStatus;
  updated_at: string;
}

export interface StoreOrder {
  id: string;
  store_id: string;
  order_no: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  items: StoreOrderItem[];
  callback_status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export interface StoreOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface PlanInfo {
  type: PlanType;
  name: string;
  price: number;
  product_limit: number;
  order_limit: number;
  features: string[];
}

export interface StoreStats {
  total_visits: number;
  total_orders: number;
  total_revenue: number;
  hot_products: Array<{ name: string; sales: number }>;
}

// ========== API 调用封装 ==========

/**
 * 通用错误处理
 */
/** 浏览器模拟数据存储 */
let mockStore: CloudStore | null = null;
let mockTheme: StoreTheme | null = null;

function generateMockStore(planType: PlanType, subdomain: string): CloudStore {
  return {
    id: `mock-store-${Date.now()}`,
    user_id: 'mock-boss-001',
    subdomain: subdomain,
    api_key: `sk-proclaw-${Date.now().toString(36)}`,
    status: 'active',
    plan_type: planType,
    created_at: new Date().toISOString(),
  };
}

function generateMockTheme(storeId: string): StoreTheme {
  return {
    store_id: storeId,
    primary_color: '#6366f1',
    secondary_color: '#ec4899',
    layout_style: 'card',
    font_family: 'system-ui',
    banner_images: [],
    theme_data: {},
    updated_at: new Date().toISOString(),
  };
}

/** 演示商品数据 —— 20个iPhone电池（来自 seed_iphone_batteries.sql） */
const DEMO_PRODUCTS = [
  { id: 'spu_iphone15pm_bat', spu_code: 'SPU-2026-001', name: 'iPhone 15 Pro Max 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 1, status: 'on_sale' as const, images: [{ id: 'img_001', spu_id: 'spu_iphone15pm_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_001', spu_id: 'spu_iphone15pm_bat', sku_code: 'SKU-001', cost_price: 80, sell_price: 199, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560001', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-01-15T00:00:00Z', updated_at: '2025-01-15T00:00:00Z' },
  { id: 'spu_iphone15pro_bat', spu_code: 'SPU-2026-002', name: 'iPhone 15 Pro 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 2, status: 'on_sale' as const, images: [{ id: 'img_002', spu_id: 'spu_iphone15pro_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_002', spu_id: 'spu_iphone15pro_bat', sku_code: 'SKU-002', cost_price: 70, sell_price: 179, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560002', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-01-16T00:00:00Z', updated_at: '2025-01-16T00:00:00Z' },
  { id: 'spu_iphone15_bat', spu_code: 'SPU-2026-003', name: 'iPhone 15 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 3, status: 'on_sale' as const, images: [{ id: 'img_003', spu_id: 'spu_iphone15_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_003', spu_id: 'spu_iphone15_bat', sku_code: 'SKU-003', cost_price: 60, sell_price: 159, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560003', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-01-17T00:00:00Z', updated_at: '2025-01-17T00:00:00Z' },
  { id: 'spu_iphone15plus_bat', spu_code: 'SPU-2026-004', name: 'iPhone 15 Plus 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 4, status: 'on_sale' as const, images: [{ id: 'img_004', spu_id: 'spu_iphone15plus_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_004', spu_id: 'spu_iphone15plus_bat', sku_code: 'SKU-004', cost_price: 85, sell_price: 189, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560004', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-01-18T00:00:00Z', updated_at: '2025-01-18T00:00:00Z' },
  { id: 'spu_iphone14pm_bat', spu_code: 'SPU-2026-005', name: 'iPhone 14 Pro Max 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 5, status: 'on_sale' as const, images: [{ id: 'img_005', spu_id: 'spu_iphone14pm_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_005', spu_id: 'spu_iphone14pm_bat', sku_code: 'SKU-005', cost_price: 75, sell_price: 179, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560005', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: 'spu_iphone14pro_bat', spu_code: 'SPU-2026-006', name: 'iPhone 14 Pro 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 6, status: 'on_sale' as const, images: [{ id: 'img_006', spu_id: 'spu_iphone14pro_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_006', spu_id: 'spu_iphone14pro_bat', sku_code: 'SKU-006', cost_price: 65, sell_price: 159, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560006', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-02-02T00:00:00Z', updated_at: '2025-02-02T00:00:00Z' },
  { id: 'spu_iphone14_bat', spu_code: 'SPU-2026-007', name: 'iPhone 14 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 7, status: 'on_sale' as const, images: [{ id: 'img_007', spu_id: 'spu_iphone14_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_007', spu_id: 'spu_iphone14_bat', sku_code: 'SKU-007', cost_price: 60, sell_price: 149, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560007', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-02-03T00:00:00Z', updated_at: '2025-02-03T00:00:00Z' },
  { id: 'spu_iphone14plus_bat', spu_code: 'SPU-2026-008', name: 'iPhone 14 Plus 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 8, status: 'on_sale' as const, images: [{ id: 'img_008', spu_id: 'spu_iphone14plus_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_008', spu_id: 'spu_iphone14plus_bat', sku_code: 'SKU-008', cost_price: 80, sell_price: 169, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560008', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-02-04T00:00:00Z', updated_at: '2025-02-04T00:00:00Z' },
  { id: 'spu_iphone13pm_bat', spu_code: 'SPU-2026-009', name: 'iPhone 13 Pro Max 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 9, status: 'on_sale' as const, images: [{ id: 'img_009', spu_id: 'spu_iphone13pm_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_009', spu_id: 'spu_iphone13pm_bat', sku_code: 'SKU-009', cost_price: 70, sell_price: 169, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560009', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z' },
  { id: 'spu_iphone13pro_bat', spu_code: 'SPU-2026-010', name: 'iPhone 13 Pro 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 10, status: 'on_sale' as const, images: [{ id: 'img_010', spu_id: 'spu_iphone13pro_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_010', spu_id: 'spu_iphone13pro_bat', sku_code: 'SKU-010', cost_price: 60, sell_price: 149, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560010', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-03-02T00:00:00Z', updated_at: '2025-03-02T00:00:00Z' },
  { id: 'spu_iphone13_bat', spu_code: 'SPU-2026-011', name: 'iPhone 13 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 11, status: 'on_sale' as const, images: [{ id: 'img_011', spu_id: 'spu_iphone13_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_011', spu_id: 'spu_iphone13_bat', sku_code: 'SKU-011', cost_price: 55, sell_price: 139, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560011', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-03-03T00:00:00Z', updated_at: '2025-03-03T00:00:00Z' },
  { id: 'spu_iphone13mini_bat', spu_code: 'SPU-2026-012', name: 'iPhone 13 mini 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 12, status: 'on_sale' as const, images: [{ id: 'img_012', spu_id: 'spu_iphone13mini_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_012', spu_id: 'spu_iphone13mini_bat', sku_code: 'SKU-012', cost_price: 45, sell_price: 119, current_stock: 35, min_stock: 5, max_stock: 100, barcode: '6931234560012', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-03-04T00:00:00Z', updated_at: '2025-03-04T00:00:00Z' },
  { id: 'spu_iphone12pm_bat', spu_code: 'SPU-2026-013', name: 'iPhone 12 Pro Max 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 13, status: 'on_sale' as const, images: [{ id: 'img_013', spu_id: 'spu_iphone12pm_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_013', spu_id: 'spu_iphone12pm_bat', sku_code: 'SKU-013', cost_price: 65, sell_price: 159, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560013', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z' },
  { id: 'spu_iphone12pro_bat', spu_code: 'SPU-2026-014', name: 'iPhone 12 Pro 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 14, status: 'on_sale' as const, images: [{ id: 'img_014', spu_id: 'spu_iphone12pro_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_014', spu_id: 'spu_iphone12pro_bat', sku_code: 'SKU-014', cost_price: 55, sell_price: 139, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560014', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-04-02T00:00:00Z', updated_at: '2025-04-02T00:00:00Z' },
  { id: 'spu_iphone12_bat', spu_code: 'SPU-2026-015', name: 'iPhone 12 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 15, status: 'on_sale' as const, images: [{ id: 'img_015', spu_id: 'spu_iphone12_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_015', spu_id: 'spu_iphone12_bat', sku_code: 'SKU-015', cost_price: 55, sell_price: 129, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560015', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-04-03T00:00:00Z', updated_at: '2025-04-03T00:00:00Z' },
  { id: 'spu_iphone12mini_bat', spu_code: 'SPU-2026-016', name: 'iPhone 12 mini 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 16, status: 'on_sale' as const, images: [{ id: 'img_016', spu_id: 'spu_iphone12mini_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_016', spu_id: 'spu_iphone12mini_bat', sku_code: 'SKU-016', cost_price: 40, sell_price: 109, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560016', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-04-04T00:00:00Z', updated_at: '2025-04-04T00:00:00Z' },
  { id: 'spu_iphone11pm_bat', spu_code: 'SPU-2026-017', name: 'iPhone 11 Pro Max 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 17, status: 'on_sale' as const, images: [{ id: 'img_017', spu_id: 'spu_iphone11pm_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_017', spu_id: 'spu_iphone11pm_bat', sku_code: 'SKU-017', cost_price: 60, sell_price: 149, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560017', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-05-01T00:00:00Z', updated_at: '2025-05-01T00:00:00Z' },
  { id: 'spu_iphone11pro_bat', spu_code: 'SPU-2026-018', name: 'iPhone 11 Pro 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 18, status: 'on_sale' as const, images: [{ id: 'img_018', spu_id: 'spu_iphone11pro_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_018', spu_id: 'spu_iphone11pro_bat', sku_code: 'SKU-018', cost_price: 50, sell_price: 129, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560018', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-05-02T00:00:00Z', updated_at: '2025-05-02T00:00:00Z' },
  { id: 'spu_iphone11_bat', spu_code: 'SPU-2026-019', name: 'iPhone 11 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 19, status: 'on_sale' as const, images: [{ id: 'img_019', spu_id: 'spu_iphone11_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_019', spu_id: 'spu_iphone11_bat', sku_code: 'SKU-019', cost_price: 50, sell_price: 119, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560019', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-05-03T00:00:00Z', updated_at: '2025-05-03T00:00:00Z' },
  { id: 'spu_iphonese3_bat', spu_code: 'SPU-2026-020', name: 'iPhone SE (第三代) 电池', category_id: 'cat_iphonese', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 20, status: 'on_sale' as const, images: [{ id: 'img_020', spu_id: 'spu_iphonese3_bat', image_url: '', image_type: 'main' as const, sort_order: 1 }], skus: [{ id: 'sku_020', spu_id: 'spu_iphonese3_bat', sku_code: 'SKU-020', cost_price: 25, sell_price: 59, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560020', specifications: {}, spec_text: '标准版', is_default: true }], created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
] as any[];

/** 浏览器模式：可变的 mock 商品列表（支持上下架/同步操作） */
let mockProducts: ProductSPU[] = JSON.parse(JSON.stringify(DEMO_PRODUCTS));

async function callBackend<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    if (!isTauri()) {
      // 浏览器环境：使用模拟数据
      console.warn(`[CloudStore] ${command} called outside of Tauri environment, using mock data`);

      switch (command) {
        case 'get_cloud_store':
          return (mockStore ? { ...mockStore } : null) as T;
        case 'create_cloud_store':
          mockStore = generateMockStore(
            (args?.planType as PlanType) || 'basic',
            (args?.subdomain as string) || 'demo'
          );
          mockTheme = generateMockTheme(mockStore.id);
          return { ...mockStore } as T;
        case 'get_store_theme':
          return (mockTheme ? { ...mockTheme } : null) as T;
        case 'update_store_theme':
          if (mockTheme && args?.theme) {
            Object.assign(mockTheme, args.theme as Partial<StoreTheme>);
            mockTheme.updated_at = new Date().toISOString();
          }
          return (mockTheme ? { ...mockTheme } : null) as T;
        case 'get_store_stats':
          return {
            total_visits: 1286,
            total_orders: 47,
            total_revenue: 12580.50,
            hot_products: [
              { name: 'iPhone 15 Pro Max 电池', sales: 23 },
              { name: 'Samsung Galaxy S24 屏幕总成', sales: 15 },
              { name: '华为 Mate 60 Pro 后盖', sales: 9 },
            ],
          } as T;
        case 'get_syncable_products':
          return mockProducts as T;
        case 'toggle_product_cloud_visible': {
          const spuId = args?.spuId as string;
          const isVisible = args?.isVisible as boolean;
          const idx = mockProducts.findIndex(p => p.id === spuId);
          if (idx >= 0) {
            mockProducts[idx] = { ...mockProducts[idx], is_on_sale: isVisible };
          }
          return undefined as T;
        }
        case 'sync_all_products_to_cloud':
          // 模拟全量同步：将所有商品状态设为已同步
          return { id: `log-${Date.now()}`, sync_type: 'full', status: 'success', message: `已同步 ${mockProducts.length} 个商品到云端`, created_at: new Date().toISOString() } as T;
        case 'sync_incremental_products':
          // 模拟增量同步
          return { id: `log-${Date.now()}`, sync_type: 'incremental', status: 'success', message: '增量同步完成，无变更商品', created_at: new Date().toISOString() } as T;
        case 'generate_store_theme_ai': {
          // 模拟 AI 生成主题：根据行业参数返回不同配色
          const _industry = (args?.industry as string) || '通用';
          const colorMap: Record<string, { primary: string; secondary: string }> = {
            '零售': { primary: '#ff6b6b', secondary: '#f8f9fa' },
            '数码': { primary: '#1890ff', secondary: '#f0f5ff' },
            '服装': { primary: '#eb2f96', secondary: '#fff0f6' },
            '食品': { primary: '#fa8c16', secondary: '#fff7e6' },
            '家居': { primary: '#52c41a', secondary: '#f6ffed' },
          };
          const colors = colorMap[_industry] || colorMap['数码'];
          if (mockTheme) {
            mockTheme.primary_color = colors.primary;
            mockTheme.secondary_color = colors.secondary;
            mockTheme.font_family = 'PingFang SC, Microsoft YaHei, sans-serif';
            mockTheme.layout_style = 'card';
            mockTheme.updated_at = new Date().toISOString();
          }
          return (mockTheme ? { ...mockTheme } : null) as T;
        }
        case 'get_store_orders':
          return [] as T;
        case 'get_cloud_sync_logs':
          return [] as T;
        default:
          return null as T;
      }
    }
    const result = await safeInvoke<T>(command, args);
    if (result === null) {
      throw new Error(`Command "${command}" returned null`);
    }
    return result;
  } catch (error) {
    console.error(`[CloudStore] ${command} failed:`, error);
    throw error;
  }
}

// ========== 商城管理 API ==========

/**
 * 获取商城信息
 */
export async function getCloudStore(): Promise<CloudStore | null> {
  return callBackend<CloudStore | null>('get_cloud_store');
}

/**
 * 开通云商城
 */
export async function createCloudStore(planType: PlanType, subdomain: string): Promise<CloudStore> {
  return callBackend<CloudStore>('create_cloud_store', { planType, subdomain });
}

/**
 * 更新商城配置
 */
export async function updateCloudStore(storeId: string, data: Partial<CloudStore>): Promise<CloudStore> {
  return callBackend<CloudStore>('update_cloud_store', { storeId, data });
}

/**
 * 重置 API Key
 */
export async function resetApiKey(storeId: string): Promise<{ api_key: string }> {
  return callBackend<{ api_key: string }>('reset_store_api_key', { storeId });
}

// ========== 商品同步 API ==========

/**
 * 获取可同步的商品列表
 */
export async function getSyncableProducts(): Promise<ProductSPU[]> {
  return callBackend<ProductSPU[]>('get_syncable_products');
}

/**
 * 全量同步商品到云端
 */
export async function syncAllProducts(storeId: string): Promise<CloudSyncLog> {
  return callBackend<CloudSyncLog>('sync_all_products_to_cloud', { storeId });
}

/**
 * 增量同步（仅同步变更商品）
 */
export async function syncIncremental(storeId: string): Promise<CloudSyncLog> {
  return callBackend<CloudSyncLog>('sync_incremental_products', { storeId });
}

/**
 * 切换商品上架状态
 */
export async function toggleProductVisible(spuId: string, isVisible: boolean): Promise<void> {
  return callBackend<void>('toggle_product_cloud_visible', { spuId, isVisible });
}

/**
 * 批量设置商品上架状态
 */
export async function batchToggleProducts(spuIds: string[], isVisible: boolean): Promise<void> {
  return callBackend<void>('batch_toggle_products_visible', { spuIds, isVisible });
}

/**
 * 获取同步日志
 */
export async function getSyncLogs(limit?: number): Promise<CloudSyncLog[]> {
  return callBackend<CloudSyncLog[]>('get_cloud_sync_logs', { limit: limit || 20 });
}

// ========== 主题配置 API ==========

/**
 * 获取商城主题配置
 */
export async function getStoreTheme(storeId: string): Promise<StoreTheme> {
  return callBackend<StoreTheme>('get_store_theme', { storeId });
}

/**
 * 更新主题配置
 */
export async function updateStoreTheme(storeId: string, theme: Partial<StoreTheme>): Promise<StoreTheme> {
  return callBackend<StoreTheme>('update_store_theme', { storeId, theme });
}

/**
 * AI 生成主题
 */
export async function generateThemeWithAI(storeId: string, industry: string, categories: string[], priceRange: string): Promise<StoreTheme> {
  return callBackend<StoreTheme>('generate_store_theme_ai', { storeId, industry, categories, priceRange });
}

// ========== 订单管理 API ==========

/**
 * 获取云端订单列表
 */
export async function getStoreOrders(storeId: string, status?: OrderStatus): Promise<StoreOrder[]> {
  return callBackend<StoreOrder[]>('get_store_orders', { storeId, status });
}

/**
 * 获取订单详情
 */
export async function getStoreOrder(orderId: string): Promise<StoreOrder> {
  return callBackend<StoreOrder>('get_store_order', { orderId });
}

/**
 * 标记订单已发货
 */
export async function markOrderShipped(orderId: string, trackingNo?: string): Promise<void> {
  return callBackend<void>('mark_store_order_shipped', { orderId, trackingNo });
}

// ========== 统计数据 API ==========

/**
 * 获取商城访问统计
 */
export async function getStoreStats(storeId: string, days?: number): Promise<StoreStats> {
  return callBackend<StoreStats>('get_store_stats', { storeId, days: days || 7 });
}

// ========== 套餐信息（功能级别标记，已切换为 Token 计费模式） ==========
// 注：云商城已全面切换为 Token 按量计费（PRD v8.0），
// plan_type 仅作为功能级别标记保留，不再作为计费依据。
// 详细定价请查看 Token 计费页面。

export const PLAN_INFO: Record<PlanType, PlanInfo> = {
  free: {
    type: 'free',
    name: '免费体验',
    price: 0,
    product_limit: 0,
    order_limit: 0,
    features: ['Token 计费，按需付费', '免费注册赠送 50,000 PT', '前 20 个商品免费同步', '100 MB 免费图片存储', 'ProClaw 子域名永久免费'],
  },
  basic: {
    type: 'basic',
    name: 'Token 计费',
    price: 0,
    product_limit: 0,
    order_limit: 0,
    features: ['按 Token 计费（1 PT = ¥0.001）', '无商品数量上限', '无订单数量上限', '自定义域名', 'AI 主题生成', '实时同步'],
  },
  professional: {
    type: 'professional',
    name: 'Token 计费',
    price: 0,
    product_limit: 0,
    order_limit: 0,
    features: ['按 Token 计费（1 PT = ¥0.001）', '无限商品同步', '无限订单处理', '自定义域名 + SSL', 'AI 主题生成/微调', '高级数据分析', '优先支持'],
  },
  enterprise: {
    type: 'enterprise',
    name: 'Token 计费',
    price: 0,
    product_limit: 0,
    order_limit: 0,
    features: ['按 Token 计费（1 PT = ¥0.001）', '无限资源使用', '自定义域名 + SSL', 'AI 主题生成/微调', '高级数据分析', '专属支持', 'API 对接'],
  },
};

// ========== 工具函数 ==========

/**
 * 获取商城访问 URL
 */
export function getStoreUrl(store: CloudStore): string {
  if (store.custom_domain) {
    return `https://${store.custom_domain}`;
  }
  return `https://${store.subdomain}.proclaw.cc`;
}

/**
 * 格式化价格
 */
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

/**
 * 获取订单状态标签
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: '待付款',
    paid: '已付款',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消',
  };
  return labels[status] || status;
}

/**
 * 获取订单状态颜色
 */
export function getOrderStatusColor(status: OrderStatus): 'warning' | 'success' | 'info' | 'default' | 'error' {
  const colors: Record<OrderStatus, 'warning' | 'success' | 'info' | 'default' | 'error'> = {
    pending: 'warning',
    paid: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'default';
}
