import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CashFlowReport,
  FinancialSummary,
  ProfitLossReport,
  getCashFlowReport,
  getFinancialSummary,
  getProfitLossReport,
} from '../financeService';
import {
  ARAPDetailItem,
  ARAPSummaryItem,
  getARAPDetail,
  getARAPSummary,
} from '../paymentService';
import {
  ReconciliationRule,
  SmtpConfig,
  getReconciliationRules,
  getSmtpConfig,
} from '../reconciliationService';

export const financeQueryKey = ['finance'] as const;

export function currentMonthRange() {
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

export function useFinancialSummary(enabled = true) {
  return useQuery<FinancialSummary>({
    queryKey: [...financeQueryKey, 'summary'],
    queryFn: getFinancialSummary,
    enabled,
  });
}

export function useProfitLossReport(startDate?: string, endDate?: string, enabled = true) {
  const range = currentMonthRange();
  const start = startDate ?? range.startDate;
  const end = endDate ?? range.endDate;
  return useQuery<ProfitLossReport>({
    queryKey: [...financeQueryKey, 'profitLoss', start, end],
    queryFn: () => getProfitLossReport(start, end),
    enabled,
  });
}

export function useCashFlowReport(startDate?: string, endDate?: string, enabled = true) {
  const range = currentMonthRange();
  const start = startDate ?? range.startDate;
  const end = endDate ?? range.endDate;
  return useQuery<CashFlowReport>({
    queryKey: [...financeQueryKey, 'cashFlow', start, end],
    queryFn: () => getCashFlowReport(start, end),
    enabled,
  });
}

export function useARAPSummary(type: 'supplier' | 'customer', enabled = true) {
  return useQuery<ARAPSummaryItem[]>({
    queryKey: [...financeQueryKey, 'arap', type],
    queryFn: () => getARAPSummary(type),
    enabled,
  });
}

export function useARAPDetail(
  type: 'supplier' | 'customer',
  id: string | null,
  enabled = true,
) {
  return useQuery<ARAPDetailItem[]>({
    queryKey: [...financeQueryKey, 'arapDetail', type, id ?? ''],
    queryFn: () => getARAPDetail(type, id!),
    enabled: enabled && !!id,
  });
}

export function useReconciliationRules(enabled = true) {
  return useQuery<ReconciliationRule[]>({
    queryKey: [...financeQueryKey, 'reconciliationRules'],
    queryFn: getReconciliationRules,
    enabled,
  });
}

export function useSmtpConfig(enabled = true) {
  return useQuery<SmtpConfig | null>({
    queryKey: [...financeQueryKey, 'smtpConfig'],
    queryFn: getSmtpConfig,
    enabled,
  });
}

export function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: financeQueryKey });
}