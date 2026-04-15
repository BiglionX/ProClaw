import { invoke } from '@tauri-apps/api/core';

/**
 * 生成供应商编码
 * 格式: SUP-{YYYYMMDD}-{随机4位}
 * 示例: SUP-20260415-A3F7
 */
export function generateSupplierCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SUP-${dateStr}-${randomStr}`;
}

/**
 * 生成采购订单号
 * 格式: PO-{YYYYMMDD}-{随机4位}
 * 示例: PO-20260415-A3F7
 */
export function generatePurchaseOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${dateStr}-${randomStr}`;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  tax_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  tax_number?: string;
  notes?: string;
  is_active?: boolean;
}

/**
 * 创建供应商
 */
export async function createSupplier(
  input: CreateSupplierInput
): Promise<{ id: string; name: string; code: string }> {
  // 如果未提供编码，自动生成
  const finalInput = {
    ...input,
    code: input.code || generateSupplierCode(),
  };
  return await invoke('create_supplier', { supplier: finalInput });
}

/**
 * 获取供应商列表
 */
export async function getSuppliers(options?: {
  search?: string;
}): Promise<Supplier[]> {
  return await invoke('get_suppliers', { options });
}

// ==================== 采购订单接口 ====================

export interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  received_quantity?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderInput {
  po_number?: string;
  supplier_id: string;
  order_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  created_by?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
}

export interface PurchaseOrderDetail {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
}

/**
 * 创建采购订单
 */
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<{ id: string; po_number: string; total_amount: number }> {
  // 如果未提供订单号，自动生成
  const finalInput = {
    ...input,
    po_number: input.po_number || generatePurchaseOrderNumber(),
  };
  return await invoke('create_purchase_order', { order: finalInput });
}

/**
 * 获取采购订单列表
 */
export async function getPurchaseOrders(options?: {
  status?: string;
  search?: string;
}): Promise<PurchaseOrder[]> {
  return await invoke('get_purchase_orders', { options });
}

/**
 * 获取采购订单详情
 */
export async function getPurchaseOrderDetail(
  orderId: string
): Promise<PurchaseOrderDetail> {
  return await invoke('get_purchase_order_detail', { orderId });
}
