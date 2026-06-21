import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';

export interface PaymentTransaction {
  id: string;
  order_type: string;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  payment_method: string | null;
  voucher_no: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ARAPSummaryItem {
  counterparty_id: string;
  counterparty_name: string | null;
  counterparty_code: string | null;
  email: string | null;
  contact_person: string | null;
  phone: string | null;
  order_count: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  counterparty_type: string;
}

export interface ARAPDetailItem {
  order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  payment_status: string;
  order_type: string;
}

export interface PaymentResult {
  id: string;
  paid_amount: number;
  payment_status: string;
  message: string;
}

/** 记录采购付款 */
export async function recordPurchasePayment(
  orderId: string,
  amount: number,
  transactionDate: string,
  paymentMethod?: string,
  voucherNo?: string,
  notes?: string,
  createdBy?: string,
): Promise<PaymentResult> {
  if (!isTauri()) {
    return { id: '', paid_amount: 0, payment_status: 'unpaid', message: 'Mock' };
  }
  return await invoke('record_payment_cmd', {
    orderId,
    amount,
    transactionDate,
    paymentMethod: paymentMethod || null,
    voucherNo: voucherNo || null,
    notes: notes || null,
    createdBy: createdBy || null,
  });
}

/** 记录销售收款 */
export async function recordSalesReceipt(
  orderId: string,
  amount: number,
  transactionDate: string,
  paymentMethod?: string,
  voucherNo?: string,
  notes?: string,
  createdBy?: string,
): Promise<PaymentResult> {
  if (!isTauri()) {
    return { id: '', paid_amount: 0, payment_status: 'unpaid', message: 'Mock' };
  }
  return await invoke('record_receipt_cmd', {
    orderId,
    amount,
    transactionDate,
    paymentMethod: paymentMethod || null,
    voucherNo: voucherNo || null,
    notes: notes || null,
    createdBy: createdBy || null,
  });
}

/** 获取订单付款/收款历史 */
export async function getPaymentHistory(orderId: string): Promise<PaymentTransaction[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_payments_cmd', { orderId });
}

/** 获取 AR/AP 汇总（按供应商/客户维度） */
export async function getARAPSummary(counterpartyType?: 'supplier' | 'customer'): Promise<ARAPSummaryItem[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_ar_ap_summary_cmd', { counterpartyType: counterpartyType || null });
}

/** 获取某供应商/客户的未清项明细 */
export async function getARAPDetail(
  counterpartyType: 'supplier' | 'customer',
  counterpartyId: string,
): Promise<ARAPDetailItem[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke('get_ar_ap_detail_cmd', { counterpartyType, counterpartyId });
}
