import {
  ClearAll as ClearAllIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  UnrecognizedCommand,
  clearUnrecognizedCommands,
  deleteUnrecognizedCommand,
  downloadUnrecognizedCommands,
  getUnrecognizedCommands,
  getUnrecognizedCommandsStats,
} from '../lib/unrecognizedCommandService';

export default function UnrecognizedCommandsPage() {
  const [commands, setCommands] = useState<UnrecognizedCommand[]>([]);
  const [stats, setStats] = useState<{
    totalCount: number;
    todayCount: number;
    weekCount: number;
    topCommands: Array<{ text: string; count: number }>;
  } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 加载数据
  const loadData = () => {
    const cmds = getUnrecognizedCommands();
    const statsData = getUnrecognizedCommandsStats();
    setCommands(cmds);
    setStats(statsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 清除所有
  const handleClearAll = () => {
    clearUnrecognizedCommands();
    setSuccessMessage('已清除所有未识别指令');
    setConfirmClearOpen(false);
    loadData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 删除单个
  const handleDelete = (id: string) => {
    deleteUnrecognizedCommand(id);
    setSuccessMessage('已删除该记录');
    loadData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 导出 JSON
  const handleExportJSON = () => {
    downloadUnrecognizedCommands('json');
    setSuccessMessage('已导出 JSON 文件');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // 导出 CSV
  const handleExportCSV = () => {
    downloadUnrecognizedCommands('csv');
    setSuccessMessage('已导出 CSV 文件');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          🔍 未识别指令分析
        </Typography>
        <Typography variant="body1" color="text.secondary">
          收集和分析用户输入但无法识别的自然语言指令，用于优化 AI Chat
        </Typography>
      </Box>

      {/* 成功提示 */}
      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* 统计卡片 */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  总记录数
                </Typography>
                <Typography variant="h3">{stats.totalCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  今日新增
                </Typography>
                <Typography variant="h3" color="primary">
                  {stats.todayCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  本周新增
                </Typography>
                <Typography variant="h3" color="info.main">
                  {stats.weekCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  高频指令
                </Typography>
                <Typography variant="h5">
                  {stats.topCommands.length} 种
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 高频指令 */}
      {stats && stats.topCommands.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingUpIcon sx={{ color: 'error.main', mr: 1 }} />
            <Typography variant="h6">
              高频未识别指令（Top 10）
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {stats.topCommands.map((item, index) => (
              <Chip
                key={index}
                label={`${item.text} (${item.count}次)`}
                color={index < 3 ? 'error' : index < 7 ? 'warning' : 'default'}
                variant={index < 3 ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: index < 3 ? 600 : 400,
                  fontSize: index < 3 ? '0.9rem' : '0.8rem',
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* 趋势分析 */}
      {stats && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CalendarIcon sx={{ color: 'info.main', mr: 1 }} />
            <Typography variant="h6">数据趋势</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'primary.50',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  今日占比
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stats.totalCount > 0
                    ? ((stats.todayCount / stats.totalCount) * 100).toFixed(1)
                    : 0}
                  %
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'info.50',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  本周占比
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.totalCount > 0
                    ? ((stats.weekCount / stats.totalCount) * 100).toFixed(1)
                    : 0}
                  %
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'success.50',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  历史数据
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.totalCount - stats.weekCount}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 操作栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
        >
          刷新
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportJSON}
          disabled={commands.length === 0}
        >
          导出 JSON
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={commands.length === 0}
        >
          导出 CSV
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<ClearAllIcon />}
          onClick={() => setConfirmClearOpen(true)}
          disabled={commands.length === 0}
          sx={{ ml: 'auto' }}
        >
          清空所有
        </Button>
      </Paper>

      {/* 指令列表 */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell width="50%">
                <strong>用户指令</strong>
              </TableCell>
              <TableCell>
                <strong>时间</strong>
              </TableCell>
              <TableCell>
                <strong>页面</strong>
              </TableCell>
              <TableCell align="right">
                <strong>操作</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    🎉 暂无未识别指令，AI Chat 运行良好！
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              commands.map(command => (
                <TableRow key={command.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: '#f5f5f5',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {command.originalText}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(command.timestamp).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={command.context?.currentPage || '未知'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(command.id)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 确认清空对话框 */}
      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
      >
        <DialogTitle>确认清空</DialogTitle>
        <DialogContent>
          <Typography>
            确定要清空所有未识别指令记录吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>取消</Button>
          <Button onClick={handleClearAll} color="error" variant="contained">
            确认清空
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
