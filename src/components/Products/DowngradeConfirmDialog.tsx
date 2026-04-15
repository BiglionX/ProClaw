import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  LinearProgress,
} from '@mui/material';
import {
  WarningAmber,
  ArrowBack,
} from '@mui/icons-material';

interface DowngradeConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DowngradeConfirmDialog: React.FC<DowngradeConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmText, setConfirmText] = React.useState('');

  const CONFIRM_KEYWORD = 'CONFIRM';
  const isConfirmed = confirmText === CONFIRM_KEYWORD;

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || '降级失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmText('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        ⚠️ 返回简单商品库
      </DialogTitle>

      <DialogContent dividers>
        {/* 警告信息 */}
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            危险操作！此操作将导致以下数据丢失：
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>所有SPU（标准产品单位）数据</li>
            <li>所有SKU（库存量单位）数据</li>
            <li>所有商品图片关联</li>
            <li>多规格配置信息</li>
          </Typography>
        </Alert>

        {/* 保留的数据 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>保留的数据：</strong>原Product表中的商品基本信息不会被删除
          </Typography>
        </Alert>

        {/* 建议 */}
        <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            强烈建议：
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
            <li>在降级前备份数据库</li>
            <li>确认不再需要多规格管理功能</li>
            <li>了解降级后无法自动恢复SKU数据</li>
          </Typography>
        </Alert>

        {/* 二次确认输入框 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            请输入 <code>{CONFIRM_KEYWORD}</code> 以确认降级：
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="输入 CONFIRM"
            disabled={loading}
            error={confirmText.length > 0 && !isConfirmed}
            helperText={
              confirmText.length > 0 && !isConfirmed
                ? '输入不正确，请重新输入'
                : ''
            }
          />
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* 加载进度 */}
        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              正在降级，请稍候...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || !isConfirmed}
          variant="contained"
          color="error"
          startIcon={loading ? null : <ArrowBack />}
        >
          {loading ? '降级中...' : '确认降级'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
