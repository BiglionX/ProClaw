/**
 * 决策历史侧边栏面板 (PRD v6.3 第 5.2 节)
 * 在 CEO Agent 聊天窗口显示所有重要决策及其 Boss 反应
 * 支持按类型、时间范围筛选
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, Chip, Divider,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Paper, IconButton,
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon, Cancel as RejectedIcon,
  Edit as EditedIcon, Schedule as SnoozedIcon, HourglassEmpty as PendingIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { proclawDecision, DecisionLogEntry, DecisionStats } from '../../lib/ceoController';

const DECISION_TYPE_LABELS: Record<string, string> = {
  context_add: '添加上下文',
  context_update: '更新上下文',
  task_dispatch: '分派任务',
  agent_request: 'Agent请求',
  goal_pause: '暂停目标',
};

const DECISION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved: { label: '已确认', color: '#4caf50', icon: <ApprovedIcon sx={{ fontSize: 16 }} /> },
  rejected: { label: '已拒绝', color: '#f44336', icon: <RejectedIcon sx={{ fontSize: 16 }} /> },
  edited: { label: '已编辑', color: '#ff9800', icon: <EditedIcon sx={{ fontSize: 16 }} /> },
  snoozed: { label: '已推迟', color: '#9e9e9e', icon: <SnoozedIcon sx={{ fontSize: 16 }} /> },
};

interface DecisionHistoryPanelProps {
  onClose?: () => void;
}

export default function DecisionHistoryPanel({ onClose }: DecisionHistoryPanelProps) {
  const [logs, setLogs] = useState<DecisionLogEntry[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterDecision, setFilterDecision] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logData, statsData] = await Promise.all([
        proclawDecision.queryLogs({
          decisionType: filterType || undefined,
          bossDecision: filterDecision || undefined,
          limit: 50,
        }),
        proclawDecision.getStats(),
      ]);
      setLogs(logData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load decision history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterDecision]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDecisionInfo = (decision: string | null) => {
    if (!decision) return { label: '待处理', color: '#9e9e9e', icon: <PendingIcon sx={{ fontSize: 16 }} /> };
    return DECISION_LABELS[decision] || { label: decision, color: '#757575', icon: null };
  };

  return (
    <Box sx={{ width: 340, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa', borderLeft: '1px solid', borderColor: 'divider' }}>
      {/* 标题栏 */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          决策历史
        </Typography>
        <IconButton size="small" onClick={loadData} disabled={loading}>
          <RefreshIcon fontSize="small" />
        </IconButton>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* 统计卡片 */}
      {stats && (
        <Paper elevation={0} sx={{ mx: 1.5, my: 1, p: 1, borderRadius: 1, bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{stats.total}</Typography>
              <Typography variant="caption" color="text.secondary">总决策</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="success.main" sx={{ lineHeight: 1.2 }}>
                {(stats.approval_rate * 100).toFixed(0)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">接受率</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color="error.main" sx={{ lineHeight: 1.2 }}>{stats.rejected}</Typography>
              <Typography variant="caption" color="text.secondary">拒绝</Typography>
            </Box>
          </Box>
          {stats.most_rejected_type && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
              常拒绝: {DECISION_TYPE_LABELS[stats.most_rejected_type] || stats.most_rejected_type}
            </Typography>
          )}
        </Paper>
      )}

      {/* 筛选器 */}
      <Box sx={{ px: 1.5, pb: 1, display: 'flex', gap: 1 }}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>类型</InputLabel>
          <Select
            value={filterType}
            label="类型"
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ fontSize: '0.8rem' }}
          >
            <MenuItem value="" sx={{ fontSize: '0.8rem' }}>全部</MenuItem>
            <MenuItem value="context_add" sx={{ fontSize: '0.8rem' }}>添加上下文</MenuItem>
            <MenuItem value="context_update" sx={{ fontSize: '0.8rem' }}>更新上下文</MenuItem>
            <MenuItem value="task_dispatch" sx={{ fontSize: '0.8rem' }}>分派任务</MenuItem>
            <MenuItem value="agent_request" sx={{ fontSize: '0.8rem' }}>Agent请求</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel sx={{ fontSize: '0.8rem' }}>状态</InputLabel>
          <Select
            value={filterDecision}
            label="状态"
            onChange={(e) => setFilterDecision(e.target.value)}
            sx={{ fontSize: '0.8rem' }}
          >
            <MenuItem value="" sx={{ fontSize: '0.8rem' }}>全部</MenuItem>
            <MenuItem value="approved" sx={{ fontSize: '0.8rem' }}>已确认</MenuItem>
            <MenuItem value="rejected" sx={{ fontSize: '0.8rem' }}>已拒绝</MenuItem>
            <MenuItem value="edited" sx={{ fontSize: '0.8rem' }}>已编辑</MenuItem>
            <MenuItem value="snoozed" sx={{ fontSize: '0.8rem' }}>已推迟</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider />

      {/* 列表 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            暂无决策记录
          </Typography>
        ) : (
          <List dense disablePadding>
            {logs.map((log) => {
              const decisionInfo = getDecisionInfo(log.boss_decision);
              const isExpanded = expandedId === log.id;
              let summary = '';
              try {
                const parsed = JSON.parse(log.proposed_content);
                summary = parsed.intentSummary || parsed.action || log.decision_type;
              } catch {
                summary = log.proposed_content.substring(0, 60);
              }

              return (
                <Box key={log.id}>
                  <ListItem
                    disableGutters
                    sx={{ px: 1.5, py: 0.8, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            label={DECISION_TYPE_LABELS[log.decision_type] || log.decision_type}
                            size="small"
                            sx={{ height: 18, fontSize: '0.55rem', bgcolor: '#e3f2fd', fontWeight: 500 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                            {formatTime(log.created_at)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ lineHeight: 1.3, display: 'block', mt: 0.3 }} noWrap>
                          {summary}
                        </Typography>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    <Chip
                      icon={decisionInfo.icon as any}
                      label={decisionInfo.label}
                      size="small"
                      sx={{
                        height: 20, fontSize: '0.55rem',
                        bgcolor: `${decisionInfo.color}15`,
                        color: decisionInfo.color,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    />
                  </ListItem>
                  {/* 展开详情 */}
                  {isExpanded && (
                    <Box sx={{ px: 1.5, pb: 1, bgcolor: 'grey.50' }}>
                      <Divider sx={{ mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.3 }}>
                        建议内容:
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace', fontSize: '0.6rem', bgcolor: 'white', p: 0.5, borderRadius: 0.5, border: '1px solid #eee', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {log.proposed_content}
                      </Typography>
                      {log.boss_feedback && (
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.3 }}>
                            Boss 反馈:
                          </Typography>
                          <Typography variant="caption" color="error.main" sx={{ display: 'block', fontStyle: 'italic' }}>
                            "{log.boss_feedback}"
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
