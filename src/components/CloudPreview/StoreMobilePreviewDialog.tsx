/**
 * 云商城手机预览 Dialog
 *
 * 用途：在桌面端弹出手机模拟器（iPhone 风格外框），iframe 内加载真实云商城 URL
 * 设计：参照 StorePreviewEditor 内的 PhoneSimulator，但内容改为 iframe
 *
 * 关键点：
 * - 使用真实域名 getStoreUrl(store)（proclaw.cc/shop/{subdomain}）
 * - iframe 加载 H5 商城，模拟用户用手机访问
 * - 顶部地址栏显示当前 URL（含复制 + 新窗口打开）
 * - 检测 iframe 加载失败时降级提示
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Smartphone as PhoneIcon,
} from '@mui/icons-material';
import PhoneSimulator from './PhoneSimulator';
import { getStoreUrl, DEMO_CLOUD_STORE_SUBDOMAIN, type CloudStore } from '../../lib/cloudStoreService';
import LocalMobilePreviewContent from './LocalMobilePreviewContent';

interface StoreMobilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  /** 商城子域（不含 .proclaw.cc） */
  subdomain: string;
}

export default function StoreMobilePreviewDialog({
  open,
  onClose,
  subdomain,
}: StoreMobilePreviewDialogProps) {
  // 使用 getStoreUrl：proclaw.cc/shop/{subdomain}
  const storeUrl = getStoreUrl({
    id: 'preview',
    user_id: '',
    subdomain,
    api_key: '',
    status: 'active',
    plan_type: 'free',
    created_at: new Date().toISOString(),
  } as CloudStore);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const useLocalPreview = subdomain === DEMO_CLOUD_STORE_SUBDOMAIN;

  // 每次打开对话框时重置状态
  useEffect(() => {
    if (open) {
      setIframeLoading(true);
      setIframeError(false);
      setReloadKey(k => k + 1);
    }
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl).catch(() => {
      /* ignore */
    });
  };

  const handleOpenInBrowser = () => {
    window.open(storeUrl, '_blank');
  };

  const handleReload = () => {
    setIframeLoading(true);
    setIframeError(false);
    setReloadKey(k => k + 1);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <PhoneIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            手机预览 · {subdomain}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {storeUrl}
          </Typography>
        </Box>
        <Tooltip title="复制 URL">
          <IconButton size="small" onClick={handleCopy}>
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="浏览器中打开">
          <IconButton size="small" onClick={handleOpenInBrowser}>
            <OpenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="刷新">
          <IconButton size="small" onClick={handleReload}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          bgcolor: '#f5f5f7',
          minHeight: 640,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {iframeError ? (
          <Box sx={{ maxWidth: 480, width: '100%' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              无法在 iframe 中加载 {storeUrl}。常见原因：X-Frame-Options 限制或网络不可达。
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              演示账号可尝试：
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: 'text.secondary', fontSize: 14 }}>
              <li>点击右上角「浏览器中打开」访问 {storeUrl.replace('https://', '')}</li>
              <li>或前往「云商城 → 预览编辑」查看本地 20 个演示商品</li>
              <li>演示商城地址：<strong>https://proclaw.cc/shop/demo</strong></li>
            </Box>
            <Button
              variant="outlined"
              startIcon={<OpenIcon />}
              onClick={handleOpenInBrowser}
              sx={{ mt: 2, mr: 1 }}
            >
              浏览器中打开
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhoneIcon />}
              onClick={handleReload}
              sx={{ mt: 2 }}
            >
              重试
            </Button>
          </Box>
        ) : useLocalPreview ? (
          <PhoneSimulator url={storeUrl} scale={0.85}>
            <LocalMobilePreviewContent />
          </PhoneSimulator>
        ) : (
          <PhoneSimulator url={storeUrl} scale={0.85}>
            <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'white' }}>
              {iframeLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'white',
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={32} />
                  <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                    正在加载 {storeUrl.replace('https://', '')}...
                  </Typography>
                </Box>
              )}
              <iframe
                key={reloadKey}
                src={storeUrl}
                title={`Preview: ${subdomain}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeLoading(false);
                  setIframeError(true);
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </Box>
          </PhoneSimulator>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {useLocalPreview
            ? '演示账号使用本地 20 个商品渲染预览；线上地址可在浏览器中打开。'
            : '模拟 H5 商城在手机端访问的效果。如需编辑主题/商品，请使用「预览编辑」标签。'}
        </Typography>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
