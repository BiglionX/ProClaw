import {
  AccountCircle as ProfileIcon,
  Security as SecurityIcon,
  Smartphone as DevicesIcon,
  Android as AndroidIcon,
  WorkspacePremium as SubscriptionIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  VisibilityOff as ViewOffIcon,
  CheckCircle as CheckIcon,
  Circle as CircleIcon,
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Bolt as BoltIcon,
  Warning as WarningIcon,
  CreditCard as CreditCardIcon,
  Percent as PercentIcon,
  Storage as StorageIcon,
  Logout as LogoutIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Avatar,
  Button,
  TextField,
  Paper,
  Tabs,
  Tab,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ipcInvoke as invoke } from '../lib/tauri';
import { useAuthStore } from '../lib/authStore';
import {
  useInvalidateUserCenter,
  useSubscriptionBundle,
  useUserDevices,
  useUserProfile,
} from '../lib/hooks/useUserCenter';
import type {
  Device,
  PlanData,
} from '../lib/userCenterService';

// ========================== Types ==========================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(p: TabPanelProps) {
  return p.value === p.index ? <Box sx={{ pt: 3 }}>{p.children}</Box> : null;
}

// ========================== Main Component ==========================

export default function UserCenterPage() {
  const storeUser = useAuthStore(s => s.user);
  const userId = storeUser?.id || 'mock-boss-001';

  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState('');

  const profileFallback = {
    email: storeUser?.email,
    created_at: storeUser?.created_at,
  };
  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useUserProfile(userId, profileFallback);
  const {
    data: devices = [],
    refetch: refetchDevices,
  } = useUserDevices(userId);
  const {
    data: subscriptionBundle,
    refetch: refetchSubscription,
  } = useSubscriptionBundle(userId);
  const invalidateUserCenter = useInvalidateUserCenter();
  const loading = profileLoading;

  const plans = subscriptionBundle?.plans ?? [];
  const sub = subscriptionBundle?.sub ?? null;
  const summary = subscriptionBundle?.summary ?? null;
  const usageItems = subscriptionBundle?.usageItems ?? [];
  const invoices = subscriptionBundle?.invoices ?? [];

  // ---- Profile ----
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ---- Security ----
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // ---- Devices ----
  const [pairingCode, setPairingCode] = useState('123456');
  const [pairingExpires, setPairingExpires] = useState(Date.now() / 1000 + 300);
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);

  // ---- Subscription ----
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [subscribeTarget, setSubscribeTarget] = useState<PlanData | null>(null);

  useEffect(() => {
    if (!profile) return;
    setEditName(profile.name || '');
    setEditPhone(profile.phone || '');
    setEditEmail(profile.email || storeUser?.email || '');
  }, [profile, storeUser?.email]);

  const refreshUserCenter = () => {
    invalidateUserCenter();
    refetchProfile();
    refetchDevices();
    refetchSubscription();
  };

  // ========================== Actions ==========================

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await invoke('update_user_cmd', { id: userId, name: editName, phone: editPhone || null, email: editEmail || null });
      setSnackbar('个人资料已更新');
      setEditing(false);
      refetchProfile();
    } catch (e: any) {
      setSnackbar(`保存失败: ${e}`);
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!oldPwd) { setSnackbar('请输入当前密码'); return; }
    if (!newPwd) { setSnackbar('请输入新密码'); return; }
    if (newPwd.length < 6) { setSnackbar('新密码至少 6 位'); return; }
    if (newPwd !== confirmPwd) { setSnackbar('两次密码不一致'); return; }
    setChangingPwd(true);
    try {
      await invoke('change_user_password_cmd', { userId, newPassword: newPwd });
      setSnackbar('密码修改成功');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      setSnackbar(`修改失败: ${e}`);
    }
    setChangingPwd(false);
  };

  const handleGeneratePairingCode = async () => {
    setPairingLoading(true);
    try {
      const res = await invoke<any>('get_pairing_code_cmd', { userId });
      if (res?.pairing_code) {
        setPairingCode(res.pairing_code);
        setPairingExpires(res.expires_at);
        setSnackbar('配对码已生成');
      }
    } catch {
      setSnackbar('生成配对码失败');
    }
    setPairingLoading(false);
  };

  const handleRevokeDevice = async () => {
    if (!revokeTarget) return;
    try {
      await invoke('revoke_device_cmd', { deviceId: revokeTarget.id, userId }).catch(() => {});
      setSnackbar(`已踢除设备: ${revokeTarget.device_name}`);
      setRevokeOpen(false);
      refetchDevices();
    } catch (e: any) {
      setSnackbar(`踢除失败: ${e}`);
    }
  };

  const handleSubscribe = async () => {
    if (!subscribeTarget) return;
    try {
      await invoke('subscribe_plan_cmd', { userId, planId: subscribeTarget.id, billingCycle: selectedBilling });
      setSnackbar('订阅成功！');
      setSubscribeOpen(false);
      refetchSubscription();
    } catch (e: any) {
      setSnackbar(`订阅失败: ${e}`);
    }
  };

  const handleCancelSub = async () => {
    try {
      await invoke('cancel_subscription_cmd', { userId });
      setSnackbar('已取消订阅');
      refetchSubscription();
    } catch (e: any) {
      setSnackbar(`取消失败: ${e}`);
    }
  };

  const currentPlanKey = sub?.plan_key || summary?.plan_key || 'free';

  const isDeviceOnline = (d: Device) => d.last_active_at ? (Date.now() - d.last_active_at * 1000) < 5 * 60 * 1000 : false;

  const remainingTime = () => {
    const r = Math.max(0, pairingExpires - Date.now() / 1000);
    return `${Math.floor(r / 60)}:${String(Math.floor(r % 60)).padStart(2, '0')}`;
  };

  // ========================== Render: Header ==========================

  const renderHeader = () => (
    <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 3, bgcolor: '#1e1e1e', color: '#fff' }}>
      <Avatar sx={{ width: 72, height: 72, bgcolor: profile?.role === 'admin' ? '#ff3b30' : '#6366f1', fontSize: 28 }}>
        {(editName || profile?.name || 'U').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" fontWeight={700}>{profile?.name || '用户'}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>{profile?.email}</Typography>
          <Chip size="small" label={profile?.role === 'admin' ? '管理员' : profile?.role || '用户'} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem' }} />
          <Chip size="small" label={profile?.user_type === 'internal' ? '内部用户' : '外部用户'} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }} />
        </Box>
        {profile?.created_at && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5, display: 'block' }}>
            注册时间: {new Date(profile.created_at).toLocaleDateString('zh-CN')}
          </Typography>
        )}
      </Box>
    </Paper>
  );

  // ========================== Render: Tab 0 - Profile ==========================

  const renderProfile = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">个人资料</Typography>
          {!editing ? (
            <Button startIcon={<EditIcon />} onClick={() => setEditing(true)} size="small">编辑</Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<CancelIcon />} onClick={() => {
                setEditing(false);
                if (profile) {
                  setEditName(profile.name || '');
                  setEditPhone(profile.phone || '');
                  setEditEmail(profile.email || storeUser?.email || '');
                }
              }} size="small" color="inherit">取消</Button>
              <Button startIcon={<SaveIcon />} onClick={handleSaveProfile} size="small" variant="contained" disabled={savingProfile}>
                {savingProfile ? '保存中...' : '保存'}
              </Button>
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="姓名" value={editing ? editName : (profile?.name || '')}
              onChange={e => setEditName(e.target.value)} disabled={!editing} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="手机号" value={editing ? editPhone : (profile?.phone || '')}
              onChange={e => setEditPhone(e.target.value)} disabled={!editing} size="small" placeholder="未设置" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="邮箱" value={editing ? editEmail : (profile?.email || '')}
              onChange={e => setEditEmail(e.target.value)} disabled={!editing} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="用户角色" value={profile?.role || ''} disabled size="small" />
          </Grid>
        </Grid>

        {/* 权限展示 */}
        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>权限列表</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {profile?.permissions?.length ? profile.permissions.map((p, i) => (
            <Chip key={i} size="small" icon={<CheckIcon sx={{ fontSize: 14 }} />} label={p} color={p === '*' ? 'warning' : 'default'} variant="outlined" />
          )) : (
            <Typography variant="body2" color="text.secondary">所有权限</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // ========================== Render: Tab 1 - Security ==========================

  const renderSecurity = () => (
    <Box>
      {/* 修改密码 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>修改密码</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="当前密码" type={showOldPwd ? 'text' : 'password'} value={oldPwd}
                onChange={e => setOldPwd(e.target.value)} size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowOldPwd(!showOldPwd)} edge="end">
                      {showOldPwd ? <ViewOffIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>,
                }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="新密码" type={showNewPwd ? 'text' : 'password'} value={newPwd}
                onChange={e => setNewPwd(e.target.value)} size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowNewPwd(!showNewPwd)} edge="end">
                      {showNewPwd ? <ViewOffIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>,
                }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="确认新密码" type="password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)} size="small" />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleChangePassword} disabled={changingPwd || !oldPwd || !newPwd || !confirmPwd}>
              {changingPwd ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              修改密码
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 登录日志（占位） */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>登录日志</Typography>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info">登录日志功能将在后续版本中完善（需新增 login_logs 表）</Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>设备类型</TableCell>
                  <TableCell>IP 地址</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    暂无登录记录
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // ========================== Render: Tab 2 - Devices ==========================

  const renderDevices = () => (
    <Box>
      {/* 配对码区域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">设备配对</Typography>
            <Button startIcon={<RefreshIcon />} onClick={handleGeneratePairingCode} size="small" disabled={pairingLoading}>
              {pairingLoading ? <CircularProgress size={16} /> : '刷新配对码'}
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* 二维码 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2, minWidth: 180 }}>
              <Box sx={{ width: 140, height: 140, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, mb: 1 }}>
                <QrCodeIcon sx={{ fontSize: 120, color: '#000' }} />
              </Box>
              <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: 3, fontWeight: 700, color: '#333' }}>
                {pairingCode}
              </Typography>
              <Chip size="small" label={`剩余 ${remainingTime()}`} sx={{ mt: 1 }} color={(pairingExpires - Date.now() / 1000) > 60 ? 'primary' : 'error'} />
            </Box>
            {/* 说明 */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                在移动端设备上打开 ProClaw App，扫描二维码或输入配对码即可连接。
              </Typography>
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                确保移动端和桌面端在同一局域网内。配对码 5 分钟有效。
              </Alert>
              <Alert severity="success" sx={{ fontSize: '0.8rem', mt: 2 }} icon={<AndroidIcon />}>
                还没有安装 App？{'\u00A0'}
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  component="a"
                  href="https://proclaw.cc/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                >
                  下载 ProClaw 移动端 App
                </Button>
              </Alert>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 已授权设备列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>已授权设备</Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>设备名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>最后活跃</TableCell>
                  <TableCell>授权时间</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无已授权设备</TableCell></TableRow>
                ) : devices.filter(d => !d.is_revoked).map(d => (
                  <TableRow key={d.id}>
                    <TableCell><Typography fontWeight={500}>{d.device_name}</Typography></TableCell>
                    <TableCell><Chip size="small" label={d.device_type === 'mobile' ? '移动端' : '桌面端'} color={d.device_type === 'mobile' ? 'primary' : 'default'} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircleIcon sx={{ fontSize: 10, color: isDeviceOnline(d) ? '#10b981' : '#ef4444' }} />
                        {isDeviceOnline(d) ? '在线' : '离线'}
                      </Box>
                    </TableCell>
                    <TableCell>{d.last_active_at ? new Date(d.last_active_at * 1000).toLocaleString('zh-CN') : '-'}</TableCell>
                    <TableCell>{d.created_at}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="踢除设备">
                        <IconButton size="small" color="error" onClick={() => { setRevokeTarget(d); setRevokeOpen(true); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 踢除确认弹窗 */}
      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)}>
        <DialogTitle>确认踢除设备</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要踢除设备「{revokeTarget?.device_name}」吗？踢除后需要重新配对。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeOpen(false)}>取消</Button>
          <Button onClick={handleRevokeDevice} variant="contained" color="error">确认踢除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // ========================== Render: Tab 3 - Subscription ==========================

  const renderSubscription = () => {
    const currentSub = sub || summary;

    return (
      <Box>
        {/* 概览卡片 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">当前套餐</Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <SubscriptionIcon color={currentPlanKey === 'free' ? 'disabled' : 'warning'} />
                <Typography variant="h5" fontWeight={700}>{currentSub?.plan_name || '免费版'}</Typography>
              </Box>
              {sub?.expires_at && <Typography variant="caption" color="text.secondary">到期: {new Date(sub.expires_at).toLocaleDateString()}</Typography>}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">Token 余额</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{summary?.token_remaining?.toLocaleString() ?? '--'}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">本月已用</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{(summary?.token_used ?? 0).toLocaleString()}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card><CardContent>
              <Typography variant="body2" color="text.secondary">配额</Typography>
              <Typography variant="h4" fontWeight={700} mt={1}>{(summary?.token_quota ?? 0).toLocaleString()}</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>

        {/* 用量进度条 */}
        {summary && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle1">Token 用量</Typography>
                <Typography variant="body2" color={summary.usage_percent > 80 ? 'error' : 'text.secondary'}>
                  {summary.token_used.toLocaleString()} / {summary.token_quota.toLocaleString()} ({summary.usage_percent.toFixed(1)}%)
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(summary.usage_percent, 100)}
                color={summary.usage_percent > 80 ? 'error' : summary.usage_percent > 60 ? 'warning' : 'primary'}
                sx={{ height: 10, borderRadius: 5 }} />
              {summary.usage_percent > 80 && (
                <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>配额即将用尽，建议升级套餐</Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* 当前订阅状态 */}
        {sub && currentPlanKey !== 'free' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{sub.plan_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sub.billing_cycle === 'yearly' ? '年付' : '月付'} · {sub.status === 'active' ? '活跃' : sub.status}
                  </Typography>
                  {sub.expires_at && <Typography variant="caption" color="text.secondary">到期: {new Date(sub.expires_at).toLocaleDateString()}</Typography>}
                </Box>
                <Button variant="outlined" color="error" onClick={handleCancelSub} startIcon={<LogoutIcon />}>取消订阅</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 可选套餐 */}
        <Typography variant="h6" sx={{ mb: 2 }}>可选套餐</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {plans.filter(p => p.plan_key !== currentPlanKey).map((plan, i) => {
            const features = (() => { try { return JSON.parse(plan.features); } catch { return []; } })();
            const colors = ['info', 'primary', 'secondary', 'success'] as const;
            return (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card sx={{ position: 'relative', border: plan.plan_key === 'enterprise' ? 2 : 0, borderColor: 'warning.main', height: '100%' }}>
                  {plan.plan_key === 'enterprise' && <Chip label="推荐" color="warning" size="small" sx={{ position: 'absolute', top: 10, right: 10 }} />}
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
                          <CheckIcon sx={{ fontSize: 12, mr: 0.5, color: 'success.main' }} />{f}
                        </Typography>
                      ))}
                    </Box>
                    <Button fullWidth variant="contained" sx={{ mt: 2 }} color={colors[i % 4]}
                      onClick={() => { setSubscribeTarget(plan); setSubscribeOpen(true); }}>
                      升级到 {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* 用量明细 */}
        <Typography variant="h6" sx={{ mb: 2 }}>用量明细</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>时间</TableCell><TableCell>操作类型</TableCell><TableCell>消耗 Token</TableCell><TableCell>资源</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usageItems.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>暂无用量记录</TableCell></TableRow>
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

        {/* 账单 */}
        <Typography variant="h6" sx={{ mb: 2 }}>账单记录</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>发票号</TableCell><TableCell>金额</TableCell><TableCell>状态</TableCell><TableCell>支付方式</TableCell><TableCell>日期</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>暂无账单</TableCell></TableRow>
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

        {/* 订阅确认弹窗 */}
        <Dialog open={subscribeOpen} onClose={() => setSubscribeOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>确认升级套餐</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>选择计费周期：</Typography>
            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              <Button variant={selectedBilling === 'monthly' ? 'contained' : 'outlined'} onClick={() => setSelectedBilling('monthly')}>月付（更灵活）</Button>
              <Button variant={selectedBilling === 'yearly' ? 'contained' : 'outlined'} onClick={() => setSelectedBilling('yearly')} startIcon={<PercentIcon />}>年付（省 17%）</Button>
            </Box>
            {currentPlanKey !== 'free' && <Alert severity="info">升级后将立即切换套餐，当前套餐剩余天数将按比例折算</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubscribeOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleSubscribe} startIcon={<CreditCardIcon />}>确认订阅（模拟支付）</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  // ========================== Main Render ==========================

  if (loading) return <Box textAlign="center" py={8}><CircularProgress /></Box>;

  return (
    <Box>
      {/* 页面标题 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>用户中心</Typography>
        <Button startIcon={<RefreshIcon />} onClick={refreshUserCenter} size="small">刷新</Button>
      </Box>

      {renderHeader()}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab icon={<ProfileIcon />} label="个人资料" />
          <Tab icon={<SecurityIcon />} label="账号安全" />
          <Tab icon={<DevicesIcon />} label="设备管理" />
          <Tab icon={<SubscriptionIcon />} label="套餐订阅" />
        </Tabs>
      </Paper>

      <TabPanel index={0} value={tabValue}>{renderProfile()}</TabPanel>
      <TabPanel index={1} value={tabValue}>{renderSecurity()}</TabPanel>
      <TabPanel index={2} value={tabValue}>{renderDevices()}</TabPanel>
      <TabPanel index={3} value={tabValue}>{renderSubscription()}</TabPanel>

      {/* 全局 Snackbar */}
      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
}
