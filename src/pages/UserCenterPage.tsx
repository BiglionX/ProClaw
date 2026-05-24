import {
  Bolt as BoltIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  CreditCard as CreditCardIcon,
  History as HistoryIcon,
  Percent as PercentIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
  WorkspacePremium as PremiumIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
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
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../lib/authStore';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel(p: TabPanelProps) {
  return p.value === p.index ? <Box sx={{ pt: 3 }}>{p.children}</Box> : null;
}

interface PlanData {
  id: string; plan_key: string; name: string; description: string | null;
  monthly_price: number; yearly_price: number;
  token_quota: number; max_devices: number; features: string;
  sort_order: number;
}
interface SubData {
  id: string; plan_key: string | null; plan_name: string | null;
  token_quota: number | null; status: string; billing_cycle: string;
  started_at: string; expires_at: string | null; auto_renew: boolean;
}
interface TokenSummary {
  plan_name: string; plan_key: string; token_quota: number;
  token_used: number; token_remaining: number;
  usage_percent: number; subscription_status: string;
}
interface UsageItem {
  id: string; tokens_consumed: number; action_type: string;
  resource_path: string; ip_address: string | null; created_at: string;
}
interface InvoiceItem {
  id: string; invoice_number: string; amount: number;
  status: string; payment_method: string;
  billing_period_start: string | null; billing_period_end: string | null;
  paid_at: string | null; created_at: string;
}

