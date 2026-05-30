import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  AlertTitle,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ChartIcon,
  Warning as WarningIcon,
  LocalOffer as TagIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getTokenBalance,
  getTokenPricing,
  getTokenUsage,
  getInvoices,
  getPlans,
  type TokenBalanceInfo,
  type TokenPricingRule,
  type TokenUsageEntry,
  type Invoice,
  type Plan,
} from '../../lib/subscriptionService';
import { useAuthStore } from '../../lib/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

/** 生成示例消耗趋势数据（实际应从 API 获取） */
function generateTrendData(days: number): { date: string; used: number }[] {
  const data: { date: string; used: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      used: Math.floor(Math.random() * 100) + 20,
    });
  }
  return data;
}

export default function TokenBillingPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [balance, setBalance] = useState<TokenBalanceInfo | null>(null);
  const [pricingRules, setPricingRules] = useState<TokenPricingRule[]>([]);
  const [usageEntries, setUsageEntries] = useState<TokenUsageEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getTokenBalance(userId).then(setBalance).catch(() => {}),
      getTokenPricing().then(setPricingRules).catch(() => {}),
      getTokenUsage(userId, 50, 0).then(setUsageEntries).catch(() => {}),
      getInvoices(userId).then(setInvoices).catch(() => {}),
      getPlans().then(setPlans).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [userId]);

  const trendData = generateTrendData(trendDays);

  const formatTokens = (val: number) => {
    if (val >= 1000000) return `${(val / 10000).toFixed(0)}万`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  if (!userId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">请先登录以查看 Token 计费信息</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#0ea5e9' }}>
        ☁️ Token 计费仪表盘
      </Typography>

      {/* ===== 余额概览卡片 ===== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', color: '#fbbf24' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WalletIcon />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>当前余额</Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {balance ? formatTokens(balance.balance) : '--'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              PT (ProClaw Token)
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', color: '#fb923c' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingDownIcon />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>今日消耗</Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {balance ? formatTokens(balance.today_used) : '--'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              预估可用 {balance?.estimated_days ?? '--'} 天
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', color: '#60a5fa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChartIcon />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>日均消耗</Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {balance ? formatTokens(balance.daily_avg_30d) : '--'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              近 30 天平均
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ===== 消耗趋势图 ===== */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>消耗趋势</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="7天"
              size="small"
              color={trendDays === 7 ? 'primary' : 'default'}
              onClick={() => setTrendDays(7)}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="30天"
              size="small"
              color={trendDays === 30 ? 'primary' : 'default'}
              onClick={() => setTrendDays(30)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#ccc' }}
              />
              <Line
                type="monotone"
                dataKey="used"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* ===== Tab 导航 ===== */}
      <Paper sx={{ px: 3, pt: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="消耗标准" icon={<TagIcon />} iconPosition="start" />
          <Tab label="充值套餐" icon={<WalletIcon />} iconPosition="start" />
          <Tab label="消费明细" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="购买记录" icon={<TrendingDownIcon />} iconPosition="start" />
        </Tabs>

        {/* 消耗标准 */}
        <TabPanel value={tabValue} index={0}>
          {pricingRules.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无消耗标准数据
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>操作</TableCell>
                    <TableCell align="right">消耗 (PT)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pricingRules.map((rule) => (
                    <TableRow key={rule.resource_type} hover>
                      <TableCell>
                        {rule.action_name}
                        {rule.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({rule.description})
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={`${rule.pt_cost} PT`} size="small" color="warning" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* 充值套餐 */}
        <TabPanel value={tabValue} index={1}>
          {plans.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无可用套餐
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {plans.map((plan) => (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>{plan.name}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#0ea5e9', mb: 1 }}>
                        ¥{plan.monthly_price.toFixed(0)}
                        <Typography component="span" variant="body2" color="text.secondary"> /月</Typography>
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <TagIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                        Token 配额: {plan.token_quota.toLocaleString()} PT
                      </Typography>
                      {plan.description && (
                        <Typography variant="body2" color="text.secondary">
                          {plan.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button fullWidth variant="outlined" color="primary">
                        选择套餐
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* 消费明细 */}
        <TabPanel value={tabValue} index={2}>
          {usageEntries.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无消费记录
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>操作类型</TableCell>
                    <TableCell align="right">消耗</TableCell>
                    <TableCell align="right">时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{entry.action_type}</TableCell>
                      <TableCell align="right">
                        <Typography color="error.main">-{entry.tokens_consumed} PT</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {new Date(entry.created_at).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* 购买记录 */}
        <TabPanel value={tabValue} index={3}>
          {invoices.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无购买记录
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>账单号</TableCell>
                    <TableCell align="right">金额</TableCell>
                    <TableCell align="right">状态</TableCell>
                    <TableCell align="right">时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                          {inv.invoice_number}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">¥{inv.amount.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={inv.status === 'paid' ? '已完成' : inv.status === 'pending' ? '处理中' : '失败'}
                          size="small"
                          color={inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {new Date(inv.created_at).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* ===== 预警设置通知 ===== */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<WarningIcon />}>
        <AlertTitle>预警设置</AlertTitle>
        当余额低于 500 PT 时将触发通知提醒。可在 <strong>设置 - 通知偏好</strong> 中调整阈值。
      </Alert>
    </Box>
  );
}
