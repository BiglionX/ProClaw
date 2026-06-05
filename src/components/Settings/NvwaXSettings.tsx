/**
 * NvwaX API 配置面板
 *
 * 提供 NvwaX API Key 的配置、测试和状态管理。
 * 集成在 ProClaw 设置页面中。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Key as KeyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountBalanceWallet as WalletIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material';
import { safeInvoke } from '../../lib/tauri';
import UsageDashboard from '../NvwaX/UsageDashboard';
import { useNvwaXBalanceAlert } from '../../lib/useNvwaXBalanceAlert';
import { NvwaXService } from '../../lib/nvwaxClient';

/** 连接测试结果 */
interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export default function NvwaXSettings() {
  const [apiKey, setApiKey] = useState('');
  const [storedApiKey, setStoredApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  // 余额告警
  const { alert: balanceAlert, dismissAlert: dismissBalanceAlert } = useNvwaXBalanceAlert();

  // 定时检查余额（已配置 API Key 时每 5 分钟检查一次）
  useEffect(() => {
    if (!isConfigured) return;
    const interval = setInterval(async () => {
      await NvwaXService.checkBalanceAndAlert();
    }, 5 * 60 * 1000); // 5 分钟
    return () => clearInterval(interval);
  }, [isConfigured]);

  /** 检查当前配置状态 */
  useEffect(() => {
    // 通过环境变量检测（开发环境）
    const envKey = import.meta.env.VITE_NVWAX_API_KEY || '';
    if (envKey) {
      setStoredApiKey(envKey.substring(0, 10) + '...');
      setIsConfigured(true);
    } else {
      // 尝试从数据库读取（通过 Tauri 命令）
      safeInvoke<string>('get_nvwax_api_key').then((key) => {
        if (key) {
          setStoredApiKey(key.substring(0, 10) + '...');
          setIsConfigured(true);
        }
      }).catch(() => {});
    }
  }, []);

  /** 保存 API Key */
  const handleSave = async () => {
    if (!apiKey.trim()) {
      setSnackbar('请输入 API Key');
      return;
    }

    setSaving(true);
    try {
      // 通过 Tauri 命令保存到数据库
      await safeInvoke('save_nvwax_api_key', { apiKey: apiKey.trim() });
      setStoredApiKey(apiKey.trim().substring(0, 10) + '...');
      setIsConfigured(true);
      setApiKey('');
      setSnackbar('API Key 已保存');
    } catch (err: any) {
      setSnackbar('保存失败: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  /** 测试连接 */
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // 调用 Tauri 命令测试 NvwaX API 连接
      const result = await safeInvoke<ConnectionTestResult>('test_nvwax_connection');
      setTestResult(result || { success: false, message: '无响应' });
    } catch (err: any) {
      setTestResult({ success: false, message: String(err) });
    } finally {
      setTesting(false);
    }
  };

  /** 清除 API Key */
  const handleClear = async () => {
    try {
      await safeInvoke('clear_nvwax_api_key');
      setStoredApiKey('');
      setIsConfigured(false);
      setTestResult(null);
      setSnackbar('API Key 已清除');
    } catch (err: any) {
      setSnackbar('清除失败: ' + String(err));
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <KeyIcon sx={{ color: '#6366f1' }} />
            <Typography variant="h6">NvwaX API 集成</Typography>
            <Chip
              label={isConfigured ? '已配置' : '未配置'}
              size="small"
              color={isConfigured ? 'success' : 'default'}
              sx={{ ml: 1 }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            配置 NvwaX API Key 以启用 Agent 市场浏览、Agent/AiTeam 管理、
            导出和 Token 消耗统计等功能。API Key 在本地加密存储。
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* 当前配置状态 */}
          {isConfigured && (
            <Paper
              sx={{
                p: 2,
                mb: 2,
                bgcolor: alpha('#10b981', 0.05),
                border: '1px solid',
                borderColor: alpha('#10b981', 0.2),
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />
                <Box>
                  <Typography variant="body2">
                    API Key 已配置: <strong>{storedApiKey}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    环境变量或数据库存储
                  </Typography>
                </Box>
              </Box>
              <Button size="small" color="error" onClick={handleClear}>
                清除
              </Button>
            </Paper>
          )}

          {/* API Key 输入 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="NvwaX API Key"
              placeholder="nvwx_xxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type={showKey ? 'text' : 'password'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowKey(!showKey)}
                      edge="end"
                    >
                      {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={testing ? <CircularProgress size={14} /> : <CloudSyncIcon />}
              onClick={handleTest}
              disabled={testing || !isConfigured}
            >
              测试连接
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<WalletIcon />}
              onClick={() => setUsageOpen(true)}
              disabled={!isConfigured}
            >
              Token 用量
            </Button>
          </Box>

          {/* 测试结果 */}
          {testResult && (
            <Paper
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: testResult.success
                  ? alpha('#10b981', 0.05)
                  : alpha('#ef4444', 0.05),
                border: '1px solid',
                borderColor: testResult.success
                  ? alpha('#10b981', 0.2)
                  : alpha('#ef4444', 0.2),
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {testResult.success ? (
                  <CheckIcon sx={{ color: '#10b981', fontSize: 18 }} />
                ) : (
                  <CloseIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                )}
                <Typography variant="body2" color={testResult.success ? 'success.main' : 'error.main'}>
                  {testResult.message}
                </Typography>
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Token 用量看板 */}
      <UsageDashboard open={usageOpen} onClose={() => setUsageOpen(false)} />

      {/* Token 余额告警 */}
      <Snackbar
        open={balanceAlert.show}
        autoHideDuration={10000}
        onClose={dismissBalanceAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Paper
          sx={{
            p: 2,
            bgcolor: '#fff3e0',
            border: '1px solid #ffb74d',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 300,
          }}
        >
          <Typography variant="body2" color="warning.dark">
            {balanceAlert.message}
          </Typography>
          <Button size="small" variant="outlined" color="warning" onClick={() => setUsageOpen(true)}>
            查看用量
          </Button>
        </Paper>
      </Snackbar>

      <Snackbar
        open={!!snackbar}
        message={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
