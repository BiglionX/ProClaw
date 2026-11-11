/**
 * PendingReviewPanel — 待审核技能列表面板
 *
 * 商户在主页面上能一眼看到所有 AI 自动生成 / 优化的待审核技能,
 * 一键批准 / 拒绝。点击卡片 → 打开 SkillDetailDrawer。
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HourglassTop as PendingIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import type { Skill } from '../../lib/hermes';
import { useHermesApi } from './useHermesApi';
import { SkillDetailDrawer } from './SkillDetailDrawer';

export function PendingReviewPanel() {
  const api = useHermesApi();
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  const refresh = async () => {
    try {
      const all = await api.listSkills({ status: 'pending_review', limit: 100 });
      setSkills(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (error) return <Alert severity="error">加载待审核列表失败:{error}</Alert>;
  if (skills === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (skills.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <PendingIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          暂无待审核技能。Agent 进化出新的技能后会出现在这里。
        </Typography>
      </Card>
    );
  }

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <PendingIcon color="warning" />
        <Typography variant="subtitle1">
          {skills.length} 个待审核技能
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {skills.map((skill) => (
          <Grid item xs={12} md={6} lg={4} key={skill.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {skill.name}
                  </Typography>
                  <Chip label={`v${skill.version}`} size="small" variant="outlined" />
                  <Chip label={skill.source} size="small" color="primary" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {skill.description}
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mb: 1 }}>
                  {skill.triggerPhrases.slice(0, 3).map((p) => (
                    <Chip key={p} label={p} size="small" color="primary" variant="outlined" />
                  ))}
                  {skill.triggerPhrases.length > 3 && (
                    <Chip label={`+${skill.triggerPhrases.length - 3}`} size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  工具:{skill.toolTemplates.map((t) => t.toolName).join(', ') || '(无)'}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => setDetailSkill(skill)}
                >
                  查看
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={async () => {
                    await api.rejectSkill(skill.id);
                    void refresh();
                  }}
                >
                  拒绝
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={async () => {
                    await api.approveSkill(skill.id);
                    void refresh();
                  }}
                >
                  通过
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <SkillDetailDrawer
        skill={detailSkill}
        open={detailSkill !== null}
        onClose={() => setDetailSkill(null)}
        onChanged={() => {
          setDetailSkill(null);
          void refresh();
        }}
      />
    </>
  );
}