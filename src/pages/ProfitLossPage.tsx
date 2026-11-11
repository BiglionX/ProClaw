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
import { useState } from 'react';
import ReportLineDrawer from '../components/DataCenter/ReportLineDrawer';
import type { ReportLineKind } from '../lib/financeService';
import { useProfitLossReport } from '../lib/hooks/useFinance';

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`;

interface ProfitLossPageProps {
  startDate: string;
  endDate: string;
}

interface DrillState {
  line: ReportLineKind;
  expectedAmount: number;
}

export default function ProfitLossPage({ startDate, endDate }: ProfitLossPageProps) {
  const { data: profitLoss, isLoading: loading } = useProfitLossReport(startDate, endDate);
  const [drill, setDrill] = useState<DrillState | null>(null);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  const openDrill = (line: ReportLineKind, expectedAmount: number) => {
    setDrill({ line, expectedAmount });
  };

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
                <DrillRow
                  label="销售收入"
                  display={formatCurrency(profitLoss.revenue)}
                  color="#10B981"
                  onDrill={() => openDrill('revenue', profitLoss.revenue)}
                />
                <DrillRow
                  label="销售成本"
                  display={`-${formatCurrency(profitLoss.cost_of_goods_sold)}`}
                  color="#EF4444"
                  onDrill={() => openDrill('cogs', profitLoss.cost_of_goods_sold)}
                />
                <DrillRow
                  label="毛利润"
                  display={formatCurrency(profitLoss.gross_profit)}
                  color={profitLoss.gross_profit >= 0 ? '#10B981' : '#EF4444'}
                  emphasize
                />
                <DrillRow
                  label="运营费用"
                  display={`-${formatCurrency(profitLoss.operating_expenses)}`}
                  color="#EF4444"
                  onDrill={() => openDrill('operating_expense', profitLoss.operating_expenses)}
                />
                <DrillRow
                  label="净利润"
                  display={formatCurrency(profitLoss.net_profit)}
                  color={profitLoss.net_profit >= 0 ? '#10B981' : '#EF4444'}
                  emphasize
                />
                <DrillRow
                  label="利润率"
                  display={`${profitLoss.profit_margin.toFixed(2)}%`}
                  color={
                    profitLoss.profit_margin >= 20
                      ? '#10B981'
                      : profitLoss.profit_margin >= 10
                        ? '#F59E0B'
                        : '#EF4444'
                  }
                />
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Typography color="text.secondary">暂无数据</Typography>
      )}
      <ReportLineDrawer
        line={drill?.line ?? null}
        startDate={startDate}
        endDate={endDate}
        expectedAmount={drill?.expectedAmount ?? 0}
        onClose={() => setDrill(null)}
      />
    </Box>
  );
}

function DrillRow({
  label,
  display,
  color,
  emphasize,
  onDrill,
}: {
  label: string;
  display: string;
  color: string;
  emphasize?: boolean;
  onDrill?: () => void;
}) {
  return (
    <TableRow
      hover={!!onDrill}
      onClick={onDrill}
      sx={{
        bgcolor: emphasize ? 'action.hover' : undefined,
        cursor: onDrill ? 'pointer' : 'default',
      }}
    >
      <TableCell>
        <Typography sx={{ fontWeight: emphasize ? 700 : 600, fontSize: '0.875rem' }}>{label}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography sx={{ color, fontWeight: emphasize ? 700 : 600, fontSize: '0.875rem' }}>{display}</Typography>
      </TableCell>
      <TableCell align="right" sx={{ width: 72, color: '#FF3B30', fontSize: '0.75rem', fontWeight: 600 }}>
        {onDrill ? '明细' : ''}
      </TableCell>
    </TableRow>
  );
}
