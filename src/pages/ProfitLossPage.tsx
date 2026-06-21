import { AttachMoney as MoneyIcon } from '@mui/icons-material';
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
import { useProfitLossReport } from '../lib/hooks/useFinance';

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`;

export default function ProfitLossPage() {
  const { data: profitLoss, isLoading: loading } = useProfitLossReport();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {profitLoss ? (
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(99,102,241,0.04)' }}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <MoneyIcon sx={{ color: '#6366F1', fontSize: 20 }} />
              利润表 ({profitLoss.period.start} ~ {profitLoss.period.end})
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>销售收入</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: '#10B981', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(profitLoss.revenue)}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>销售成本</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: '#EF4444', fontWeight: 600, fontSize: '0.875rem' }}>-{formatCurrency(profitLoss.cost_of_goods_sold)}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>毛利润</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{
                      fontWeight: 700, fontSize: '0.875rem',
                      color: profitLoss.gross_profit >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {formatCurrency(profitLoss.gross_profit)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>运营费用</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: '#EF4444', fontWeight: 600, fontSize: '0.875rem' }}>-{formatCurrency(profitLoss.operating_expenses)}</Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>净利润</Typography></TableCell>
                  <TableCell align="right">
                    <Typography sx={{
                      fontWeight: 700, fontSize: '0.875rem',
                      color: profitLoss.net_profit >= 0 ? '#10B981' : '#EF4444'
                    }}>
                      {formatCurrency(profitLoss.net_profit)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Typography color="text.secondary">暂无数据</Typography>
      )}
    </Box>
  );
}
