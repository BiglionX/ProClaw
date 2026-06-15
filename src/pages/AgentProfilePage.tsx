/**
 * Agent 介绍页（独立页面）
 *
 * 路由：/agent-profile/:agentId
 *
 * 三段式布局：
 *  1. Banner：大头像（点击 → 打开头像库 Dialog）+ 昵称 + 基本信息
 *  2. Skill 介绍卡片：description + capabilities（带中文标签）
 *  3. 能力配置卡片：开关/按钮（启用-禁用、调用入口、权限详情）
 *
 * UX 流程（来自设计要求）：
 *   联系人行/头像 → /chat/:id   先打开聊天
 *   聊天页头部头像 → /agent-profile/:agentId  进入本页
 *   本页大头像 → 打开头像库 Dialog  变更头像
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CameraAlt as CameraIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  SmartToy as BotIcon,
  Chat as ChatIcon,
  Videocam as VideoIcon,
  Phone as PhoneIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  AssignmentTurnedIn as SkillIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { useAgentManagerStore } from '../lib/agentManagerStore';
import {
  AGENT_AVATAR_PRESETS,
  getDefaultAgentAvatar as getDefaultAvatarUrl,
} from '../types/agentAvatarLibrary';
import {
  getAgentProfileOverride,
  saveAgentProfileOverride,
  uploadCustomAvatar,
  readCustomAvatarDataUrl,
  resetAgentProfile,
  type AgentProfileOverride,
} from '../lib/agentProfileService';
import { localAgentManifests } from '../lib/agentMarketService';

/** capability 字符串 → 中文描述（覆盖本地常见 Agent） */
const CAPABILITY_LABELS: Record<string, string> = {
  seo_analysis: 'SEO 分析',
  keyword_tracking: '关键词追踪',
  site_audit: '站点健康审计',
  content_generation: '内容生成',
  deepseek_integration: 'DeepSeek 大模型集成',
  boss_confirmation: 'Boss 确认机制',
  data_analytics: '数据分析',
  ga4_integration: 'Google Analytics 4 集成',
  trend_detection: '异常趋势预警',
  conversion_optimization: '转化优化',
  ab_testing: 'A/B 测试',
  funnel_analysis: '漏斗分析',
  social_account_binding: '社交账号 OAuth 绑定',
  oauth_flow: 'OAuth 流程',
  content_publishing: '内容发布',
  schedule_management: '定时发布',
  engagement_tracking: '互动数据追踪',
};

function getCapabilityLabel(cap: string): string {
  if (CAPABILITY_LABELS[cap]) return CAPABILITY_LABELS[cap];
  // 通用转换：下划线 → 空格，首字母大写
  return cap.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
}

/** 权限字符串 → 中文友好显示 */
const PERMISSION_LABELS: Record<string, string> = {
  read_user: '读取用户信息',
  read_contacts: '读取联系人',
  send_message: '发送消息',
  show_notification: '系统通知',
  http_request: '发起网络请求',
  read_files: '读取本地文件',
  write_files: '写入本地文件',
};

function getPermissionLabel(perm: string): string {
  return PERMISSION_LABELS[perm] || perm;
}

