import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CloudStore,
  StoreOrder,
  StoreStats,
  StoreTheme,
  getCloudStore,
  getStoreOrders,
  getStoreStats,
  getStoreTheme,
  getSyncableProducts,
} from '../cloudStoreService';
import { ProductSPU } from '../productService';
import { ProductReview, StoreCoupon, fetchStoreCoupons, fetchStoreReviews } from '../cloudStoreExtras';

export const cloudStoreQueryKey = ['cloudStore'] as const;

export function useCloudStore(enabled = true) {
  return useQuery<CloudStore | null>({
    queryKey: [...cloudStoreQueryKey, 'current'],
    queryFn: getCloudStore,
    enabled,
  });
}

export function useStoreStats(storeId: string | undefined, enabled = true) {
  return useQuery<StoreStats>({
    queryKey: [...cloudStoreQueryKey, 'stats', storeId ?? ''],
    queryFn: () => getStoreStats(storeId!),
    enabled: enabled && !!storeId,
  });
}

export function useStoreTheme(storeId: string | undefined, enabled = true) {
  return useQuery<StoreTheme>({
    queryKey: [...cloudStoreQueryKey, 'theme', storeId ?? ''],
    queryFn: () => getStoreTheme(storeId!),
    enabled: enabled && !!storeId,
  });
}

export function useSyncableProducts(enabled = true) {
  return useQuery<ProductSPU[]>({
    queryKey: [...cloudStoreQueryKey, 'syncableProducts'],
    queryFn: getSyncableProducts,
    enabled,
  });
}

export function useStoreOrders(
  storeId: string | undefined,
  status?: string,
  enabled = true,
) {
  return useQuery<StoreOrder[]>({
    queryKey: [...cloudStoreQueryKey, 'orders', storeId ?? '', status ?? 'all'],
    queryFn: () => getStoreOrders(storeId!, status as any),
    enabled: enabled && !!storeId,
  });
}

export function useStoreReviews(productId?: string, enabled = true) {
  return useQuery<ProductReview[]>({
    queryKey: [...cloudStoreQueryKey, 'reviews', productId ?? 'all'],
    queryFn: () => fetchStoreReviews(productId),
    enabled,
  });
}

export function useStoreCoupons(enabled = true) {
  return useQuery<StoreCoupon[]>({
    queryKey: [...cloudStoreQueryKey, 'coupons'],
    queryFn: fetchStoreCoupons,
    enabled,
  });
}

export function useInvalidateCloudStore() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cloudStoreQueryKey });
}