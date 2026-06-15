/**
 * AI Team 小组资料页（独立页面）
 *
 * 路由：/team-profile/:teamId
 *
 * 类似 QQ 群资料：小组信息 / 成员列表 / 群聊入口
 *
 * 入口：联系人 → AI Team 群聊（isGroupChat）→ 头部头像 → /team-profile/:teamId
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography,
  Divider, List, ListItem, ListItemAvatar, ListItemText, Stack, Tabs, Tab,
  Card, CardContent, CardActionArea,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
  Description as DescriptionIcon,
  EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import {
  buildGroupId, type AITeamGroupConfig, AI_TEAM_GROUPS,
} from '../lib/contactService';
import { localAgentManifests } from '../lib/agentMarketService';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description?: string;
  isBoss?: boolean;
}

/** 解析小组成员清单（Boss + Agent members） */
function buildTeamMembers(config: AITeamGroupConfig): TeamMember[] {
  const list: TeamMember[] = [
    {
      id: 'self',
      name: 'Boss',
      role: '老板',
      avatar: '👑',
      description: '小组创建者 / 任务派发者',
      isBoss: true,
    },
  ];
  for (const [memberId, member] of Object.entries(config.members || {})) {
    list.push({
      id: memberId,
      name: member.name,
      role: member.role,
      avatar: member.avatar,
    });
  }
  return list;
}

/** 从 localAgentManifests 找 member 描述 / 能力 */
function lookupAgentDescription(agentId: string): string {
  const m: any = (localAgentManifests as any)[agentId];
  return m?.description || m?.capabilities?.description || '';
}

