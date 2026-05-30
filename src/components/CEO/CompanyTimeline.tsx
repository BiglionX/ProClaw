/**
 * 公司时间轴组件 (PRD v6.3 第 4.2 节)
 * 故事化展示虚拟公司的关键决策节点、里程碑、成功/失败案例
 * Boss 可标注"高光时刻"或"转折点"
 */

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Flag as GoalIcon, TaskAlt as MilestoneIcon, CheckCircle as SuccessIcon,
  Error as FailIcon, Timeline as TimelineIcon, PlayArrow as DecisionIcon,
  Star as HighlightIcon, Star as StarIcon,
} from '@mui/icons-material';
import { proclawDecision, proclawContext, proclawTasks } from '../../lib/ceoController';

interface TimelineEvent {
  id: string;
  type: 'milestone' | 'decision' | 'task_success' | 'task_fail' | 'context_goal';
  title: string;
  description: string;
  timestamp: number;
  isHighlight?: boolean;
  isTurningPoint?: boolean;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  milestone: <MilestoneIcon sx={{ fontSize: 16 }} />,
  decision: <DecisionIcon sx={{ fontSize: 16 }} />,
  task_success: <SuccessIcon sx={{ fontSize: 16 }} />,
  task_fail: <FailIcon sx={{ fontSize: 16 }} />,
  context_goal: <GoalIcon sx={{ fontSize: 16 }} />,
};

const EVENT_COLORS: Record<string, string> = {
  milestone: '#2979ff',
  decision: '#ff9100',
  task_success: '#4caf50',
  task_fail: '#f44336',
  context_goal: '#7c4dff',
};

const EVENT_LABELS: Record<string, string> = {
  milestone: '里程碑',
  decision: '决策',
  task_success: '成功',
  task_fail: '失败',
  context_goal: '目标',
};

export default function CompanyTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const [decisions, contexts, taskList] = await Promise.all([
        proclawDecision.queryLogs({ limit: 50 }),
        proclawContext.query({}),
        proclawTasks.list({ limit: 20 }),
      ]);

      const allEvents: TimelineEvent[] = [];

      // 从决策日志构建事件
      decisions.forEach((d) => {
        let title = '';
        try {
          const parsed = JSON.parse(d.proposed_content);
          title = parsed.intentSummary || parsed.action || d.decision_type;
        } catch {
          title = d.decision_type;
        }
        allEvents.push({
          id: `dec_${d.id}`,
          type: 'decision',
          title: title.substring(0, 80),
          description: d.boss_decision ? `Boss 已${d.boss_decision === 'approved' ? '确认' : d.boss_decision === 'rejected' ? '拒绝' : '编辑'}` : '待确认',
          timestamp: d.created_at,
        });
      });

      // 从 PCP 目标构建事件
      contexts
        .filter((c) => c.context_type === 'milestone' || c.context_type === 'goal')
        .forEach((c) => {
          allEvents.push({
            id: `pcp_${c.id}`,
            type: c.context_type === 'milestone' ? 'milestone' : 'context_goal',
            title: c.title || '无标题',
            description: c.description || '',
            timestamp: c.created_at,
          });
        });

      // 从任务结果构建事件
      taskList
        .filter((t) => t.status === 'completed' || t.status === 'failed')
        .forEach((t) => {
          allEvents.push({
            id: `task_${t.id}`,
            type: t.status === 'completed' ? 'task_success' : 'task_fail',
            title: t.description || '任务',
            description: `分配给 ${t.assigned_agent_id}`,
            timestamp: t.completed_at || t.created_at,
          });
        });

      // 按时间排序（降序）
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(allEvents);
    } catch (e) {
      console.error('Failed to load timeline:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleHighlight = (id: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', maxHeight: 500, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TimelineIcon sx={{ fontSize: 20, color: '#7c4dff' }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          公司时间轴
        </Typography>
        <Typography variant="caption" color="text.disabled">
          共 {events.length} 个事件
        </Typography>
      </Box>

      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          暂无时间轴数据，开始使用后会自动生成
        </Typography>
      ) : (
        <Box sx={{ position: 'relative', pl: 3 }}>
          {/* 时间线竖线 */}
          <Box sx={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, bgcolor: '#e0e0e0' }} />

          {events.map((event, index) => {
            const color = EVENT_COLORS[event.type] || '#757575';
            const isHighlighted = highlightedIds.has(event.id);

            return (
              <Box
                key={event.id}
                sx={{
                  position: 'relative',
                  pb: index < events.length - 1 ? 2 : 0,
                  opacity: event.type === 'task_fail' ? 0.8 : 1,
                }}
              >
                {/* 圆点 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: -23,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: `2px solid ${isHighlighted ? '#ffd700' : 'white'}`,
                    boxShadow: isHighlighted ? '0 0 0 2px #ffd700' : '0 0 0 1px #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />

                {/* 时间 */}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.2 }}>
                  {formatTime(event.timestamp)}
                </Typography>

                {/* 事件卡片 */}
                <Paper
                  elevation={0}
                  sx={{
                    mt: 0.3,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: isHighlighted ? '#fffde7' : '#fafafa',
                    border: `1px solid ${isHighlighted ? '#ffd54f' : '#e0e0e0'}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Box sx={{ color, mt: 0.2 }}>{EVENT_ICONS[event.type]}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                        <Chip
                          label={EVENT_LABELS[event.type] || event.type}
                          size="small"
                          sx={{ height: 16, fontSize: '0.55rem', bgcolor: `${color}20`, color, fontWeight: 600 }}
                        />
                        {isHighlighted && (
                          <Chip
                            icon={<StarIcon sx={{ fontSize: 10 }} />}
                            label="高光"
                            size="small"
                            sx={{ height: 16, fontSize: '0.5rem', bgcolor: '#ffd700', color: '#333', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                        {event.title}
                      </Typography>
                      {event.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, mt: 0.2 }}>
                          {event.description}
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title={isHighlighted ? '取消标注' : '标注为高光时刻'}>
                      <IconButton
                        size="small"
                        onClick={() => toggleHighlight(event.id)}
                        sx={{ p: 0.3, mt: -0.3 }}
                      >
                        <HighlightIcon sx={{ fontSize: 14, color: isHighlighted ? '#ffd700' : '#e0e0e0' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
