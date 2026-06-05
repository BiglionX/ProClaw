import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauri';

/**
 * 生成客户编码
 * 格式: CUS-{YYYYMMDD}-{随机4位}
 * 示例: CUS-20260415-A3F7
 */
export function generateCustomerCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CUS-${dateStr}-${randomStr}`;
}

/**
 * 生成销售订单号
 * 格式: SO-{YYYYMMDD}-{随机4位}
 * 示例: SO-20260415-A3F7
 */
export function generateSalesOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SO-${dateStr}-${randomStr}`;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  customer_type: 'individual' | 'company';
  tax_number?: string;
  credit_limit: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  customer_type?: 'individual' | 'company';
  tax_number?: string;
  credit_limit?: number;
  notes?: string;
  is_active?: boolean;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ id: string; name: string; code: string }> {
  // 如果未提供编码，自动生成
  const finalInput = {
    ...input,
    code: input.code || generateCustomerCode(),
  };
  return await invoke('create_customer', { customer: finalInput });
}

export async function getCustomers(options?: {
  search?: string;
}): Promise<Customer[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_customers', { options });
}

// ==================== 销售订单接口 ====================

export interface SalesOrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  shipped_quantity?: number;
  notes?: string;
}

export interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  platform_source?: 'local' | 'groupbuy' | 'miniapp';
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSalesOrderInput {
  so_number?: string;
  customer_id: string;
  order_date?: string;
  expected_delivery_date?: string;
  shipping_address?: string;
  notes?: string;
  created_by?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
}

export async function createSalesOrder(
  input: CreateSalesOrderInput
): Promise<{ id: string; so_number: string; total_amount: number }> {
  // 如果未提供订单号，自动生成
  const finalInput = {
    ...input,
    so_number: input.so_number || generateSalesOrderNumber(),
  };
  return await invoke('create_sales_order', { order: finalInput });
}

export interface SalesOrderDetail {
  order: SalesOrder;
  items: SalesOrderItem[];
}

export async function getSalesOrders(options?: {
  status?: string;
  search?: string;
  platform_source?: string;
}): Promise<SalesOrder[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_sales_orders', { options });
}

export async function getSalesOrderDetail(
  orderId: string
): Promise<SalesOrderDetail> {
  return await invoke('get_sales_order_detail', { orderId });
}

/**
 * 提交销售订单 → 确认出库 + 自动扣减库存
 */
export async function submitSalesOrder(
  orderId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('submit_sales_order_cmd', { orderId });
}

/**
 * 更新销售订单（仅草稿状态）
 */
export async function updateSalesOrder(
  orderId: string,
  order: Partial<CreateSalesOrderInput>
): Promise<{ id: string; message: string }> {
  return await invoke('update_sales_order_cmd', { orderId, order });
}

/**
 * 删除销售订单（仅草稿/已取消状态）
 */
export async function deleteSalesOrder(
  orderId: string
): Promise<{ id: string; message: string }> {
  return await invoke('delete_sales_order_cmd', { orderId });
}

/**
 * 取消销售订单 (任意状态 → cancelled)
 */
export async function cancelSalesOrder(
  orderId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('cancel_sales_order_cmd', { orderId });
}

/**
 * 标记销售订单已发货 (confirmed → shipped)
 */
export async function markSalesShipped(
  orderId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('mark_sales_shipped_cmd', { orderId });
}

/**
 * 标记销售订单已送达 (shipped → delivered)
 */
export async function markSalesDelivered(
  orderId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('mark_sales_delivered_cmd', { orderId });
}
