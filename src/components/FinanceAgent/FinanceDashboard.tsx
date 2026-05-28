import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import {
  AccountBalance as AssetIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  PieChart as ProfitIcon,
} from '@mui/icons-material';
import { FinanceAgentApi } from '../../lib/financeAgentService';

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<{ balance: number }[]>([]);
  const [summary, setSummary] = useState<{ total_income: number; total_expense: number; net: number }>({
    total_income: 0,
    total_expense: 0,
    net: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [accts, catSummary] = await Promise.all([
        FinanceAgentApi.getAccounts(),
        FinanceAgentApi.getCategorySummary(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0],
        ),
      ]);
      setAccounts(accts);
      setSummary(catSummary.summary);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    setLoading(false);
  }

  const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const cards = [
    {
      label: '总资产',
      value: `¥${totalAssets.toFixed(2)}`,
      icon: <AssetIcon sx={{ fontSize: 36 }} />,
      color: '#1976d2',
    },
    {
      label: '本月收入',
      value: `¥${summary.total_income.toFixed(2)}`,
      icon: <IncomeIcon sx={{ fontSize: 36 }} />,
      color: '#2e7d32',
    },
    {
      label: '本月支出',
      value: `¥${summary.total_expense.toFixed(2)}`,
      icon: <ExpenseIcon sx={{ fontSize: 36 }} />,
      color: '#d32f2f',
    },
    {
      label: '本月结余',
      value: `¥${summary.net.toFixed(2)}`,
      icon: <ProfitIcon sx={{ fontSize: 36 }} />,
      color: summary.net >= 0 ? '#1976d2' : '#d32f2f',
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        财务概览
      </Typography>
      <Grid container spacing={2}>
        {cards.map(card => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card
              sx={{
                borderLeft: `4px solid ${card.color}`,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ color: card.color }}>{card.icon}</Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {card.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
