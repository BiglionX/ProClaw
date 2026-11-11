/**
 * SkillEvolveLog — 进化日志时间线
 *
 * 把 hermes_evolution_log 表的内容以 Timeline 形式展示。
 * 每条日志带:
 *  - 动作(创建/优化/合并/跳过/无操作)
 *  - 关联技能
 *  - 触发原因
 *  - 时间
 *  - 错误信息(若有)
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  AddCircle as CreateIcon,
  Tune as OptimizeIcon,
  MergeType as MergeIcon,
  Block as NoopIcon,
  SkipNext as SkipIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import type { EvolutionLogEntry } from '../../lib/hermes';
import { useHermesApi } from './useHermesApi';

interface SkillEvolveLogProps {
  limit?: number;
  /** 过滤器:仅显示某些 action */
  filterActions?: EvolutionLogEntry['action'][];
  /** 自动刷新间隔(ms),0 = 不刷新 */
  autoRefreshMs?: number;
}

const ACTION_META: Record<
  EvolutionLogEntry['action'],
  { label: string; icon: React.ReactNode; color: 'primary' | 'success' | 'warning' | 'default' | 'error' }
> = {
  create: { label: '新建技能', icon: <CreateIcon fontSize="small" />, color: 'success' },
  optimize: { label: '优化技能', icon: <OptimizeIcon fontSize="small" />, color: 'primary' },
  merge: { label: '合并技能', icon: <MergeIcon fontSize="small" />, color: 'primary' },
  noop: { label: '无操作', icon: <NoopIcon fontSize="small" />, color: 'default' },
  skip: { label: '跳过', icon: <SkipIcon fontSize="small" />, color: 'default' },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export function SkillEvolveLog({ limit = 50, filterActions, autoRefreshMs = 0 }: SkillEvolveLogProps) {
  const api = useHermesApi();
  const [logs, setLogs] = useState<EvolutionLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await api.listEvolutionLog(limit);
      const filtered = filterActions ? data.filter((l) => filterActions.includes(l.action)) : data;
      setLogs(filtered);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refresh();
    if (autoRefreshMs > 0) {
      const id = setInterval(refresh, autoRefreshMs);
      return () => clearInterval(id);
    }
    return undefined;
  }, [limit, autoRefreshMs, filterActions?.join(',')]);

  if (error) {
    return <Alert severity="error">加载进化日志失败:{error}</Alert>;
  }

  if (logs === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (logs.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
        <Typography variant="body2" color="text.secondary">
          还没有进化记录。Agent 执行失败时,会在这里生成「新建技能」的反思事件。
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ position: 'relative' }}>
      {logs.map((log, idx) => {
        const meta = ACTION_META[log.action] ?? ACTION_META.noop;
        return (
          <Box key={log.id} sx={{ position: 'relative', pl: 4 }}>
            {/* 时间线左侧圆点 */}
            <Box
              sx={{
                position: 'absolute',
                left: 8,
                top: 12,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: `${meta.color}.main`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'common.white',
                fontSize: 10,
              }}
            >
              {meta.icon}
            </Box>
            {/* 时间线连接线(除最后一条) */}
            {idx < logs.length - 1 && (
              <Divider
                orientation="vertical"
                sx={{
                  position: 'absolute',
                  left: 13,
                  top: 24,
                  bottom: -12,
                  borderColor: 'divider',
                }}
              />
            )}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Chip label={meta.label} size="small" color={meta.color} />
                {log.skillId && (
                  <Chip
                    label={
                      log.skillId.startsWith('sk_preset_')
                        ? log.skillId
                        : `新技能: ${log.skillId.slice(0, 12)}…`
                    }
                    size="small"
                    variant="outlined"
                  />
                )}
                {log.sourceSkillIds && (
                  <Chip
                    label={`合并自 ${log.sourceSkillIds.length} 个`}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Box sx={{ flex: 1 }} />
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TimeIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(log.timestamp)}
                  </Typography>
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Agent:{log.agentName} · 查询:{log.traceQuery.slice(0, 60)}
                {log.traceQuery.length > 60 ? '…' : ''}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {log.reasoning}
              </Typography>
              {log.error && (
                <Alert severity="error" sx={{ mt: 1 }} icon={<ErrorIcon fontSize="inherit" />}>
                  {log.error}
                </Alert>
              )}
              {log.signals && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    label={`outcome=${log.signals.outcome ?? 'n/a'}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`置信度 ${(log.signals.confidence ?? 0).toFixed(2)}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`工具成功率 ${((log.signals.toolSuccessRate ?? 0) * 100).toFixed(0)}%`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              )}
            </Paper>
          </Box>
        );
      })}
    </Stack>
  );
}