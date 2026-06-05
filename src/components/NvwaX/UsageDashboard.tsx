/**
 * NvwaX Token 用量看板
 *
 * 展示 Token 消耗趋势、余额、月度统计。
 * 通过 NvwaXService 调用 Rust 后端 API。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  Grid,
  Button,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { NvwaXService } from '../../lib/nvwaxClient';
import type { UsageStats, TokenBalance } from '../../types/nvwax';

/** 用量看板对话框属性 */
interface UsageDashboardProps {
  open: boolean;
  onClose: () => void;
}

/** 统计卡片 */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/** 每日消耗柱状图（简化文本版） */
function DailyChart({ daily }: { daily: { date: string; tokens: number; calls: number }[] }) {
  if (!daily || daily.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>暂无日消耗数据</Typography>;
  }

  const maxTokens = Math.max(...daily.map((d) => d.tokens), 1);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>每日消耗趋势</Typography>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 120, px: 1 }}>
        {daily.map((d, i) => {
          const height = (d.tokens / maxTokens) * 100;
          return (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: `${Math.max(height, 2)}%`,
                backgroundColor: 'primary.main',
                borderRadius: '4px 4px 0 0',
                opacity: 0.7 + (height / 100) * 0.3,
                position: 'relative',
                '&:hover': {
                  opacity: 1,
                  '& .tooltip': { display: 'block' },
                },
              }}
            >
              <Typography
                className="tooltip"
                variant="caption"
                sx={{
                  display: 'none',
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'grey.800',
                  color: 'white',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                  fontSize: 10,
                  zIndex: 10,
                }}
              >
                {d.date}: {d.tokens.toLocaleString()} tokens
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {daily[0]?.date || ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {daily[daily.length - 1]?.date || ''}
        </Typography>
      </Box>
    </Box>
  );
}

/** 按模型消耗表 */
function ModelTable({ byModel }: { byModel: { model: string; tokens: number; calls: number }[] }) {
  if (!byModel || byModel.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>暂无模型数据</Typography>;
  }

  const totalTokens = byModel.reduce((s, m) => s + m.tokens, 0);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>按模型消耗</Typography>
      {byModel.map((m, i) => (
        <Box key={i} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="body2">{m.model}</Typography>
            <Typography variant="body2" fontWeight={600}>
              {m.tokens.toLocaleString()} tokens
            </Typography>
          </Box>
          <Box
            sx={{
              height: 8,
              bgcolor: 'grey.200',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(m.tokens / totalTokens) * 100}%`,
                bgcolor: 'primary.main',
                borderRadius: 4,
                transition: 'width 0.3s',
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {m.calls} 次调用
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function UsageDashboard({ open, onClose }: UsageDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [balance, stats] = await Promise.all([
        NvwaXService.getTokenBalance(),
        NvwaXService.getUsageStats('month'),
      ]);
      setTokenBalance(balance);
      setUsageStats(stats);
    } catch (err: any) {
      setSnackbar('加载失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  /** 同步对账 */
  const handleSync = async () => {
    try {
      const result = await NvwaXService.syncUsage();
      setSyncResult(JSON.stringify(result, null, 2));
      if (result.discrepancies?.length > 0) {
        setSnackbar('对账完成，发现 ' + result.discrepancies.length + ' 处差异');
      } else {
        setSnackbar('对账完成，数据一致');
      }
    } catch (err: any) {
      setSnackbar('同步失败: ' + (err.message || '未知错误'));
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletIcon sx={{ color: '#10b981' }} />
            <span>Token 用量看板</span>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton onClick={loadData} disabled={loading} size="small" title="刷新">
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {/* 摘要卡片 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="余额"
                    value={tokenBalance ? formatNumber(tokenBalance.balance) : '-'}
                    subtitle={tokenBalance ? `免费额度: ${formatNumber(tokenBalance.free_monthly_quota)}/月` : undefined}
                    icon={<WalletIcon />}
                    color="#10b981"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="本月已用"
                    value={tokenBalance ? formatNumber(tokenBalance.monthly_consumed) : '-'}
                    subtitle={tokenBalance ? `占比 ${((tokenBalance.monthly_consumed / Math.max(tokenBalance.free_monthly_quota, 1)) * 100).toFixed(1)}%` : undefined}
                    icon={<TrendingUpIcon />}
                    color="#6366f1"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="累计消耗"
                    value={tokenBalance ? formatNumber(tokenBalance.total_consumed) : '-'}
                    icon={<StorageIcon />}
                    color="#f59e0b"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="本月调用"
                    value={usageStats ? formatNumber(usageStats.calls) : '-'}
                    subtitle="总调用次数"
                    icon={<StorageIcon />}
                    color="#8b5cf6"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* 每日趋势 */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <DailyChart daily={usageStats?.daily || []} />
              </Paper>

              {/* 按模型消耗 */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <ModelTable byModel={usageStats?.by_model || []} />
              </Paper>

              {/* 对账区 */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">数据同步对账</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={handleSync}
                  >
                    同步对账
                  </Button>
                </Box>
                {syncResult && (
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      fontSize: 11,
                      overflow: 'auto',
                      maxHeight: 120,
                    }}
                  >
                    {syncResult}
                  </Typography>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        message={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
