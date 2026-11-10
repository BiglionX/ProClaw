export interface DraftOrderLine {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface DraftOrderHeader {
  supplier_id?: string;
  customer_id?: string;
  order_date?: string;
  expected_delivery_date?: string;
  shipping_address?: string;
  notes?: string;
}

export function canEditDraftOrder(status: string): boolean {
  return status === 'draft';
}

export function draftOrderTotal(lines: DraftOrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
}

export function validateDraftOrderLines(lines: DraftOrderLine[]): string | null {
  if (lines.length === 0) return '请至少保留一个商品';
  for (const line of lines) {
    if (!line.product_id.trim()) return '请选择商品';
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) return '数量必须是大于 0 的整数';
    if (!(line.unit_price >= 0)) return '单价不能为负数';
  }
  return null;
}

function toUpdateItems(lines: DraftOrderLine[]) {
  return lines.map(line => ({
    product_id: line.product_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
    ...(line.notes ? { notes: line.notes } : {}),
  }));
}

export function buildPurchaseDraftUpdate(order: DraftOrderHeader, lines: DraftOrderLine[]) {
  return {
    supplier_id: order.supplier_id ?? '',
    order_date: order.order_date,
    expected_delivery_date: order.expected_delivery_date,
    notes: order.notes,
    items: toUpdateItems(lines),
  };
}

export function buildSalesDraftUpdate(order: DraftOrderHeader, lines: DraftOrderLine[]) {
  return {
    customer_id: order.customer_id ?? '',
    order_date: order.order_date,
    expected_delivery_date: order.expected_delivery_date,
    shipping_address: order.shipping_address,
    notes: order.notes,
    items: toUpdateItems(lines),
  };
}

export function linesFromOrderItems(items: Array<{
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}>): DraftOrderLine[] {
  return items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name || item.sku || item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    ...(item.notes ? { notes: item.notes } : {}),
  }));
}
