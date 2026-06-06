import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, LinearProgress } from '@mui/material';
import { safeInvoke } from '../../lib/tauri';

export default function CreditLedgerPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAccounts(); }, []);
  const loadAccounts = async () => {
    setLoading(true);
    try { const r = await safeInvoke<any>('hw_get_credit_accounts'); if (r?.accounts) setAccounts(r.accounts); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getUsagePercent = (balance: number, limit: number) => limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
  const getUsageColor = (pct: number) => pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success';

  if (loading) return <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}><CircularProgress sx={{ color: '#64748b' }} /></Box>;

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const totalLimit = accounts.reduce((sum, a) => sum + (a.credit_limit || 0), 0);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#f8fafc', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: '#64748b' }}>挂账管理</Typography>
        <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
          <Box><Typography variant="body2" color="text.secondary">账户数量</Typography><Typography variant="h6" fontWeight="bold">{accounts.length}</Typography></Box>
          <Box><Typography variant="body2" color="text.secondary">总挂账余额</Typography><Typography variant="h6" fontWeight="bold" sx={{ color: '#ef4444' }}>¥{totalBalance.toFixed(2)}</Typography></Box>
          <Box><Typography variant="body2" color="text.secondary">总额度</Typography><Typography variant="h6" fontWeight="bold">¥{totalLimit.toFixed(2)}</Typography></Box>
        </Box>
      </Paper>
      <TableContainer component={Paper} elevation={1}>
        <Table><TableHead><TableRow sx={{ bgcolor: '#f1f5f9' }}><TableCell>客户名称</TableCell><TableCell>赊账额度</TableCell><TableCell>当前余额</TableCell><TableCell>已用比例</TableCell></TableRow></TableHead>
          <TableBody>{accounts.map((a: any) => {
            const pct = getUsagePercent(a.current_balance, a.credit_limit);
            return (
              <TableRow key={a.id} hover>
                <TableCell>{a.customer_name || a.customer_id}</TableCell>
                <TableCell>¥{a.credit_limit?.toFixed(2) || '0.00'}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: a.current_balance > 0 ? '#ef4444' : '#10b981' }}>¥{a.current_balance?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={pct} sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: getUsageColor(pct) === 'error' ? '#ef4444' : getUsageColor(pct) === 'warning' ? '#f59e0b' : '#10b981' } }} />
                    <Typography variant="body2" sx={{ minWidth: 40 }}>{pct.toFixed(0)}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {accounts.length === 0 && <TableRow><TableCell colSpan={4} align="center">暂无挂账数据</TableCell></TableRow>}
          </TableBody></Table>
      </TableContainer>
    </Box>
  );
}
