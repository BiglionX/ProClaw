import { invoke } from '@tauri-apps/api/core';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  reference_no?: string;
  reason?: string;
  performed_by?: string;
  notes?: string;
  created_at: string;
  sync_status: string;
}

export interface CreateTransactionInput {
  product_id: string;
  transaction_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  reference_no?: string;
  reason?: string;
  performed_by?: string;
  notes?: string;
}

export interface InventoryStats {
  total_products: number;
  low_stock_count: number;
  zero_stock_count: number;
  today_transactions: number;
  total_value: number;
  low_stock_products: Array<{
    id: string;
    name: string;
    sku: string;
    current_stock: number;
    min_stock: number;
  }>;
}

/**
 * 创建库存交易
 */
export async function createInventoryTransaction(
  input: CreateTransactionInput
): Promise<{ id: string; message: string }> {
  return await invoke('create_inventory_transaction', { transaction: input });
}

/**
 * 获取库存交易列表
 */
export async function getInventoryTransactions(options?: {
  product_id?: string;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<InventoryTransaction[]> {
  return await invoke('get_inventory_transactions', { options });
}

/**
 * 获取库存统计信息
 */
export async function getInventoryStats(): Promise<InventoryStats> {
  return await invoke('get_inventory_stats');
}
