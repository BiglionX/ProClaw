import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

/**
 * 生成采购退货单编号
 * 格式: PR-YYYYMMDD-XXXX
 */
export function generatePRNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${dateStr}-${randomStr}`;
}

export interface PurchaseReturn {
  id: string;
  pr_number: string;
  purchase_order_id: string;
  po_number?: string;
  supplier_id: string;
  supplier_name?: string;
  return_date: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  refund_amount: number;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseReturnItem {
  id?: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  reason?: string;
}

export interface PurchaseReturnDetail {
  return: PurchaseReturn;
  items: PurchaseReturnItem[];
}

export interface CreatePurchaseReturnInput {
  pr_number?: string;
  purchase_order_id: string;
  supplier_id: string;
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

export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput
): Promise<{ id: string; pr_number: string; total_amount: number }> {
  const finalInput = {
    ...input,
    pr_number: input.pr_number || generatePRNumber(),
  };
  return await invoke('create_purchase_return', { return: finalInput });
}

export async function getPurchaseReturns(options?: {
  status?: string;
  search?: string;
  purchase_order_id?: string;
}): Promise<PurchaseReturn[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_purchase_returns', { options });
}

export async function getPurchaseReturnDetail(
  returnId: string
): Promise<PurchaseReturnDetail> {
  return await invoke('get_purchase_return_detail', { returnId });
}

export async function confirmPurchaseReturn(
  returnId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('confirm_purchase_return', { returnId });
}

export async function cancelPurchaseReturn(
  returnId: string
): Promise<{ id: string; status: string; message: string }> {
  return await invoke('cancel_purchase_return', { returnId });
}

export async function updatePurchaseReturn(
  returnId: string,
  input: Partial<CreatePurchaseReturnInput>
): Promise<{ id: string; message: string }> {
  return await invoke('update_purchase_return', { returnId, return: input });
}
