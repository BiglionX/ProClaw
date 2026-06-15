import {
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  AttachMoney as MoneyIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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

import AIInsights, { type AIInsightItem } from '../components/DataCenter/AIInsights';
import AIStatusBar from '../components/DataCenter/AIStatusBar';
import ChartsSection from '../components/DataCenter/ChartsSection';
import StatCard from '../components/DataCenter/StatCard';
import QuickActions from '../components/Agent/QuickActions';
import { generateAIInsights } from '../lib/aiInsightEngine';
import {
  getSalesTrend, getProductAnalytics,
  type SalesTrendData, type ProductAnalytics,
} from '../lib/analyticsService';
import { getFinancialSummary,
  type FinancialSummary,
} from '../lib/financeService';
import { getInventoryStats, type InventoryStats } from '../lib/inventoryService';
import { getDatabaseStats } from '../lib/productService';
import ProfitLossPage from './ProfitLossPage';
import CashFlowPage from './CashFlowPage';
import AITaskOverview from '../components/DataCenter/AITaskOverview';

/* ========== 工具函数 ========== */

const formatCurrency = (value: number) => {
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
  return `¥${value.toFixed(2)}`;
};

/* ========== 主页面 ========== */

export default function DataCenterPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [insights, setInsights] = useState<AIInsightItem[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsTrend, setAnalyticsTrend] = useState<SalesTrendData | null>(null);
  const [analyticsProducts, setAnalyticsProducts] = useState<ProductAnalytics | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  // 加载概览数据
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invStats, prodAnalytics, finSummary, dbStatistics] = await Promise.all([
        getInventoryStats(), getProductAnalytics(),
        getFinancialSummary(), getDatabaseStats(),
      ]);
      setInventoryStats(invStats);
      setFinancialSummary(finSummary);
      setDbStats(dbStatistics);

      const generatedInsights = generateAIInsights({
        lowStockCount: invStats?.low_stock_count || 0,
        zeroStockCount: invStats?.zero_stock_count || 0,
        totalProducts: dbStatistics?.spu_count || 0,
        monthlyRevenue: finSummary?.monthly_revenue || 0,
        monthlyProfit: finSummary?.monthly_profit || 0,
        bestSellingProducts: prodAnalytics?.best_selling?.slice(0, 3),
        lowStockProducts: invStats?.low_stock_products,
        accountsReceivable: finSummary?.accounts_receivable || 0,
        accountsPayable: finSummary?.accounts_payable || 0,
      });
      setInsights(generatedInsights);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载数据分析
  const loadAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const [trendData, analyticsData] = await Promise.all([
        getSalesTrend(period), getProductAnalytics(),
      ]);
      setAnalyticsTrend(trendData);
      setAnalyticsProducts(analyticsData);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);
  useEffect(() => { loadAnalyticsData(); }, [period]);

  const finSummary = financialSummary;

  // 构造 sparkline 数据（PRD v11.0 §4.1.3：StatCard 右上角 32px 迷你趋势线）
  // 优先从 analyticsTrend.data 提取近期数据；为 table 各 metric 构建独立序列
  const trendData = analyticsTrend?.data || [];
  const sparklineDataMap = {
    outbound: trendData.slice(-7).map(d => ({ value: d.outbound_qty })),
    inbound: trendData.slice(-7).map(d => ({ value: d.inbound_qty })),
    transactions: trendData.slice(-7).map(d => ({ value: d.transaction_count })),
    products: trendData.slice(-7).map((_, idx) => ({ value: (dbStats?.spu_count || 0) + idx })),
  };

  // 转换 analyticsTrend 为 ChartsSection 期望的格式（出库量/入库量/交易数）
  const salesChartData = trendData.map(d => ({
    date: d.date,
    '出库量': d.outbound_qty,
    '入库量': d.inbound_qty,
    '交易数': d.transaction_count,
  }));

  // 库存状态分布（从 inventoryStats 提取）
  const inventoryDistribution = inventoryStats ? [
    { name: '充足', value: Math.max(0, (inventoryStats.total_products || 0) - (inventoryStats.low_stock_count || 0) - (inventoryStats.zero_stock_count || 0)), color: '#10B981' },
    { name: '预警', value: inventoryStats.low_stock_count || 0, color: '#F59E0B' },
    { name: '缺货', value: inventoryStats.zero_stock_count || 0, color: '#EF4444' },
  ].filter(item => item.value > 0) : [];

  return (
    <Box>
      {/* 页面标题行 + AI小如按钮在右侧 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            数据中心
          </Typography>
        </Box>
        {/* AI 小如 —— 紧凑按钮 */}
        <Box
          onClick={() => setReportOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: 'rgba(255,59,48,0.15)',
            bgcolor: 'rgba(255,59,48,0.04)',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(255,59,48,0.1)',
              borderColor: 'rgba(255,59,48,0.3)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box sx={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
          }}>如</Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#FF3B30' }}>
            AI 分析
          </Typography>
        </Box>
      </Box>

      {/* 分列导航：业务分析 | 利润表 | 现金流量表 */}
      <AIStatusBar
        insight={insights[0]?.message}
        dailyReport={insights.slice(0, 5).map(i => i.message)}
      />
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF3B30',
              height: 2,
            },
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.5)',
              '&.Mui-selected': {
                color: '#FF3B30',
                fontWeight: 600,
              },
            },
            '& .MuiTab-iconWrapper': {
              mr: 0.5,
            },
          }}
        >
          <Tab icon={<BarChartIcon sx={{ fontSize: 16 }} />} label="业务分析" iconPosition="start" />
          <Tab icon={<MoneyIcon sx={{ fontSize: 16 }} />} label="利润表" iconPosition="start" />
          <Tab icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} label="现金流量表" iconPosition="start" />
          <Tab icon={<AssignmentIcon sx={{ fontSize: 16 }} />} label="AI 任务概览" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: 业务分析 */}
      {tabValue === 0 && (
        <>
          {/* ========== 经营概览卡片 ========== */}
          {loading ? (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[1, 2, 3, 4].map(i => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Skeleton variant="rounded" height={120} />
                </Grid>
              ))}
            </Grid>
          ) : error ? (
            <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
              <Typography>{error}</Typography>
              <Button variant="outlined" size="small" onClick={loadDashboardData} sx={{ mt: 1 }}>
                重试
              </Button>
            </Paper>
          ) : (
            <>
              {/* 概览统计卡片 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {inventoryStats && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        icon={<InventoryIcon />}
                        title="总产品数"
                        value={inventoryStats.total_products}
                        color="#6366F1"
                        sparklineData={sparklineDataMap.products}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        icon={<WarningIcon />}
                        title="低库存预警"
                        value={inventoryStats.low_stock_count}
                        color={inventoryStats.low_stock_count > 0 ? '#F59E0B' : '#10B981'}
                        sparklineData={sparklineDataMap.transactions}
                        alert={inventoryStats.low_stock_count > 5}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        icon={<WarningIcon />}
                        title="零库存"
                        value={inventoryStats.zero_stock_count}
                        color={inventoryStats.zero_stock_count > 0 ? '#EF4444' : '#10B981'}
                        sparklineData={sparklineDataMap.inbound}
                        alert={inventoryStats.zero_stock_count > 0}
                      />
                    </Grid>
                  </>
                )}
                {dbStats && (
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      icon={<DashboardIcon />}
                      title="SPU 总数"
                      value={dbStats.spu_count || 0}
                      color="#FF3B30"
                      sparklineData={sparklineDataMap.outbound}
                    />
                  </Grid>
                )}
              </Grid>

              {/* PRD v11.0 §4.1.2：快捷操作区（含 AI 推荐 + 呼吸光晕） */}
              <Box sx={{ mb: 3 }}>
                <QuickActions onSalesAnalysis={() => setTabValue(0)} />
              </Box>

              {/* 财务概览卡片 */}
              {finSummary && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', color: '#065F46' }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>本月收入</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem' }}>{formatCurrency(finSummary.monthly_revenue)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)', color: '#991B1B' }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>本月支出</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem' }}>{formatCurrency(finSummary.monthly_expense)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                      background: finSummary.monthly_profit >= 0
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.02) 100%)'
                        : 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)',
                      color: finSummary.monthly_profit >= 0 ? '#4338CA' : '#92400E',
                    }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>本月利润</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem' }}>{formatCurrency(finSummary.monthly_profit)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 100%)', color: '#4338CA' }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>营运资金</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem' }}>{formatCurrency(finSummary.working_capital)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <TableContainer>
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>应收账款</Typography></TableCell>
                              <TableCell align="right">
                                <Typography sx={{ color: '#F59E0B', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(finSummary.accounts_receivable)}</Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>应付账款</Typography></TableCell>
                              <TableCell align="right">
                                <Typography sx={{ color: '#EF4444', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(finSummary.accounts_payable)}</Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>库存价值</Typography></TableCell>
                              <TableCell align="right">
                                <Typography sx={{ color: '#FF3B30', fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(finSummary.inventory_value)}</Typography>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {/* AI 洞察 */}
              {insights.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <AIInsights insights={insights} />
                </Box>
              )}

              {/* ========== 销售数据分析 ========== */}
              {/* 数据分析区域 */}
              <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnalyticsIcon sx={{ color: '#FF3B30' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>销售数据分析</Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>时间周期</InputLabel>
                  <Select value={period} label="时间周期" onChange={e => setPeriod(e.target.value as any)}>
                    <MenuItem value="day">按天 (30天)</MenuItem>
                    <MenuItem value="week">按周 (13周)</MenuItem>
                    <MenuItem value="month">按月 (12月)</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAnalyticsData} disabled={analyticsLoading}>刷新</Button>
              </Paper>

              {/* PRD v11.0 §4.1.5：使用 ChartsSection 统一品牌配色 + 毛玻璃 Tooltip */}
              {analyticsTrend?.data && analyticsTrend.data.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <ChartsSection
                    salesChartData={salesChartData}
                    inventoryDistribution={inventoryDistribution}
                  />
                </Box>
              ) : (
                <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography color="text.secondary">暂无销售数据</Typography>
                  </Box>
                </Paper>
              )}

              {/* 产品分析 */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#10B981', fontSize: '0.95rem' }}>🔥 畅销产品 TOP 10</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><Typography sx={{ fontSize: '0.875rem' }}>排名</Typography></TableCell><TableCell><Typography sx={{ fontSize: '0.875rem' }}>产品名称</Typography></TableCell><TableCell><Typography sx={{ fontSize: '0.875rem' }}>SKU</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>销量</Typography></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analyticsProducts?.best_selling.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
                          ) : (
                            analyticsProducts?.best_selling.map((product, index) => (
                              <TableRow key={product.id} hover>
                                <TableCell>
                                  <Typography sx={{
                                    fontWeight: 600,
                                    color: index === 0 ? '#FF3B30' : index === 1 ? '#6366F1' : index === 2 ? '#F59E0B' : 'inherit',
                                    fontSize: '0.875rem'
                                  }}>
                                    #{index + 1}
                                  </Typography>
                                </TableCell>
                                <TableCell><Typography sx={{ fontSize: '0.875rem' }}>{product.name}</Typography></TableCell>
                                <TableCell><Typography sx={{ fontSize: '0.875rem' }}>{product.sku}</Typography></TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ fontWeight: 600, color: '#10B981', fontSize: '0.875rem' }}>{product.total_sold}</Typography>
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
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#F59E0B', fontSize: '0.95rem' }}>⚠️ 滞销产品 TOP 10</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><Typography sx={{ fontSize: '0.875rem' }}>产品名称</Typography></TableCell><TableCell><Typography sx={{ fontSize: '0.875rem' }}>SKU</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>库存</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>库存价值</Typography></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {analyticsProducts?.slow_moving.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
                          ) : (
                            analyticsProducts?.slow_moving.map(product => (
                              <TableRow key={product.id} hover>
                                <TableCell><Typography sx={{ fontSize: '0.875rem' }}>{product.name}</Typography></TableCell>
                                <TableCell><Typography sx={{ fontSize: '0.875rem' }}>{product.sku}</Typography></TableCell>
                                <TableCell align="right"><Typography sx={{ color: '#F59E0B', fontWeight: 600, fontSize: '0.875rem' }}>{product.current_stock}</Typography></TableCell>
                                <TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>¥{product.stock_value.toFixed(2)}</Typography></TableCell>
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
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>📊 库存周转率 (按类别)</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><Typography sx={{ fontSize: '0.875rem' }}>类别</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>产品数</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>总库存</Typography></TableCell>
                        <TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>总销量</Typography></TableCell><TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>周转率</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsProducts?.turnover_by_category.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">暂无数据</Typography></TableCell></TableRow>
                      ) : (
                        analyticsProducts?.turnover_by_category.map(category => (
                          <TableRow key={category.category} hover>
                            <TableCell><Typography sx={{ fontSize: '0.875rem' }}>{category.category}</Typography></TableCell>
                            <TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>{category.product_count}</Typography></TableCell>
                            <TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>{category.total_stock}</Typography></TableCell>
                            <TableCell align="right"><Typography sx={{ fontSize: '0.875rem' }}>{category.total_sold}</Typography></TableCell>
                            <TableCell align="right">
                              <Typography sx={{
                                fontWeight: 600, fontSize: '0.875rem',
                                color: parseFloat(category.turnover_rate) > 1 ? '#10B981' : parseFloat(category.turnover_rate) > 0.5 ? '#F59E0B' : '#EF4444'
                              }}>
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

              {/* 加载错误提示 */}
              {analyticsError && (
                <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
                  <Typography>{analyticsError}</Typography>
                </Paper>
              )}
            </>
          )}
        </>
      )}

      {/* Tab 1: 利润表 */}
      {tabValue === 1 && <ProfitLossPage />}

      {/* Tab 2: 现金流量表 */}
      {tabValue === 2 && <CashFlowPage />}

      {/* Tab 3: AI 任务概览 */}
      {tabValue === 3 && <AITaskOverview />}

      {/* AI 小如 —— 简报弹窗 */}
      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            📋 AI 今日简报
          </Typography>
          <IconButton size="small" onClick={() => setReportOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {insights.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {insights.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: idx % 2 === 0 ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
                    border: '1px solid',
                    borderColor: idx % 2 === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#4B5563' }}>
                    {item.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无分析数据，录入更多交易后 AI 将自动生成简报
            </Typography>
          )}
        </DialogContent>
      </Dialog>

    </Box>
  );
}
