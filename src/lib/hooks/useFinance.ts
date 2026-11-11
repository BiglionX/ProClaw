import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CashFlowReport,
  FinancialSummary,
  ProfitLossReport,
  ReportLineItem,
  ReportLineKind,
  getCashFlowReport,
  getFinancialSummary,
  getProfitLossReport,
  getReportLines,
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

export type ReportPreset = 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMonthRange(now = new Date()) {
  return rangeForPreset('month', now);
}

export function rangeForPreset(preset: Exclude<ReportPreset, 'custom'>, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (preset === 'month') {
    return {
      startDate: formatLocalDate(new Date(year, month, 1)),
      endDate: formatLocalDate(now),
    };
  }
  if (preset === 'lastMonth') {
    return {
      startDate: formatLocalDate(new Date(year, month - 1, 1)),
      endDate: formatLocalDate(new Date(year, month, 0)),
    };
  }
  if (preset === 'quarter') {
    const quarterStart = Math.floor(month / 3) * 3;
    return {
      startDate: formatLocalDate(new Date(year, quarterStart, 1)),
      endDate: formatLocalDate(now),
    };
  }
  return {
    startDate: formatLocalDate(new Date(year, 0, 1)),
    endDate: formatLocalDate(now),
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

export function useReportLines(
  line: ReportLineKind | null,
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery<ReportLineItem[]>({
    queryKey: [...financeQueryKey, 'reportLines', line, startDate, endDate],
    queryFn: () => getReportLines(startDate, endDate, line!),
    enabled: enabled && !!line,
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