export default function TeamProfilePage() {
  const { teamId = '' } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // teamId 可能是:
  // 1) 原始 group_id (ai-team-group-xxx) - 来自 /chat/ai-team-group-xxx 头像点击 parseTeamId
  // 2) 原始 team_id (xxx) - 直接访问 /team-profile/xxx
  const normalizedId = teamId.startsWith('ai-team-group-') ? teamId : buildGroupId(teamId);
  const config: AITeamGroupConfig | undefined = useMemo(() => {
    return AI_TEAM_GROUPS[normalizedId] || AI_TEAM_GROUPS[teamId];
  }, [normalizedId, teamId]);

  // 监听 AI_TEAM_GROUPS 异步填充（首次访问时群组可能尚未 sync）
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!config) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} size="small">
            <BackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>AI Team 小组详情</Typography>
        </Box>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography color="text.secondary">正在加载小组 {teamId} ...</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            小组配置可能尚未同步,稍候自动重试
          </Typography>
        </Paper>
      </Box>
    );
  }

  const members = buildTeamMembers(config);
  const groupId = buildGroupId(config.teamId);
  const memberCount = members.length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* 顶部导航 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <BackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>AI Team 小组详情</Typography>
      </Box>

      {/* Banner - 小组图标 / 名称 / 描述 / 关键操作 */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, ' + (config.color || '#ff6d00') + '20 0%, ' + (config.color || '#ff6d00') + '05 100%)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              backgroundColor: (config.color || '#ff6d00') + '20',
              border: '2px solid',
              borderColor: (config.color || '#ff6d00') + '40',
              flexShrink: 0,
            }}
          >
            {config.icon || <GroupIcon sx={{ fontSize: 48 }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={700} noWrap>{config.name}</Typography>
              <Chip
                label={'ID: ' + config.teamId}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace', height: 22 }}
              />
              <Chip
                label={memberCount + ' 位成员'}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 22 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
              {config.description || 'AI Team 小组,协同完成特定业务场景。'}
            </Typography>
          </Box>
        </Box>
        {/* 关键操作按钮组 */}
        <Box sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat/' + groupId)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: config.color || '#ff6d00',
              '&:hover': { backgroundColor: config.color || '#ff6d00', opacity: 0.9 },
            }}
          >
            打开群聊
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => alert('小组设置:待开发 (可配置成员角色 / 默认任务模板)')}
            sx={{ textTransform: 'none' }}
          >
            小组设置
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => alert('邀请 Agent 加入:待开发 (从 Agent 市场挑选后拖入)')}
            sx={{ textTransform: 'none' }}
          >
            邀请成员
          </Button>
        </Box>
      </Paper>

      {/* Tabs 切换: 成员 / 任务 / 描述 */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 1,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
          }}
        >
          <Tab label={'成员 (' + memberCount + ')'} />
          <Tab label="小组描述" />
          <Tab label="快捷命令" />
        </Tabs>

        {/* Tab 0: 成员列表 */}
        {tabValue === 0 && (
          <Box sx={{ p: 1.5 }}>
            <List dense disablePadding>
              {members.map((m) => (
                <ListItem
                  key={m.id}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    mb: 0.5,
                    '&:hover': { backgroundColor: 'action.hover' },
                    cursor: m.isBoss ? 'default' : 'pointer',
                  }}
                  onClick={() => {
                    if (m.isBoss) return;
                    navigate('/agent-profile/' + m.id);
                  }}
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        backgroundColor: m.isBoss ? '#fff3e0' : (config.color || '#ff6d00') + '15',
                      }}
                    >
                      {m.avatar}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{m.name}</Typography>
                        {m.isBoss && (
                          <Chip label="创建者" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                        <Chip
                          label={m.role}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                        {m.description && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 360 }}>
                            {m.description}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                  {!m.isBoss && (
                    <Tooltip title="查看 Agent 详情">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); navigate('/agent-profile/' + m.id); }}
                      >
                        <BackIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Tab 1: 小组描述 */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DescriptionIcon fontSize="small" />小组简介
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.7 }}>
                  {config.description || '暂无简介'}
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EmojiEventsIcon fontSize="small" />典型场景
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                  {getTypicalScenes(config.teamId).map((s) => (
                    <Chip key={s} label={s} size="small" sx={{ backgroundColor: (config.color || '#ff6d00') + '15', color: config.color || '#ff6d00' }} />
                  ))}
                </Box>
              </Box>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">成员职责</Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {Object.entries(config.members || {}).map(([id, m]) => (
                    <Box key={id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '1.2rem' }}>{m.avatar}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{m.name} · {m.role}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lookupAgentDescription(id) || '负责 ' + m.role + ' 相关工作'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Tab 2: 快捷命令 */}
        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              在群聊中输入以下命令可快速触发对应能力
            </Typography>
            <Stack spacing={1}>
              {getTeamShortcuts(config.teamId).map((sc) => (
                <Card key={sc.cmd} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardActionArea
                    onClick={() => {
                      navigator.clipboard?.writeText(sc.cmd).catch(() => {});
                      navigate('/chat/' + groupId);
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main', minWidth: 140 }}>
                          {sc.cmd}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                          {sc.desc}
                        </Typography>
                        <Chip label="点击复制" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

/** 小组典型场景(从 teamId 推断) */
function getTypicalScenes(teamId: string): string[] {
  const scenes: Record<string, string[]> = {
    'biz-ops': ['店铺运营分析', '订单处理协调', '客户问题跟进', '营销活动策划'],
    'finance': ['每日流水对账', '应收账款提醒', '财务报表生成', '成本异常告警'],
    'supply-chain': ['采购计划制定', '供应商比价', '库存预警', '物流跟踪'],
    'marketing': ['内容选题策划', '渠道投放优化', '用户画像分析', '活动复盘'],
  };
  return scenes[teamId] || ['日常协作', '任务派发', '进度同步', '问题升级'];
}

/** 小组快捷命令(后续可按 teamId 返回不同快捷命令) */
function getTeamShortcuts(_teamId: string): Array<{ cmd: string; desc: string }> {
  return [
    { cmd: '/task list', desc: '查看所有任务进度' },
    { cmd: '/status', desc: '查看各成员状态' },
    { cmd: '/report', desc: '生成小组工作报告' },
    { cmd: '/help', desc: '查看所有可用命令' },
  ];
}
