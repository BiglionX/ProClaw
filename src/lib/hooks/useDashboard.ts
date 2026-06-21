import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProductAnalytics, getProductAnalytics } from '../analyticsService';
import { FinancialSummary, getFinancialSummary } from '../financeService';
import { InventoryStats, getInventoryStats } from '../inventoryService';
import { getDatabaseStats } from '../productService';

export type DatabaseStats = Awaited<ReturnType<typeof getDatabaseStats>>;

export const dashboardQueryKey = ['dashboard'] as const;

export interface DashboardOverview {
  invStats: InventoryStats;
  prodAnalytics: ProductAnalytics;
  finSummary: FinancialSummary;
  dbStatistics: DatabaseStats;
}

export function useDashboardOverview(enabled = true) {
  return useQuery<DashboardOverview>({
    queryKey: [...dashboardQueryKey, 'overview'],
    queryFn: async () => {
      const [invStats, prodAnalytics, finSummary, dbStatistics] = await Promise.all([
        getInventoryStats(),
        getProductAnalytics(),
        getFinancialSummary(),
        getDatabaseStats(),
      ]);
      return { invStats, prodAnalytics, finSummary, dbStatistics };
    },
    enabled,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
}