import {
  ShowChart as ChartIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ProductAnalytics,
  SalesTrendData,
  getProductAnalytics,
  getSalesTrend,
} from '../lib/analyticsService';

export default function AnalyticsPage() {
  const [salesTrend, setSalesTrend] = useState<SalesTrendData | null>(null);
  const [productAnalytics, setProductAnalytics] =
    useState<ProductAnalytics | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [trendData, analyticsData] = await Promise.all([
        getSalesTrend(period),
        getProductAnalytics(),
      ]);
      setSalesTrend(trendData);
      setProductAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📈 数据分析
        </Typography>
        <Typography variant="body1" color="text.secondary">
          销售趋势、产品分析和库存周转率
        </Typography>
      </Box>

      {/* 控制栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>时间周期</InputLabel>
          <Select
            value={period}
            label="时间周期"
            onChange={e => setPeriod(e.target.value as any)}
          >
            <MenuItem value="day">按天 (30天)</MenuItem>
            <MenuItem value="week">按周 (13周)</MenuItem>
            <MenuItem value="month">按月 (12月)</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          刷新
        </Button>
      </Paper>

      {/* 销售趋势图表 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">销售趋势</Typography>
        </Box>

        {salesTrend && salesTrend.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={salesTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="outbound_qty"
                name="出库量"
                stroke="#f44336"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="inbound_qty"
                name="入库量"
                stroke="#4caf50"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
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
          <Typography variant="h6" gutterBottom>
            交易数量趋势
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transaction_count" name="交易次数" fill="#1976d2" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* 产品分析 */}
      <Grid container spacing={3}>
        {/* 畅销产品 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: 'success.main' }}
            >
              🔥 畅销产品 TOP 10
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell>
                    <TableCell>产品名称</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">销量</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productAnalytics?.best_selling.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productAnalytics?.best_selling.map((product, index) => (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Typography
                            sx={{
                              fontWeight: index < 3 ? 'bold' : 'normal',
                              color:
                                index === 0
                                  ? '#ffd700'
                                  : index === 1
                                    ? '#c0c0c0'
                                    : index === 2
                                      ? '#cd7f32'
                                      : 'inherit',
                            }}
                          >
                            #{index + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ fontWeight: 'bold', color: 'success.main' }}
                          >
                            {product.total_sold}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* 滞销产品 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: 'warning.main' }}
            >
              ⚠️ 滞销产品 TOP 10
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>产品名称</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">库存</TableCell>
                    <TableCell align="right">库存价值</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productAnalytics?.slow_moving.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">暂无数据</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productAnalytics?.slow_moving.map(product => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ color: 'warning.main', fontWeight: 'bold' }}
                          >
                            {product.current_stock}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          ¥{product.stock_value.toFixed(2)}
                        </TableCell>
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
        <Typography variant="h6" gutterBottom>
          📊 库存周转率 (按类别)
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>类别</TableCell>
                <TableCell align="right">产品数</TableCell>
                <TableCell align="right">总库存</TableCell>
                <TableCell align="right">总销量</TableCell>
                <TableCell align="right">周转率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productAnalytics?.turnover_by_category.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productAnalytics?.turnover_by_category.map(category => (
                  <TableRow key={category.category} hover>
                    <TableCell>{category.category}</TableCell>
                    <TableCell align="right">
                      {category.product_count}
                    </TableCell>
                    <TableCell align="right">{category.total_stock}</TableCell>
                    <TableCell align="right">{category.total_sold}</TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color:
                            parseFloat(category.turnover_rate) > 1
                              ? 'success.main'
                              : parseFloat(category.turnover_rate) > 0.5
                                ? 'warning.main'
                                : 'error.main',
                        }}
                      >
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

      {/* 错误提示 */}
      {error && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'error.light',
            color: 'error.contrastText',
            borderRadius: 2,
          }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}
    </Box>
  );
}
