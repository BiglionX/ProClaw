import {
  AccountBalance as BalanceIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as UpIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  CashFlowReport,
  FinancialSummary,
  ProfitLossReport,
  getCashFlowReport,
  getFinancialSummary,
  getProfitLossReport,
} from '../lib/financeService';

export default function FinancePage() {
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);

  // 加载财务概览
  const loadSummary = async () => {
    try {
      const data = await getFinancialSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  // 加载利润表
  const loadProfitLoss = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      const data = await getProfitLossReport(startDate, endDate);
      setProfitLoss(data);
    } catch (err) {
      console.error('Failed to load profit/loss:', err);
    }
  };

  // 加载现金流量表
  const loadCashFlow = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      const data = await getCashFlowReport(startDate, endDate);
      setCashFlow(data);
    } catch (err) {
      console.error('Failed to load cash flow:', err);
    }
  };

  useEffect(() => {
    loadSummary();
    loadProfitLoss();
    loadCashFlow();
  }, []);

  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`;
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📊 财务报表
        </Typography>
        <Typography variant="body1" color="text.secondary">
          利润表、现金流量表和财务概览
        </Typography>
      </Box>

      {/* 标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<BalanceIcon />} label="财务概览" />
          <Tab icon={<MoneyIcon />} label="利润表" />
          <Tab icon={<UpIcon />} label="现金流量表" />
        </Tabs>
      </Paper>

      {/* 财务概览标签页 */}
      {tabValue === 0 && summary && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card
                sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月收入
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_revenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月支出
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_expense)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  bgcolor:
                    summary.monthly_profit >= 0
                      ? 'primary.light'
                      : 'warning.light',
                  color: 'white',
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月利润
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.monthly_profit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    营运资金
                  </Typography>
                  <Typography variant="h3">
                    {formatCurrency(summary.working_capital)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 详细数据表格 */}
          <Paper
            elevation={0}
            sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}
          >
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        应收账款
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'warning.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.accounts_receivable)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        应付账款
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.accounts_payable)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        库存价值
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'primary.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(summary.inventory_value)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 利润表标签页 */}
      {tabValue === 1 && profitLoss && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'primary.50',
              }}
            >
              <Typography variant="h6">
                利润表 ({profitLoss.period.start} ~ {profitLoss.period.end})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        销售收入
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'success.main', fontWeight: 'bold' }}
                      >
                        {formatCurrency(profitLoss.revenue)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        销售成本
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        -{formatCurrency(profitLoss.cost_of_goods_sold)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.1em' }}
                      >
                        毛利润
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.1em',
                          color:
                            profitLoss.gross_profit >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(profitLoss.gross_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        运营费用
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{ color: 'error.main', fontWeight: 'bold' }}
                      >
                        -{formatCurrency(profitLoss.operating_expenses)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'primary.50' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.2em' }}
                      >
                        净利润
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.2em',
                          color:
                            profitLoss.net_profit >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(profitLoss.net_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        利润率
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color:
                            profitLoss.profit_margin >= 20
                              ? 'success.main'
                              : profitLoss.profit_margin >= 10
                                ? 'warning.main'
                                : 'error.main',
                        }}
                      >
                        {profitLoss.profit_margin.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 现金流量表标签页 */}
      {tabValue === 2 && cashFlow && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'info.50',
              }}
            >
              <Typography variant="h6">
                现金流量表 ({cashFlow.period.start} ~ {cashFlow.period.end})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        经营活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流入</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'success.main' }}>
                        {formatCurrency(cashFlow.operating_activities.inflow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流出</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'error.main' }}>
                        -{formatCurrency(cashFlow.operating_activities.outflow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ pl: 4 }}>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        经营净现金流
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color:
                            cashFlow.operating_activities.net >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(cashFlow.operating_activities.net)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        投资活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">
                      {formatCurrency(cashFlow.investing_activities)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography
                        sx={{ fontWeight: 'bold', color: 'primary.main' }}
                      >
                        筹资活动现金流
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">
                      {formatCurrency(cashFlow.financing_activities)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'info.50' }}>
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 'bold', fontSize: '1.2em' }}
                      >
                        净现金流
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          fontSize: '1.2em',
                          color:
                            cashFlow.net_cash_flow >= 0
                              ? 'success.main'
                              : 'error.main',
                        }}
                      >
                        {formatCurrency(cashFlow.net_cash_flow)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
