import { invoke } from '@tauri-apps/api/core';

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
export async function createSupplier(input: CreateSupplierInput): Promise<{ id: string; name: string; code: string }> {
  return await invoke('create_supplier', { supplier: input });
}

/**
 * 获取供应商列表
 */
export async function getSuppliers(options?: { search?: string }): Promise<Supplier[]> {
  return await invoke('get_suppliers', { options });
}
