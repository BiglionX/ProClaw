import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Warning as WarningIcon } from '@mui/icons-material';
import { FinanceAgentApi, type Budget } from '../../lib/financeAgentService';

export default function BudgetPanel() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [alerts, setAlerts] = useState<{ budget_id: string; category_name: string; level: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: 'fc_food', month: new Date().toISOString().slice(0, 7), limitAmount: 0, notes: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [b, a] = await Promise.all([
        FinanceAgentApi.getBudgets(),
        FinanceAgentApi.checkBudgetAlerts(),
      ]);
      setBudgets(b);
      setAlerts(a);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载预算数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (form.limitAmount <= 0) return;
    try {
      await FinanceAgentApi.createBudget(form.categoryId, form.month, form.limitAmount, form.notes || undefined);
      setDialogOpen(false);
      setForm(f => ({ ...f, limitAmount: 0, notes: '' }));
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '创建预算失败';
      setError(msg);
      setSnackbarOpen(true);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          预算控制
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          设置预算
        </Button>
      </Box>

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 预算告警 */}
      {!loading && alerts.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="body2">
            {alerts.length} 个预算即将超支或已超支：
            {alerts.map(a => a.category_name).join('、')}
          </Typography>
        </Box>
      )}

      {!loading && !error && (
      <List disablePadding>
        {budgets.map(budget => {
          const isOver = budget.is_over_budget;
          const color = isOver ? 'error' : budget.usage_percent >= 80 ? 'warning' : 'primary';
          return (
            <ListItem
              key={budget.id}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                bgcolor: 'background.paper',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500}>
                  {budget.category_name || budget.category_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ¥{budget.actual_amount.toFixed(0)} / ¥{budget.limit_amount.toFixed(0)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(budget.usage_percent, 100)}
                color={color}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, textAlign: 'right' }}>
                {budget.usage_percent}%
              </Typography>
            </ListItem>
          );
        })}
        {budgets.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            暂无预算设置
          </Typography>
        )}
      </List>
      )}

      {/* 设置预算弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">设置预算</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="分类"
              select
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="fc_salary">薪资</option>
              <option value="fc_food">餐饮</option>
              <option value="fc_transport">交通</option>
              <option value="fc_office">办公</option>
              <option value="fc_rent">房租</option>
              <option value="fc_utility">水电</option>
              <option value="fc_travel">差旅</option>
              <option value="fc_marketing">营销</option>
              <option value="fc_other_expense">其他支出</option>
            </TextField>
            <TextField
              label="月份"
              type="month"
              value={form.month}
              onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="预算限额"
              type="number"
              value={form.limitAmount}
              onChange={e => setForm(f => ({ ...f, limitAmount: parseFloat(e.target.value) || 0 }))}
              fullWidth
              required
            />
            <TextField
              label="备注"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth
            />
            <Button variant="contained" onClick={handleCreate} disabled={form.limitAmount <= 0}>
              创建
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* 错误提示 Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbarOpen(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
