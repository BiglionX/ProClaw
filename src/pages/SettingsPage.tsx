import {
  Cloud as CloudIcon,
  Storage as DatabaseIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getDatabaseStats, getSyncStatus } from '../lib/syncService';

interface DatabaseStats {
  products: number;
  categories: number;
  transactions: number;
  pending_sync: number;
}

interface SyncStatus {
  pending_operations: number;
  last_sync_time?: string;
  sync_enabled: boolean;
}

export default function SettingsPage() {
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stats, status] = await Promise.all([
        getDatabaseStats(),
        getSyncStatus(),
      ]);
      setDbStats(stats);
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          ⚙️ 系统设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          数据库、同步和系统信息
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 数据库统计 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DatabaseIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">数据库统计</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <LinearProgress />
              ) : dbStats ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">产品数量</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{dbStats.products}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">分类数量</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{dbStats.categories}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">库存交易</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{dbStats.transactions}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">待同步记录</Typography>
                    <Typography
                      sx={{
                        fontWeight: 'bold',
                        color: dbStats.pending_sync > 0 ? 'warning.main' : 'success.main',
                      }}
                    >
                      {dbStats.pending_sync}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">加载失败</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 同步状态 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">数据同步</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <LinearProgress />
              ) : syncStatus ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">同步状态</Typography>
                    <Typography
                      sx={{
                        fontWeight: 'bold',
                        color: syncStatus.sync_enabled ? 'success.main' : 'warning.main',
                      }}
                    >
                      {syncStatus.sync_enabled ? '已启用' : '未启用'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">待同步操作</Typography>
                    <Typography
                      sx={{
                        fontWeight: 'bold',
                        color: syncStatus.pending_operations > 0 ? 'warning.main' : 'success.main',
                      }}
                    >
                      {syncStatus.pending_operations}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">最后同步时间</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {syncStatus.last_sync_time || '从未同步'}
                    </Typography>
                  </Box>
                  <Divider />
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadData}
                    disabled={loading}
                    fullWidth
                  >
                    刷新状态
                  </Button>
                </Box>
              ) : (
                <Typography color="text.secondary">加载失败</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 系统信息 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">系统信息</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                    <StorageIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      应用版本
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      v0.1.0
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                    <DatabaseIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      数据库引擎
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      SQLite + SQLCipher
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                    <CloudIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      云端服务
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Supabase
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                    <InfoIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      框架版本
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Tauri 2.0
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
