import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Customer,
  SalesOrder,
  getCustomers,
  getSalesOrders,
} from '../salesService';
import {
  SalesReturn,
  getSalesReturns,
} from '../salesReturnService';

export const salesCustomersKey = ['sales', 'customers'] as const;
export const salesOrdersKey = ['sales', 'orders'] as const;
export const salesReturnsKey = ['sales', 'returns'] as const;

export function useCustomers(search?: string, enabled = true) {
  return useQuery<Customer[]>({
    queryKey: [...salesCustomersKey, search ?? ''],
    queryFn: () => getCustomers({ search: search || undefined }),
    enabled,
  });
}

export function useSalesOrders(
  options: { search?: string; platform?: string },
  enabled = true
) {
  const { search, platform } = options;
  return useQuery<SalesOrder[]>({
    queryKey: [...salesOrdersKey, search ?? '', platform ?? ''],
    queryFn: () =>
      getSalesOrders({
        search: search || undefined,
        platform_source: platform || undefined,
      }),
    enabled,
  });
}

export function useSalesReturns(search?: string, enabled = true) {
  return useQuery<SalesReturn[]>({
    queryKey: [...salesReturnsKey, search ?? ''],
    queryFn: () => getSalesReturns({ search: search || undefined }),
    enabled,
  });
}

export function useShippedSalesOrders(enabled = true) {
  return useQuery<SalesOrder[]>({
    queryKey: [...salesOrdersKey, 'shipped'],
    queryFn: async () => {
      const all = await getSalesOrders({});
      return all.filter(
        (o) => o.status === 'confirmed' || o.status === 'shipped' || o.status === 'delivered'
      );
    },
    enabled,
  });
}

export function useInvalidateSales() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: salesCustomersKey });
    queryClient.invalidateQueries({ queryKey: salesOrdersKey });
    queryClient.invalidateQueries({ queryKey: salesReturnsKey });
  };
}