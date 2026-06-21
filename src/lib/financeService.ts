import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

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
  if (!isTauri()) {
    return {
      period: { start: startDate, end: endDate },
      revenue: 0,
      cost_of_goods_sold: 0,
      gross_profit: 0,
      operating_expenses: 0,
      net_profit: 0,
      profit_margin: 0,
    };
  }
  return await invoke('get_profit_loss_report', { startDate, endDate });
}

export async function getCashFlowReport(
  startDate: string,
  endDate: string
): Promise<CashFlowReport> {
  if (!isTauri()) {
    return {
      period: { start: startDate, end: endDate },
      operating_activities: {
        inflow: 0,
        outflow: 0,
        net: 0,
      },
      investing_activities: 0,
      financing_activities: 0,
      net_cash_flow: 0,
    };
  }
  return await invoke('get_cash_flow_report', { startDate, endDate });
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  if (!isTauri()) {
    return {
      monthly_revenue: 0,
      monthly_expense: 0,
      monthly_profit: 0,
      accounts_receivable: 0,
      accounts_payable: 0,
      inventory_value: 0,
      working_capital: 0,
    };
  }
  return await invoke('get_financial_summary');
}
