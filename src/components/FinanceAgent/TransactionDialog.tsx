import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { FinanceAgentApi, type Account } from '../../lib/financeAgentService';

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionDialog({ open, onClose, onSuccess }: TransactionDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    amount: 0,
    type: 'expense' as 'income' | 'expense',
    transactionDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  useEffect(() => {
    if (open) {
      FinanceAgentApi.getAccounts().then(setAccounts).catch(console.error);
    }
  }, [open]);

  async function handleSubmit() {
    if (!form.accountId || form.amount <= 0) return;
    try {
      await FinanceAgentApi.createTransaction({
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        amount: form.amount,
        type: form.type,
        transactionDate: form.transactionDate,
        note: form.note || undefined,
      });
      onSuccess();
      onClose();
      setForm(f => ({ ...f, amount: 0, note: '' }));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">记一笔</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* 收支类型切换 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={form.type === 'expense' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
              fullWidth
            >
              支出
            </Button>
            <Button
              variant={form.type === 'income' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setForm(f => ({ ...f, type: 'income' }))}
              fullWidth
            >
              收入
            </Button>
          </Box>

          <TextField
            label="金额"
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            fullWidth
            required
          />
          <TextField
            label="账户"
            select
            value={form.accountId}
            onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            fullWidth
            required
            SelectProps={{ native: true }}
          >
            <option value="">选择账户</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (¥{acc.balance.toFixed(2)})
              </option>
            ))}
          </TextField>
          <TextField
            label="备注"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            fullWidth
          />
          <TextField
            label="日期"
            type="date"
            value={form.transactionDate}
            onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.accountId || form.amount <= 0}
            color={form.type === 'expense' ? 'error' : 'success'}
          >
            确认
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
