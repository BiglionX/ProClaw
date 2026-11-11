/**
 * SkillTree — 技能树状列表
 *
 * 按 status + source 分组展示所有技能,支持:
 *  - 展开/折叠分组
 *  - 单击查看详情(通过 onSelectSkill 回调)
 *  - 显示成功率(成功次数 / 总使用次数)
 *  - 标签徽章
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  AutoAwesome as SparkleIcon,
  Build as BuildIcon,
  Psychology as LearnedIcon,
  Tune as OptimizedIcon,
  CheckCircle as ActiveIcon,
  Archive as ArchivedIcon,
  HourglassTop as PendingIcon,
} from '@mui/icons-material';
import type { Skill, SkillStatus, SkillSource } from '../../lib/hermes';

interface SkillTreeProps {
  skills: Skill[];
  /** 用户点击某条技能 */
  onSelectSkill?: (skill: Skill) => void;
  /** 默认折叠 archived */
  defaultCollapseArchived?: boolean;
}

interface Group {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: 'default' | 'primary' | 'success' | 'warning' | 'error';
  items: Skill[];
}

const SOURCE_ICON: Record<SkillSource, React.ReactNode> = {
  preset: <BuildIcon fontSize="small" />,
  learned: <LearnedIcon fontSize="small" />,
  optimized: <OptimizedIcon fontSize="small" />,
};

const SOURCE_LABEL: Record<SkillSource, string> = {
  preset: '预设',
  learned: 'AI 学习',
  optimized: 'AI 优化',
};

const STATUS_ICON: Record<SkillStatus, React.ReactNode> = {
  active: <ActiveIcon fontSize="small" color="success" />,
  pending_review: <PendingIcon fontSize="small" color="warning" />,
  archived: <ArchivedIcon fontSize="small" color="disabled" />,
};

const STATUS_LABEL: Record<SkillStatus, string> = {
  active: '已激活',
  pending_review: '待审核',
  archived: '已归档',
};

const SOURCE_KEYS: readonly SkillSource[] = ['preset', 'learned', 'optimized'];

function buildGroups(skills: Skill[], collapseArchived: boolean): Group[] {
  // 按 status + source 二级分组
  const byStatus: Record<SkillStatus, Skill[]> = {
    active: [],
    pending_review: [],
    archived: [],
  };
  for (const s of skills) {
    byStatus[s.status].push(s);
  }

  const groups: Group[] = [];

  // active: 按 source 分
  for (const source of SOURCE_KEYS) {
    const items = byStatus.active.filter((s) => s.source === source);
    if (items.length === 0) continue;
    groups.push({
      key: `active-${source}`,
      label: `${STATUS_LABEL.active} · ${SOURCE_LABEL[source]}`,
      icon: SOURCE_ICON[source],
      color: 'success',
      items: items.sort((a, b) => b.version - a.version),
    });
  }

  // pending_review 单独一组(顶部优先)
  if (byStatus.pending_review.length > 0) {
    groups.unshift({
      key: 'pending',
      label: `${STATUS_LABEL.pending_review} (${byStatus.pending_review.length})`,
      icon: <PendingIcon fontSize="small" />,
      color: 'warning',
      items: byStatus.pending_review,
    });
  }

  // archived 默认折叠
  if (byStatus.archived.length > 0) {
    groups.push({
      key: 'archived',
      label: `${STATUS_LABEL.archived} (${byStatus.archived.length})`,
      icon: <ArchivedIcon fontSize="small" />,
      color: 'default',
      items: byStatus.archived,
    });
  }

  return groups;
}

function computeSuccessRate(skill: Skill): number {
  // > 0 而不是 === 0:防止历史脏数据(usageCount 为 undefined/NaN)渲染出 NaN
  if (!(skill.usageCount > 0)) return 0;
  return skill.successCount / skill.usageCount;
}

export function SkillTree({ skills, onSelectSkill, defaultCollapseArchived = true }: SkillTreeProps) {
  const groups = useMemo(
    () => buildGroups(skills, defaultCollapseArchived),
    [skills, defaultCollapseArchived],
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      init[g.key] = !g.key.startsWith('archived');
    }
    return init;
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (skills.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          暂无技能。等待 Agent 执行并自动进化,或手动新建。
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      {groups.map((group) => (
        <Paper key={group.key} variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            onClick={() => toggle(group.key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              cursor: 'pointer',
              bgcolor: 'action.hover',
              userSelect: 'none',
            }}
          >
            <IconButton size="small" sx={{ mr: 0.5 }}>
              {expanded[group.key] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
            {group.icon}
            <Typography variant="subtitle2" sx={{ ml: 1, flex: 1 }}>
              {group.label}
            </Typography>
            <Chip
              label={group.items.length}
              size="small"
              color={group.color === 'default' ? 'default' : group.color}
              variant="outlined"
            />
          </Box>
          <Collapse in={expanded[group.key] ?? false}>
            <List dense disablePadding>
              {group.items.map((skill) => {
                const successRate = computeSuccessRate(skill);
                return (
                  <ListItem
                    key={skill.id}
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={`触发 ${skill.usageCount} 次 · 成功率 ${(successRate * 100).toFixed(0)}%`}>
                          <Chip
                            label={`${(successRate * 100).toFixed(0)}%`}
                            size="small"
                            color={
                              successRate >= 0.8 ? 'success' : successRate >= 0.5 ? 'warning' : 'default'
                            }
                            variant="outlined"
                          />
                        </Tooltip>
                        <Tooltip title={`v${skill.version}${skill.parentVersion ? ` ← v${skill.parentVersion}` : ''}`}>
                          <Chip label={`v${skill.version}`} size="small" variant="outlined" />
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemButton onClick={() => onSelectSkill?.(skill)}>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <span>{skill.name}</span>
                            {skill.tags.slice(0, 3).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            ))}
                          </Stack>
                        }
                        secondary={skill.description}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        </Paper>
      ))}
    </Stack>
  );
}