import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  PendingActions as PendingActionsIcon,
  PlayCircle as PlayCircleIcon,
} from '@mui/icons-material';
import {
  Grid,
  Skeleton,
} from '@mui/material';

import StatCard from './StatCard';
import type { TaskStats } from '../../lib/ceoController';

interface AITaskStatsProps {
  stats: TaskStats | null;
}

export default function AITaskStats({ stats }: AITaskStatsProps) {
  if (!stats) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const completionRate = stats.total > 0
    ? `${((stats.completed / stats.total) * 100).toFixed(0)}%`
    : '0%';

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          icon={<AssignmentIcon />}
          title="总任务"
          value={stats.total}
          color="#FF3B30"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          icon={<PlayCircleIcon />}
          title="进行中"
          value={stats.in_progress}
          color="#6366F1"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          icon={<CheckCircleIcon />}
          title="已完成"
          value={stats.completed}
          color="#10B981"
          subtitle={`完成率 ${completionRate}`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          icon={<ErrorOutlineIcon />}
          title="失败"
          value={stats.failed}
          color="#F59E0B"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          icon={<PendingActionsIcon />}
          title="待处理"
          value={stats.pending}
          color="#6B7280"
        />
      </Grid>
    </Grid>
  );
}
