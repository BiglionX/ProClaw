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
import { useState } from 'react';
import ReportLineDrawer from '../components/DataCenter/ReportLineDrawer';
import type { ReportLineKind } from '../lib/financeService';
import { useCashFlowReport } from '../lib/hooks/useFinance';

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`;

interface CashFlowPageProps {
  startDate: string;
  endDate: string;
}

interface DrillState {
  line: ReportLineKind;
  expectedAmount: number;
}

export default function CashFlowPage({ startDate, endDate }: CashFlowPageProps) {
  const { data: cashFlow, isLoading: loading } = useCashFlowReport(startDate, endDate);
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
                <SectionRow label="经营活动现金流" />
                <AmountRow
                  label="现金流入"
                  display={formatCurrency(cashFlow.operating_activities.inflow)}
                  color="#10B981"
                  indent
                  onDrill={() => openDrill('cash_in', cashFlow.operating_activities.inflow)}
                />
                <AmountRow
                  label="现金流出"
                  display={`-${formatCurrency(cashFlow.operating_activities.outflow)}`}
                  color="#EF4444"
                  indent
                  onDrill={() => openDrill('cash_out', cashFlow.operating_activities.outflow)}
                />
                <AmountRow
                  label="经营净现金流"
                  display={formatCurrency(cashFlow.operating_activities.net)}
                  color={cashFlow.operating_activities.net >= 0 ? '#10B981' : '#EF4444'}
                  indent
                  emphasize
                />
                <SectionRow label="投资活动现金流" />
                <AmountRow
                  label="净额"
                  display={formatCurrency(cashFlow.investing_activities)}
                  color="#111827"
                  indent
                  hint="暂无构成"
                />
                <SectionRow label="筹资活动现金流" />
                <AmountRow
                  label="净额"
                  display={formatCurrency(cashFlow.financing_activities)}
                  color="#111827"
                  indent
                  hint="暂无构成"
                />
                <AmountRow
                  label="净现金流"
                  display={formatCurrency(cashFlow.net_cash_flow)}
                  color={cashFlow.net_cash_flow >= 0 ? '#10B981' : '#EF4444'}
                  emphasize
                  tinted
                />
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Typography color="text.secondary">暂无现金流量数据</Typography>
        </Paper>
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

function SectionRow({ label }: { label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={3}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#FF3B30' }}>{label}</Typography>
      </TableCell>
    </TableRow>
  );
}

function AmountRow({
  label,
  display,
  color,
  indent,
  emphasize,
  tinted,
  hint,
  onDrill,
}: {
  label: string;
  display: string;
  color: string;
  indent?: boolean;
  emphasize?: boolean;
  tinted?: boolean;
  hint?: string;
  onDrill?: () => void;
}) {
  return (
    <TableRow
      hover={!!onDrill}
      onClick={onDrill}
      sx={{
        bgcolor: emphasize ? (tinted ? 'rgba(99,102,241,0.04)' : 'action.hover') : undefined,
        cursor: onDrill ? 'pointer' : 'default',
      }}
    >
      <TableCell sx={{ pl: indent ? 4 : 2 }}>
        <Typography sx={{ fontWeight: emphasize ? 700 : 500, fontSize: '0.875rem' }}>{label}</Typography>
        {hint && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{hint}</Typography>
        )}
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
