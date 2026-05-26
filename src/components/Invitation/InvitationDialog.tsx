import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentCopy,
  QrCode2,
  Launch,
  Timer,
  CheckCircle,
} from '@mui/icons-material';
import {
  createInvitation,
  formatTimeRemaining,
  getInvitationTypeLabel,
} from '../../lib/invitationService';

interface InvitationDialogProps {
  open: boolean;
  onClose: () => void;
  invitationType: 'order_share' | 'price_update';
  businessRefId: string; // 订单号或商品ID
  targetPhone?: string;
  inviterId: string; // 当前用户 ID
  businessSummary?: string; // 业务摘要（用于展示）
}

export const InvitationDialog: React.FC<InvitationDialogProps> = ({
  open,
  onClose,
  invitationType,
  businessRefId,
  targetPhone,
  inviterId,
  businessSummary,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    invite_code: string;
    qr_data: string;
    expires_at: number;
  } | null>(null);



  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createInvitation({
        invitation_type: invitationType,
        business_ref_id: businessRefId,
        target_phone: targetPhone || undefined,
        inviter_id: inviterId,
      });
      setResult({
        invite_code: res.invite_code,
        qr_data: res.qr_data,
        expires_at: res.expires_at,
      });
    } catch (err: any) {
      setError(err.message || '创建邀请失败');
    } finally {
      setLoading(false);
    }
  };

  // 弹窗打开时自动创建邀请
  React.useEffect(() => {
    if (open && !result && !loading) {
      handleCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  const handleCopyLink = () => {
    if (!result) return;
    const link = result.qr_data;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
  };

  const handleCopyCode = () => {
    if (!result) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(result.invite_code);
    }
  };

  const timeRemaining = result ? formatTimeRemaining(result.expires_at) : '';
  const isExpired = result ? Date.now() > result.expires_at : false;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
        }}
      >
        <QrCode2 color="primary" />
        分享邀请
        <Chip
          label={getInvitationTypeLabel(invitationType)}
          size="small"
          color={invitationType === 'order_share' ? 'primary' : 'secondary'}
          sx={{ ml: 'auto' }}
        />
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2 }}>
        {/* 业务摘要 */}
        {businessSummary && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>关联业务：</strong>
              {businessSummary}
            </Typography>
          </Alert>
        )}

        {/* 加载中 */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              正在生成邀请...
            </Typography>
          </Box>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* 邀请结果展示 */}
        {result && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {/* 二维码区域 */}
            <Box
              sx={{
                width: 200,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fff',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              {/* 使用 QRCodeCanvas 或显示占位 */}
              <Box sx={{ textAlign: 'center' }}>
                <QrCode2 sx={{ fontSize: 120, color: 'primary.main', mb: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  扫码加入 ProClaw
                </Typography>
              </Box>

              {/* 已过期遮罩 */}
              {isExpired && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Typography color="#fff" fontWeight={600}>
                    已过期
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 邀请码 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                邀请码：
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              >
                {result.invite_code.slice(0, 8)}...
              </Typography>
              <Tooltip title="复制邀请码">
                <IconButton size="small" onClick={handleCopyCode}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* 分享链接 */}
            <TextField
              fullWidth
              size="small"
              label="分享链接"
              value={result.qr_data}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Tooltip title="复制链接">
                    <IconButton size="small" onClick={handleCopyLink}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ),
              }}
              sx={{ mt: 1 }}
            />

            {/* 过期倒计时 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Timer color="action" fontSize="small" />
              {isExpired ? (
                <Typography variant="body2" color="error">
                  邀请已过期
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  剩余时间：{timeRemaining}
                </Typography>
              )}
            </Box>

            {/* 目标手机号提示 */}
            {targetPhone && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 1, width: '100%', borderRadius: 2 }}>
                <Typography variant="body2">
                  仅限手机号 <strong>{targetPhone}</strong> 接受邀请
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          {result ? '关闭' : '取消'}
        </Button>
        {!result && !loading && (
          <Button onClick={handleCreate} variant="contained" startIcon={<Launch />}>
            重新生成
          </Button>
        )}
        {result && !isExpired && (
          <Button
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleCopyLink}
          >
            复制链接
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
