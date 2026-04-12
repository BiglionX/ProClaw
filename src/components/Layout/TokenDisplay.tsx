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
import { useState } from 'react';

export default function TokenDisplay() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // 模拟 Token 数据
  const tokenData = {
    used: 12500,
    total: 50000,
    percentage: 25,
  };

  const handleRecharge = () => {
    // 这里将来会跳转到充值页面或打开充值对话框
    setDialogOpen(false);
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
          bgcolor: 'rgba(255,255,255,0.1)',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.15)',
          },
        }}
        onClick={() => setDialogOpen(true)}
      >
        <WalletIcon sx={{ fontSize: 20, color: '#ffd700' }} />
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
              {(tokenData.used / 1000).toFixed(1)}K /{' '}
              {(tokenData.total / 1000).toFixed(0)}K
            </Typography>
            <Chip
              label={`${tokenData.percentage}%`}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.65rem',
                bgcolor:
                  tokenData.percentage > 80
                    ? '#f44336'
                    : tokenData.percentage > 60
                      ? '#ff9800'
                      : '#4caf50',
                color: '#fff',
                '& .MuiChip-label': {
                  px: 0.5,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Token 充值对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>💰 Token 充值</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* 当前用量 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                当前用量
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
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
                    {(tokenData.used / 1000).toFixed(1)}K
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={tokenData.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        tokenData.percentage > 80
                          ? '#f44336'
                          : tokenData.percentage > 60
                            ? '#ff9800'
                            : '#4caf50',
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
                >
                  剩余 {(tokenData.total - tokenData.used).toLocaleString()}{' '}
                  Tokens
                </Typography>
              </Box>
            </Box>

            {/* 充值套餐 */}
            <Typography variant="subtitle2" gutterBottom>
              充值套餐
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 2,
              }}
            >
              {[
                { amount: '10K', price: '¥29', popular: false },
                { amount: '50K', price: '¥129', popular: true },
                { amount: '200K', price: '¥449', popular: false },
              ].map((plan, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    border: '2px solid',
                    borderColor: plan.popular ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.50',
                    },
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label="热门"
                      size="small"
                      color="primary"
                      sx={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  <Typography variant="h6" fontWeight={700}>
                    {plan.amount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tokens
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color="primary.main"
                    sx={{ mt: 1 }}
                  >
                    {plan.price}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 说明 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Typography variant="caption" color="info.main">
                💡 Token 用于 AI 智能体对话、数据分析等 AI
                功能。用完后将无法使用 AI 相关功能，但不影响基础业务操作。
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>关闭</Button>
          <Button onClick={handleRecharge} variant="contained" color="primary">
            立即充值
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
