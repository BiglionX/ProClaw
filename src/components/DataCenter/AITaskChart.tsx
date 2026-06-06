import { Box, Grid, Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import type { AgentCapability, CeoTaskRecord } from '../../lib/ceoController';

// ========== 品牌色 ==========
const BRAND_RED = '#FF3B30';
const BRAND_PURPLE = '#6366F1';
const BRAND_GREEN = '#10B981';
const BRAND_GOLD = '#F59E0B';

const GRID_STYLE = { stroke: 'rgba(0,0,0,0.04)', strokeDasharray: '3 3' };

// ========== 自定义 Tooltip ==========
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((entry: any, idx: number) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
          <Typography variant="caption" sx={{ color: '#666' }}>
            {entry.name}: <strong>{entry.value}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ========== 工具函数 ==========

/** 将时间戳格式化为 YYYY-MM-DD */
function formatDate(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

/** 生成近 N 天的日期序列 */
function generateDateRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

// ========== 类型定义 ==========

interface AITaskChartProps {
  tasks: CeoTaskRecord[];
  agents: AgentCapability[];
}

// ========== 组件 ==========

export default function AITaskChart({ tasks, agents }: AITaskChartProps) {
  // 构建 Agent ID → 名称映射
  const agentNameMap = new Map<string, string>();
  agents.forEach(a => agentNameMap.set(a.agentId, a.agentName));

  // --- Agent 分布数据 ---
  const agentTaskCount = tasks.reduce((acc, task) => {
    acc[task.assigned_agent_id] = (acc[task.assigned_agent_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const agentChartData = Object.entries(agentTaskCount)
    .map(([id, count]) => ({
      agentName: agentNameMap.get(id) || id,
      tasks: count,
    }))
    .sort((a, b) => b.tasks - a.tasks);

  const hasAgentData = agentChartData.length > 0;

  // --- 30 天趋势数据 ---
  const days = generateDateRange(30);
  const trendData = days.map(date => ({
    date: date.slice(5), // 仅显示 MM-DD
    created: tasks.filter(t => formatDate(t.created_at) === date).length,
    completed: tasks.filter(t => t.completed_at && formatDate(t.completed_at) === date).length,
    failed: tasks.filter(t => t.status === 'failed' && formatDate(t.created_at) === date).length,
  }));

  const hasTrendData = trendData.some(d => d.created > 0 || d.completed > 0 || d.failed > 0);

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* 左：Agent 任务分布柱状图 */}
      <Grid item xs={12} md={6}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            📊 各 Agent 任务分布
          </Typography>
          {hasAgentData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={agentChartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="agentBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="agentName"
                  tick={{ fontSize: 11, fill: '#666' }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasks" name="任务数" fill="url(#agentBarGradient)" radius={[0, 4, 4, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" color="text.secondary">暂无 Agent 任务数据</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* 右：近30天任务趋势折线图 */}
      <Grid item xs={12} md={6}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            📈 近30天任务趋势
          </Typography>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#999' }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="新增"
                  stroke={BRAND_RED}
                  strokeWidth={2}
                  dot={{ r: 3, fill: BRAND_RED, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="完成"
                  stroke={BRAND_GREEN}
                  strokeWidth={2}
                  dot={{ r: 3, fill: BRAND_GREEN, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="失败"
                  stroke={BRAND_GOLD}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: BRAND_GOLD, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" color="text.secondary">暂无趋势数据</Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
