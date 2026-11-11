/**
 * MoAResultPanel — MoA 多模型提议可视化
 *
 * 展示一次 MoA 调用的完整过程:
 *  - 触发评估
 *  - 每个 proposer 的提议(角色/耗时/输出)
 *  - 裁判评分(柱状图)
 *  - 最终输出
 *  - Fallback 原因(若未走 aggregator)
 *
 * 给 demo 用,通过 api.demoMoAResult() 拿样例数据。
 * 真实场景下,在 CEO Agent 的回复面板里嵌入。
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bolt as FastIcon,
  Psychology as ThoroughIcon,
  Lightbulb as CreativeIcon,
  Balance as BalancedIcon,
  Gavel as JudgeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import type { MoAProposer } from '../../lib/hermes';
import { useHermesApi } from './useHermesApi';

const ROLE_ICON: Record<MoAProposer['role'], React.ReactNode> = {
  fast: <FastIcon fontSize="small" color="primary" />,
  thorough: <ThoroughIcon fontSize="small" color="primary" />,
  creative: <CreativeIcon fontSize="small" color="primary" />,
  balanced: <BalancedIcon fontSize="small" color="primary" />,
};

const ROLE_LABEL: Record<MoAProposer['role'], string> = {
  fast: '快速',
  thorough: '深入',
  creative: '创意',
  balanced: '平衡',
};

interface MoAResultPanelProps {
  /** 用 demo 数据(默认 true)。真实接入时改 false 并通过 prop 传 result */
  useDemo?: boolean;
}

export function MoAResultPanel({ useDemo = true }: MoAResultPanelProps) {
  const api = useHermesApi();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.demoMoAResult>> | null>(null);

  useEffect(() => {
    if (useDemo) {
      void api.demoMoAResult().then(setData);
    }
  }, [useDemo, api]);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const maxScore = Math.max(
    1,
    ...data.verdictScores.map((v) => (Number.isFinite(v.score) ? v.score : 0)),
  );
  const trigger = data.triggered;

  return (
    <Stack spacing={2}>
      {/* 触发指示 */}
      <Alert
        severity={trigger ? 'success' : 'warning'}
        icon={trigger ? <CheckIcon /> : <WarningIcon />}
      >
        {trigger
          ? `MoA 已触发,综合 ${data.proposals.length} 个模型提议`
          : `MoA 未触发,已降级为单模型直连`}
      </Alert>

      {/* 提议卡片 */}
      <Typography variant="subtitle2">提议层({data.proposals.length} 个模型并行)</Typography>
      <Stack spacing={1.5}>
        {data.proposals.map((p) => (
          <Card key={p.provider} variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                {ROLE_ICON[p.role as MoAProposer['role']] ?? <BalancedIcon />}
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {p.provider} · {ROLE_LABEL[p.role as MoAProposer['role']] ?? p.role}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TimeIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {p.durationMs}ms
                  </Typography>
                </Stack>
              </Stack>
              <Typography variant="body2">{p.output}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* 裁判评分 */}
      <Divider />
      <Stack direction="row" alignItems="center" spacing={1}>
        <JudgeIcon color="primary" />
        <Typography variant="subtitle2">裁判评分</Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`信心度 ${(data.confidence * 100).toFixed(0)}%`}
          size="small"
          color={data.confidence >= 0.7 ? 'success' : data.confidence >= 0.4 ? 'warning' : 'default'}
        />
      </Stack>
      <Stack spacing={1}>
        {data.verdictScores.map((v) => (
          <Box key={v.providerId}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2">{v.providerId}</Typography>
              <Typography variant="body2" fontWeight={500}>
                {v.score}/10
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.max(0, Math.min(100, (v.score / maxScore) * 100))}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: v.score >= 8 ? 'success.main' : v.score >= 5 ? 'primary.main' : 'warning.main',
                },
              }}
            />
          </Box>
        ))}
      </Stack>

      {/* 最终输出 */}
      <Divider />
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
        <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
          🤖 裁判综合输出
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {data.finalOutput}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          总耗时 {data.totalDurationMs}ms · 来源:{trigger ? 'aggregator' : 'single-model-fallback'}
        </Typography>
      </Paper>
    </Stack>
  );
}