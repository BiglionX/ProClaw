import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { db } from '../db/database';

export default function DatabaseTestPage() {
  const [stats, setStats] = useState<{
    products: number;
    categories: number;
    transactions: number;
    pending_sync: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.getDatabaseStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        🗄️ 本地数据库测试
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Phase 0 Week 3 - SQLite + SQLCipher 集成测试
      </Typography>

      {error && (
        <Card sx={{ mb: 3, bgcolor: 'error.lighter' }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">数据库统计信息</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={loadStats}
              disabled={loading}
            >
              {loading ? '加载中...' : '刷新'}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {stats ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  产品数量
                </Typography>
                <Typography variant="h4">{stats.products}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  分类数量
                </Typography>
                <Typography variant="h4">{stats.categories}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  库存交易
                </Typography>
                <Typography variant="h4">{stats.transactions}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  待同步记录
                </Typography>
                <Chip
                  label={stats.pending_sync}
                  color={stats.pending_sync > 0 ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">加载中...</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 功能清单
          </Typography>

          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">✅ SQLite 数据库集成</Typography>
            </li>
            <li>
              <Typography variant="body2">✅ SQLCipher 加密支持</Typography>
            </li>
            <li>
              <Typography variant="body2">✅ 数据库 Schema 定义</Typography>
            </li>
            <li>
              <Typography variant="body2">✅ Rust 数据访问层</Typography>
            </li>
            <li>
              <Typography variant="body2">✅ TypeScript 类型定义</Typography>
            </li>
            <li>
              <Typography variant="body2">
                ⏳ Tauri Commands 实现 (待完成)
              </Typography>
            </li>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: 'block' }}
          >
            注意: 完整的 CRUD 操作需要在 Rust 后端实现 Tauri Commands
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
