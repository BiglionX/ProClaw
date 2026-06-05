import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

const paymentService = await import('../lib/paymentService');

describe('paymentService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 确保 isTauri 在每个测试前都返回 true
    const tauri = await import('../lib/tauri');
    vi.mocked(tauri.isTauri).mockImplementation(() => true);
  });

  describe('recordPurchasePayment', () => {
    it('应该使用正确的参数调用 record_payment_cmd', async () => {
      vi.mocked(invoke).mockResolvedValue({ id: 'pay_001', paid_amount: 5000, payment_status: 'partial', message: '付款成功' });

      const result = await paymentService.recordPurchasePayment('po_001', 5000, '2026-06-05', 'bank_transfer', 'VCH001', '测试付款');

      expect(invoke).toHaveBeenCalledWith('record_payment_cmd', {
        orderId: 'po_001', amount: 5000, transactionDate: '2026-06-05',
        paymentMethod: 'bank_transfer', voucherNo: 'VCH001', notes: '测试付款', createdBy: null,
      });
      expect(result).toEqual({ id: 'pay_001', paid_amount: 5000, payment_status: 'partial', message: '付款成功' });
    });

    it('可选参数为 null 时应该传 null', async () => {
      vi.mocked(invoke).mockResolvedValue({ id: '', paid_amount: 0, payment_status: 'unpaid', message: '' });

      await paymentService.recordPurchasePayment('po_001', 1000, '2026-06-05');

      expect(invoke).toHaveBeenCalledWith('record_payment_cmd', expect.objectContaining({
        paymentMethod: null, voucherNo: null, notes: null,
      }));
    });

    it('非 Tauri 环境应该返回 mock 数据', async () => {
      const tauri = await import('../lib/tauri');
      vi.mocked(tauri.isTauri).mockReturnValue(false);

      const result = await paymentService.recordPurchasePayment('po_001', 1000, '2026-06-05');
      expect(result).toEqual({ id: '', paid_amount: 0, payment_status: 'unpaid', message: 'Mock' });
    });
  });

  describe('recordSalesReceipt', () => {
    it('应该使用正确的参数调用 record_receipt_cmd', async () => {
      vi.mocked(invoke).mockResolvedValue({ id: 'rcv_001', paid_amount: 10000, payment_status: 'paid', message: '收款成功' });

      await paymentService.recordSalesReceipt('so_001', 10000, '2026-06-05', 'wechat', 'WX20260605', '微信收款');

      expect(invoke).toHaveBeenCalledWith('record_receipt_cmd', {
        orderId: 'so_001', amount: 10000, transactionDate: '2026-06-05',
        paymentMethod: 'wechat', voucherNo: 'WX20260605', notes: '微信收款', createdBy: null,
      });
    });
  });

  describe('getPaymentHistory', () => {
    it('应该使用正确的参数调用 get_payments_cmd', async () => {
      const mockTransactions = [
        { id: 't1', order_type: 'purchase', transaction_type: 'payment', amount: 5000, transaction_date: '2026-06-05', payment_method: 'bank_transfer', voucher_no: null, notes: null, created_by: null, created_at: '2026-06-05 10:00:00' },
      ];
      vi.mocked(invoke).mockResolvedValue(mockTransactions);

      const result = await paymentService.getPaymentHistory('po_001');

      expect(invoke).toHaveBeenCalledWith('get_payments_cmd', { orderId: 'po_001' });
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('getARAPSummary', () => {
    it('应该使用正确的参数调用 get_ar_ap_summary_cmd', async () => {
      const mockSummary = [
        { counterparty_id: 's_001', counterparty_name: '供应商A', counterparty_code: 'SUP001', email: null, contact_person: null, phone: null, order_count: 3, total_amount: 50000, paid_amount: 20000, balance: 30000, counterparty_type: 'supplier' },
      ];
      vi.mocked(invoke).mockResolvedValue(mockSummary);

      const result = await paymentService.getARAPSummary('supplier');

      expect(invoke).toHaveBeenCalledWith('get_ar_ap_summary_cmd', { counterpartyType: 'supplier' });
      expect(result).toEqual(mockSummary);
    });

    it('不传类型时应该传 null', async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      await paymentService.getARAPSummary();
      expect(invoke).toHaveBeenCalledWith('get_ar_ap_summary_cmd', { counterpartyType: null });
    });
  });

  describe('getARAPDetail', () => {
    it('应该使用正确的参数调用 get_ar_ap_detail_cmd', async () => {
      const mockDetail = [
        { order_id: 'po_001', order_number: 'PO-20260601-001', order_date: '2026-06-01', status: 'confirmed', total_amount: 50000, paid_amount: 20000, balance: 30000, payment_status: 'partial', order_type: 'purchase' },
      ];
      vi.mocked(invoke).mockResolvedValue(mockDetail);

      const result = await paymentService.getARAPDetail('supplier', 's_001');

      expect(invoke).toHaveBeenCalledWith('get_ar_ap_detail_cmd', { counterpartyType: 'supplier', counterpartyId: 's_001' });
      expect(result).toEqual(mockDetail);
    });
  });
});
