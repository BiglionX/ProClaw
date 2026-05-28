import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import {
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as NetIcon,
  Percent as MarginIcon,
} from '@mui/icons-material';
import { FinanceAgentApi } from '../../lib/financeAgentService';

export default function ReportView() {
  const [loading, setLoading] = useState(true);
  const [pl, setPl] = useState<{
    total_income: number;
    total_expense: number;
    net_profit: number;
    profit_margin: number;
  } | null>(null);
  const [categories, setCategories] = useState<{ name: string; amount: number; type: string }[]>([]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const startDate = `${thisMonth}-01`;
  const endDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [profitLoss, catSummary] = await Promise.all([
        FinanceAgentApi.getProfitLoss(startDate, endDate),
        FinanceAgentApi.getCategorySummary(startDate, endDate),
      ]);
      setPl(profitLoss);
      setCategories(catSummary.categories);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  const summaryCards = pl ? [
    { label: '总收入', value: `¥${pl.total_income.toFixed(2)}`, icon: <IncomeIcon />, color: '#2e7d32' },
    { label: '总支出', value: `¥${pl.total_expense.toFixed(2)}`, icon: <ExpenseIcon />, color: '#d32f2f' },
    { label: '净利润', value: `¥${pl.net_profit.toFixed(2)}`, icon: <NetIcon />, color: '#1976d2' },
    { label: '利润率', value: `${pl.profit_margin}%`, icon: <MarginIcon />, color: '#7b1fa2' },
  ] : [];

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        财务报表
      </Typography>

      {/* 概览卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(card => (
          <Grid item xs={6} md={3} key={card.label}>
            <Card sx={{ borderLeft: `4px solid ${card.color}` }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{card.value}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 分类统计 */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        分类收支统计
      </Typography>
      <Grid container spacing={2}>
        {categories
          .filter(c => c.amount > 0)
          .map(cat => (
            <Grid item xs={6} sm={4} md={3} key={cat.name}>
              <Card>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {cat.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={cat.type === 'income' ? 'success.main' : 'error.main'}
                  >
                    ¥{cat.amount.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
    </Box>
  );
}
