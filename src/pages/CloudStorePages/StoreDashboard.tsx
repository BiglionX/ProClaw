import {
  Add as AddIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  OpenInNew as TokenIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCloudStore, createCloudStore, getStoreStats, CloudStore, StoreStats } from '../../lib/cloudStoreService';
import { isTauri } from '../../lib/tauri';

interface StoreDashboardProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreDashboard({
  loading, setLoading, setError, setSuccessMessage,
}: StoreDashboardProps) {
  const navigate = useNavigate();
  const [store, setStore] = useState<CloudStore | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const storeData = await getCloudStore();
      setStore(storeData);
      if (storeData) {
        const statsData = await getStoreStats(storeData.id);
        setStats(statsData);
      }
    } catch (err) {
      console.error('加载商城数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStore = async () => {
    if (!subdomain.trim()) {
      setError('请输入子域名');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      setError('子域名只能包含小写字母、数字和连字符');
      return;
    }
    try {
      setLoading(true);
      const newStore = await createCloudStore('free', subdomain.trim());
      setStore(newStore);
      setOpenDialog(false);
      setSuccessMessage('商城开通成功！');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '开通失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewStore = async () => {
    if (!store) {
      setError('请先开通云商城');
      return;
    }
    
    setPreviewLoading(true);
    try {
      const storeUrl = `https://${store.subdomain}.proclaw.cc`;
      
      if (isTauri()) {
        // 在 Tauri 环境中，使用 Tauri API 打开新窗口
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        new WebviewWindow(`store-preview-${Date.now()}`, {
          url: storeUrl,
          title: `预览商城 - ${store.subdomain}.proclaw.cc`,
          width: 1200,
          height: 800,
          center: true,
          decorations: true,
          visible: true,
        });
      } else {
        // 在浏览器环境中，直接打开新标签页
        window.open(storeUrl, '_blank');
      }
      
      setSuccessMessage('正在打开商城预览...');
    } catch (err) {
      setError(err instanceof Error ? err.message : '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 未开通状态 - 显示开通引导
  if (!store) {
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
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="免费注册" size="small" color="success" /> 注册即赠送 50,000 PT（≈¥50）
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="商品同步" size="small" /> 50 PT/个
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="订单处理" size="small" /> 10 PT/单
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="AI 主题" size="small" /> 5,000 PT/次
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="子域名" size="small" color="info" /> 永久免费
            </Typography>
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
          onClick={() => setOpenDialog(true)}
          disabled={loading}
        >
          立即开通
        </Button>

        {/* 开通对话框 */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>开通云托管商城</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                开通免费，按 Token 计费。新用户获赠 50,000 PT。
              </Alert>
              <TextField
                label="子域名"
                value={subdomain}
                onChange={e => setSubdomain(e.target.value.toLowerCase())}
                placeholder="mystore"
                helperText="将生成 https://mystore.proclaw.cc"
                fullWidth
                required
                InputProps={{
                  endAdornment: <Typography variant="body2" color="text.secondary">.proclaw.cc</Typography>,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>取消</Button>
            <Button onClick={handleCreateStore} variant="contained" disabled={loading}>
              {loading ? '开通中...' : '确认开通'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // 已开通状态 - 显示概览
  const storeUrl = `https://${store.subdomain}.proclaw.cc`;

  return (
    <Box>
      {/* 状态栏 */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: store.status === 'active' ? 'success.50' : 'warning.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6">商城状态：</Typography>
              <Chip
                label={store.status === 'active' ? '已开通' : store.status === 'expired' ? '已过期' : '已停用'}
                color={store.status === 'active' ? 'success' : 'error'}
              />
              <Chip label="Token 计费" variant="outlined" color="warning" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="primary.main" sx={{ fontWeight: 600 }}>{storeUrl}</Typography>
              <Button size="small" onClick={() => navigator.clipboard.writeText(storeUrl)}>复制</Button>
              <Button size="small" endIcon={<LaunchIcon />} onClick={() => window.open(storeUrl, '_blank')}>访问</Button>
              <Button 
                size="small" 
                variant="contained" 
                startIcon={previewLoading ? <CircularProgress size={16} /> : <PreviewIcon />} 
                onClick={handlePreviewStore}
                disabled={previewLoading}
                color="secondary"
              >
                预览商城
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
            { label: '访问量', value: stats.total_visits.toLocaleString(), unit: '次', color: '#6366f1' },
            { label: '订单数', value: stats.total_orders.toLocaleString(), unit: '单', color: '#10b981' },
            { label: '总收入', value: `¥${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, unit: '', color: '#f59e0b' },
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
    </Box>
  );
}
