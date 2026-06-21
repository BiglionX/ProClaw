import {
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useSalesTrend } from '../lib/hooks/useAnalytics';
import { useDashboardOverview, useInvalidateDashboard } from '../lib/hooks/useDashboard';
import { useAppModeStore } from '../config/appMode';
import FloatingAgentChat from '../components/Agent/FloatingAgentChat';
import type { TeamChatContext } from '../components/Agent/FloatingAgentChat';
import TeamConfigDialog from '../components/Agent/TeamConfigDialog';

interface AITeamCardData {
  id: string;
  name: string;
  status: 'running' | 'configuring';
  desc: string;
  color: string;
  icon: string;
}

function getDefaultAITeams(): AITeamCardData[] {
  let stored: AITeamCardData[] = [];
  try {
    const data = localStorage.getItem('proclaw-dashboard-ai-teams');
    if (data) stored = JSON.parse(data);
  } catch { /* ignore */ }

  if (stored.length > 0) return stored;

  const defaults: AITeamCardData[] = [
    { id: 'team-newmedia', name: '新媒体运营', status: 'running', desc: '支持短视频、小红书内容生成与发布', color: '#e74c3c', icon: '📱' },
    { id: 'team-localdeal', name: '本地团购', status: 'configuring', desc: '管理美团/抖音团购订单与活动', color: '#f39c12', icon: '🏷️' },
    { id: 'team-miniapp', name: '小程序商城', status: 'running', desc: '一键同步商品、订单处理、客户管理', color: '#3498db', icon: '🛍️' },
  ];
  return defaults;
}

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              bgcolor: `${color}.light`,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {change && (
            <Chip
              label={change}
              size="small"
              color={change.startsWith('+') ? 'success' : 'error'}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // 从插件 manifest 读取快速操作按钮
  const plugin = useAppModeStore(state => state.activePlugin);
  const quickActions = plugin?.ui.quickActions ?? [];

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useDashboardOverview();
  const {
    data: salesTrend,
    isLoading: trendLoading,
    refetch: refetchTrend,
  } = useSalesTrend('day');
  const invalidateDashboard = useInvalidateDashboard();

  const loading = overviewLoading || trendLoading;
  const error = overviewError instanceof Error ? overviewError.message : null;
  const inventoryStats = overview?.invStats ?? null;
  const productAnalytics = overview?.prodAnalytics ?? null;
  const financialSummary = overview?.finSummary ?? null;
  const dbStats = overview?.dbStatistics ?? null;

  const loadDashboardData = () => {
    invalidateDashboard();
    refetchOverview();
    refetchTrend();
  };

  // AI 团队交互状态
  const [chatContext, setChatContext] = useState<TeamChatContext | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);
  const [configTeam, setConfigTeam] = useState<{ id: string; name: string } | null>(null);

  // 格式化货币
  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toFixed(2)}`;
  };

  // 准备库存分布数据
  const getInventoryDistribution = () => {
    if (!inventoryStats) return [];
    
    const normalStock = inventoryStats.total_products - 
                       inventoryStats.low_stock_count - 
                       inventoryStats.zero_stock_count;
    
    return [
      { name: '正常库存', value: normalStock, color: '#4caf50' },
      { name: '低库存', value: inventoryStats.low_stock_count, color: '#ff9800' },
      { name: '零库存', value: inventoryStats.zero_stock_count, color: '#f44336' },
    ].filter(item => item.value > 0);
  };

  // 准备销售趋势图表数据
  const getSalesChartData = () => {
    if (!salesTrend || !salesTrend.data) return [];
    return salesTrend.data.slice(-7).map(item => ({
      date: item.date.slice(5), // 只显示月-日
      出库量: item.outbound_qty,
      入库量: item.inbound_qty,
      交易数: item.transaction_count,
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            仪表盘
          </Typography>
          <Typography variant="body1" color="text.secondary">
            业务概览和关键指标
            <Typography
              component="span"
              sx={{
                ml: 1,
                color: '#ff3b30',
                fontSize: '0.9em',
              }}
            >
              🦞
            </Typography>
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={loading}
        >
          刷新数据
        </Button>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 关键指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="产品总数"
            value={dbStats?.spu_count || 0}
            icon={<InventoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
            color="primary"
            subtitle={`${dbStats?.categories_count || 0} 个分类`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="本月销售额"
            value={formatCurrency(financialSummary?.monthly_revenue || 0)}
            icon={<TrendingUpIcon sx={{ fontSize: 32, color: 'success.main' }} />}
            color="success"
            change={`+${((financialSummary?.monthly_profit || 0) / Math.max(financialSummary?.monthly_revenue || 1, 1) * 100).toFixed(1)}%`}
            subtitle={`利润: ${formatCurrency(financialSummary?.monthly_profit || 0)}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="今日交易"
            value={inventoryStats?.today_transactions || 0}
            icon={<ShoppingCartIcon sx={{ fontSize: 32, color: 'warning.main' }} />}
            color="warning"
            subtitle={`库存价值: ${formatCurrency(inventoryStats?.total_value || 0)}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="库存预警"
            value={inventoryStats?.low_stock_count || 0}
            icon={<WarningIcon sx={{ fontSize: 32, color: 'info.main' }} />}
            color="info"
            change={inventoryStats?.zero_stock_count ? `+${inventoryStats.zero_stock_count} 缺货` : undefined}
            subtitle={`${inventoryStats?.zero_stock_count || 0} 个产品缺货`}
          />
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                待收回款项
              </Typography>
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                待支付款项
              </Typography>
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                可用流动资金
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 图表区域 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 销售趋势图 */}
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

        {/* 库存分布饼图 */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              📊 库存状态分布
            </Typography>
            {getInventoryDistribution().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getInventoryDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const percentage = percent ? (percent * 100).toFixed(0) : '0';
                      return `${name} ${percentage}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
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
        {/* 畅销产品 TOP 5 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
              🔥 畅销产品 TOP 5
            </Typography>
            {productAnalytics?.best_selling && productAnalytics.best_selling.length > 0 ? (
              <Box>
                {productAnalytics.best_selling.slice(0, 5).map((product, index) => (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 4 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'text.secondary',
                          minWidth: 30,
                        }}
                      >
                        #{index + 1}
                      </Typography>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.sku}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${product.total_sold} 件`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">暂无销售数据</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* 低库存预警 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
              ⚠️ 低库存预警
            </Typography>
            {inventoryStats?.low_stock_products && inventoryStats.low_stock_products.length > 0 ? (
              <Box>
                {inventoryStats.low_stock_products.slice(0, 5).map((product, index) => (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 4 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        SPU: {product.spu_code} · {product.sku_count}个SKU
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip
                        label={`当前: ${product.total_stock}`}
                        size="small"
                        color={product.total_stock === 0 ? 'error' : 'warning'}
                        sx={{ mb: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        最低: {product.min_stock}
                      </Typography>
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

      {/* AI 团队运行状态卡片（全版本） */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          {'🤖 AI 团队运行状态'}
        </Typography>
        <Grid container spacing={2}>
          {getDefaultAITeams().map(team => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%', '&:hover': { boxShadow: 2 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h5" sx={{ fontSize: '1.8rem' }}>{team.icon}</Typography>
                    <Chip
                      label={team.status === 'running' ? '运行中' : '待配置'}
                      size="small"
                      color={team.status === 'running' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {team.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.desc}
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ color: team.color }}
                      onClick={() => setConfigTeam({ id: team.id, name: team.name })}
                    >
                      配置
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ color: team.color }}
                      onClick={() => {
                        setChatContext({ teamId: team.id, teamName: team.name });
                        setChatOpen(true);
                      }}
                    >
                      查看详情
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 一键操作按钮 - 从插件 manifest 动态渲染 */}
        {quickActions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="contained"
                startIcon={action.icon === 'shopping-cart' ? <ShoppingCartIcon /> : <TrendingUpIcon />}
                sx={{ bgcolor: action.color || '#3498db', '&:hover': { bgcolor: action.color || '#2980b9' } }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {/* FloatingAgentChat 团队对话 */}
      {chatOpen && chatContext && (
        <FloatingAgentChat
          teamContext={chatContext}
          onClose={() => {
            setChatOpen(false);
            setChatContext(undefined);
          }}
        />
      )}

      {/* TeamConfigDialog 团队配置对话框 */}
      {configTeam && (
        <TeamConfigDialog
          open={!!configTeam}
          teamId={configTeam.id}
          teamName={configTeam.name}
          onClose={() => setConfigTeam(null)}
        />
      )}
    </Box>
  );
}
