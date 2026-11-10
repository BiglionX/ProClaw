export interface PickerProduct {
  id: string;
  name: string;
  code: string;
  unitPrice: number;
  lastOrderDate?: string;
  orderCount?: number;
}

export interface PurchaseOrderLine {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface SupplierHistoryProduct {
  id: string;
  name: string;
  code: string;
  last_unit_price: number;
  last_order_date: string;
  order_count: number;
  total_quantity: number;
}

export interface PickerSpu {
  id: string;
  name: string;
  spu_code: string;
  skus?: Array<{ is_default?: boolean; cost_price: number; sell_price?: number }>;
}

export type PickerTab = 'history' | 'recent' | 'all';

export const RECENT_PRODUCT_STORAGE_KEY = 'proclaw.purchase.recentProductIds';
export const RECENT_PRODUCT_LIMIT = 30;

export function filterPickerProducts(products: PickerProduct[], query: string): PickerProduct[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return products;
  return products.filter(product =>
    product.name.toLowerCase().includes(keyword) || product.code.toLowerCase().includes(keyword),
  );
}

export function defaultPickerTab(supplierId: string): PickerTab {
  return supplierId.trim() ? 'history' : 'all';
}

export function mergePickedProducts(lines: PurchaseOrderLine[], picked: PickerProduct[]): PurchaseOrderLine[] {
  const next = lines.map(line => ({ ...line }));
  for (const product of picked) {
    const existing = next.find(line => line.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      next.push({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.unitPrice,
      });
    }
  }
  return next;
}

export function rememberRecentProductIds(current: string[], addedIds: string[], limit = RECENT_PRODUCT_LIMIT): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of [...addedIds].reverse().concat(current)) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= limit) break;
  }
  return next;
}

export function resolveRecentProducts(ids: string[], catalog: PickerProduct[]): PickerProduct[] {
  const byId = new Map(catalog.map(product => [product.id, product]));
  return ids.flatMap(id => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export function historyToPickerProduct(row: SupplierHistoryProduct): PickerProduct {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    unitPrice: Number(row.last_unit_price) || 0,
    lastOrderDate: row.last_order_date,
    orderCount: row.order_count,
  };
}

export function spuToPickerProduct(spu: PickerSpu, priceSource: 'cost' | 'sell' = 'cost'): PickerProduct {
  const sku = spu.skus?.find(item => item.is_default) ?? spu.skus?.[0];
  const unitPrice = priceSource === 'sell'
    ? (sku?.sell_price ?? sku?.cost_price ?? 0)
    : (sku?.cost_price ?? 0);
  return {
    id: spu.id,
    name: spu.name,
    code: spu.spu_code,
    unitPrice,
  };
}
