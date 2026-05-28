import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as GrantedIcon,
  RadioButtonUnchecked as NotGrantedIcon,
  Speed as SpeedIcon,
  SystemUpdateAlt as UpdateIcon,
} from '@mui/icons-material';
import type { AgentItem } from '../../lib/agentManagerStore';
import { AgentMarketService } from '../../lib/agentMarketService';
import { agentRuntime, type AgentPerformanceMetrics } from '../../lib/agentRuntime';

interface AgentDetailDialogProps {
  agent: AgentItem | null;
  open: boolean;
  onClose: () => void;
  /** 更新成功后刷新列表 */
  onUpdateSuccess?: () => void;
}

export default function AgentDetailDialog({ agent, open, onClose, onUpdateSuccess }: AgentDetailDialogProps) {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ latestVersion: string; marketAgent: { name: string; version: string; description?: string } } | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [performanceMetrics, setPerformanceMetrics] = useState<AgentPerformanceMetrics | null>(null);

  // 性能监控定时刷新
  useEffect(() => {
    if (!agent || !open) return;
    const updateMetrics = () => {
      setPerformanceMetrics(agentRuntime.getAgentPerformance(agent.id));
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, [agent, open]);

  if (!agent) return null;

  const allPermissions = agent.manifest.permissions || [];
  const grantedPermissions = agent.permissions_granted || [];

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    setUpdateAvailable(null);
    try {
      const marketId = agent.manifest.id || agent.id;
      const result = await AgentMarketService.checkAgentUpdate(marketId, agent.version);
      if (result) {
        setUpdateAvailable(result);
      } else {
        setUpdateError('当前已是最新版本');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '检查更新失败');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleStartUpdate = () => {
    setConfirmUpdateOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!updateAvailable) return;
    setUpdating(true);
    try {
      const newManifest = {
        ...agent.manifest,
        version: updateAvailable.latestVersion,
      };
      const marketId = agent.manifest.id || agent.id;
      await AgentMarketService.updateAgent(marketId, JSON.stringify(newManifest), updateAvailable.latestVersion);
      setConfirmUpdateOpen(false);
      setUpdateAvailable(null);
      setSnackbar({ open: true, message: `已更新至 v${updateAvailable.latestVersion}`, severity: 'success' });
      onUpdateSuccess?.();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '更新失败', severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">{agent.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              v{agent.version}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* 基本信息 */}
          {agent.manifest.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {agent.manifest.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            {agent.manifest.author && (
              <Box>
                <Typography variant="caption" color="text.disabled">作者</Typography>
                <Typography variant="body2">{agent.manifest.author}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.disabled">状态</Typography>
              <Typography variant="body2" color={agent.enabled ? 'success.main' : 'text.secondary'}>
                {agent.enabled ? '已启用' : '已禁用'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">类型</Typography>
              <Typography variant="body2">
                {agent.is_builtin ? '内置 Agent（不可卸载）' : '已安装 Agent'}
              </Typography>
            </Box>
          </Box>

          {/* 更新检查区域 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2">版本更新</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={checkingUpdate ? <CircularProgress size={14} /> : <UpdateIcon />}
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
              >
                {checkingUpdate ? '检查中...' : '检查更新'}
              </Button>
            </Box>

            {updateError && (
              <Alert severity={updateError === '当前已是最新版本' ? 'info' : 'warning'} sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
                {updateError}
              </Alert>
            )}

            {updateAvailable && (
              <Alert
                severity="success"
                action={
                  <Button size="small" color="inherit" onClick={handleStartUpdate}>
                    立即更新
                  </Button>
                }
                sx={{ '& .MuiAlert-message': { fontSize: '0.85rem' } }}
              >
                发现新版本 v{updateAvailable.latestVersion}
              </Alert>
            )}
          </Box>

          {/* 性能指标 */}
          {performanceMetrics && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <SpeedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">性能指标</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.disabled">启动耗时</Typography>
                  <Typography variant="body2">{performanceMetrics.startupTime.toFixed(0)} ms</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">消息频率</Typography>
                  <Typography variant="body2">{performanceMetrics.messageRate} 条/分钟</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">子资源数</Typography>
                  <Typography variant="body2">{performanceMetrics.resourceCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">总请求数</Typography>
                  <Typography variant="body2">{performanceMetrics.totalRequests}</Typography>
                </Box>
              </Box>
              {performanceMetrics.startupTime > 5000 && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, (performanceMetrics.startupTime / 10000) * 100)} 
                    color="warning" 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                  <Typography variant="caption" color="warning.main" sx={{ mt: 0.25, display: 'block' }}>
                    启动耗时较长（{'>'}5s），可能影响使用体验
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* 权限列表 */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            所需权限 ({allPermissions.length})
          </Typography>
          <List dense disablePadding>
            {allPermissions.map(perm => {
              const granted = grantedPermissions.includes(perm);
              return (
                <ListItem key={perm} disablePadding sx={{ py: 0.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: granted ? 'success.main' : 'text.disabled' }}>
                    {granted ? <GrantedIcon fontSize="small" /> : <NotGrantedIcon fontSize="small" />}
                    <Typography variant="body2">{perm}</Typography>
                  </Box>
                </ListItem>
              );
            })}
          </List>

          {/* 入口信息 */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
            技术信息
          </Typography>
          <Typography variant="body2" color="text.secondary">
            入口文件：{agent.manifest.entry}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Agent ID：{agent.id}
          </Typography>
        </DialogContent>
      </Dialog>

      {/* 确认更新弹窗 */}
      <Dialog open={confirmUpdateOpen} onClose={() => !updating && setConfirmUpdateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>确认更新</DialogTitle>
        <DialogContent>
          <DialogContentText>
            将 {agent.name} 从 v{agent.version} 更新至 v{updateAvailable?.latestVersion}？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateOpen(false)} disabled={updating}>取消</Button>
          <Button onClick={handleConfirmUpdate} variant="contained" disabled={updating} startIcon={updating ? <CircularProgress size={16} /> : <UpdateIcon />}>
            {updating ? '更新中...' : '确认更新'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 操作反馈 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