export default function AgentProfilePage() {
  const { agentId = '' } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const agents = useAgentManagerStore(s => s.agents);
  const fetchAgents = useAgentManagerStore(s => s.fetchAgents);

  const [loading, setLoading] = useState(true);
  const [override, setOverride] = useState<AgentProfileOverride | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatarKey, setEditAvatarKey] = useState<string | null>(null);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity?: 'success' | 'error' } | null>(null);

  // 头像库 Dialog
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarDialogTab, setAvatarDialogTab] = useState(0); // 0=头像库 1=上传

  // 能力配置状态
  const [agentEnabled, setAgentEnabled] = useState(true);

  // 查找 manifest（优先本地内置，其次 agentManagerStore）
  const localManifest = localAgentManifests[agentId];
  const agent = useMemo(() => agents.find(a => a.manifest.id === agentId), [agents, agentId]);

  // 合并 manifest：本地 > store
  const mergedManifest = useMemo(() => {
    if (localManifest) {
      return {
        id: localManifest.id,
        name: localManifest.name,
        version: localManifest.version,
        entry: localManifest.entry,
        permissions: localManifest.permissions,
        icon: localManifest.icon,
        description: localManifest.description,
        author: localManifest.author,
        homepage: localManifest.homepage,
        capabilities: localManifest.capabilities,
      };
    }
    if (agent?.manifest) {
      // store 里的 manifest 不含 capabilities，置空数组
      return { ...agent.manifest, capabilities: undefined as string[] | undefined };
    }
    return null;
  }, [localManifest, agent]);

  const defaultName = mergedManifest?.name || agentId;
  const defaultEmoji = mergedManifest?.icon || '🤖';
  const description = mergedManifest?.description || '该 Agent 暂无介绍。';
  const capabilities: string[] = (mergedManifest as any)?.capabilities || [];
  const permissions = mergedManifest?.permissions || [];

  // 加载 override + 头像数据
  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    (async () => {
      try {
        if (agents.length === 0) await fetchAgents();
        const ovr = await getAgentProfileOverride(agentId);
        setOverride(ovr);
        setEditName(ovr?.display_name || '');
        setEditAvatarKey(ovr?.avatar_key || null);

        // 加载 custom 头像
        if (ovr?.custom_avatar_path) {
          const dataUrl = await readCustomAvatarDataUrl(ovr.custom_avatar_path);
          if (dataUrl) setCustomAvatarDataUrl(dataUrl);
        }
      } catch (e) {
        console.error('[AgentProfilePage] 加载失败:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId, agents.length, fetchAgents]);

  /** 当前显示的头像 URL：custom > avatarKey 库 > 默认 */
  const currentAvatarUrl = useMemo(() => {
    if (customAvatarDataUrl) return customAvatarDataUrl;
    if (editAvatarKey) {
      const preset = AGENT_AVATAR_PRESETS.find(p => p.key === editAvatarKey);
      if (preset) return preset.src;
    }
    return getDefaultAvatarUrl(agentId);
  }, [customAvatarDataUrl, editAvatarKey, agentId]);

  /** 上传图片 */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const result = await uploadCustomAvatar(agentId, file);
      if (result) {
        // 立即把 dataUrl 渲染到 UI
        if (result.relative_path.startsWith('data:')) {
          setCustomAvatarDataUrl(result.relative_path);
        } else {
          const dataUrl = await readCustomAvatarDataUrl(result.relative_path);
          if (dataUrl) setCustomAvatarDataUrl(dataUrl);
        }
        // 清空 avatar_key（自定义头像优先级最高）
        setEditAvatarKey(null);
        setToast({ msg: '头像已上传，点击保存以生效', severity: 'success' });
      }
    } catch (err: any) {
      setToast({ msg: err.message || '上传失败', severity: 'error' });
    } finally {
      setSaving(false);
      // 清空 input value 以便同一文件能再次选择
      e.target.value = '';
    }
  };

  /** 保存：写入 override */
  const handleSave = async () => {
    try {
      setSaving(true);
      const fields: Partial<AgentProfileOverride> = {
        display_name: editName.trim() || null,
        avatar_key: editAvatarKey,
        custom_avatar_path: customAvatarDataUrl && !currentAvatarUrl.startsWith('data:') === false
          ? (override?.custom_avatar_path || null)
          : null,
      };

      // 如果选择的是头像库
      if (editAvatarKey) {
        fields.avatar_key = editAvatarKey;
        fields.custom_avatar_path = null;
      }

      // 如果是 custom 头像
      if (customAvatarDataUrl) {
        fields.avatar_key = null;
        // custom_avatar_path 已经在 uploadCustomAvatar 写入了
        // 但需要从 override 取出来
        if (override?.custom_avatar_path) {
          fields.custom_avatar_path = override.custom_avatar_path;
        }
      }

      // 如果清空了 custom 但之前有
      if (!customAvatarDataUrl && override?.custom_avatar_path) {
        fields.custom_avatar_path = null;
      }

      const saved = await saveAgentProfileOverride(agentId, fields);
      setOverride(saved);
      setToast({ msg: '已保存', severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || '保存失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /** 恢复默认 */
  const handleReset = async () => {
    if (!confirm(`确定要恢复「${defaultName}」的默认昵称和头像吗？`)) return;
    try {
      setSaving(true);
      await resetAgentProfile(agentId);
      setOverride(null);
      setEditName('');
      setEditAvatarKey(null);
      setCustomAvatarDataUrl(null);
      setToast({ msg: '已恢复默认', severity: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || '恢复失败', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /** 从头像库选中（暂存，还需点保存） */
  const handlePickAvatar = (key: string) => {
    setEditAvatarKey(key);
    setCustomAvatarDataUrl(null);
  };

  /** 移除自定义头像 */
  const handleRemoveCustomAvatar = () => {
    setCustomAvatarDataUrl(null);
    setEditAvatarKey(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!agentId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">无效的 Agent ID</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          返回
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto', p: 3 }}>
      {/* 顶部：返回 + 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <BackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          Agent 介绍
        </Typography>
      </Box>

      {/* Banner：大头像（点击 → 打开头像库）+ 昵称 + 基本信息 */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title="点击更换头像" arrow placement="bottom">
            <Box
              onClick={() => setAvatarDialogOpen(true)}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.03)' },
                '&:hover .avatar-overlay': { opacity: 1 },
              }}
            >
              <Avatar
                src={currentAvatarUrl}
                sx={{ width: 96, height: 96, bgcolor: 'grey.200' }}
              >
                {defaultEmoji}
              </Avatar>
              <Box
                className="avatar-overlay"
                sx={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', borderRadius: '50%',
                  color: 'white', fontSize: 12, fontWeight: 600, opacity: 0,
                  transition: 'opacity 0.2s', pointerEvents: 'none', flexDirection: 'column',
                }}
              >
                <CameraIcon sx={{ fontSize: 24, mb: 0.5 }} />
                更换头像
              </Box>
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <TextField
              fullWidth
              size="medium"
              label="昵称"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              helperText={`默认名：${defaultName}（留空则使用默认）`}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={'Agent ID: ' + agentId} size="small" variant="outlined" />
              {mergedManifest?.version && <Chip label={'v' + mergedManifest.version} size="small" variant="outlined" />}
              {mergedManifest?.author && <Chip label={'作者：' + mergedManifest.author} size="small" variant="outlined" />}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Skill 介绍卡片 */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SkillIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>Skill 介绍</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          {description}
        </Typography>
        {capabilities.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              核心能力（{capabilities.length}）
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {capabilities.map((cap: string) => (
                <Chip
                  key={cap}
                  icon={<BoltIcon sx={{ fontSize: 14 }} />}
                  label={getCapabilityLabel(cap)}
                  size="small"
                  sx={{
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: 'primary.main' },
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Paper>

      {/* 能力配置卡片 */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BoltIcon color="warning" />
          <Typography variant="h6" fontWeight={600}>能力配置</Typography>
        </Box>

        <List disablePadding>
          {/* 启用 Agent */}
          <ListItem
            disableGutters
            secondaryAction={
              <Switch
                edge="end"
                checked={agentEnabled}
                onChange={(e) => {
                  setAgentEnabled(e.target.checked);
                  setToast({
                    msg: e.target.checked ? '已启用' : '已禁用',
                    severity: 'success',
                  });
                }}
              />
            }
          >
            <ListItemIcon>
              <BoltIcon color={agentEnabled ? 'success' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="启用 Agent"
              secondary={agentEnabled ? 'Agent 将响应聊天消息和任务' : 'Agent 已禁用，不会接收新任务'}
            />
          </ListItem>

          <Divider component="li" />

          {/* 进入聊天 */}
          <ListItem disableGutters>
            <ListItemIcon>
              <ChatIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="聊天对话" secondary={`与 ${defaultName} 发起聊天`} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={() => navigate(`/chat/${agentId}`)}
            >
              进入聊天
            </Button>
          </ListItem>

          <Divider component="li" />

          {/* 语音通话 */}
          <ListItem disableGutters>
            <ListItemIcon>
              <PhoneIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="语音通话" secondary="通过 AI 语音与 Agent 交流" />
            <Button
              size="small"
              variant="outlined"
              startIcon={<PhoneIcon />}
              onClick={() => {
                navigate('/call');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('proclaw:start-call', {
                    detail: { agentId, mode: 'audio' },
                  }));
                }
              }}
            >
              通话
            </Button>
          </ListItem>

          <Divider component="li" />

          {/* 视频通话 */}
          <ListItem disableGutters>
            <ListItemIcon>
              <VideoIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="视频通话" secondary="与 Agent 进行视频对话" />
            <Button
              size="small"
              variant="outlined"
              startIcon={<VideoIcon />}
              onClick={() => {
                navigate('/call');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('proclaw:start-call', {
                    detail: { agentId, mode: 'video' },
                  }));
                }
              }}
            >
              视频
            </Button>
          </ListItem>

          <Divider component="li" />

          {/* 权限详情 */}
          <ListItem disableGutters alignItems="flex-start">
            <ListItemIcon sx={{ mt: 0.5 }}>
              <SecurityIcon color="action" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  权限声明
                  <Chip label={`${permissions.length} 项`} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {permissions.length === 0 ? (
                    <Typography variant="caption" color="text.disabled">未声明权限</Typography>
                  ) : (
                    permissions.map(p => (
                      <Chip
                        key={p}
                        label={getPermissionLabel(p)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    ))
                  )}
                </Box>
              }
            />
          </ListItem>

          {mergedManifest?.homepage && (
            <>
              <Divider component="li" />
              <ListItem disableGutters>
                <ListItemIcon>
                  <CodeIcon color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="主页 / 文档"
                  secondary={mergedManifest.homepage}
                />
                <Button
                  size="small"
                  variant="text"
                  onClick={() => window.open(mergedManifest.homepage, '_blank')}
                >
                  打开
                </Button>
              </ListItem>
            </>
          )}
        </List>
      </Paper>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="text"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={handleReset}
          disabled={saving}
        >
          恢复默认
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          返回
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          保存
        </Button>
      </Box>

      {/* 头像库 Dialog（点击大头像打开） */}
      <Dialog
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon color="primary" />
          更换头像
        </DialogTitle>
        <DialogContent dividers>
          {/* 简易 Tab 切换 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              variant={avatarDialogTab === 0 ? 'contained' : 'text'}
              onClick={() => setAvatarDialogTab(0)}
              sx={{ borderRadius: 0, borderBottom: avatarDialogTab === 0 ? '2px solid' : 'none' }}
            >
              头像库
            </Button>
            <Button
              size="small"
              variant={avatarDialogTab === 1 ? 'contained' : 'text'}
              onClick={() => setAvatarDialogTab(1)}
              sx={{ borderRadius: 0, borderBottom: avatarDialogTab === 1 ? '2px solid' : 'none' }}
            >
              上传
            </Button>
            <Box sx={{ flex: 1 }} />
            {customAvatarDataUrl && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleRemoveCustomAvatar}
              >
                移除自定义
              </Button>
            )}
          </Box>

          {avatarDialogTab === 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: 1.5,
              }}
            >
              {AGENT_AVATAR_PRESETS.map(preset => {
                const selected = editAvatarKey === preset.key && !customAvatarDataUrl;
                return (
                  <Tooltip key={preset.key} title={preset.label} arrow>
                    <Box
                      onClick={() => handlePickAvatar(preset.key)}
                      sx={{
                        position: 'relative',
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: selected ? 'primary.main' : 'transparent',
                        borderRadius: 2,
                        p: 0.5,
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: selected ? 'primary.main' : 'grey.300' },
                      }}
                    >
                      <Avatar src={preset.src} sx={{ width: '100%', height: 'auto', aspectRatio: '1/1' }} />
                      {selected && (
                        <CheckIcon
                          sx={{
                            position: 'absolute', top: 4, right: 4,
                            color: 'primary.main', bgcolor: 'white', borderRadius: '50%', fontSize: 18,
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          )}

          {avatarDialogTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                支持 PNG / JPG / WebP / SVG，文件大小 ≤ 2MB。建议尺寸 256×256。
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {customAvatarDataUrl ? (
                  <Avatar src={customAvatarDataUrl} sx={{ width: 96, height: 96 }} />
                ) : (
                  <Avatar sx={{ width: 96, height: 96, bgcolor: 'grey.200' }}>
                    <BotIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                  </Avatar>
                )}
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  disabled={saving}
                >
                  选择图片
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleUpload}
                  />
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await handleSave();
              setAvatarDialogOpen(false);
            }}
            disabled={saving}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || 'success'}
          variant="filled"
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
