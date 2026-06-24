import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CloudStore,
  StoreOrder,
  StoreStats,
  StoreTheme,
  createDemoCloudStoreStub,
  DEMO_CLOUD_STORE_STUB_ID,
  getCloudStore,
  getStoreOrders,
  getStoreStats,
  getStoreTheme,
  getSyncableProducts,
} from '../cloudStoreService';
import { ProductSPU } from '../productService';
import { ProductReview, StoreCoupon, fetchStoreCoupons, fetchStoreReviews } from '../cloudStoreExtras';
import { DEMO_EMAIL, isDemoAccount } from '../aiTeamTokenService';
import { useAuthStore } from '../authStore';

export const cloudStoreQueryKey = ['cloudStore'] as const;

const CLOUD_STORE_FETCH_TIMEOUT_MS = 2500;

function isDemoUser(user: { email?: string; id?: string } | null | undefined): boolean {
  if (!user) return isDemoAccount();
  return user.email === DEMO_EMAIL || user.id === 'mock-boss-001';
}

async function fetchCloudStoreWithTimeout(): Promise<CloudStore | null> {
  try {
    const result = await Promise.race([
      getCloudStore(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), CLOUD_STORE_FETCH_TIMEOUT_MS)),
    ]);
    return result?.subdomain ? result : null;
  } catch {
    return null;
  }
}

export function useCloudStore(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const demo = isDemoUser(user);
  return useQuery<CloudStore | null>({
    queryKey: [...cloudStoreQueryKey, 'current', demo ? 'demo' : 'normal'],
    initialData: demo ? createDemoCloudStoreStub() : undefined,
    queryFn: async () => {
      if (demo) {
        const store = await fetchCloudStoreWithTimeout();
        return store ?? createDemoCloudStoreStub();
      }
      const store = await fetchCloudStoreWithTimeout();
      return store?.subdomain ? store : null;
    },
    enabled,
    retry: demo ? 1 : 2,
  });
}

export function useStoreStats(storeId: string | undefined, enabled = true) {
  const isStub = storeId === DEMO_CLOUD_STORE_STUB_ID;
  return useQuery<StoreStats>({
    queryKey: [...cloudStoreQueryKey, 'stats', storeId ?? ''],
    queryFn: () => getStoreStats(storeId!),
    enabled: enabled && !!storeId && !isStub,
  });
}

export function useStoreTheme(storeId: string | undefined, enabled = true) {
  const isStub = storeId === DEMO_CLOUD_STORE_STUB_ID;
  return useQuery<StoreTheme>({
    queryKey: [...cloudStoreQueryKey, 'theme', storeId ?? ''],
    queryFn: () => getStoreTheme(storeId!),
    enabled: enabled && !!storeId && !isStub,
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