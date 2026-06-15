/**
 * 演示产品数据集合（demoBootstrap 专用）
 * ------------------------------------------------------------------
 * 与 cloudStoreService.ts 的 DEMO_PRODUCTS 共享数据；这里以独立文件导出，
 * 便于 demoBootstrap 在浏览器环境下引用而不引入 cloudStoreService 的副作用。
 * 如有修改，请同步更新 cloudStoreService.ts 的 DEMO_PRODUCTS。
 */

export const DEMO_PRODUCTS_FOR_BOOTSTRAP: Array<{
  id: string;
  spu_code: string;
  name: string;
  category_id: string;
  brand_id: string;
  unit: string;
  is_on_sale: boolean;
  is_featured: boolean;
  sort_order: number;
  status: 'on_sale';
  sku_code: string;
  cost_price: number;
  sell_price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  barcode: string;
  created_at: string;
  updated_at: string;
}> = [
  { id: 'spu_iphone15pm_bat', spu_code: 'SPU-2026-001', name: 'iPhone 15 Pro Max 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 1, status: 'on_sale', sku_code: 'SKU-001', cost_price: 80, sell_price: 199, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560001', created_at: '2025-01-15T00:00:00Z', updated_at: '2025-01-15T00:00:00Z' },
  { id: 'spu_iphone15pro_bat', spu_code: 'SPU-2026-002', name: 'iPhone 15 Pro 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 2, status: 'on_sale', sku_code: 'SKU-002', cost_price: 70, sell_price: 179, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560002', created_at: '2025-01-16T00:00:00Z', updated_at: '2025-01-16T00:00:00Z' },
  { id: 'spu_iphone15_bat', spu_code: 'SPU-2026-003', name: 'iPhone 15 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 3, status: 'on_sale', sku_code: 'SKU-003', cost_price: 60, sell_price: 159, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560003', created_at: '2025-01-17T00:00:00Z', updated_at: '2025-01-17T00:00:00Z' },
  { id: 'spu_iphone15plus_bat', spu_code: 'SPU-2026-004', name: 'iPhone 15 Plus 电池', category_id: 'cat_iphone15', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 4, status: 'on_sale', sku_code: 'SKU-004', cost_price: 85, sell_price: 189, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560004', created_at: '2025-01-18T00:00:00Z', updated_at: '2025-01-18T00:00:00Z' },
  { id: 'spu_iphone14pm_bat', spu_code: 'SPU-2026-005', name: 'iPhone 14 Pro Max 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: true, sort_order: 5, status: 'on_sale', sku_code: 'SKU-005', cost_price: 75, sell_price: 179, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560005', created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: 'spu_iphone14pro_bat', spu_code: 'SPU-2026-006', name: 'iPhone 14 Pro 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 6, status: 'on_sale', sku_code: 'SKU-006', cost_price: 65, sell_price: 159, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560006', created_at: '2025-02-02T00:00:00Z', updated_at: '2025-02-02T00:00:00Z' },
  { id: 'spu_iphone14_bat', spu_code: 'SPU-2026-007', name: 'iPhone 14 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 7, status: 'on_sale', sku_code: 'SKU-007', cost_price: 60, sell_price: 149, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560007', created_at: '2025-02-03T00:00:00Z', updated_at: '2025-02-03T00:00:00Z' },
  { id: 'spu_iphone14plus_bat', spu_code: 'SPU-2026-008', name: 'iPhone 14 Plus 电池', category_id: 'cat_iphone14', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 8, status: 'on_sale', sku_code: 'SKU-008', cost_price: 80, sell_price: 169, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560008', created_at: '2025-02-04T00:00:00Z', updated_at: '2025-02-04T00:00:00Z' },
  { id: 'spu_iphone13pm_bat', spu_code: 'SPU-2026-009', name: 'iPhone 13 Pro Max 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 9, status: 'on_sale', sku_code: 'SKU-009', cost_price: 70, sell_price: 169, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560009', created_at: '2025-03-01T00:00:00Z', updated_at: '2025-03-01T00:00:00Z' },
  { id: 'spu_iphone13pro_bat', spu_code: 'SPU-2026-010', name: 'iPhone 13 Pro 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 10, status: 'on_sale', sku_code: 'SKU-010', cost_price: 60, sell_price: 149, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560010', created_at: '2025-03-02T00:00:00Z', updated_at: '2025-03-02T00:00:00Z' },
  { id: 'spu_iphone13_bat', spu_code: 'SPU-2026-011', name: 'iPhone 13 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 11, status: 'on_sale', sku_code: 'SKU-011', cost_price: 55, sell_price: 139, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560011', created_at: '2025-03-03T00:00:00Z', updated_at: '2025-03-03T00:00:00Z' },
  { id: 'spu_iphone13mini_bat', spu_code: 'SPU-2026-012', name: 'iPhone 13 mini 电池', category_id: 'cat_iphone13', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 12, status: 'on_sale', sku_code: 'SKU-012', cost_price: 45, sell_price: 119, current_stock: 35, min_stock: 5, max_stock: 100, barcode: '6931234560012', created_at: '2025-03-04T00:00:00Z', updated_at: '2025-03-04T00:00:00Z' },
  { id: 'spu_iphone12pm_bat', spu_code: 'SPU-2026-013', name: 'iPhone 12 Pro Max 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 13, status: 'on_sale', sku_code: 'SKU-013', cost_price: 65, sell_price: 159, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560013', created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z' },
  { id: 'spu_iphone12pro_bat', spu_code: 'SPU-2026-014', name: 'iPhone 12 Pro 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 14, status: 'on_sale', sku_code: 'SKU-014', cost_price: 55, sell_price: 139, current_stock: 55, min_stock: 5, max_stock: 100, barcode: '6931234560014', created_at: '2025-04-02T00:00:00Z', updated_at: '2025-04-02T00:00:00Z' },
  { id: 'spu_iphone12_bat', spu_code: 'SPU-2026-015', name: 'iPhone 12 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 15, status: 'on_sale', sku_code: 'SKU-015', cost_price: 55, sell_price: 129, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560015', created_at: '2025-04-03T00:00:00Z', updated_at: '2025-04-03T00:00:00Z' },
  { id: 'spu_iphone12mini_bat', spu_code: 'SPU-2026-016', name: 'iPhone 12 mini 电池', category_id: 'cat_iphone12', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 16, status: 'on_sale', sku_code: 'SKU-016', cost_price: 40, sell_price: 109, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560016', created_at: '2025-04-04T00:00:00Z', updated_at: '2025-04-04T00:00:00Z' },
  { id: 'spu_iphone11pm_bat', spu_code: 'SPU-2026-017', name: 'iPhone 11 Pro Max 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 17, status: 'on_sale', sku_code: 'SKU-017', cost_price: 60, sell_price: 149, current_stock: 40, min_stock: 5, max_stock: 100, barcode: '6931234560017', created_at: '2025-05-01T00:00:00Z', updated_at: '2025-05-01T00:00:00Z' },
  { id: 'spu_iphone11pro_bat', spu_code: 'SPU-2026-018', name: 'iPhone 11 Pro 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 18, status: 'on_sale', sku_code: 'SKU-018', cost_price: 50, sell_price: 129, current_stock: 50, min_stock: 5, max_stock: 100, barcode: '6931234560018', created_at: '2025-05-02T00:00:00Z', updated_at: '2025-05-02T00:00:00Z' },
  { id: 'spu_iphone11_bat', spu_code: 'SPU-2026-019', name: 'iPhone 11 电池', category_id: 'cat_iphone11', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 19, status: 'on_sale', sku_code: 'SKU-019', cost_price: 50, sell_price: 119, current_stock: 60, min_stock: 5, max_stock: 100, barcode: '6931234560019', created_at: '2025-05-03T00:00:00Z', updated_at: '2025-05-03T00:00:00Z' },
  { id: 'spu_iphonese3_bat', spu_code: 'SPU-2026-020', name: 'iPhone SE (第三代) 电池', category_id: 'cat_iphonese', brand_id: 'brand_apple', unit: '块', is_on_sale: true, is_featured: false, sort_order: 20, status: 'on_sale', sku_code: 'SKU-020', cost_price: 25, sell_price: 59, current_stock: 45, min_stock: 5, max_stock: 100, barcode: '6931234560020', created_at: '2025-06-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z' },
];
