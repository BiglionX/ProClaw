import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

/**
 * 生成销售退货单编号
 * 格式: SR-YYYYMMDD-XXXX
 */
export function generateSRNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SR-${dateStr}-${randomStr}`;
}

export interface SalesReturn {
  id: string;
  sr_number: string;
  sales_order_id: string;
  so_number?: string;
  customer_id: string;
  customer_name?: string;
  return_date: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  refund_amount: number;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesReturnItem {
  id?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  reason?: string;
}

export interface SalesReturnDetail {
  return: SalesReturn;
  items: SalesReturnItem[];
}

export interface CreateSalesReturnInput {
  sr_number?: string;
  sales_order_id: string;
  customer_id: string;
  return_date?: string;
  reason?: string;
  notes?: string;
  created_by?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    reason?: string;
  }>;
}

export async function createSalesReturn(
  input: CreateSalesReturnInput
): Promise<{ id: string; sr_number: string; total_amount: number }> {
  const finalInput = {
    ...input,
    sr_number: input.sr_number || generateSRNumber(),
  };
  return await invoke('create_sales_return', { return: finalInput });
}

export async function getSalesReturns(options?: {
  status?: string;
  search?: string;
  sales_order_id?: string;
}): Promise<SalesReturn[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_sales_returns', { options });
}

export async function getSalesReturnDetail(
  returnId: string
): Promise<SalesReturnDetail> {
  return await invoke('get_sales_return_detail', { returnId });
}

export async function confirmSalesReturn(
  returnId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('confirm_sales_return', { returnId });
}

export async function cancelSalesReturn(
  returnId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('cancel_sales_return', { returnId });
}
