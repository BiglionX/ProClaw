import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Storage as StorageIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import {
  getBackupHistory,
  getBackupStatus,
  getBackupConfig,
  triggerBackup,
  setAutoBackupSchedule,
  restoreFromBackup,
  type BackupJob,
  type BackupConfig,
  type BackupStatus,
} from '../../lib/cloudBackupService';
import { useAuthStore } from '../../lib/authStore';

/** 格式化字节数 */
function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 格式化日期 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleString('zh-CN');
  } catch {
    return dateStr;
  }
}

export default function CloudBackupPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [snackbar, setSnackbar] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  // Data
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupJob[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);

  // Config editing
  const [editConfig, setEditConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    auto_backup: false,
    frequency: 'daily',
    backup_time: '02:00',
    retention_days: 30,
    encrypt_backup: true,
  });

  // Restore dialog
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null);

  const fetchData = () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getBackupStatus().then(setStatus).catch(() => {}),
      getBackupHistory(20).then(setHistory).catch(() => {}),
      getBackupConfig(userId).then((cfg) => {
        setConfig(cfg);
        setConfigForm({
          auto_backup: cfg.auto_backup,
          frequency: cfg.frequency,
          backup_time: cfg.backup_time,
          retention_days: cfg.retention_days,
          encrypt_backup: cfg.encrypt_backup,
        });
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleTriggerBackup = async () => {
    setBackingUp(true);
    try {
      const result = await triggerBackup(userId);
      setSnackbar({ msg: result.message || '备份完成', severity: 'success' });
      fetchData();
    } catch (e: any) {
      setSnackbar({ msg: e.toString(), severity: 'error' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await setAutoBackupSchedule(
        userId,
        configForm.auto_backup,
        configForm.frequency,
        configForm.backup_time,
        configForm.retention_days,
        configForm.encrypt_backup,
      );
      setSnackbar({ msg: '备份策略已更新', severity: 'success' });
      setEditConfig(false);
      fetchData();
    } catch (e: any) {
      setSnackbar({ msg: e.toString(), severity: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setRestoring(true);
    try {
      await restoreFromBackup(selectedBackup.id);
      setSnackbar({ msg: '数据恢复完成', severity: 'success' });
      setRestoreDialog(false);
    } catch (e: any) {
      setSnackbar({ msg: e.toString(), severity: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  if (!userId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">请先登录以使用云备份</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  const statusColor = status?.available ? 'success' : 'warning';
  const statusText = status?.available ? '已连接' : '未配置';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#0ea5e9' }}>
        ☁️ 云备份管理
      </Typography>

      {/* ===== 状态概览 ===== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BackupIcon color={statusColor as any} />
              <Typography variant="body2" color="text.secondary">连接状态</Typography>
            </Box>
            <Chip label={statusText} color={statusColor as any} size="small" />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <HistoryIcon color="action" />
              <Typography variant="body2" color="text.secondary">上次备份</Typography>
            </Box>
            <Typography variant="body2">{formatDate(status?.last_backup_at ?? null)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StorageIcon color="action" />
              <Typography variant="body2" color="text.secondary">总备份次数</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {status?.total_backups ?? 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LockIcon color="action" />
              <Typography variant="body2" color="text.secondary">加密状态</Typography>
            </Box>
            <Chip
              label={config?.encrypt_backup ? '已加密' : '未加密'}
              color={config?.encrypt_backup ? 'success' : 'warning'}
              size="small"
            />
          </Paper>
        </Grid>
      </Grid>

      {/* ===== 操作按钮 ===== */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={handleTriggerBackup}
            disabled={backingUp}
          >
            {backingUp ? '备份中...' : '手动备份'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setEditConfig(true)}
          >
            备份策略
          </Button>
        </Box>
      </Paper>

      {/* ===== 自动备份配置预览 ===== */}
      {config && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            当前备份策略
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">自动备份</Typography>
              <Chip
                label={config.auto_backup ? '已启用' : '已禁用'}
                color={config.auto_backup ? 'success' : 'default'}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">频率</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                {config.frequency === 'daily' ? '每天' : config.frequency === 'weekly' ? '每周' : config.frequency}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">备份时间</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>{config.backup_time}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">保留天数</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>{config.retention_days} 天</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ===== 备份历史 ===== */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          备份历史
        </Typography>

        {history.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            暂无备份记录
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>备份 ID</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">大小</TableCell>
                  <TableCell align="right">表数量</TableCell>
                  <TableCell align="right">开始时间</TableCell>
                  <TableCell align="right">完成时间</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {job.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={job.status === 'completed' ? <SuccessIcon /> : job.status === 'failed' ? <ErrorIcon /> : undefined}
                        label={job.status === 'completed' ? '完成' : job.status === 'running' ? '运行中' : job.status === 'failed' ? '失败' : job.status}
                        size="small"
                        color={job.status === 'completed' ? 'success' : job.status === 'running' ? 'info' : job.status === 'failed' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">{formatBytes(job.size_bytes)}</TableCell>
                    <TableCell align="right">{job.table_count ?? '--'}</TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(job.started_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(job.completed_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<RestoreIcon />}
                        disabled={job.status !== 'completed'}
                        onClick={() => { setSelectedBackup(job); setRestoreDialog(true); }}
                      >
                        恢复
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ===== 备份策略编辑弹窗 ===== */}
      <Dialog open={editConfig} onClose={() => setEditConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>备份策略设置</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={configForm.auto_backup}
                  onChange={(e) => setConfigForm({ ...configForm, auto_backup: e.target.checked })}
                />
              }
              label="启用自动备份"
            />
            {configForm.auto_backup && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>备份频率</InputLabel>
                  <Select
                    value={configForm.frequency}
                    label="备份频率"
                    onChange={(e) => setConfigForm({ ...configForm, frequency: e.target.value })}
                  >
                    <MenuItem value="daily">每天</MenuItem>
                    <MenuItem value="weekly">每周</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="备份时间"
                  type="time"
                  size="small"
                  value={configForm.backup_time}
                  onChange={(e) => setConfigForm({ ...configForm, backup_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="保留天数"
                  type="number"
                  size="small"
                  value={configForm.retention_days}
                  onChange={(e) => setConfigForm({ ...configForm, retention_days: parseInt(e.target.value) || 30 })}
                />
              </>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={configForm.encrypt_backup}
                  onChange={(e) => setConfigForm({ ...configForm, encrypt_backup: e.target.checked })}
                />
              }
              label="启用备份加密"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditConfig(false)}>取消</Button>
          <Button onClick={handleSaveConfig} variant="contained" disabled={savingConfig}>
            {savingConfig ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== 恢复确认弹窗 ===== */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认恢复数据</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>操作不可逆</AlertTitle>
            恢复操作将覆盖当前数据。建议在恢复前先执行一次手动备份。
          </Alert>
          {selectedBackup && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                备份时间: {formatDate(selectedBackup.completed_at)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                数据大小: {formatBytes(selectedBackup.size_bytes)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                表数量: {selectedBackup.table_count ?? '--'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>取消</Button>
          <Button onClick={handleRestore} variant="contained" color="warning" disabled={restoring}>
            {restoring ? '恢复中...' : '确认恢复'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.msg}
      />
    </Box>
  );
}
