import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface CreditAccount {
  id: string;
  customer_id: string;
  customer_name?: string;
  contact_person?: string;
  credit_limit: number;
  current_balance: number;
  last_settlement_at?: string;
  pending_debit: number;
}

interface CreditTransaction {
  id: string;
  credit_account_id: string;
  order_id?: string;
  type: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export default function CreditLedgerPage() {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('debit');
  const [txNotes, setTxNotes] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const result = await safeInvoke<any>('lw_get_credit_accounts');
      if (result?.accounts) setAccounts(result.accounts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTransactions = async (account: CreditAccount) => {
    setSelectedAccount(account);
    setTxLoading(true);
    try {
      const result = await safeInvoke<any>('lw_get_credit_transactions', { creditAccountId: account.id });
      if (result?.transactions) setTransactions(result.transactions);
    } catch (e) { console.error(e); }
    setTxLoading(false);
  };

  const addTransaction = async () => {
    if (!selectedAccount || !txAmount) return;
    try {
      await safeInvoke('lw_create_credit_transaction', {
        creditAccountId: selectedAccount.id,
        transactionType: txType,
        amount: parseFloat(txAmount),
        notes: txNotes || null,
      });
      setShowAddTx(false);
      setTxAmount('');
      setTxNotes('');
      loadAccounts();
      loadTransactions(selectedAccount);
    } catch (e) { console.error(e); }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'debit': return { label: '赊账', color: 'error' as const };
      case 'credit': return { label: '还款', color: 'success' as const };
      case 'settlement': return { label: '结算', color: 'primary' as const };
      default: return { label: type, color: 'default' as const };
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fef2f2' }}>
        <CircularProgress sx={{ color: '#dc2626' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#fef2f2', p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#dc2626' }}>
              赊账/挂账管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              共 {accounts.length} 个赊账账户
            </Typography>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fef2f2' }}>
              <TableCell>客户名称</TableCell>
              <TableCell>联系人</TableCell>
              <TableCell align="right">赊账额度</TableCell>
              <TableCell align="right">当前欠款</TableCell>
              <TableCell align="right">待结算金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map(acc => (
              <TableRow key={acc.id} hover sx={{ cursor: 'pointer', bgcolor: acc.current_balance > acc.credit_limit ? '#fff5f5' : 'inherit' }}
                onClick={() => loadTransactions(acc)}>
                <TableCell>{acc.customer_name || acc.customer_id}</TableCell>
                <TableCell>{acc.contact_person || '-'}</TableCell>
                <TableCell align="right">¥{acc.credit_limit.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: acc.current_balance > 0 ? '#dc2626' : '#16a34a' }}>
                  ¥{acc.current_balance.toFixed(2)}
                </TableCell>
                <TableCell align="right">¥{acc.pending_debit.toFixed(2)}</TableCell>
                <TableCell>
                  {acc.current_balance > acc.credit_limit ? (
                    <Chip icon={<WarningIcon />} label="超额" color="error" size="small" />
                  ) : acc.current_balance > 0 ? (
                    <Chip label="有欠款" color="warning" size="small" />
                  ) : (
                    <Chip label="正常" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setSelectedAccount(acc); setShowAddTx(true); }}>
                    记账
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center">暂无赊账账户</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction History Dialog */}
      <Dialog open={!!selectedAccount && !showAddTx} onClose={() => setSelectedAccount(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAccount?.customer_name || '客户'} - 交易明细
        </DialogTitle>
        <DialogContent>
          {txLoading ? <CircularProgress /> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时间</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>订单号</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map(tx => {
                    const typeInfo = getTypeLabel(tx.type);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.created_at?.substring(0, 19)}</TableCell>
                        <TableCell><Chip label={typeInfo.label} color={typeInfo.color} size="small" /></TableCell>
                        <TableCell>{tx.order_id || '-'}</TableCell>
                        <TableCell align="right" sx={{ color: tx.type === 'debit' ? '#dc2626' : '#16a34a' }}>
                          {tx.type === 'debit' ? '+' : '-'}¥{tx.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{tx.notes || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelectedAccount(null); setTransactions([]); }}>关闭</Button>
          <Button variant="contained" onClick={() => setShowAddTx(true)}>新增交易</Button>
        </DialogActions>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTx} onClose={() => setShowAddTx(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增赊账交易</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant={txType === 'debit' ? 'contained' : 'outlined'} color="error"
                onClick={() => setTxType('debit')}>赊账</Button>
              <Button variant={txType === 'credit' ? 'contained' : 'outlined'} color="success"
                onClick={() => setTxType('credit')}>还款</Button>
              <Button variant={txType === 'settlement' ? 'contained' : 'outlined'} color="primary"
                onClick={() => setTxType('settlement')}>结算</Button>
            </Box>
            <TextField label="金额" type="number" value={txAmount}
              onChange={e => setTxAmount(e.target.value)} fullWidth />
            <TextField label="备注" value={txNotes}
              onChange={e => setTxNotes(e.target.value)} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddTx(false)}>取消</Button>
          <Button variant="contained" onClick={addTransaction}
            disabled={!txAmount}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
