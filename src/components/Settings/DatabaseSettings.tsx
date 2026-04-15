import {
  Check as CheckIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '../../lib/supabaseTest';
import { getDatabaseStats } from '../../lib/syncService';

interface DatabaseStats {
  products: number;
  categories: number;
  transactions: number;
  pending_sync: number;
}

interface SupabaseConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

const STORAGE_KEY = 'proclaw-supabase-config';

export default function DatabaseSettings() {
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    apiKey: '',
    enabled: false,
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadDatabaseStats();
    loadSupabaseConfig();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch (error) {
      console.error('Failed to load database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupabaseConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSupabaseConfig(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load Supabase config:', error);
    }
  };

  const handleSaveSupabaseConfig = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseConfig));
      setSnackbar({
        open: true,
        message: 'Supabase 配置已保存',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存配置失败',
        severity: 'error',
      });
    }
  };

  const handleTestConnection = async () => {
    if (!supabaseConfig.url || !supabaseConfig.apiKey) {
      setSnackbar({
        open: true,
        message: '请先填写 Supabase URL 和 API Key',
        severity: 'error',
      });
      return;
    }

    try {
      setTestingConnection(true);
      const result = await testSupabaseConnection();
      setTestResult(result);
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接测试失败',
      });
      setSnackbar({
        open: true,
        message: '连接测试失败',
        severity: 'error',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetConfig = () => {
    setSupabaseConfig({
      url: '',
      apiKey: '',
      enabled: false,
    });
    localStorage.removeItem(STORAGE_KEY);
    setSnackbar({
      open: true,
      message: '配置已重置为默认值',
      severity: 'info',
    });
  };

  return (
    <Box>
      {/* 本地数据库信息 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">本地数据库</Typography>
            <Chip
              label="SQLite"
              size="small"
              sx={{ ml: 1 }}
              color="primary"
              variant="outlined"
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="body2" color="text.secondary">
                  数据库类型
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
                  SQLite + SQLCipher
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  加密本地存储
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="body2" color="text.secondary">
                  数据库状态
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 'bold', mt: 1, color: 'success.main' }}
                >
                  ✅ 运行正常
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  数据已加密
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* 数据库统计 */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              📊 数据库统计
            </Typography>
            {loading ? (
              <LinearProgress />
            ) : dbStats ? (
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'primary.main' }}
                    >
                      {dbStats.products}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      产品数量
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'success.main' }}
                    >
                      {dbStats.categories}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      分类数量
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'info.main' }}
                    >
                      {dbStats.transactions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      库存交易
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 'bold',
                        color:
                          dbStats.pending_sync > 0
                            ? 'warning.main'
                            : 'success.main',
                      }}
                    >
                      {dbStats.pending_sync}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      待同步
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">加载失败</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Supabase 云端同步配置 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CloudIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6">云端同步（Supabase）</Typography>
            <Chip
              label="可选"
              size="small"
              sx={{ ml: 1 }}
              color="info"
              variant="outlined"
            />
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              配置 Supabase 可实现多设备数据同步。本地数据会自动同步到云端，
              确保您的业务数据在任何设备上都可访问。
            </Typography>
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Supabase 项目 URL"
                value={supabaseConfig.url}
                onChange={e =>
                  setSupabaseConfig(prev => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://your-project.supabase.co"
                fullWidth
                size="small"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                在 Supabase 控制台创建项目后获取
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Supabase API Key"
                value={supabaseConfig.apiKey}
                onChange={e =>
                  setSupabaseConfig(prev => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                fullWidth
                type="password"
                size="small"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                在 Supabase 项目设置 → API 中获取 anon 或 service_role key
              </Typography>
            </Grid>
          </Grid>

          {/* 测试连接结果 */}
          {testResult && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 1,
                bgcolor: testResult.success ? 'success.50' : 'error.50',
                border: '1px solid',
                borderColor: testResult.success ? 'success.main' : 'error.main',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: testResult.success ? 'success.main' : 'error.main',
                  fontWeight: 'bold',
                }}
              >
                {testResult.success ? '✅' : '❌'} {testResult.message}
              </Typography>
            </Box>
          )}

          {/* 操作按钮 */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleResetConfig}
              startIcon={<RefreshIcon />}
            >
              重置配置
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testingConnection}
              startIcon={
                testingConnection ? (
                  <RefreshIcon
                    sx={{
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                ) : (
                  <CheckIcon />
                )
              }
            >
              {testingConnection ? '测试中...' : '测试连接'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveSupabaseConfig}
              startIcon={<SaveIcon />}
            >
              保存配置
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
