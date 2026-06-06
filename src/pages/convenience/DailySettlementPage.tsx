import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  CircularProgress, Chip,
} from '@mui/material';
import {
  Calculate as CalcIcon, TrendingUp,
  QrCode, Payment as CashPayment,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';
import { format } from 'date-fns';

interface Settlement {
  id?: string;
  settlement_date: string;
  shift_start?: string;
  shift_end?: string;
  cash_amount: number;
  wechat_amount: number;
  alipay_amount: number;
  total_revenue: number;
  notes?: string;
}

export default function DailySettlementPage() {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadSettlement();
  }, []);

  const loadSettlement = async () => {
    setLoading(true);
    try {
      const result = await safeInvoke<Settlement>('cv_get_daily_settlement', { date: today });
      if (result) {
        setSettlement(result);
      }
    } catch (err) {
      console.error('Failed to load settlement:', err);
    }
    setLoading(false);
  };

  const totalRevenue = settlement?.total_revenue || 0;
  const cashAmount = settlement?.cash_amount || 0;
  const wechatAmount = settlement?.wechat_amount || 0;
  const alipayAmount = settlement?.alipay_amount || 0;

  const paymentCards = [
    { label: '现金收款', value: cashAmount, icon: <CashPayment />, color: '#16a34a', bg: '#f0fdf4' },
    { label: '微信收款', value: wechatAmount, icon: <QrCode />, color: '#07c160', bg: '#ecfdf5' },
    { label: '支付宝收款', value: alipayAmount, icon: <QrCode />, color: '#1677ff', bg: '#eff6ff' },
  ];

  if (loading) {
    return (
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff7ed' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', bgcolor: '#fff7ed', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#f97316' }}>
              日结盘点
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {today} · 每日交接班统计
            </Typography>
          </Box>
          <CalcIcon sx={{ fontSize: 40, color: '#f97316', opacity: 0.3 }} />
        </Box>
      </Paper>

      {/* Total Revenue */}
      <Paper sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'linear-gradient(135deg, #f97316, #ea580c)' }} elevation={3}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          今日总营收
        </Typography>
        <Typography variant="h2" fontWeight="bold" sx={{ color: '#f97316', my: 1 }}>
          ¥{totalRevenue.toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
          {totalRevenue > 0 ? (
            <Chip icon={<TrendingUp />} label="营业中" color="success" variant="outlined" />
          ) : (
            <Chip label="暂无交易" variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Payment Breakdown */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {paymentCards.map(card => (
          <Grid item xs={12} sm={4} key={card.label}>
            <Card elevation={2} sx={{ bgcolor: card.bg, borderLeft: `4px solid ${card.color}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: card.color, mt: 0.5 }}>
                      ¥{card.value.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      占比 {totalRevenue > 0 ? ((card.value / totalRevenue) * 100).toFixed(1) : 0}%
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.5 }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Shift Info */}
      {settlement?.shift_start && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            班次信息
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">上班时间</Typography>
              <Typography variant="body1">{settlement.shift_start}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">下班时间</Typography>
              <Typography variant="body1">{settlement.shift_end || '进行中'}</Typography>
            </Grid>
          </Grid>
          {settlement.notes && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">备注</Typography>
              <Typography variant="body1">{settlement.notes}</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
