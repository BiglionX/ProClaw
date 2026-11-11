/**
 * HermesSkillsPage — Hermes Skills 管理主页面
 *
 * 包含 4 个 Tab:
 *  1. 总览:统计卡片 + 待审核入口
 *  2. 技能库:SkillTree + 检索测试
 *  3. 进化日志:SkillEvolveLog 时间线
 *  4. MoA 演示:MoAResultPanel
 *
 * 风格与 ProClaw 现有页面保持一致(MUI + 自定义卡片)。
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Psychology as BrainIcon,
  Timeline as TimelineIcon,
  Gavel as MoAIcon,
  Hub as HubIcon,
  Build as BuildIcon,
  CheckCircle as ActiveIcon,
  HourglassTop as PendingIcon,
} from '@mui/icons-material';
import type { Skill, ScoredSkill } from '../lib/hermes';
import { useHermesApi } from '../components/hermes/useHermesApi';
import { SkillTree } from '../components/hermes/SkillTree';
import { SkillDetailDrawer } from '../components/hermes/SkillDetailDrawer';
import { SkillEvolveLog } from '../components/hermes/SkillEvolveLog';
import { PendingReviewPanel } from '../components/hermes/PendingReviewPanel';
import { MoAResultPanel } from '../components/hermes/MoAResultPanel';

interface StatsData {
  total: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'primary' | 'success' | 'warning' | 'default';
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}.50`,
              color: `${color}.main`,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function HermesSkillsPage({ embedded = false }: { embedded?: boolean }) {
  const api = useHermesApi();
  const [tab, setTab] = useState(0);
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<ScoredSkill[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = async () => {
    try {
      const [all, st] = await Promise.all([api.listSkills({ limit: 500 }), api.stats()]);
      setSkills(all);
      setStats(st);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const handleTestRetrieval = async () => {
    if (!testQuery.trim()) {
      setTestResults(null);
      return;
    }
    const results = await api.testRetrieval(testQuery, 5);
    setTestResults(results);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">加载失败:{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: embedded ? 0 : 3, maxWidth: 1400, mx: embedded ? 0 : 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <HubIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant={embedded ? 'h5' : 'h4'}>Hermes Skills 管理</Typography>
          <Typography variant="body2" color="text.secondary">
            越用越聪明的 AI Agent · 技能自进化 + MoA 模型委员会 + 工具自愈
          </Typography>
        </Box>
        <IconButton onClick={refreshAll} aria-label="刷新">
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatsCard icon={<BrainIcon />} label="总技能数" value={stats.total} color="primary" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<ActiveIcon />}
              label="已激活"
              value={stats.byStatus.active ?? 0}
              color="success"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<PendingIcon />}
              label="待审核"
              value={stats.byStatus.pending_review ?? 0}
              color="warning"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<BuildIcon />}
              label="预设技能"
              value={stats.bySource.preset ?? 0}
              color="default"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="总览" />
          <Tab label="技能库" />
          <Tab label="进化日志" />
          <Tab label="MoA 演示" />
        </Tabs>
      </Paper>

      {/* Tab 内容 */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              待审核技能
            </Typography>
            <PendingReviewPanel />
          </Box>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              最近活动
            </Typography>
            <SkillEvolveLog limit={10} />
          </Box>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={3}>
          {/* 检索测试 */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              检索测试
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="试试:帮我看看哪些商品库存不足 / 上周销售怎么样"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestRetrieval()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button variant="contained" onClick={handleTestRetrieval}>
                检索
              </Button>
            </Stack>
            {testResults && (
              <Stack spacing={1}>
                {testResults.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    没有命中任何技能
                  </Typography>
                ) : (
                  testResults.map((r) => (
                    <Stack
                      key={r.skill.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                      onClick={() => setDetailSkill(r.skill)}
                    >
                      <Chip
                        label={`综合 ${Number.isFinite(r.compositeScore) ? r.compositeScore.toFixed(2) : '—'}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {r.skill.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.skill.description}
                      </Typography>
                    </Stack>
                  ))
                )}
              </Stack>
            )}
          </Paper>

          {/* 技能树 */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              全部技能
            </Typography>
            {skills === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <SkillTree skills={skills} onSelectSkill={setDetailSkill} />
            )}
          </Box>
        </Stack>
      )}

      {tab === 2 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            进化日志(自动记录每次 create / optimize / merge / skip)
          </Typography>
          <SkillEvolveLog limit={100} autoRefreshMs={5000} />
        </Box>
      )}

      {tab === 3 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            MoA 模型委员会演示
          </Typography>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <MoAResultPanel useDemo />
          </Paper>
        </Box>
      )}

      <SkillDetailDrawer
        skill={detailSkill}
        open={detailSkill !== null}
        onClose={() => setDetailSkill(null)}
        onChanged={refreshAll}
      />
    </Box>
  );
}