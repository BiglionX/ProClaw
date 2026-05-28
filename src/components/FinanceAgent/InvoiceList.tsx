import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Snackbar,
  Typography,
} from '@mui/material';
import { FinanceAgentApi, type Invoice } from '../../lib/financeAgentService';

const statusLabels: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  pending: { label: '待审核', color: 'warning' },
  verified: { label: '已认证', color: 'primary' },
  paid: { label: '已付款', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const typeLabels: Record<string, string> = {
  input: '进项发票',
  output: '销项发票',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [page]);

  async function loadInvoices() {
    setLoading(true);
    setError(null);
    try {
      const result = await FinanceAgentApi.getInvoices({ page, pageSize: 20 });
      setInvoices(result.data);
      setTotal(result.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载发票数据失败';
      setError(msg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          发票管理
        </Typography>
        {!loading && (
          <Typography variant="body2" color="text.secondary">
            共 {total} 张
          </Typography>
        )}
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

      {!loading && !error && (
      <List disablePadding>
        {invoices.map(inv => {
          const st = statusLabels[inv.status] || { label: inv.status, color: 'default' as const };
          return (
            <ListItem
              key={inv.id}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      {typeLabels[inv.type] || inv.type}
                    </Typography>
                    <Chip label={st.label} size="small" color={st.color} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                  </Box>
                }
                secondary={
                  <Box>
                    {inv.counterparty_name && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        对方：{inv.counterparty_name}
                      </Typography>
                    )}
                    {inv.invoice_number && (
                      <Typography variant="caption" display="block" color="text.disabled">
                        发票号：{inv.invoice_number}
                      </Typography>
                    )}
                    {inv.issue_date && (
                      <Typography variant="caption" display="block" color="text.disabled">
                        开票日期：{inv.issue_date}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  ¥{inv.amount.toFixed(2)}
                </Typography>
                {inv.tax_amount > 0 && (
                  <Typography variant="caption" color="text.disabled">
                    税额：¥{inv.tax_amount.toFixed(2)}
                  </Typography>
                )}
              </Box>
            </ListItem>
          );
        })}
        {!loading && invoices.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            暂无发票记录
          </Typography>
        )}
      </List>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
        </Box>
      )}

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
