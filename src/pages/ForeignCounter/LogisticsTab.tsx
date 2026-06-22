import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  LocalShipping as LogisticsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';

interface LogisticsTrack {
  tracking_no: string;
  carrier: string;
  status: 'created' | 'picked_up' | 'in_transit' | 'customs' | 'delivered' | 'exception';
  origin: string;
  destination: string;
  estimated_delivery: string;
  events: Array<{ time: string; location: string; description: string; status: string }>;
}

const CARRIERS = [
  { code: 'dhl', name: 'DHL Express' },
  { code: 'fedex', name: 'FedEx' },
  { code: 'ups', name: 'UPS' },
  { code: 'ems', name: 'EMS（中国邮政）' },
  { code: 'sf', name: '顺丰国际' },
];

const STATUS_MAP: Record<LogisticsTrack['status'], { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error'; index: number }> = {
  created: { label: '已下单', color: 'default', index: 0 },
  picked_up: { label: '已揽收', color: 'primary', index: 1 },
  in_transit: { label: '运输中', color: 'primary', index: 2 },
  customs: { label: '清关中', color: 'warning', index: 3 },
  delivered: { label: '已签收', color: 'success', index: 4 },
  exception: { label: '异常', color: 'error', index: -1 },
};

const STEPS = ['已下单', '已揽收', '运输中', '清关中', '已签收'];

const DEFAULT_TRACKING_NO = 'DHL7894561230';

export default function LogisticsTab() {
  const [trackingNo, setTrackingNo] = useState(DEFAULT_TRACKING_NO);
  const [carrier, setCarrier] = useState('dhl');
  const [track, setTrack] = useState<LogisticsTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!trackingNo.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await safeInvoke<LogisticsTrack>('track_foreign_logistics', { trackingNo, carrier });
      if (result?.tracking_no) {
        setTrack({
          ...result,
          events: Array.isArray(result.events) ? result.events : [],
        });
      } else {
        setTrack(null);
        setError('未找到该运单的物流信息');
      }
    } catch {
      setTrack(null);
      setError('查询失败，请确认运单号后重试');
    } finally {
      setLoading(false);
    }
  }, [trackingNo, carrier]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const statusInfo = track ? STATUS_MAP[track.status] : null;
  const stepIndex = statusInfo?.index ?? 0;

  return (
    <Box>
      <Card sx={{ mb: 3, bgcolor: '#F0FDF4' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <LogisticsIcon color="success" />
            <Typography variant="h6">📦 国际物流跟踪</Typography>
          </Stack>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>物流商</InputLabel>
                <Select value={carrier} label="物流商" onChange={e => setCarrier(e.target.value as string)}>
                  {CARRIERS.map(c => (
                    <MenuItem key={c.code} value={c.code}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="运单号"
                value={trackingNo}
                onChange={e => setTrackingNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >
                查询轨迹
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {track && (
        <>
          <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">运单号</Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{track.tracking_no}</Typography>
              </Box>
              <Chip
                label={statusInfo?.label || '未知'}
                color={statusInfo?.color || 'default'}
                size="medium"
              />
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">物流商</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{track.carrier.toUpperCase()}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">起点 → 终点</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{track.origin} → {track.destination}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">预计送达</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{track.estimated_delivery}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
            <Typography variant="h6" sx={{ mb: 3 }}>运输进度</Typography>
            <Stepper activeStep={stepIndex} alternativeLabel>
              {STEPS.map((label, idx) => (
                <Step key={label} completed={idx < stepIndex}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {track.status !== 'delivered' && track.status !== 'exception' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  距离送达还有 {Math.max(0, STEPS.length - 1 - stepIndex)} 步
                </Typography>
                <LinearProgress variant="determinate" value={(stepIndex / (STEPS.length - 1)) * 100} />
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3 }} variant="outlined">
            <Typography variant="h6" sx={{ mb: 2 }}>轨迹明细</Typography>
            <Stack spacing={2}>
              {track.events.length === 0 ? (
                <Typography variant="body2" color="text.secondary">暂无轨迹节点</Typography>
              ) : (
                track.events.map((evt, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ minWidth: 140 }}>
                      <Typography variant="body2" color="text.secondary">{evt.time}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 120 }}>
                      <Chip size="small" label={evt.location} variant="outlined" />
                    </Box>
                    <Typography variant="body2">{evt.description}</Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </Paper>
        </>
      )}

      {!track && !loading && !error && (
        <Alert severity="info">输入运单号查询物流轨迹。</Alert>
      )}
    </Box>
  );
}
