import { invoke } from '@tauri-apps/api/core';

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
  return await invoke('create_customer', { customer: input });
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
  return await invoke('create_sales_order', { order: input });
}

export async function getSalesOrders(options?: {
  status?: string;
  search?: string;
}): Promise<SalesOrder[]> {
  return await invoke('get_sales_orders', { options });
}
