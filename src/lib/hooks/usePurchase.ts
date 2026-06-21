import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PurchaseOrder,
  Supplier,
  getPurchaseOrders,
  getSuppliers,
} from '../purchaseService';
import {
  PurchaseReturn,
  getPurchaseReturns,
} from '../purchaseReturnService';

export const purchaseSuppliersKey = ['purchase', 'suppliers'] as const;
export const purchaseOrdersKey = ['purchase', 'orders'] as const;
export const purchaseReturnsKey = ['purchase', 'returns'] as const;

export function useSuppliers(search?: string, enabled = true) {
  return useQuery<Supplier[]>({
    queryKey: [...purchaseSuppliersKey, search ?? ''],
    queryFn: () => getSuppliers({ search: search || undefined }),
    enabled,
  });
}

export function usePurchaseOrders(search?: string, enabled = true) {
  return useQuery<PurchaseOrder[]>({
    queryKey: [...purchaseOrdersKey, search ?? ''],
    queryFn: () => getPurchaseOrders({ search: search || undefined }),
    enabled,
  });
}

export function usePurchaseReturns(search?: string, enabled = true) {
  return useQuery<PurchaseReturn[]>({
    queryKey: [...purchaseReturnsKey, search ?? ''],
    queryFn: () => getPurchaseReturns({ search: search || undefined }),
    enabled,
  });
}

export function useInvalidatePurchase() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: purchaseSuppliersKey });
    queryClient.invalidateQueries({ queryKey: purchaseOrdersKey });
    queryClient.invalidateQueries({ queryKey: purchaseReturnsKey });
  };
}