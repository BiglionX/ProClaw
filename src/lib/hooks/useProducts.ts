import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductSPUs, Product, ProductSPU } from '../productService';

export const productsQueryKey = ['products'] as const;
export const productSpusQueryKey = ['products', 'spus'] as const;

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: () => getProducts(),
  });
}

export function useProductSPUs(limit = 100, enabled = true) {
  return useQuery<ProductSPU[]>({
    queryKey: [...productSpusQueryKey, limit],
    queryFn: () => getProductSPUs({ limit }),
    enabled,
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: productsQueryKey });
    queryClient.invalidateQueries({ queryKey: productSpusQueryKey });
  };
}