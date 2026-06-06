import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Assignment as AssignmentIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
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

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

const ROWS_PER_PAGE = 20;

// ========== 工具函数 ==========

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

// ========== 类型定义 ==========

interface AITaskTableProps {
  tasks: CeoTaskRecord[];
  agents: AgentCapability[];
  onViewDetail: (task: CeoTaskRecord) => void;
  onCancelTask: (taskId: string) => void;
}

interface FilterState {
  status: string;
  agentId: string;
  search: string;
}

// ========== 组件 ==========

export default function AITaskTable({ tasks, agents, onViewDetail, onCancelTask }: AITaskTableProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterState>({
    status: 'all',
    agentId: 'all',
    search: '',
  });
  const [page, setPage] = useState(0);

  // Agent 名称映射
  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach(a => map.set(a.agentId, a.agentName));
    return map;
  }, [agents]);

  // 前端过滤
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter.status !== 'all' && task.status !== filter.status) return false;
      if (filter.agentId !== 'all' && task.assigned_agent_id !== filter.agentId) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const desc = (task.description || task.type || '').toLowerCase();
        if (!desc.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter]);

  // 分页
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  }, [filteredTasks, page]);

  // 空状态判断
  const isEmpty = tasks.length === 0;

  const handleCancel = (e: React.MouseEvent, task: CeoTaskRecord) => {
    e.stopPropagation();
    if (task.status === 'pending' || task.status === 'in_progress') {
      onCancelTask(task.task_id);
    }
  };

  if (isEmpty) {
    return (
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AssignmentIcon sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            暂无 AI 任务记录
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            通过 AI Team 向 CEO Agent 下达指令即可创建任务
          </Typography>
          <Button variant="outlined" size="small" onClick={() => navigate('/teams')}>
            前往 AI Team
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* 筛选栏 */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem', mr: 1 }}>
          📋 任务列表
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={filter.status}
            label="状态"
            onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0); }}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Agent</InputLabel>
          <Select
            value={filter.agentId}
            label="Agent"
            onChange={e => { setFilter(f => ({ ...f, agentId: e.target.value })); setPage(0); }}
          >
            <MenuItem value="all">全部 Agent</MenuItem>
            {agents.map(a => (
              <MenuItem key={a.agentId} value={a.agentId}>{a.agentName}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="搜索任务描述..."
          value={filter.search}
          onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(0); }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#999', mr: 0.5 }} />,
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* 表格 */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80 }}><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>状态</Typography></TableCell>
              <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>任务描述</Typography></TableCell>
              <TableCell sx={{ width: 140 }}><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>指派 Agent</Typography></TableCell>
              <TableCell sx={{ width: 80 }}><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>优先级</Typography></TableCell>
              <TableCell sx={{ width: 100 }}><Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>创建时间</Typography></TableCell>
              <TableCell sx={{ width: 60 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">无匹配任务</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map(task => {
                const statusConfig = STATUS_CONFIG[task.status] || { color: '#999', label: task.status };
                const agentName = agentNameMap.get(task.assigned_agent_id) || task.assigned_agent_id;
                const priorityStars = '⭐'.repeat(Math.min(Math.max(task.priority, 1), 3));
                const canCancel = task.status === 'pending' || task.status === 'in_progress';

                return (
                  <TableRow
                    key={task.id}
                    hover
                    onClick={() => onViewDetail(task)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {/* 状态 */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusConfig.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.875rem', color: statusConfig.color, fontWeight: 500 }}>
                          {statusConfig.label}
                        </Typography>
                      </Box>
                    </TableCell>
                    {/* 任务描述 */}
                    <TableCell>
                      <Tooltip title={task.description || task.type || '未命名任务'} arrow>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.description || task.type || '未命名任务'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    {/* Agent */}
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: '#6366F1',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          navigate('/teams');
                        }}
                      >
                        {agentName}
                      </Typography>
                    </TableCell>
                    {/* 优先级 */}
                    <TableCell>
                      <Typography sx={{ fontSize: '0.75rem' }}>
                        {priorityStars}
                      </Typography>
                    </TableCell>
                    {/* 创建时间 */}
                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                        {timeAgo(task.created_at)}
                      </Typography>
                    </TableCell>
                    {/* 操作 */}
                    <TableCell>
                      {canCancel && (
                        <Tooltip title="取消任务" arrow>
                          <IconButton size="small" onClick={e => handleCancel(e, task)}>
                            <CancelIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <TablePagination
        component="div"
        count={filteredTasks.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
        labelRowsPerPage="每页"
      />
    </Paper>
  );
}
