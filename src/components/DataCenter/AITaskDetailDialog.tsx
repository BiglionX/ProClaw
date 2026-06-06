import {
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';

import type { AgentCapability, CeoTaskRecord } from '../../lib/ceoController';

// ========== 常量 ==========

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:     { color: '#6B7280', label: '待处理' },
  in_progress: { color: '#6366F1', label: '进行中' },
  completed:   { color: '#10B981', label: '已完成' },
  failed:      { color: '#EF4444', label: '失败' },
  cancelled:   { color: '#9CA3AF', label: '已取消' },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
};

// ========== 工具函数 ==========

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: number, end?: number | null): string {
  if (!end) return '进行中';
  const diff = Math.round((end - start) / 60000);
  if (diff < 1) return '不到 1 分钟';
  if (diff < 60) return `${diff} 分钟`;
  return `${Math.floor(diff / 60)} 小时 ${diff % 60} 分钟`;
}

// ========== 类型定义 ==========

interface AITaskDetailDialogProps {
  open: boolean;
  task: CeoTaskRecord | null;
  agents: AgentCapability[];
  onClose: () => void;
}

// ========== 组件 ==========

export default function AITaskDetailDialog({ open, task, agents, onClose }: AITaskDetailDialogProps) {
  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] || { color: '#999', label: task.status };
  const agentNameMap = new Map<string, string>();
  agents.forEach(a => agentNameMap.set(a.agentId, a.agentName));
  const agentName = agentNameMap.get(task.assigned_agent_id) || task.assigned_agent_id;
  const priorityLabel = PRIORITY_LABELS[task.priority] || `${task.priority}`;
  const priorityStars = '⭐'.repeat(Math.min(Math.max(task.priority, 1), 3));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          📋 任务详情
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* 基本信息 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <DetailRow label="状态" value={statusConfig.label} color={statusConfig.color} />
            <DetailRow label="指派 Agent" value={agentName} color="#6366F1" />
            <DetailRow label="优先级" value={`${priorityStars} (${priorityLabel})`} />
            <DetailRow label="创建时间" value={formatTime(task.created_at)} />
            {task.completed_at && (
              <DetailRow label="完成时间" value={formatTime(task.completed_at)} />
            )}
            <DetailRow label="耗时" value={formatDuration(task.created_at, task.completed_at)} />
          </Box>
        </Paper>

        {/* 任务描述 */}
        {task.description && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.85rem', color: '#FF3B30' }}>
              📝 任务描述
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(255,59,48,0.03)',
                border: '1px solid',
                borderColor: 'rgba(255,59,48,0.1)',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>
                {task.description}
              </Typography>
            </Paper>
          </>
        )}

        {/* 预期输出 */}
        {task.expected_output && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.85rem', color: '#6366F1' }}>
              🎯 预期输出
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(99,102,241,0.03)',
                border: '1px solid',
                borderColor: 'rgba(99,102,241,0.1)',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>
                {task.expected_output}
              </Typography>
            </Paper>
          </>
        )}

        {/* 执行结果 */}
        {task.result && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.85rem', color: '#10B981' }}>
              ✅ 执行结果
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(16,185,129,0.03)',
                border: '1px solid',
                borderColor: 'rgba(16,185,129,0.1)',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>
                {task.result}
              </Typography>
            </Paper>
          </>
        )}

        {/* 任务 ID 水印 */}
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 2, color: '#ddd', textAlign: 'center', fontSize: '0.65rem' }}
        >
          ID: {task.task_id}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

// ========== 辅助子组件 ==========

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{ color: '#999', minWidth: 60, fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          fontSize: '0.8rem',
          color: color || '#333',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
