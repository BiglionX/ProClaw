import { Close as CloseIcon, FileDownloadOutlined as DownloadIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReportLineKind } from '../../lib/financeService';
import { useReportLines } from '../../lib/hooks/useFinance';
import { exportDetailCsv } from '../../lib/reportExport';

const TITLES: Record<ReportLineKind, string> = {
  revenue: '销售收入明细',
  cogs: '销售成本明细',
  operating_expense: '运营费用明细',
  cash_in: '经营现金流入明细',
  cash_out: '经营现金流出明细',
};

const EMPTY_COPY: Record<ReportLineKind, string> = {
  revenue: '本期间没有对应的收入凭证或已出库订单',
  cogs: '本期间没有对应的成本凭证或已出库订单',
  operating_expense: '本期间没有费用凭证',
  cash_in: '本期间没有收款记录',
  cash_out: '本期间没有付款记录',
};

const PARTY_LABEL: Record<ReportLineKind, string> = {
  revenue: '客户',
  cogs: '客户',
  operating_expense: '科目',
  cash_in: '对方',
  cash_out: '对方',
};

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`;

interface ReportLineDrawerProps {
  line: ReportLineKind | null;
  startDate: string;
  endDate: string;
  expectedAmount: number;
  onClose: () => void;
}

export default function ReportLineDrawer({
  line,
  startDate,
  endDate,
  expectedAmount,
  onClose,
}: ReportLineDrawerProps) {
  const { data, isLoading, error } = useReportLines(line, startDate, endDate, !!line);
  const rows = data ?? [];
  const total = Math.round(rows.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const expected = Math.round(expectedAmount * 100) / 100;
  const diff = Math.round((total - expected) * 100) / 100;
  const mismatch = !isLoading && !error && Math.abs(diff) >= 0.01;

  return (
    <Drawer
      anchor="right"
      open={!!line}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 680 },
          top: 64,
          height: 'calc(100% - 64px)',
        },
      }}
    >
      {line && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{TITLES[line]}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
                {startDate} ~ {endDate}
              </Typography>
            </Box>
            <Button
              size="small"
              disabled={isLoading || !!error}
              startIcon={<DownloadIcon />}
              onClick={() => exportDetailCsv(line, startDate, endDate, rows)}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                color: '#FF3B30',
                border: '1px solid',
                borderColor: 'rgba(255,59,48,0.35)',
                flexShrink: 0,
                '&:hover': { bgcolor: 'rgba(255,59,48,0.06)' },
              }}
            >
              导出
            </Button>
            <IconButton size="small" onClick={onClose} aria-label="关闭明细">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : error ? (
              <Typography color="error" sx={{ p: 3, fontSize: '0.875rem' }}>
                {error instanceof Error ? error.message : '明细加载失败'}
              </Typography>
            ) : rows.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3, fontSize: '0.875rem' }}>
                {EMPTY_COPY[line]}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell>单号</TableCell>
                    <TableCell>{PARTY_LABEL[line]}</TableCell>
                    <TableCell>摘要</TableCell>
                    <TableCell>来源</TableCell>
                    <TableCell align="right">金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.date}</TableCell>
                      <TableCell>{item.doc_no || '—'}</TableCell>
                      <TableCell>{item.party || '—'}</TableCell>
                      <TableCell>{item.summary || '—'}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>

          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              size="small"
              variant="contained"
              disabled={isLoading || !!error}
              startIcon={<DownloadIcon />}
              onClick={() => exportDetailCsv(line, startDate, endDate, rows)}
              sx={{ bgcolor: '#FF3B30', fontWeight: 700, '&:hover': { bgcolor: '#E0352B' } }}
            >
              导出
            </Button>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
              明细合计 {formatCurrency(total)}
            </Typography>
            <Typography sx={{ ml: 'auto', fontSize: '0.875rem', fontWeight: 700, color: mismatch ? '#EF4444' : 'text.primary' }}>
              汇总 {formatCurrency(expected)}
              {mismatch ? ` · 差额 ${formatCurrency(diff)}` : ''}
            </Typography>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
