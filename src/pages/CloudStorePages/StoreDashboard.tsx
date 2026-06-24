import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  OpenInNew as TokenIcon,
  Smartphone as PhonePreviewIcon,
  Science as DemoIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCloudStore, useInvalidateCloudStore, useStoreStats } from '../../lib/hooks/useCloudStore';
import { getStoreUrl, getTenantLoginUrl, DEMO_CLOUD_STORE_SUBDOMAIN, createDemoCloudStoreStub } from '../../lib/cloudStoreService';
import { safeNumber, safeFixed } from '../../lib/format';
import CloudStoreSetupWizard from './StoreSetupWizard';
import { DEMO_EMAIL, isDemoAccount } from '../../lib/aiTeamTokenService';
import { useAuthStore } from '../../lib/authStore';
import { isDemoResource } from '../../lib/demoFlag';
import { ensureDemoCloudStoreReady, resetDemoData } from '../../lib/demoBootstrap';
import StoreMobilePreviewDialog from '../../components/CloudPreview/StoreMobilePreviewDialog';

interface StoreDashboardProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreDashboard({
  loading: _parentLoading, setLoading, setError, setSuccessMessage,
}: StoreDashboardProps) {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const demoMode =
    authUser?.email === DEMO_EMAIL ||
    authUser?.id === 'mock-boss-001' ||
    isDemoAccount();
  const { data: store, isLoading: storeLoading, refetch: refetchStore } = useCloudStore();
  const effectiveStore = store ?? (demoMode ? createDemoCloudStoreStub() : null);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStoreStats(
    effectiveStore?.id,
    !!effectiveStore,
  );
  const invalidateCloudStore = useInvalidateCloudStore();
  const [storeFetchTimedOut, setStoreFetchTimedOut] = useState(false);
  const loading = demoMode ? false : (storeLoading && !storeFetchTimedOut) || statsLoading;
  const [openWizard, setOpenWizard] = useState(false);
  const [wizardSubdomain, setWizardSubdomain] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  // 手机预览 Dialog
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    if (demoMode || !storeLoading) {
      setStoreFetchTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setStoreFetchTimedOut(true), 3000);
    return () => window.clearTimeout(timer);
  }, [demoMode, storeLoading]);

  const loadData = () => {
    invalidateCloudStore();
    refetchStore();
    refetchStats();
  };

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  // 演示账号：后台修复本地 demo 商城（延迟执行，避免与首次 get_cloud_store 抢锁）
  useEffect(() => {
    if (!demoMode) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      await ensureDemoCloudStoreReady();
      if (!cancelled) {
        invalidateCloudStore();
        refetchStore();
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demoMode, invalidateCloudStore, refetchStore]);

  useEffect(() => {
    const refresh = () => {
      invalidateCloudStore();
      refetchStore();
      refetchStats();
    };
    window.addEventListener('proclaw:demo-bootstrapped', refresh);
    window.addEventListener('proclaw:cloud-store-changed', refresh);
    return () => {
      window.removeEventListener('proclaw:demo-bootstrapped', refresh);
      window.removeEventListener('proclaw:cloud-store-changed', refresh);
    };
  }, [invalidateCloudStore, refetchStore, refetchStats]);

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      await resetDemoData();
      setSuccessMessage('演示数据已重置，请稍候刷新页面查看效果。');
      setResetDialogOpen(false);
      // 刷新当前数据
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError('重置失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setResetting(false);
    }
  };

  // 处理开通商城
  const handleOpenSetupWizard = (subdomainValue: string) => {
    if (isDemoAccount()) {
      setMobilePreviewOpen(true);
      return;
    }
    console.log('[StoreDashboard] handleOpenSetupWizard called, subdomain:', subdomainValue);
    setWizardSubdomain(subdomainValue);
    setOpenWizard(true);
  };

  // 向导完成回调
  const handleWizardComplete = (_newStore: unknown) => {
    setOpenWizard(false);
    setSuccessMessage('商城开通成功！请同步商品到云端。');
    loadData();
  };

  // 向导取消回调
  const handleWizardCancel = () => {
    setOpenWizard(false);
    setWizardSubdomain('');
  };

  const handlePreviewStore = async () => {
    if (demoMode || effectiveStore) {
      setMobilePreviewOpen(true);
      return;
    }
    setError('请先开通云商城');
  };

  const demoStoreActive =
    demoMode &&
    !!effectiveStore &&
    (effectiveStore.subdomain === DEMO_CLOUD_STORE_SUBDOMAIN ||
      isDemoResource('cloudStore', effectiveStore.subdomain ?? ''));

  // 未开通（非演示账号）
  if (!effectiveStore && !demoMode) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          开通云托管商城，即可将商品同步到独立域名商城。
          采用 Token 计费模式（1 PT = ¥0.001），按实际用量付费。
        </Alert>

        {/* Token 计费说明 */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Token 按量计费</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            云商城已全面切换为 Token 按量计费模式，告别固定月费：
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="免费注册" size="small" color="success" /> <Typography variant="body2" component="span">注册即赠送 50,000 PT（≈¥50）</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="商品同步" size="small" /> <Typography variant="body2" component="span">50 PT/个</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="订单处理" size="small" /> <Typography variant="body2" component="span">10 PT/单</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="AI 主题" size="small" /> <Typography variant="body2" component="span">5,000 PT/次</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="子域名" size="small" color="info" /> <Typography variant="body2" component="span">永久免费</Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="text"
            endIcon={<TokenIcon />}
            onClick={() => navigate('/token-billing')}
          >
            查看完整定价
          </Button>
        </Paper>

        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          onClick={() => {
            console.log('[Button] clicked, loading:', loading, 'store:', store);
            // 生成默认 subdomain
            const defaultSubdomain = `store${Date.now().toString(36)}`;
            handleOpenSetupWizard(defaultSubdomain);
          }}
          disabled={loading}
        >
          立即开通
        </Button>

        {/* 开通向导 - 在未开通状态也需要渲染 */}
        <CloudStoreSetupWizard
          open={openWizard}
          subdomain={wizardSubdomain}
          storeName={wizardSubdomain || '我的商城'}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </Box>
    );
  }

  // 已开通 / 演示账号
  const activeStore = effectiveStore!;
  const storeUrl = getStoreUrl(activeStore);

  return (
    <Box>
      {demoMode && (
        <Alert
          severity="info"
          icon={<DemoIcon />}
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<PhonePreviewIcon />}
              onClick={() => setMobilePreviewOpen(true)}
            >
              预览演示商城
            </Button>
          }
        >
          演示账号已预置 <strong>proclaw.cc/shop/demo</strong>，无需「立即开通」，点击右侧按钮直接预览。
        </Alert>
      )}

      {/* 演示数据提示（仅演示账号下显示） */}
      {demoStoreActive && (
        <Alert
          severity="warning"
          icon={<DemoIcon />}
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="warning"
              startIcon={<ResetIcon />}
              onClick={() => setResetDialogOpen(true)}
            >
              重置演示数据
            </Button>
          }
        >
          当前为 <strong>演示账号</strong>，已预置演示商城（{getStoreUrl(activeStore).replace('https://', '')}），点击「手机预览」即可查看，无需手动开通。
        </Alert>
      )}

      {/* 状态栏 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: activeStore.status === 'active' ? 'success.50' : 'warning.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="h6">商城状态：</Typography>
              <Chip
                label={activeStore.status === 'active' ? '已开通' : activeStore.status === 'expired' ? '已过期' : '已停用'}
                color={activeStore.status === 'active' ? 'success' : 'error'}
              />
              <Chip label="Token 计费" variant="outlined" color="warning" />
              {demoStoreActive && (
                <Chip
                  label="🧪 演示数据"
                  color="warning"
                  size="small"
                  icon={<DemoIcon sx={{ fontSize: 16 }} />}
                />
              )}
            </Stack>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>{storeUrl}</Typography>
              <Button size="small" onClick={() => navigator.clipboard.writeText(storeUrl)}>复制</Button>
              <Button size="small" endIcon={<LaunchIcon />} onClick={() => window.open(storeUrl, '_blank')}>访问</Button>
              {demoStoreActive && (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => window.open(getTenantLoginUrl(true), '_blank')}
                >
                  管理云端后台
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                startIcon={<PreviewIcon />}
                onClick={handlePreviewStore}
                color="secondary"
              >
                手机预览
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<PhonePreviewIcon />}
                onClick={() => navigate('/shop/preview')}
                color="primary"
              >
                预览编辑器
              </Button>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>
            刷新
          </Button>
        </Box>
      </Paper>

      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: '访问量', value: safeNumber(stats.total_visits), unit: '次', color: '#6366f1' },
            { label: '订单数', value: safeNumber(stats.total_orders), unit: '单', color: '#10b981' },
            { label: '总收入', value: `¥${safeFixed(stats.total_revenue, 2)}`, unit: '', color: '#f59e0b' },
          ].map(item => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', minHeight: 120, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>{item.label}</Typography>
                <Typography variant="h4" component="span" sx={{ fontWeight: 700, color: item.color }} style={{ wordBreak: 'break-all' }}>
                  {item.value}
                </Typography>
                {item.unit && (
                  <Typography variant="body1" component="span" color="text.secondary" sx={{ ml: 0.5 }}>{item.unit}</Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 重置演示数据确认对话框 */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => !resetting && setResetDialogOpen(false)}
      >
        <DialogTitle>重置演示数据？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            将重置演示账号的所有预置数据（20 个产品 / 云商城 / 3 个 AI Team / 外贸柜台插件），然后重新注入。
            此操作不可撤销，请确认后继续。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} disabled={resetting}>取消</Button>
          <Button
            onClick={handleResetDemoData}
            color="warning"
            variant="contained"
            disabled={resetting}
            startIcon={resetting ? <CircularProgress size={16} /> : <ResetIcon />}
          >
            {resetting ? '重置中...' : '确认重置'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 手机模拟器预览 Dialog（proclaw.cc/shop/{subdomain}） */}
      <StoreMobilePreviewDialog
        open={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        subdomain={effectiveStore?.subdomain ?? DEMO_CLOUD_STORE_SUBDOMAIN}
      />

    </Box>
  );
}
