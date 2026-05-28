import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Tooltip,
  Typography,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { FinanceAgentApi, type Transaction } from '../../lib/financeAgentService';
import TransactionDialog from './TransactionDialog';

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pageSize = 30;

  useEffect(() => {
    loadTransactions();
  }, [page]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const result = await FinanceAgentApi.getTransactions({ page, pageSize });
      setTransactions(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确定删除此交易记录？')) return;
    try {
      await FinanceAgentApi.deleteTransaction(id);
      loadTransactions();
    } catch (err) {
      console.error(err);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          交易记录
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          记一笔
        </Button>
      </Box>

      <List disablePadding>
        {transactions.map(tx => (
          <ListItem
            key={tx.id}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            secondaryAction={
              <Tooltip title="删除">
                <IconButton edge="end" size="small" onClick={() => handleDelete(tx.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{tx.note || tx.category_name || '无备注'}</Typography>
                  {tx.category_name && (
                    <Typography variant="caption" color="text.disabled">
                      ({tx.category_name})
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.disabled">
                  {tx.transaction_date} · {tx.account_name}
                </Typography>
              }
            />
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color={tx.type === 'income' ? 'success.main' : 'error.main'}
              sx={{ mr: 4 }}
            >
              {tx.type === 'income' ? '+' : '-'}¥{Math.abs(tx.amount).toFixed(2)}
            </Typography>
          </ListItem>
        ))}
        {!loading && transactions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            暂无交易记录
          </Typography>
        )}
      </List>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
        </Box>
      )}

      <TransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadTransactions}
      />
    </Box>
  );
}
