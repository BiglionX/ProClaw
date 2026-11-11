import { FileDownloadOutlined as DownloadIcon } from '@mui/icons-material';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import type { ReportPreset } from '../../lib/hooks/useFinance';

const PRESETS: { id: ReportPreset; label: string }[] = [
  { id: 'month', label: '本月' },
  { id: 'lastMonth', label: '上月' },
  { id: 'quarter', label: '本季' },
  { id: 'year', label: '本年' },
  { id: 'custom', label: '自定义' },
];

interface ReportPeriodBarProps {
  preset: ReportPreset;
  startDate: string;
  endDate: string;
  exporting?: boolean;
  exportError?: string | null;
  onPreset: (preset: ReportPreset) => void;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  onExport: () => void;
}

export default function ReportPeriodBar({
  preset,
  startDate,
  endDate,
  onPreset,
  onStartDate,
  onEndDate,
  exporting = false,
  exportError,
  onExport,
}: ReportPeriodBarProps) {
  return (
    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      {PRESETS.map((item) => {
        const selected = preset === item.id;
        return (
          <Button
            key={item.id}
            size="small"
            onClick={() => onPreset(item.id)}
            sx={{
              minWidth: 64,
              borderRadius: 1.5,
              fontWeight: selected ? 700 : 500,
              color: selected ? '#fff' : 'text.secondary',
              bgcolor: selected ? '#FF3B30' : 'transparent',
              border: '1px solid',
              borderColor: selected ? '#FF3B30' : 'divider',
              '&:hover': {
                bgcolor: selected ? '#E0352B' : 'action.hover',
              },
            }}
          >
            {item.label}
          </Button>
        );
      })}
      {preset === 'custom' ? (
        <>
          <TextField
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => onStartDate(event.target.value)}
            sx={{ width: 160 }}
          />
          <Typography color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => onEndDate(event.target.value)}
            sx={{ width: 160 }}
          />
        </>
      ) : (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', ml: 0.5 }}>
          {startDate} ~ {endDate}
        </Typography>
      )}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
        {exportError && (
          <Typography sx={{ fontSize: '0.75rem', color: '#EF4444' }}>{exportError}</Typography>
        )}
        <Button
          size="small"
          onClick={onExport}
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
          sx={{
            borderRadius: 1.5,
            fontWeight: 600,
            color: '#FF3B30',
            border: '1px solid',
            borderColor: 'rgba(255,59,48,0.35)',
            '&:hover': { bgcolor: 'rgba(255,59,48,0.06)' },
          }}
        >
          {exporting ? '导出中' : '导出'}
        </Button>
      </Box>
    </Box>
  );
}
