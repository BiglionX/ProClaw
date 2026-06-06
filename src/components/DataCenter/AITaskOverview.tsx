import { useCallback, useEffect, useState } from 'react';
import {
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';

import AITaskChart from './AITaskChart';
import AITaskDetailDialog from './AITaskDetailDialog';
import AITaskStats from './AITaskStats';
import AITaskTable from './AITaskTable';
import {
  proclawAgents,
  proclawTasks,
  type AgentCapability,
  type CeoTaskRecord,
  type TaskStats,
} from '../../lib/ceoController';

export default function AITaskOverview() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [tasks, setTasks] = useState<CeoTaskRecord[]>([]);
  const [agents, setAgents] = useState<AgentCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 详情弹窗
  const [detailTask, setDetailTask] = useState<CeoTaskRecord | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, tasksData, agentsData] = await Promise.all([
        proclawTasks.getStats(),
        proclawTasks.list({ limit: 1000 }),
        proclawAgents.list(),
      ]);
      setStats(statsData);
      setTasks(tasksData);
      setAgents(agentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 AI 任务数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 取消任务
  const handleCancelTask = useCallback(async (taskId: string) => {
    try {
      await proclawTasks.cancel(taskId);
      // 刷新数据
      const [statsData, tasksData] = await Promise.all([
        proclawTasks.getStats(),
        proclawTasks.list({ limit: 1000 }),
      ]);
      setStats(statsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('取消任务失败:', err);
    }
  }, []);

  // 骨架屏（初始加载）
  if (loading && !stats && tasks.length === 0) {
    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={300} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 48, color: '#EF4444', mb: 2 }} />
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
          重试
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* 页面标题 + 刷新按钮 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            🤖 AI 任务概览
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          {loading ? '加载中...' : '刷新'}
        </Button>
      </Box>

      {/* 统计卡片 */}
      <AITaskStats stats={stats} />

      {/* 图表区域 */}
      <AITaskChart tasks={tasks} agents={agents} />

      {/* 任务列表 */}
      <AITaskTable
        tasks={tasks}
        agents={agents}
        onViewDetail={setDetailTask}
        onCancelTask={handleCancelTask}
      />

      {/* 详情弹窗 */}
      <AITaskDetailDialog
        open={detailTask !== null}
        task={detailTask}
        agents={agents}
        onClose={() => setDetailTask(null)}
      />
    </Box>
  );
}
