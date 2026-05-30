/**
 * 任务卡片组件
 * 在 CEO Agent 聊天窗口中展示结构化任务信息
 */

import { Box, Chip, Typography, LinearProgress, Button, Paper } from '@mui/material';
import { TaskAlt as TaskIcon, Schedule as TimeIcon, Flag as PriorityIcon } from '@mui/icons-material';

export interface TaskCardData {
  taskId: string;
  type: string;
  priority: number;
  description: string;
  expected_output: string;
  deadline?: string;
  assigned_to?: string;
  status?: string;
}

interface TaskCardProps {
  task: TaskCardData;
  onViewDetail?: (taskId: string) => void;
}

export default function TaskCard({ task, onViewDetail }: TaskCardProps) {
  const priorityColor = task.priority <= 1 ? 'error' : task.priority <= 2 ? 'warning' : 'default';
  const priorityLabel = task.priority <= 1 ? '紧急' : task.priority <= 2 ? '高' : task.priority <= 3 ? '中' : '低';

  const statusValue = task.status || 'pending';
  const statusColor = statusValue === 'completed' ? 'success' :
    statusValue === 'in_progress' ? 'info' :
    statusValue === 'failed' ? 'error' : 'default';
  const statusLabel = statusValue === 'completed' ? '已完成' :
    statusValue === 'in_progress' ? '进行中' :
    statusValue === 'failed' ? '失败' :
    statusValue === 'cancelled' ? '已取消' : '待处理';

  const progressValue = statusValue === 'completed' ? 100 :
    statusValue === 'in_progress' ? 50 :
    statusValue === 'failed' ? 0 : 0;

  const formatDeadline = (deadline?: string): string => {
    if (!deadline) return '';
    try {
      const d = new Date(deadline);
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return deadline;
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fafafa',
        maxWidth: 320,
      }}
    >
      {/* 任务头部 */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <TaskIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.3 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
            {task.description || '未命名任务'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {/* 优先级徽标 */}
            <Chip
              icon={<PriorityIcon sx={{ fontSize: 12 }} />}
              label={priorityLabel}
              size="small"
              color={priorityColor}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
            {/* 状态徽标 */}
            <Chip
              label={statusLabel}
              size="small"
              color={statusColor}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
            {/* 截止时间 */}
            {task.deadline && (
              <Chip
                icon={<TimeIcon sx={{ fontSize: 12 }} />}
                label={formatDeadline(task.deadline)}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* 进度条 */}
      <Box sx={{ mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              bgcolor: statusValue === 'completed' ? '#00c853' :
                statusValue === 'in_progress' ? '#2979ff' :
                statusValue === 'failed' ? '#ff1744' : '#bdbdbd',
            },
          }}
        />
      </Box>

      {/* 预期输出 */}
      {task.expected_output && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          预期输出: {task.expected_output}
        </Typography>
      )}

      {/* 分配给谁 */}
      {task.assigned_to && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
          分配给: {task.assigned_to}
        </Typography>
      )}

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem', minWidth: 'auto', py: 0.2, px: 1 }}
          onClick={() => onViewDetail?.(task.taskId)}
        >
          查看详情
        </Button>
      </Box>
    </Paper>
  );
}
