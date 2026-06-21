import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  InventoryStats,
  InventoryTransaction,
  getInventoryStats,
  getInventoryTransactions,
} from '../inventoryService';
import { ProductSPU, getProductSPUs } from '../productService';
import { StockConfidenceInfo, getLowConfidenceProducts } from '../inventoryCalibrationService';

export const inventoryDashboardKey = ['inventory', 'dashboard'] as const;

export interface InventoryDashboardData {
  stats: InventoryStats;
  transactions: InventoryTransaction[];
  products: ProductSPU[];
  lowConfidence: StockConfidenceInfo[];
}

export function useInventoryDashboard(enabled = true) {
  return useQuery<InventoryDashboardData>({
    queryKey: inventoryDashboardKey,
    enabled,
    queryFn: async () => {
      const [stats, transactions, products] = await Promise.all([
        getInventoryStats(),
        getInventoryTransactions(),
        getProductSPUs({ limit: 100 }),
      ]);
      let lowConfidence: StockConfidenceInfo[] = [];
      try {
        lowConfidence = await getLowConfidenceProducts();
      } catch {
        lowConfidence = [];
      }
      return { stats, transactions, products, lowConfidence };
    },
  });
}

export function useInvalidateInventoryDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: inventoryDashboardKey });
}
