import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ProductAnalytics,
  SalesTrendData,
  getProductAnalytics,
  getSalesTrend,
} from '../analyticsService';

export const analyticsQueryKey = ['analytics'] as const;

export function useSalesTrend(period: 'day' | 'week' | 'month') {
  return useQuery<SalesTrendData>({
    queryKey: [...analyticsQueryKey, 'salesTrend', period],
    queryFn: () => getSalesTrend(period),
  });
}

export function useProductAnalytics(enabled = true) {
  return useQuery<ProductAnalytics>({
    queryKey: [...analyticsQueryKey, 'products'],
    queryFn: getProductAnalytics,
    enabled,
  });
}

export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: analyticsQueryKey });
}