export default function UserCenterPage() {
  const user = useAuthStore(s => s.user);
  const userId = user?.id || 'mock-boss-001';
  const [tabValue, setTabValue] = useState(0);

  const [plans, setPlans] = useState<PlanData[]>([]);
  const [sub, setSub] = useState<SubData | null>(null);
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [snackbar, setSnackbar] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, summaryRes, usageRes, invoicesRes] = await Promise.all([
        invoke('get_plans_cmd').catch(_e => ({ data: [] })),
        invoke('get_my_subscription_cmd', { userId }).catch(_e => null),
        invoke('get_token_summary_cmd', { userId }).catch(_e => null),
        invoke('get_token_usage_cmd', { userId, limit: 20, offset: 0 }).catch(_e => ({ data: [] })),
        invoke('get_invoices_cmd', { userId }).catch(_e => ({ data: [] })),
      ]);
      const p = (plansRes as any)?.data || [];
      setPlans(p);
      setSub((subRes as any)?.data || null);
      setSummary((summaryRes as any)?.data || null);
      setUsageItems((usageRes as any)?.data || []);
      setInvoices((invoicesRes as any)?.data || []);
    } catch { /* demo fallback */ }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [userId]);

  const currentPlanKey = sub?.plan_key || summary?.plan_key || 'free';

  const handleSubscribe = async (planId: string) => {
    try {
      await invoke('subscribe_plan_cmd', { userId, planId, billingCycle: selectedBilling });
      setSnackbar('订阅成功！');
      setSubscribeOpen(false);
      loadAll();
    } catch (e: any) {
      setSnackbar(`订阅失败: ${e}`);
    }
  };

  const handleCancel = async () => {
    try {
      await invoke('cancel_subscription_cmd', { userId });
      setSnackbar('已取消订阅，当前周期结束后降级为免费版');
      loadAll();
    } catch (e: any) {
      setSnackbar(`取消失败: ${e}`);
    }
  };

  // ---------- Tab 0: 概览 ----------
  const renderOverview = () => (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">当前套餐</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <PremiumIcon color={currentPlanKey === 'free' ? 'disabled' : 'warning'} />
                <Typography variant="h5" fontWeight={700}>{summary?.plan_name || '免费版'}</Typography>
              </Box>
              {sub?.expires_at && (
                <Typography variant="caption" color="text.secondary">到期: {new Date(sub.expires_at).toLocaleDateString()}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Token 余额</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{summary?.token_remaining?.toLocaleString() ?? '--'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">本月已用</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{(summary?.token_used ?? 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">配额</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{(summary?.token_quota ?? 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 用量进度条 */}
      {summary && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle1">Token 用量</Typography>
              <Typography variant="body2" color={summary.usage_percent > 80 ? 'error' : 'text.secondary'}>
                {summary.token_used.toLocaleString()} / {summary.token_quota.toLocaleString()} ({summary.usage_percent.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(summary.usage_percent, 100)}
              color={summary.usage_percent > 80 ? 'error' : summary.usage_percent > 60 ? 'warning' : 'primary'}
              sx={{ height: 10, borderRadius: 5 }}
            />
            {summary.usage_percent > 80 && (
              <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
                配额即将用尽，建议升级套餐或等待下月重置
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 套餐卡片 */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>可选套餐</Typography>
      <Grid container spacing={2}>
        {plans.filter(p => p.plan_key !== currentPlanKey).map((plan, i) => {
          const features = (() => { try { return JSON.parse(plan.features); } catch { return []; } })();
          const delay = ['info', 'primary', 'secondary', 'success'][i % 4] as any;
          return (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card sx={{ position: 'relative', border: plan.plan_key === 'enterprise' ? 2 : 0, borderColor: 'warning.main' }}>
                {plan.plan_key === 'enterprise' && (
                  <Chip label="推荐" color="warning" size="small" sx={{ position: 'absolute', top: 10, right: 10 }} />
                )}
                <CardContent>
                  <Typography variant="h6">{plan.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{plan.description}</Typography>
                  <Box mt={2}>
                    <Typography variant="h4" component="span" fontWeight={700}>
                      ¥{selectedBilling === 'yearly' ? plan.yearly_price : plan.monthly_price}
                    </Typography>
                    <Typography variant="body2" component="span" color="text.secondary">/{selectedBilling === 'yearly' ? '年' : '月'}</Typography>
                  </Box>
                  <Box mt={1} display="flex" gap={1}>
                    <Chip size="small" label={`${plan.token_quota.toLocaleString()} Token/月`} icon={<BoltIcon />} />
                    <Chip size="small" label={`${plan.max_devices} 设备`} icon={<StorageIcon />} />
                  </Box>
                  <Box mt={2} display="flex" flexDirection="column" gap={0.5}>
                    {Array.isArray(features) && features.slice(0, 5).map((f: string) => (
                      <Typography key={f} variant="caption" color="text.secondary">
                        <CheckCircleIcon sx={{ fontSize: 12, mr: 0.5, color: 'success.main' }} />{f}
                      </Typography>
                    ))}
                  </Box>
                  <Button
                    fullWidth variant="contained" sx={{ mt: 2 }}
                    color={delay as any}
                    onClick={() => { setSubscribeOpen(true); }}
                  >
                    升级到 {plan.name}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </>
  );

  // ---------- Tab 1: Token 用量明细 ----------
  const renderUsage = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>时间</TableCell><TableCell>操作类型</TableCell><TableCell>消耗 Token</TableCell><TableCell>资源</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usageItems.length === 0 ? (
            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>暂无用量记录</TableCell></TableRow>
          ) : usageItems.map(item => (
            <TableRow key={item.id}>
              <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
              <TableCell><Chip size="small" label={item.action_type} /></TableCell>
              <TableCell>{item.tokens_consumed}</TableCell>
              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.resource_path || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ---------- Tab 2: 账单 ----------
  const renderBilling = () => (
    <Box>
      {sub && currentPlanKey !== 'free' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{sub.plan_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {sub.billing_cycle === 'yearly' ? '年付' : '月付'} · {sub.status === 'active' ? '活跃' : sub.status}
                </Typography>
                {sub.expires_at && <Typography variant="caption">到期: {new Date(sub.expires_at).toLocaleDateString()}</Typography>}
              </Box>
              <Button variant="outlined" color="error" onClick={handleCancel} startIcon={<CancelIcon />}>
                取消订阅
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>发票号</TableCell><TableCell>金额</TableCell><TableCell>状态</TableCell><TableCell>支付方式</TableCell><TableCell>日期</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>暂无账单</TableCell></TableRow>
            ) : invoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>{inv.invoice_number}</TableCell>
                <TableCell>¥{inv.amount.toFixed(2)}</TableCell>
                <TableCell><Chip size="small" label={inv.status} color={inv.status === 'paid' ? 'success' : 'default'} /></TableCell>
                <TableCell>{inv.payment_method}</TableCell>
                <TableCell>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>用户中心</Typography>
        <Button startIcon={<RefreshIcon />} onClick={loadAll} size="small">刷新</Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab icon={<PremiumIcon />} label="套餐" />
          <Tab icon={<HistoryIcon />} label="用量" />
          <Tab icon={<ReceiptIcon />} label="账单" />
        </Tabs>
      </Paper>

      <TabPanel index={0} value={tabValue}>{renderOverview()}</TabPanel>
      <TabPanel index={1} value={tabValue}>{renderUsage()}</TabPanel>
      <TabPanel index={2} value={tabValue}>{renderBilling()}</TabPanel>

      {/* 订阅确认弹窗 */}
      <Dialog open={subscribeOpen} onClose={() => setSubscribeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认升级套餐</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>选择计费周期：</Typography>
          <Box display="flex" gap={2}>
            <Button variant={selectedBilling === 'monthly' ? 'contained' : 'outlined'} onClick={() => setSelectedBilling('monthly')}>
              月付 (更灵活)
            </Button>
            <Button variant={selectedBilling === 'yearly' ? 'contained' : 'outlined'} onClick={() => setSelectedBilling('yearly')} startIcon={<PercentIcon />}>
              年付 (省 17%)
            </Button>
          </Box>
          {currentPlanKey !== 'free' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              升级后将立即切换套餐，当前套餐剩余天数将按比例折算
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscribeOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => handleSubscribe(plans.find(p => p.plan_key !== currentPlanKey)?.id || '')} startIcon={<CreditCardIcon />}>
            确认订阅 (模拟支付)
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
}
