import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Warning as WarningIcon } from '@mui/icons-material';
import { AgentMarketService, type MarketAgentItem } from '../../lib/agentMarketService';

interface PermissionConfirmDialogProps {
  agent: MarketAgentItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PermissionConfirmDialog({
  agent,
  open,
  onClose,
  onConfirm,
}: PermissionConfirmDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!agent) return null;

  const permissionLabels: Record<string, string> = {
    read_user: '读取用户信息',
    read_finance: '读取财务数据',
    write_finance: '写入财务数据',
    read_contacts: '读取联系人',
    send_message: '发送消息',
    show_notification: '显示通知',
    read_files: '读取文件',
    write_files: '写入文件',
  };

  const dangerousPermissions = ['write_finance', 'write_files'];
  const hasDangerousPerms = agent.permissions.some(p => dangerousPermissions.includes(p));

  async function handleConfirm() {
    if (!agent) return;
    setInstalling(true);
    setError(null);
    try {
      // 通过市场服务安装 Agent（调用实际 Tauri 命令）
      await AgentMarketService.installAgent(agent.id);
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装失败，请重试');
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">安装 {agent.name}</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          版本 {agent.version} · 作者：{agent.author}
          {agent.price > 0 && ` · 价格：¥${agent.price}/月`}
        </Typography>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          此 Agent 需要以下权限：
        </Typography>

        <List dense disablePadding>
          {agent.permissions.map(perm => {
            const isDangerous = dangerousPermissions.includes(perm);
            return (
              <ListItem key={perm} disablePadding sx={{ py: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isDangerous && <WarningIcon fontSize="small" color="error" />}
                  <Typography
                    variant="body2"
                    color={isDangerous ? 'error.main' : 'text.primary'}
                    fontWeight={isDangerous ? 600 : 400}
                  >
                    {permissionLabels[perm] || perm}
                  </Typography>
                  {isDangerous && (
                    <Typography variant="caption" color="error">
                      （高危权限）
                    </Typography>
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button variant="outlined" onClick={onClose} fullWidth disabled={installing}>
            取消
          </Button>
          <Button
            variant="contained"
            color={hasDangerousPerms ? 'warning' : 'primary'}
            onClick={handleConfirm}
            fullWidth
            disabled={installing}
            startIcon={installing ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {installing ? '正在安装...' : '确认安装'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
