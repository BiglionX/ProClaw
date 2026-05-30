import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cancel as RevokedIcon,
} from '@mui/icons-material';
import {
  getInvitations,
  revokeInvitation,
  formatTimeRemaining,
  getInvitationTypeLabel,
  getInvitationStatusLabel,
  InvitationData,
} from '../../lib/invitationService';

interface InvitationManagementPageProps {
  currentUserId: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '活跃' },
  { value: 'used', label: '已使用' },
  { value: 'expired', label: '已过期' },
  { value: 'revoked', label: '已撤销' },
];

const InvitationManagementPage: React.FC<InvitationManagementPageProps> = ({
  currentUserId,
}) => {
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // 撤销对话框
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokingCode, setRevokingCode] = useState<string>('');

  // 成功提示
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvitations(currentUserId, statusFilter || undefined);
      setInvitations(data);
    } catch (err: any) {
      setError(err.message || '加载邀请记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadInvitations();
    }
  }, [currentUserId, statusFilter]);

  const handleRevoke = (inviteCode: string) => {
    setRevokingCode(inviteCode);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    try {
      await revokeInvitation(revokingCode, currentUserId);
      setSuccessMsg('邀请已撤销');
      setRevokeDialogOpen(false);
      loadInvitations();
    } catch (err: any) {
      setError(err.message || '撤销失败');
    }
  };

  const getStatusChip = (status: string) => {
    const colorMap: Record<string, 'success' | 'primary' | 'default' | 'error' | 'warning'> = {
      active: 'primary',
      used: 'success',
      expired: 'default',
      revoked: 'error',
    };
    return (
      <Chip
        label={getInvitationStatusLabel(status)}
        color={colorMap[status] || 'default'}
        size="small"
      />
    );
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📧 邀请管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理外部伙伴邀请链接，查看邀请状态
        </Typography>
      </Box>

      {/* 操作栏 */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>状态筛选</InputLabel>
          <Select
            value={statusFilter}
            label="状态筛选"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadInvitations}
          disabled={loading}
        >
          刷新
        </Button>
      </Paper>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 邀请列表 */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">
            邀请记录 ({invitations.length})
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>邀请码</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>关联业务</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>过期时间</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {loading ? '加载中...' : '暂无邀请记录'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {inv.invite_code.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getInvitationTypeLabel(inv.invitation_type)}
                        size="small"
                        color={inv.invitation_type === 'order_share' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {inv.business_ref_id || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(inv.status)}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={Date.now() > inv.expires_at ? 'error' : 'text.secondary'}
                      >
                        {new Date(inv.expires_at).toLocaleString()}
                        {inv.status === 'active' && (
                          <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                            ({formatTimeRemaining(inv.expires_at)})
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(inv.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {inv.status === 'active' && (
                        <Tooltip title="撤销邀请">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRevoke(inv.invite_code)}
                          >
                            <RevokedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 撤销确认对话框 */}
      <Dialog
        open={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>确认撤销邀请</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要撤销该邀请码吗？撤销后，该邀请链接将失效。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>取消</Button>
          <Button onClick={confirmRevoke} variant="contained" color="error">
            确认撤销
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功提示 */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMsg(null)} severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InvitationManagementPage;
