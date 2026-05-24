import {
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  ShowChart as ChartIcon,
  AccountBalance as BalanceIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  getInventoryStats, type InventoryStats,
} from '../lib/inventoryService';
import {
  getSalesTrend, getProductAnalytics,
  type SalesTrendData, type ProductAnalytics,
} from '../lib/analyticsService';
import {
  getFinancialSummary, getProfitLossReport, getCashFlowReport,
  type FinancialSummary, type ProfitLossReport, type CashFlowReport,
} from '../lib/financeService';
import { getDatabaseStats } from '../lib/productService';

/* ========== 通用组件 ========== */

const formatCurrency = (value: number) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toFixed(2)}`;
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, change, subtitle }: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 56, height: 56, bgcolor: `${color}.light`,
              borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {change && (
            <Chip
              label={change} size="small"
              color={change.startsWith('+') ? 'success' : 'error'}
              variant="outlined" sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ========== 业务概览 Tab ========== */

function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invStats, trendData, prodAnalytics, finSummary, dbStatistics] = await Promise.all([
        getInventoryStats(), getSalesTrend('day'), getProductAnalytics(),
        getFinancialSummary(), getDatabaseStats(),
      ]);
      setInventoryStats(invStats);
      setSalesTrend(trendData);
      setProductAnalytics(prodAnalytics);
      setFinancialSummary(finSummary);
      setDbStats(dbStatistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  const getInventoryDistribution = () => {
    if (!inventoryStats) return [];
    const normalStock = inventoryStats.total_products - inventoryStats.low_stock_count - inventoryStats.zero_stock_count;
    return [
      { name: '正常库存', value: normalStock, color: '#4caf50' },
      { name: '低库存', value: inventoryStats.low_stock_count, color: '#ff9800' },
      { name: '零库存', value: inventoryStats.zero_stock_count, color: '#f44336' },
    ].filter(item => item.value > 0);
  };

  const getSalesChartData = () => {
    if (!salesTrend || !salesTrend.data) return [];
    return salesTrend.data.slice(-7).map(item => ({
      date: item.date.slice(5),
      出库量: item.outbound_qty,
      入库量: item.inbound_qty,
      交易数: item.transaction_count,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          <Typography>{error}</Typography>
        </Box>
      )}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadDashboardData} disabled={loading}>
          刷新数据
        </Button>
      </Box>

      {/* 关键指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="产品总数" value={dbStats?.products_count || 0}
            icon={<InventoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />} color="primary"
            subtitle={`${dbStats?.categories_count || 0} 个分类`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="本月销售额" value={formatCurrency(financialSummary?.monthly_revenue || 0)}
            icon={<TrendingUpIcon sx={{ fontSize: 32, color: 'success.main' }} />} color="success"
            change={`+${((financialSummary?.monthly_profit || 0) / Math.max(financialSummary?.monthly_revenue || 1, 1) * 100).toFixed(1)}%`}
            subtitle={`利润: ${formatCurrency(financialSummary?.monthly_profit || 0)}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="今日交易" value={inventoryStats?.today_transactions || 0}
            icon={<ShoppingCartIcon sx={{ fontSize: 32, color: 'warning.main' }} />} color="warning"
            subtitle={`库存价值: ${formatCurrency(inventoryStats?.total_value || 0)}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="库存预警" value={inventoryStats?.low_stock_count || 0}
            icon={<WarningIcon sx={{ fontSize: 32, color: 'info.main' }} />} color="info"
            change={inventoryStats?.zero_stock_count ? `+${inventoryStats.zero_stock_count} 缺货` : undefined}
            subtitle={`${inventoryStats?.zero_stock_count || 0} 个产品缺货`} />
        </Grid>
      </Grid>

      {/* 财务概览 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">应收账款</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {formatCurrency(financialSummary?.accounts_receivable || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>待收回款项</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">应付账款</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {formatCurrency(financialSummary?.accounts_payable || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>待支付款项</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReportIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">营运资金</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatCurrency(financialSummary?.working_capital || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>可用流动资金</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 图表区域 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📈 近7天销售趋势
            </Typography>
            {getSalesChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSalesChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="出库量" stroke="#666" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="入库量" stroke="#999" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">暂无销售数据</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📊 库存状态分布
            </Typography>
            {getInventoryDistribution().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={getInventoryDistribution()} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                    outerRadius={80} fill="#8884d8" dataKey="value">
                    {getInventoryDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary">暂无库存数据</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 畅销产品和低库存预警 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
              🔥 畅销产品 TOP 5
            </Typography>
            {productAnalytics?.best_selling && productAnalytics.best_selling.length > 0 ? (
              <Box>
                {productAnalytics.best_selling.slice(0, 5).map((product, index) => (
                  <Box key={product.id} sx={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', py: 1.5, borderBottom: index < 4 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 'bold',
                        color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'text.secondary',
                        minWidth: 30 }}>#{index + 1}</Typography>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{product.sku}</Typography>
                      </Box>
                    </Box>
                    <Chip label={`${product.total_sold} 件`} size="small" color="success" variant="outlined" />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">暂无销售数据</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
              ⚠️ 低库存预警
            </Typography>
            {inventoryStats?.low_stock_products && inventoryStats.low_stock_products.length > 0 ? (
              <Box>
                {inventoryStats.low_stock_products.slice(0, 5).map((product, index) => (
                  <Box key={product.id} sx={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', py: 1.5, borderBottom: index < 4 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{product.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        SPU: {product.spu_code} · {product.sku_count}个SKU
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip label={`当前: ${product.total_stock}`} size="small"
                        color={product.total_stock === 0 ? 'error' : 'warning'} sx={{ mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">最低: {product.min_stock}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">✓ 库存充足，无预警</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ========== 财务报表 Tab ========== */

function FinanceTab() {
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);

  useEffect(() => {
    getFinancialSummary().then(setSummary).catch(console.error);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    getProfitLossReport(startDate, endDate).then(setProfitLoss).catch(console.error);
    getCashFlowReport(startDate, endDate).then(setCashFlow).catch(console.error);
  }, []);

  const fmt = (v: number) => `¥${v.toFixed(2)}`;

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab icon={<BalanceIcon />} label="财务概览" />
          <Tab icon={<MoneyIcon />} label="利润表" />
          <Tab icon={<TrendingUpIcon />} label="现金流量表" />
        </Tabs>
      </Paper>

      {tabValue === 0 && summary && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>本月收入</Typography>
                  <Typography variant="h3">{fmt(summary.monthly_revenue)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>本月支出</Typography>
                  <Typography variant="h3">{fmt(summary.monthly_expense)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: summary.monthly_profit >= 0 ? 'primary.light' : 'warning.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>本月利润</Typography>
                  <Typography variant="h3">{fmt(summary.monthly_profit)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>营运资金</Typography>
                  <Typography variant="h3">{fmt(summary.working_capital)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Paper elevation={0} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>应收账款</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>{fmt(summary.accounts_receivable)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>应付账款</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'error.main', fontWeight: 'bold' }}>{fmt(summary.accounts_payable)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>库存价值</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'primary.main', fontWeight: 'bold' }}>{fmt(summary.inventory_value)}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {tabValue === 1 && profitLoss && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.50' }}>
              <Typography variant="h6">利润表 ({profitLoss.period.start} ~ {profitLoss.period.end})</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>销售收入</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>{fmt(profitLoss.revenue)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>销售成本</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'error.main', fontWeight: 'bold' }}>-{fmt(profitLoss.cost_of_goods_sold)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><Typography sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>毛利润</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', fontSize: '1.1em',
                        color: profitLoss.gross_profit >= 0 ? 'success.main' : 'error.main' }}>
                        {fmt(profitLoss.gross_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>运营费用</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ color: 'error.main', fontWeight: 'bold' }}>-{fmt(profitLoss.operating_expenses)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'primary.50' }}>
                    <TableCell><Typography sx={{ fontWeight: 'bold', fontSize: '1.2em' }}>净利润</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', fontSize: '1.2em',
                        color: profitLoss.net_profit >= 0 ? 'success.main' : 'error.main' }}>
                        {fmt(profitLoss.net_profit)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography sx={{ fontWeight: 'bold' }}>利润率</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold',
                        color: profitLoss.profit_margin >= 20 ? 'success.main'
                          : profitLoss.profit_margin >= 10 ? 'warning.main' : 'error.main' }}>
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

      {tabValue === 2 && cashFlow && (
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'info.50' }}>
              <Typography variant="h6">现金流量表 ({cashFlow.period.start} ~ {cashFlow.period.end})</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>经营活动现金流</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流入</TableCell>
                    <TableCell align="right"><Typography sx={{ color: 'success.main' }}>{fmt(cashFlow.operating_activities.inflow)}</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>现金流出</TableCell>
                    <TableCell align="right"><Typography sx={{ color: 'error.main' }}>-{fmt(cashFlow.operating_activities.outflow)}</Typography></TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ pl: 4 }}><Typography sx={{ fontWeight: 'bold' }}>经营净现金流</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', color: cashFlow.operating_activities.net >= 0 ? 'success.main' : 'error.main' }}>
                        {fmt(cashFlow.operating_activities.net)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>投资活动现金流</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">{fmt(cashFlow.investing_activities)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>筹资活动现金流</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>净额</TableCell>
                    <TableCell align="right">{fmt(cashFlow.financing_activities)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'info.50' }}>
                    <TableCell><Typography sx={{ fontWeight: 'bold', fontSize: '1.2em' }}>净现金流</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold', fontSize: '1.2em',
                        color: cashFlow.net_cash_flow >= 0 ? 'success.main' : 'error.main' }}>
                        {fmt(cashFlow.net_cash_flow)}
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

/* ========== 数据分析 Tab ========== */

function AnalyticsTab() {
  const [salesTrend, setSalesTrend] = useState<SalesTrendData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [trendData, analyticsData] = await Promise.all([
        getSalesTrend(period), getProductAnalytics(),
      ]);
      setSalesTrend(trendData);
      setProductAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [period]);

  return (
    <Box>
      {/* 控制栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>时间周期</InputLabel>
          <Select value={period} label="时间周期" onChange={e => setPeriod(e.target.value as any)}>
            <MenuItem value="day">按天 (30天)</MenuItem>
            <MenuItem value="week">按周 (13周)</MenuItem>
            <MenuItem value="month">按月 (12月)</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>刷新</Button>
      </Paper>

      {/* 销售趋势图 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">销售趋势</Typography>
        </Box>
        {salesTrend && salesTrend.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={salesTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="outbound_qty" name="出库量" stroke="#666" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="inbound_qty" name="入库量" stroke="#999" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">暂无销售数据</Typography>
          </Box>
        )}
      </Paper>

      {/* 交易数量柱状图 */}
      {salesTrend && salesTrend.data.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>交易数量趋势</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transaction_count" name="交易次数" fill="#666" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* 产品分析 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>🔥 畅销产品 TOP 10</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell><TableCell>产品名称</TableCell><TableCell>SKU</TableCell><TableCell align="right">销量</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productAnalytics?.best_selling.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
                  ) : (
                    productAnalytics?.best_selling.map((product, index) => (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: index < 3 ? 'bold' : 'normal',
                            color: index === 0 ? '#666' : index === 1 ? '#888' : index === 2 ? '#999' : 'inherit' }}>
                            #{index + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>{product.total_sold}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'warning.main' }}>⚠️ 滞销产品 TOP 10</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>产品名称</TableCell><TableCell>SKU</TableCell><TableCell align="right">库存</TableCell><TableCell align="right">库存价值</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productAnalytics?.slow_moving.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
                  ) : (
                    productAnalytics?.slow_moving.map(product => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>{product.current_stock}</Typography>
                        </TableCell>
                        <TableCell align="right">¥{product.stock_value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 库存周转率 */}
      <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>📊 库存周转率 (按类别)</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>类别</TableCell><TableCell align="right">产品数</TableCell><TableCell align="right">总库存</TableCell>
                <TableCell align="right">总销量</TableCell><TableCell align="right">周转率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productAnalytics?.turnover_by_category.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
              ) : (
                productAnalytics?.turnover_by_category.map(category => (
                  <TableRow key={category.category} hover>
                    <TableCell>{category.category}</TableCell>
                    <TableCell align="right">{category.product_count}</TableCell>
                    <TableCell align="right">{category.total_stock}</TableCell>
                    <TableCell align="right">{category.total_sold}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'bold',
                        color: parseFloat(category.turnover_rate) > 1 ? 'success.main'
                          : parseFloat(category.turnover_rate) > 0.5 ? 'warning.main' : 'error.main' }}>
                        {category.turnover_rate}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {error && (
        <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
          <Typography>{error}</Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ========== 主页面 ========== */

export default function DataCenterPage() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          数据中心
        </Typography>
        <Typography variant="body1" color="text.secondary">
          业务概览、财务报表与数据分析
          <Typography component="span" sx={{ ml: 1, color: '#ff3b30', fontSize: '0.9em' }}>🦞</Typography>
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab icon={<DashboardIcon />} label="业务概览" />
          <Tab icon={<BalanceIcon />} label="财务报表" />
          <Tab icon={<AnalyticsIcon />} label="数据分析" />
        </Tabs>
      </Paper>

      {tabValue === 0 && <DashboardTab />}
      {tabValue === 1 && <FinanceTab />}
      {tabValue === 2 && <AnalyticsTab />}
    </Box>
  );
}
