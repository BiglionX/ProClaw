import { AccountBalanceWallet as WalletIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import {
  getPlans,
  getTokenSummary,
  type Plan,
  type TokenUsageSummary,
} from '../../lib/subscriptionService';

function formatQuota(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export default function TokenDisplay() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summary, setSummary] = useState<TokenUsageSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!userId) {
      setSummary(null);
      setPlans([]);
      return;
    }
    let cancelled = false;
    getTokenSummary(userId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    getPlans()
      .then((data) => {
        if (!cancelled) setPlans(data.filter((plan) => plan.is_active !== false));
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const used = summary?.token_used ?? 0;
  const total = summary?.token_quota ?? 0;
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const remaining = summary?.token_remaining ?? Math.max(total - used, 0);

  const handleRecharge = () => {
    setDialogOpen(false);
    navigate('/token-billing');
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mr: 2,
          px: 2,
          py: 0.5,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.08)',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.12)',
          },
        }}
        onClick={() => setDialogOpen(true)}
      >
        <WalletIcon sx={{ fontSize: 20, color: '#e0e0e0' }} />
        <Box sx={{ minWidth: 120 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.7rem',
              display: 'block',
            }}
          >
            Token 用量
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {summary ? `${formatQuota(used)} / ${formatQuota(total)}` : '-- / --'}
            </Typography>
            <Chip
              label={summary ? `${percentage}%` : '--'}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.65rem',
                bgcolor:
                  percentage > 80
                    ? '#666'
                    : percentage > 60
                      ? '#999'
                      : '#bbb',
                color: '#fff',
                '& .MuiChip-label': {
                  px: 0.5,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333' }}>Token 用量</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                当前用量
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    已使用
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {summary ? used.toLocaleString() : '--'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        percentage > 80
                          ? '#666'
                          : percentage > 60
                            ? '#999'
                            : '#bbb',
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
                >
                  {summary
                    ? `剩余 ${remaining.toLocaleString()} / 额度 ${total.toLocaleString()}`
                    : '登录后显示套餐额度'}
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              套餐额度
            </Typography>
            {plans.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                暂无套餐数据
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 2,
                }}
              >
                {plans.map((plan) => (
                  <Box
                    key={plan.id}
                    sx={{
                      p: 2,
                      border: '2px solid #444',
                      borderRadius: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {plan.name}
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                      {plan.token_quota.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      PT / 月
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="#e0e0e0" sx={{ mt: 1 }}>
                      ¥{plan.monthly_price}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>关闭</Button>
          <Button onClick={handleRecharge} variant="contained" color="primary">
            查看计费
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
