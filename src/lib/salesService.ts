import { invoke } from '@tauri-apps/api/core';

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

export async function getSalesOrders(options?: {
  status?: string;
  search?: string;
}): Promise<SalesOrder[]> {
  return await invoke('get_sales_orders', { options });
}
