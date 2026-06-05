import { TrendingUp as UpIcon } from '@mui/icons-material';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  getCashFlowReport,
  type CashFlowReport,
} from '../lib/financeService';

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`;

export default function CashFlowPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    getCashFlowReport(startDate, endDate)
      .then(setCashFlow)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {cashFlow ? (
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(99,102,241,0.04)' }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <UpIcon sx={{ color: '#6366F1', fontSize: 20 }} />
              现金流量表 ({cashFlow.period.start} ~ {cashFlow.period.end})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2}><Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#FF3B30' }}>经营活动现金流</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 4 }}><Typography sx={{ fontSize: '0.875rem' }}>现金流入</Typography></TableCell>
                  <TableCell align="right"><Typography sx={{ color: '#10B981', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(cashFlow.operating_activities.inflow)}</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 4 }}><Typography sx={{ fontSize: '0.875rem' }}>现金流出</Typography></TableCell>
                  <TableCell align="right"><Typography sx={{ color: '#EF4444', fontWeight: 600, fontSize: '0.875rem' }}>-{formatCurrency(cashFlow.operating_activities.outflow)}</Typography></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ pl: 4 }}><Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>经营净现金流</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{
                      fontWeight: 700, fontSize: '0.875rem',
                      color: cashFlow.operating_activities.net >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {formatCurrency(cashFlow.operating_activities.net)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2}><Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#FF3B30' }}>投资活动现金流</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 4 }}><Typography sx={{ fontSize: '0.875rem' }}>净额</Typography></TableCell>
                  <TableCell align="right"><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(cashFlow.investing_activities)}</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2}><Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#FF3B30' }}>筹资活动现金流</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 4 }}><Typography sx={{ fontSize: '0.875rem' }}>净额</Typography></TableCell>
                  <TableCell align="right"><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(cashFlow.financing_activities)}</Typography></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.04)' }}>
                  <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>净现金流</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{
                      fontWeight: 700, fontSize: '0.875rem',
                      color: cashFlow.net_cash_flow >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {formatCurrency(cashFlow.net_cash_flow)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Typography color="text.secondary">暂无现金流量数据</Typography>
        </Paper>
      )}
    </Box>
  );
}
