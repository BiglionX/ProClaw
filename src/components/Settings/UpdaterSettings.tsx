/**
 * Tauri 自动更新设置页（任务 #10：Tauri 自动更新）
 *
 * 提供：
 * - 显示当前版本
 * - 检查更新按钮
 * - 更新进度条
 * - 更新日志
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Update as UpdateIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { safeInvoke, isTauri } from '../../lib/tauri';

interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
  downloadUrl?: string;
  size?: number;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'up-to-date' | 'error';

export function UpdaterSettings() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    void loadCurrentVersion();
  }, []);

  /** 加载当前版本 */
  async function loadCurrentVersion() {
    try {
      const version = await safeInvoke<string>('app_version');
      setUpdateInfo(prev => ({ available: false, currentVersion: version, ...(prev || {}) }));
    } catch (err) {
      console.warn('获取版本失败：', err);
    }
  }

  /** 追加日志 */
  function appendLog(msg: string) {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  }

  /** 检查更新 */
  async function checkForUpdate() {
    setStatus('checking');
    setError(null);
    appendLog('正在检查更新…');

    try {
      const result = await safeInvoke<UpdateInfo>('check_for_update');

      if (result.available) {
        setUpdateInfo(result);
        setStatus('available');
        appendLog(`✓ 发现新版本 ${result.latestVersion}`);
      } else {
        setStatus('up-to-date');
        appendLog('✓ 当前已是最新版本');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查更新失败');
      setStatus('error');
      appendLog(`✗ 检查更新失败：${err}`);
    }
  }

  /** 下载并安装更新 */
  async function downloadAndInstall() {
    if (!updateInfo?.available) {
      setError('无可用更新');
      return;
    }

    setStatus('downloading');
    setProgress(0);
    appendLog(`开始下载 v${updateInfo.latestVersion}…`);

    try {
      // 模拟进度（实际 Tauri updater 通过事件回调）
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 15;
          if (next >= 100) {
            clearInterval(interval);
            setStatus('installing');
            appendLog('下载完成，开始安装…');
            void performInstall();
            return 100;
          }
          return next;
        });
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败');
      setStatus('error');
    }
  }

  /** 执行安装 */
  async function performInstall() {
    try {
      appendLog('重启准备中…');
      await safeInvoke('install_update');
      appendLog('✓ 更新安装完成，请重启应用');
    } catch (err) {
      setError(err instanceof Error ? err.message : '安装失败');
      setStatus('error');
      appendLog(`✗ 安装失败：${err}`);
    }
  }

  return (
    <Box>
      {/* 当前版本卡片 */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <UpdateIcon sx={{ fontSize: 40, color: '#FF3B30' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ProClaw Desktop
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                <Chip
                  label={`v${updateInfo?.currentVersion || '未知'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {status === 'up-to-date' && (
                  <Chip
                    icon={<CheckIcon sx={{ fontSize: 14 }} />}
                    label="已是最新版本"
                    size="small"
                    color="success"
                  />
                )}
                {status === 'available' && updateInfo && (
                  <Chip
                    label={`新版本 v${updateInfo.latestVersion} 可用`}
                    size="small"
                    color="warning"
                  />
                )}
                {!isTauri() && (
                  <Chip label="仅 Tauri 环境可用" size="small" color="default" />
                )}
              </Stack>
            </Box>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={checkForUpdate}
              disabled={status === 'checking'}
            >
              {status === 'checking' ? '检查中…' : '检查更新'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 更新可用 */}
      {status === 'available' && updateInfo && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'warning.main',
            mb: 3,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.04) 0%, rgba(255,59,48,0.02) 100%)',
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              ✨ 发现新版本 v{updateInfo.latestVersion}
            </Typography>
            {updateInfo.releaseDate && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                发布时间：{updateInfo.releaseDate}
              </Typography>
            )}
            {updateInfo.releaseNotes && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mt: 1,
                  mb: 2,
                  maxHeight: 200,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85rem',
                }}
              >
                {updateInfo.releaseNotes}
              </Box>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<DownloadIcon />}
                onClick={downloadAndInstall}
                disabled={status === 'downloading' || status === 'installing'}
              >
                下载并安装
              </Button>
              <Button variant="outlined" onClick={() => setStatus('idle')}>
                稍后
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 下载/安装进度 */}
      {(status === 'downloading' || status === 'installing') && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {status === 'downloading' ? '下载中…' : '安装中…'}
            </Typography>
            <LinearProgress
              variant={status === 'downloading' ? 'determinate' : 'indeterminate'}
              value={status === 'downloading' ? progress : undefined}
              sx={{ height: 8, borderRadius: 4 }}
            />
            {status === 'downloading' && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                {progress.toFixed(0)}% · {((updateInfo?.size || 0) * progress / 100 / 1024 / 1024).toFixed(1)} MB
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* 配置说明 */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            🔧 自动更新配置
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <List dense>
            <ListItem>
              <ListItemText
                primary="更新服务器"
                secondary="https://releases.proclaw.cc"
                secondaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="安装方式"
                secondary="被动安装（自动重启）"
                secondaryTypographyProps={{ sx: { fontSize: '0.85rem' } }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="签名验证"
                secondary="Ed25519 加密签名（密钥需替换）"
                secondaryTypographyProps={{ sx: { fontSize: '0.85rem' } }}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* 操作日志 */}
      {logs.length > 0 && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              📋 操作日志
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                maxHeight: 200,
                overflowY: 'auto',
                bgcolor: 'rgba(0,0,0,0.02)',
                p: 1.5,
                borderRadius: 1,
              }}
            >
              {logs.map((log, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: log.startsWith('[') && log.includes('✗') ? 'error.main' : 'text.secondary',
                  }}
                >
                  {log}
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default UpdaterSettings;
