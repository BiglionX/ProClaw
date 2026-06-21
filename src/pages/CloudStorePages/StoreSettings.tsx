import {
  VpnKey as ApiKeyIcon,
  Language as DomainIcon,
  Payment as PaymentIcon,
  ContentCopy as CopyIcon,
  CheckCircle as SslIcon,
  OpenInNew as TokenIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateCloudStore, resetApiKey } from '../../lib/cloudStoreService';
import { useCloudStore, useInvalidateCloudStore } from '../../lib/hooks/useCloudStore';

interface StoreSettingsProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StoreSettings({
  loading: _parentLoading, setLoading, setError, setSuccessMessage,
}: StoreSettingsProps) {
  const navigate = useNavigate();
  const { data: store, isLoading, refetch } = useCloudStore();
  const invalidateCloudStore = useInvalidateCloudStore();
  const [customDomain, setCustomDomain] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  const loadStore = () => {
    invalidateCloudStore();
    refetch();
  };

  const handleResetApiKey = async () => {
    if (!store) return;
    try {
      setSaving(true);
      await resetApiKey(store.id);
      loadStore();
      setSuccessMessage('API Key 已重置！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!store) return;
    if (!customDomain.trim()) {
      setError('请输入自定义域名');
      return;
    }
    
    try {
      setSaving(true);
      await updateCloudStore(store.id, { custom_domain: customDomain.trim() });
      loadStore();
      setSuccessMessage(`自定义域名 ${customDomain} 已绑定！SSL 证书正在自动申请中...`);
      setCustomDomain('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!store) {
    return (
      <Alert severity="warning">
        请先在「商城概览」中开通云商城。
      </Alert>
    );
  }

  const maskedApiKey = store.api_key
    ? `${store.api_key.slice(0, 8)}${'*'.repeat(Math.max(0, store.api_key.length - 8))}`
    : '';

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        配置商城域名、支付方式和 API 密钥。
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 域名设置 */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DomainIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">域名设置</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>默认子域名</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`${store.subdomain}.proclaw.cc`} color="primary" />
                <Chip icon={<SslIcon sx={{ fontSize: 16 }} />} label="SSL 已启用" size="small" color="success" variant="outlined" />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>自定义域名</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  placeholder="shop.yourdomain.com"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  size="small"
                  helperText="请先将域名 CNAME 指向 ${store.subdomain}.proclaw.cc"
                  sx={{ minWidth: 320 }}
                />
                <Button variant="contained" onClick={handleSaveDomain} disabled={!customDomain.trim() || saving}>
                  绑定
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* 支付配置 */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PaymentIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">支付配置</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Alert severity="warning" sx={{ mb: 2 }}>
            支付功能开发中，配置后将自动接收订单付款。
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="微信支付 - 商户号 (MCHID)" fullWidth size="small" disabled />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="微信支付 - API 密钥" type="password" fullWidth size="small" disabled />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="支付宝 - APPID" fullWidth size="small" disabled />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="支付宝 - 应用私钥" type="password" fullWidth size="small" disabled />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" disabled>保存支付配置（开发中）</Button>
          </Box>
        </Paper>

        {/* API 密钥 */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ApiKeyIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">API 密钥</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            API 密钥用于云端商城与桌面端之间的数据同步鉴权，请勿泄露。
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TextField
              label="当前 API Key"
              value={apiKeyVisible ? store.api_key : maskedApiKey}
              InputProps={{ readOnly: true }}
              size="small"
              sx={{ minWidth: 400 }}
            />
            <Button size="small" onClick={() => setApiKeyVisible(!apiKeyVisible)}>
              {apiKeyVisible ? '隐藏' : '显示'}
            </Button>
            <Button size="small" startIcon={<CopyIcon />} onClick={() => navigator.clipboard.writeText(store.api_key)}>
              复制
            </Button>
            <Button size="small" color="warning" onClick={handleResetApiKey} disabled={saving}>
              重置
            </Button>
          </Box>
        </Paper>

        {/* Token 计费信息 */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TokenIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="h6">Token 计费</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Alert severity="success" sx={{ mb: 2 }}>
            云商城已全面切换为 Token 按量计费模式，告别固定月费。
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>计费标准：</strong>1 PT = ¥0.001，按实际用量付费。
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="商品同步" size="small" /> 50 PT/个
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="订单处理" size="small" /> 10 PT/单
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="AI 主题生成" size="small" /> 5,000 PT/次
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="自定义域名" size="small" /> 2,000 PT/月
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="实时同步保活" size="small" /> 500 PT/天
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="warning"
            endIcon={<TokenIcon />}
            onClick={() => navigate('/token-billing')}
          >
            前往 Token 计费页面
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
