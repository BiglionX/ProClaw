/**
 * 项目仪表板页面 (PRD v6.2 第 8 节)
 * 显示 PCP 关键目标、里程碑进度、最近任务活动
 * 可通过 CEO Agent 聊天窗口的快捷按钮或自定义事件打开
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Flag as GoalIcon,
  TaskAlt as TaskIcon,
  CheckCircle as DoneIcon,
  Error as FailIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { proclawContext, proclawTasks, PcpEntry, TaskStats, CeoTaskRecord } from '../lib/ceoController';
import CompanyTimeline from '../components/CEO/CompanyTimeline';

// ==================== 类型 & 颜色 ====================

const CONTEXT_TYPE_COLORS: Record<string, string> = {
  vision: '#7c4dff',
  goal: '#00c853',
  constraint: '#ff1744',
  milestone: '#2979ff',
  decision: '#ff9100',
};

const CONTEXT_TYPE_LABELS: Record<string, string> = {
  vision: '愿景',
  goal: '目标',
  constraint: '约束',
  milestone: '里程碑',
  decision: '决策',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const PIE_COLORS = ['#ff9800', '#2196f3', '#4caf50', '#f44336', '#9e9e9e'];

// ==================== 页面组件 ====================

export default function ProjectDashboardPage() {
  const navigate = useNavigate();

  const [pcpEntries, setPcpEntries] = useState<PcpEntry[]>([]);
  const [tasks, setTasks] = useState<CeoTaskRecord[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entries, taskList, taskStats] = await Promise.all([
        proclawContext.query({ status: 'active' }),
        proclawTasks.list({ limit: 20 }),
        proclawTasks.getStats(),
      ]);
      setPcpEntries(entries);
      setTasks(taskList);
      setStats(taskStats);
    } catch (e) {
      console.error('Failed to load project overview data:', e);
      setError(e instanceof Error ? e.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 监听 CEO Agent 的刷新事件
    const handler = () => loadData();
    window.addEventListener('proclaw:open-project-overview', handler);
    return () => window.removeEventListener('proclaw:open-project-overview', handler);
  }, [loadData]);

  // ==================== 图表数据 ====================

  const pieData = stats
    ? [
        { name: '待处理', value: stats.pending },
        { name: '进行中', value: stats.in_progress },
        { name: '已完成', value: stats.completed },
        { name: '失败', value: stats.failed },
        { name: '已取消', value: stats.cancelled },
      ].filter(d => d.value > 0)
    : [];

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ==================== 渲染 ====================

  return (
    <Box sx={{ height: 'calc(100vh - 128px)', overflow: 'auto', p: 2 }}>
      {/* 标题栏 */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton size="small" onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
          项目概览
        </Typography>
        <Tooltip title="刷新数据">
          <IconButton size="small" onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* 视图切换按钮 */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Chip
          label="概览"
          size="small"
          variant={!showTimeline ? 'filled' : 'outlined'}
          color={!showTimeline ? 'primary' : 'default'}
          onClick={() => setShowTimeline(false)}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          icon={<TimelineIcon sx={{ fontSize: 14 }} />}
          label="公司时间轴"
          size="small"
          variant={showTimeline ? 'filled' : 'outlined'}
          color={showTimeline ? 'secondary' : 'default'}
          onClick={() => setShowTimeline(true)}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loading && showTimeline && (
        <CompanyTimeline />
      )}

      {!loading && !showTimeline && (
        <>
          {/* 顶部概览卡片 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<GoalIcon sx={{ color: '#7c4dff' }} />}
                label="活跃目标"
                value={pcpEntries.length}
                color="#7c4dff"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<TaskIcon sx={{ color: '#2196f3' }} />}
                label="进行中"
                value={stats?.in_progress ?? 0}
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<DoneIcon sx={{ color: '#4caf50' }} />}
                label="已完成"
                value={stats?.completed ?? 0}
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<FailIcon sx={{ color: '#f44336' }} />}
                label="失败"
                value={stats?.failed ?? 0}
                color="#f44336"
              />
            </Grid>
          </Grid>

          {/* 图表 + PCP 两列布局 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* 任务状态饼图 */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  任务状态分布
                </Typography>
                {pieData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    暂无任务数据
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* PCP 条目列表 */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%', maxHeight: 350, overflow: 'auto' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  项目上下文 ({pcpEntries.length})
                </Typography>
                {pcpEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    暂无活跃的项目上下文条目
                    <br />
                    向 CEO Agent 描述您的业务方向以创建
                  </Typography>
                ) : (
                  pcpEntries.map(entry => (
                    <Box
                      key={entry.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Chip
                        label={CONTEXT_TYPE_LABELS[entry.context_type] || entry.context_type}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          bgcolor: CONTEXT_TYPE_COLORS[entry.context_type] || '#757575',
                          color: 'white',
                          minWidth: 48,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {entry.title || '无标题'}
                        </Typography>
                        {entry.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.2 }}>
                            {entry.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 0.3 }}>
                          <Typography variant="caption" color="text.disabled">
                            优先级: {entry.priority ?? '-'}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            创建者: {entry.created_by === 'boss' ? 'Boss' : 'CEO Agent'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* 最近任务活动流 */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="subtitle2" fontWeight={600}>
                最近任务活动
              </Typography>
              <Typography variant="caption" color="text.disabled">
                (共 {stats?.total ?? 0} 条)
              </Typography>
            </Box>

            {tasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                暂无任务记录
              </Typography>
            ) : (
              <Box sx={{ position: 'relative', pl: 3 }}>
                {/* 时间线竖线 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: '#e0e0e0',
                  }}
                />
                {tasks.map((task, index) => {
                  const statusColor =
                    task.status === 'completed' ? '#4caf50' :
                    task.status === 'in_progress' ? '#2196f3' :
                    task.status === 'failed' ? '#f44336' :
                    task.status === 'cancelled' ? '#9e9e9e' : '#ff9800';

                  return (
                    <Box
                      key={task.id}
                      sx={{
                        position: 'relative',
                        pb: index < tasks.length - 1 ? 2 : 0,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: -23,
                          top: 4,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: statusColor,
                          border: '2px solid white',
                          boxShadow: '0 0 0 1px #e0e0e0',
                        },
                      }}
                    >
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        {formatTime(task.created_at)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.2 }}>
                        <Chip
                          label={STATUS_LABELS[task.status] || task.status}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 500,
                            bgcolor: statusColor,
                            color: 'white',
                            mr: 0.5,
                          }}
                        />
                        {task.description || task.type || '未命名任务'}
                        <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 1 }}>
                          分配给: {task.assigned_agent_id}
                        </Typography>
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}

// ==================== 统计卡片子组件 ====================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}15`,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
