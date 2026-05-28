import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { FinanceAgentApi, type Account } from '../../lib/financeAgentService';

const accountTypeLabels: Record<string, string> = {
  cash: '现金',
  bank: '银行账户',
  alipay: '支付宝',
  wechat: '微信',
  other: '其他',
};

export default function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'cash', balance: 0, notes: '' });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await FinanceAgentApi.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      await FinanceAgentApi.createAccount(form.name, form.type, form.balance, form.notes || undefined);
      setDialogOpen(false);
      setForm({ name: '', type: 'cash', balance: 0, notes: '' });
      loadAccounts();
    } catch (err) {
      console.error(err);
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          账户管理
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          添加账户
        </Button>
      </Box>

      <Card sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          总余额
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          ¥{totalBalance.toFixed(2)}
        </Typography>
      </Card>

      <List disablePadding>
        {accounts.map(account => (
          <ListItem
            key={account.id}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemText
              primary={account.name}
              secondary={accountTypeLabels[account.type] || account.type}
            />
            <Typography variant="subtitle1" fontWeight={600}>
              ¥{account.balance.toFixed(2)}
            </Typography>
          </ListItem>
        ))}
        {!loading && accounts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            暂无账户，添加一个开始记账
          </Typography>
        )}
      </List>

      {/* 新增账户弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">添加账户</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="账户名称"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="账户类型"
              select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="cash">现金</option>
              <option value="bank">银行账户</option>
              <option value="alipay">支付宝</option>
              <option value="wechat">微信</option>
              <option value="other">其他</option>
            </TextField>
            <TextField
              label="初始余额"
              type="number"
              value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
              fullWidth
            />
            <TextField
              label="备注"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <Button variant="contained" onClick={handleCreate} disabled={!form.name.trim()}>
              创建
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
