/** 财务管理 Agent - Tauri 命令封装 */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

/** 账户 */
export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'alipay' | 'wechat' | 'other';
  balance: number;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

/** 交易记录 */
export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  transaction_date: string;
  note: string | null;
  created_at: string;
  category_name: string | null;
  account_name: string | null;
}

/** 预算 */
export interface Budget {
  id: string;
  category_id: string;
  month: string;
  limit_amount: number;
  actual_amount: number;
  notes: string | null;
  category_name: string | null;
  category_icon: string | null;
  usage_percent: number;
  is_over_budget: boolean;
}

/** 发票 */
export interface Invoice {
  id: string;
  type: 'input' | 'output';
  invoice_code: string | null;
  invoice_number: string | null;
  amount: number;
  tax_amount: number;
  tax_rate: number;
  status: string;
  issue_date: string | null;
  counterparty_name: string | null;
  counterparty_tax_id: string | null;
  notes: string | null;
  created_at: string;
}

/** 分类汇总 */
export interface CategorySummary {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  amount: number;
}

export const FinanceAgentApi = {
  // 账户
  async getAccounts(): Promise<Account[]> {
    return invoke<Account[]>('get_fa_accounts');
  },

  async createAccount(name: string, type: string, balance?: number, notes?: string): Promise<string> {
    return invoke<string>('create_fa_account', { name, accountType: type, balance, notes });
  },

  // 交易
  async getTransactions(params?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Transaction[]; total: number; page: number; page_size: number }> {
    return invoke('get_fa_transactions', params || {});
  },

  async createTransaction(params: {
    accountId: string;
    categoryId?: string;
    amount: number;
    type: string;
    transactionDate: string;
    note?: string;
    attachmentId?: string;
  }): Promise<string> {
    return invoke<string>('create_fa_transaction', params);
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    return invoke('delete_fa_transaction', { transactionId });
  },

  // 预算
  async getBudgets(month?: string): Promise<Budget[]> {
    return invoke<Budget[]>('get_fa_budgets', month ? { month } : {});
  },

  async createBudget(categoryId: string, month: string, limitAmount: number, notes?: string): Promise<string> {
    return invoke<string>('create_fa_budget', { categoryId, month, limitAmount, notes });
  },

  async checkBudgetAlerts(): Promise<{ budget_id: string; category_name: string; level: string }[]> {
    return invoke('check_fa_budget_alerts');
  },

  // 报表
  async getCategorySummary(startDate: string, endDate: string): Promise<{
    categories: CategorySummary[];
    summary: { total_income: number; total_expense: number; net: number };
  }> {
    return invoke('get_fa_category_summary', { startDate, endDate });
  },

  async getProfitLoss(startDate: string, endDate: string): Promise<{
    period: { start: string; end: string };
    total_income: number;
    total_expense: number;
    net_profit: number;
    profit_margin: number;
  }> {
    return invoke('get_fa_profit_loss', { startDate, endDate });
  },

  async getMonthlyTrend(months?: number): Promise<{ month: string; income: number; expense: number }[]> {
    return invoke('get_fa_monthly_trend', { months });
  },

  // 发票
  async getInvoices(params?: { type?: string; status?: string; page?: number; pageSize?: number }): Promise<{
    data: Invoice[];
    total: number;
    page: number;
    page_size: number;
  }> {
    return invoke('get_fa_invoices', params || {});
  },

  async createInvoice(params: {
    invoiceType: string;
    invoiceCode?: string;
    invoiceNumber?: string;
    amount: number;
    taxAmount?: number;
    taxRate?: number;
    issueDate?: string;
    counterpartyName?: string;
    counterpartyTaxId?: string;
    fileId?: string;
    notes?: string;
  }): Promise<string> {
    return invoke<string>('create_fa_invoice', params);
  },

  async updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    return invoke('update_fa_invoice_status', { invoiceId, status });
  },
};
