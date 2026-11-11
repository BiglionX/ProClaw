/** 数据中心跳转到供应链时使用的明细口径，与财务概览 SQL 一致。 */

const FULFILLED_SALES = new Set(['confirmed', 'shipped', 'delivered']);

export type FinanceDrill =
  | 'month-revenue'
  | 'month-expense'
  | 'receivable'
  | 'payable'
  | 'inventory-value'
  | 'working-capital';

interface DrillOrder {
  status: string;
  order_date: string;
  payment_status: string;
  total_amount: number;
  paid_amount?: number;
}

/** 与 SQLite `strftime('%Y-%m', 'now')` 对齐，避免本地时区把月份差一天。 */
export function utcYearMonth(date = new Date()): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

export function drillBalance(order: DrillOrder, drill: string | null): number {
  if (drill === 'receivable' || drill === 'payable') {
    return Math.max(0, order.total_amount - (order.paid_amount || 0));
  }
  return order.total_amount;
}

export function filterSalesForDrill<T extends DrillOrder>(orders: T[], drill: string | null): T[] {
  if (drill === 'month-revenue') {
    const month = utcYearMonth();
    return orders.filter((order) => FULFILLED_SALES.has(order.status) && order.order_date.slice(0, 7) === month);
  }
  if (drill === 'receivable') {
    return orders.filter((order) => FULFILLED_SALES.has(order.status) && order.payment_status !== 'paid');
  }
  return orders;
}

export function filterPurchasesForDrill<T extends DrillOrder>(orders: T[], drill: string | null): T[] {
  if (drill === 'month-expense') {
    const month = utcYearMonth();
    return orders.filter((order) => order.status === 'received' && order.order_date.slice(0, 7) === month);
  }
  if (drill === 'payable') {
    return orders.filter((order) => order.status === 'received' && order.payment_status !== 'paid');
  }
  return orders;
}

export function drillListTitle(drill: string | null): string | null {
  switch (drill) {
    case 'month-revenue':
      return '本月收入明细';
    case 'month-expense':
      return '本月支出明细';
    case 'receivable':
      return '应收账款明细';
    case 'payable':
      return '应付账款明细';
    case 'inventory-value':
      return '库存价值';
    case 'working-capital':
      return '营运资金';
    default:
      return null;
  }
}
