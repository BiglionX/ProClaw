import { invoke } from '@tauri-apps/api/core';

export interface ProfitLossReport {
  period: { start: string; end: string };
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface CashFlowReport {
  period: { start: string; end: string };
  operating_activities: {
    inflow: number;
    outflow: number;
    net: number;
  };
  investing_activities: number;
  financing_activities: number;
  net_cash_flow: number;
}

export interface FinancialSummary {
  monthly_revenue: number;
  monthly_expense: number;
  monthly_profit: number;
  accounts_receivable: number;
  accounts_payable: number;
  inventory_value: number;
  working_capital: number;
}

export async function getProfitLossReport(
  startDate: string,
  endDate: string
): Promise<ProfitLossReport> {
  return await invoke('get_profit_loss_report', { startDate, endDate });
}

export async function getCashFlowReport(
  startDate: string,
  endDate: string
): Promise<CashFlowReport> {
  return await invoke('get_cash_flow_report', { startDate, endDate });
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  return await invoke('get_financial_summary');
}
