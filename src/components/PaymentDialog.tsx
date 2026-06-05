import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { recordPurchasePayment, recordSalesReceipt } from '../lib/paymentService';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderType: 'purchase' | 'sales';
  totalAmount: number;
  paidAmount: number;
  onSuccess: (result: { paid_amount: number; payment_status: string }) => void;
}

const paymentMethods = [
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'cash', label: '现金' },
  { value: 'check', label: '支票' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'other', label: '其他' },
];

export default function PaymentDialog({
  open,
  onClose,
  orderId,
  orderType,
  totalAmount,
  paidAmount,
  onSuccess,
}: PaymentDialogProps) {
  const remaining = Math.max(0, totalAmount - paidAmount);
  const [amount, setAmount] = useState(remaining);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [voucherNo, setVoucherNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = orderType === 'purchase' ? '记录付款' : '记录收款';
  const unitLabel = orderType === 'purchase' ? '付款' : '收款';

  const handleSubmit = async () => {
    if (amount <= 0) {
      setError(`${unitLabel}金额必须大于0`);
      return;
    }
    if (amount > remaining) {
      setError(`${unitLabel}金额不能超过未${unitLabel}金额(¥${remaining.toFixed(2)})`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = orderType === 'purchase'
        ? await recordPurchasePayment(orderId, amount, transactionDate, paymentMethod, voucherNo || undefined, notes || undefined)
        : await recordSalesReceipt(orderId, amount, transactionDate, paymentMethod, voucherNo || undefined, notes || undefined);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(remaining);
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('bank_transfer');
    setVoucherNo('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          label={`${unitLabel}金额`}
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          inputProps={{ min: 0, max: remaining, step: 0.01 }}
          helperText={`订单总额 ¥${totalAmount.toFixed(2)}，未${unitLabel} ¥${remaining.toFixed(2)}`}
        />
        <TextField
          label={`${unitLabel}日期`}
          type="date"
          fullWidth
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={`${unitLabel}方式`}
          select
          fullWidth
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          {paymentMethods.map((pm) => (
            <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="凭证号"
          fullWidth
          value={voucherNo}
          onChange={(e) => setVoucherNo(e.target.value)}
          placeholder="银行流水号等（可选）"
        />
        <TextField
          label="备注"
          fullWidth
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="可选"
        />
        {error && (
          <TextField
            error
            fullWidth
            value={error}
            variant="standard"
            InputProps={{ readOnly: true }}
            sx={{ '& .MuiInputBase-root': { color: 'error.main' } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? '处理中...' : `确认${unitLabel}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
