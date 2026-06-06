import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FileDownload as FileDownloadIcon,
  Group as TeamIcon,
  HeadsetMic as HeadsetIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  SmartToy as AgentIcon,
  Public as PublishIcon,
  PublicOff as UnpublishIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import {
  alpha,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  Tabs,
  Tab,
  Alert,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { isTauri, safeInvoke } from '../lib/tauri';
import { syncAITeamGroups, buildGroupId } from '../lib/contactService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AiTeam, CreateTeamPayload, TeamMember, UpdateTeamPayload } from '../lib/teamTypes';
import { PUBLISH_STATUS_MAP, PUBLISH_STATUS_COLOR } from '../lib/teamTypes';
import { getWorkLogsGroupedByDate } from '../lib/teamWorkLogService';
import { useAuthStore } from '../lib/authStore';
import {
  generateTeamRecommendation,
  createRecommendedTeam,
  buildNvwaXUrl,
  type TeamRecommendation,
} from '../lib/aiTeamRecommendationService';
import MarketplaceDialog from '../components/NvwaX/MarketplaceDialog';
import { NvwaXService } from '../lib/nvwaxClient';
import BapSettingsPanel from '../components/Agent/BapSettingsPanel';
import PreferenceSettings from '../components/CEO/PreferenceSettings';
import AiPluginPanel from '../components/Teams/AiPluginPanel';

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<AiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState('');
  const [existingTeamNames, setExistingTeamNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 对话框状态
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<AiTeam | null>(null);
  const [editTeam, setEditTeam] = useState<AiTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  // 页面级 Tab: 0 = Agent管理, 1 = AI团队
  const [activePageTab, setActivePageTab] = useState(0);

  // 导入方式选择对话框
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  // NvwaX 市场对话框
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);

  // 智能推荐状态
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<TeamRecommendation | null>(null);
  const [recommendError, setRecommendError] = useState('');

  // Agent 内联对话框
  const [secretaryOpen, setSecretaryOpen] = useState(false);
  const [ceoConfigOpen, setCeoConfigOpen] = useState(false);


  /** 内置默认团队成员：AI 经营团队全量 7 个 Agent */
  function getBuiltinTeamMembers(): TeamMember[] {
    return [
      {
        agent_id: 'builtin-inventory-optimizer',
        role: '库存优化师',
        responsibilities: '监控库存水平，预警低库存商品，优化安全库存设置，识别滞销品并建议清仓策略。',
        sort_order: 0,
      },
      {
        agent_id: 'builtin-sales-forecaster',
        role: '销售预测分析师',
        responsibilities: '分析历史销售趋势，预测未来销量，识别季节性波动，辅助采购决策。',
        sort_order: 1,
      },
      {
        agent_id: 'builtin-business-analyst',
        role: '业务分析师',
        responsibilities: '多维度业务分析，KPI 监控与解读，生成经营报表和月度报告。',
        sort_order: 2,
      },
      {
        agent_id: 'builtin-purchase-advisor',
        role: '采购顾问',
        responsibilities: '根据库存和销售数据生成采购建议，优化采购批量和频率，管理供应商交付评估。',
        sort_order: 3,
      },
      {
        agent_id: 'builtin-financial-advisor',
        role: '财务分析师',
        responsibilities: '监控现金流健康度，分析应收应付结构，评估定价策略和利润率。',
        sort_order: 4,
      },
      {
        agent_id: 'builtin-cs-agent',
        role: '客户服务助手',
        responsibilities: '自动处理客户咨询、订单查询，维护客户信息，跟踪售后问题。',
        sort_order: 5,
      },
      {
        agent_id: 'builtin-image-searcher',
        role: 'AI智能找图',
        responsibilities: '根据商品名称和描述自动搜索高质量产品图片，支持 Pexels/Pixabay 双源搜索，单商品精搜和批量匹配双模式，智能关键词优化以提升命中率。',
        sort_order: 6,
      },
    ];
  }

  /** 浏览器开发模式下的 mock 内置团队，无需 Tauri IPC */
  function getMockBuiltinTeam(): AiTeam {
    const now = new Date().toISOString();
    return {
      id: 'mock-builtin-team',
      name: 'AI 经营团队',
      description: 'ProClaw 内置的 AI 经营团队（浏览器开发模式），包含 7 个专业 Agent。实际运行请使用 Tauri 桌面端。',
      category: '通用经营',
      config_json: '{}',
      source: 'builtin',
      version: '1.0.0',
      publish_status: 'draft',
      tags: ['库存管理', '销售预测', '数据分析', '采购管理', '财务管理', '客户服务', '智能找图'],
      members: getBuiltinTeamMembers(),
      workflow: { mode: 'sequential', steps: [], fallback_strategy: 'skip_on_error' },
      triggers: {},
      created_at: now,
      updated_at: now,
    };
  }

  /** 首次加载时若无任何团队，自动创建内置默认团队 */
  async function ensureBuiltinTeam() {
    try {
      // 检查是否已存在内置团队
      const existing = await safeInvoke<AiTeam[]>('get_teams');
      if (existing && existing.length > 0) return;

      // 创建默认的 "AI 经营团队"
      const payload: CreateTeamPayload = {
        name: 'AI 经营团队',
        description: 'ProClaw 内置的 AI 经营团队，包含 7 个专业 Agent：库存优化师、销售预测分析师、业务分析师、采购顾问、财务分析师、客户服务助手、AI智能找图。可根据您的业务数据通过"AI 智能推荐"功能动态调整成员配置。',
        category: '通用经营',
        tags: ['库存管理', '销售预测', '数据分析', '采购管理', '财务管理', '客户服务', '智能找图'],
        members: getBuiltinTeamMembers(),
        workflow: {
          mode: 'sequential',
          steps: [
            { order: 1, agent_role: '业务分析师', action: 'analyze', input_from: 'system_trigger' },
            { order: 2, agent_role: '库存优化师', action: 'review_and_enhance', input_from: 'step_1' },
            { order: 3, agent_role: '销售预测分析师', action: 'review_and_enhance', input_from: 'step_2' },
          ],
          fallback_strategy: 'skip_on_error',
        },
        triggers: {
          inventory_check: { schedule: '0 8 * * *', description: '每天早上 8 点检查库存状态' },
          sales_report: { schedule: '0 9 * * 1', description: '每周一早上 9 点生成销售周报' },
          financial_review: { schedule: '0 10 1 * *', description: '每月 1 号上午 10 点生成月度财务报告' },
        },
      };

      const team = await safeInvoke<AiTeam>('create_team', { payload });
      if (team) setTeams([team]);
    } catch (err) {
      console.error('Failed to create builtin team:', err);
      // 静默失败，不阻塞用户操作
    }
  }

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const result = await safeInvoke<AiTeam[]>('get_teams');
      if (result) {
        // 自动去重：同名团队只保留最早创建的
        const seen = new Map<string, AiTeam>();
        const dups: string[] = [];
        for (const team of result) {
          if (seen.has(team.name)) {
            dups.push(team.name);
            // 删除较晚创建的重复团队
            safeInvoke('delete_team', { id: team.id }).catch(() => {});
          } else {
            seen.set(team.name, team);
          }
        }
        const deduped = Array.from(seen.values());
        if (dups.length > 0) {
          setSnackbar(`已自动清理 ${dups.length} 个重复团队`);
        }
        setTeams(deduped);
        setExistingTeamNames(deduped.map(t => t.name));
        syncAITeamGroups(deduped);
        // 首次加载时若无任何团队，自动创建内置默认团队
        if (deduped.length === 0) {
          ensureBuiltinTeam();
        }
      } else if (!isTauri()) {
        // 浏览器开发模式：展示模拟内置团队，方便 UI 调试
        setTeams([getMockBuiltinTeam()]);
        syncAITeamGroups([getMockBuiltinTeam()]);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
      setSnackbar('加载团队列表失败: ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 导入团队
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      JSON.parse(text); // 验证
      const team = await safeInvoke<AiTeam>('import_team', { teamJson: text });
      if (team) {
        setTeams((prev) => [team, ...prev]);
        setSnackbar(`成功导入"${team.name}"`);
      }
    } catch (err) {
      const msg = String(err);
      setSnackbar(msg.includes('JSON') ? '文件格式错误' : '导入失败: ' + msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 删除团队
  const handleDelete = async (id: string) => {
    try {
      await safeInvoke('delete_team', { id });
      setTeams((prev) => prev.filter((t) => t.id !== id));
      setSnackbar('已删除团队');
    } catch (err) {
      setSnackbar('删除失败: ' + String(err));
    } finally {
      setDeleteTarget(null);
    }
  };

  // 切换发布状态
  const handleTogglePublish = async (team: AiTeam) => {
    const newStatus = team.publish_status === 'published' ? 'private' : 'published';
    try {
      const updated = await safeInvoke<AiTeam>('update_team', {
        id: team.id,
        payload: { publish_status: newStatus },
      });
      if (updated) {
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSnackbar(newStatus === 'published' ? '已发布到市场' : '已取消发布');
      }
    } catch (err) {
      setSnackbar('操作失败: ' + String(err));
    }
  };

  // 导出团队
  const handleExport = (team: AiTeam) => {
    const data: Record<string, unknown> = {
      team_name: team.name,
      team_config: {
        id: team.id,
        name: team.name,
        description: team.description,
        category: team.category,
        version: team.version,
        tags: team.tags,
        members: team.members,
        workflow: team.workflow,
        triggers: team.triggers,
      },
      metadata: {
        source: team.source,
        exported_at: new Date().toISOString(),
        format_version: '1.0.0',
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.proclaw-team.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar('团队配置已导出');
  };

  // AI 智能推荐
  const handleRecommend = async () => {
    setRecommendOpen(true);
    setRecommendation(null);
    setRecommendError('');
    setRecommending(true);
    try {
      const result = await generateTeamRecommendation();
      setRecommendation(result);
    } catch (err) {
      setRecommendError('分析失败: ' + String(err));
    } finally {
      setRecommending(false);
    }
  };

  // 基于推荐创建团队
  const handleCreateFromRecommend = async () => {
    if (!recommendation) return;
    try {
      const team = await createRecommendedTeam(recommendation);
      setTeams((prev) => [team, ...prev]);
      setSnackbar(`已创建: ${team.name}`);
      setRecommendOpen(false);
    } catch (err) {
      setSnackbar('创建失败: ' + String(err));
    }
  };

  // 在 NvwaX 中打开推荐配置（附带跨服务预授权 Token）
  const handleOpenInNvwaX = () => {
    if (!recommendation) return;
    const userEmail = useAuthStore.getState().user?.email;
    const url = buildNvwaXUrl(recommendation, userEmail);
    window.open(url, '_blank');
    setSnackbar('已在 NvwaX 中打开虚拟公司创建页面' + (userEmail ? '（已自动登录）' : ''));
  };

  // 搜索与排序状态
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created'|'updated'|'members'>('created');
  const [menuTeam, setMenuTeam] = useState<string | null>(null);
  const [dismissedRecom, setDismissedRecom] = useState(() => {
    try { return localStorage.getItem('dismissedTeamRecom') === 'true'; } catch { return false; }
  });

  /** 按分类分配渐变色 */
  const TEAM_COLORS: Record<string, string> = {
    '通用经营': 'linear-gradient(135deg, #6366f1, #a855f7)',
    '数据分析': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    '客服': 'linear-gradient(135deg, #10b981, #34d399)',
  };
  const getTeamColor = (cat: string) => TEAM_COLORS[cat] || 'linear-gradient(135deg, #6366f1, #a855f7)';

  // 筛选 + 搜索 + 排序
  const sortedTeams = useMemo(() => {
    let list = teams;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (selectedTab === 1) list = list.filter(t => t.publish_status === 'published');
    if (selectedTab === 2) list = list.filter(t => t.publish_status === 'private');
    list = [...list].sort((a, b) => {
      if (sortBy === 'members') return (b.members?.length || 0) - (a.members?.length || 0);
      const key = sortBy === 'updated' ? 'updated_at' : 'created_at';
      return new Date(b[key]).getTime() - new Date(a[key]).getTime();
    });
    return list;
  }, [teams, searchQuery, selectedTab, sortBy]);

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* 第一行：标题 + 创建团队按钮（始终显示） */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>AI 团队</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
        >
          创建团队
        </Button>
      </Box>

      {/* 第二行：MUI Tabs 分页（始终显示） */}
      <Tabs
        value={activePageTab}
        onChange={(_, v) => {
          setActivePageTab(v);
          if (v === 1) setSelectedTab(0);
        }}
        sx={{
          mb: 2,
          minHeight: 36,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { textTransform: 'none', minHeight: 36, py: 0.5, fontWeight: 500 },
          '& .Mui-selected': { fontWeight: 700 },
        }}
      >
        <Tab
          label="Agent"
          icon={<AgentIcon />}
          iconPosition="start"
          sx={{
            color: activePageTab === 0 ? '#FF3B30' : 'text.secondary',
            '&.Mui-selected': { color: '#FF3B30' },
          }}
        />
        <Tab
          label="AI Team"
          icon={<TeamIcon />}
          iconPosition="start"
          sx={{
            color: activePageTab === 1 ? '#6366F1' : 'text.secondary',
            '&.Mui-selected': { color: '#6366F1' },
          }}
        />
        <Tab
          label="AI 插件"
          icon={<ExtensionIcon />}
          iconPosition="start"
          sx={{
            color: activePageTab === 2 ? '#10B981' : 'text.secondary',
            '&.Mui-selected': { color: '#10B981' },
          }}
        />
      </Tabs>

      {/* ---- Agent 管理分页 ---- */}
      {activePageTab === 0 ? (
        <AgentManagementSection
          navigate={navigate}
          onOpenSecretary={() => setSecretaryOpen(true)}
          onOpenCeoConfig={() => setCeoConfigOpen(true)}
        />
      ) : activePageTab === 2 ? (
        <AiPluginPanel />
      ) : (
        <>

      {/* ============ 统计概览 ============ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          共 {teams.length} 个团队 · {teams.filter(t => t.publish_status === 'published').length} 个已发布 · {teams.reduce((s, t) => s + (t.members?.length || 0), 0)} 个 Agent
        </Typography>
      </Box>

      {/* ============ 搜索 + 筛选 + 排序 + 操作工具栏 ============ */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="搜索团队名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 18 }} />,
            sx: { fontSize: '0.8rem' },
          }}
        />
        <ToggleButtonGroup
          value={selectedTab}
          exclusive
          onChange={(_, v) => v !== null && setSelectedTab(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', px: 1.5 } }}
        >
          <ToggleButton value={0}>全部 ({teams.length})</ToggleButton>
          <ToggleButton value={1}>已发布 ({teams.filter(t => t.publish_status === 'published').length})</ToggleButton>
          <ToggleButton value={2}>私有 ({teams.filter(t => t.publish_status === 'private').length})</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          value={sortBy}
          exclusive
          onChange={(_, v) => v !== null && setSortBy(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', px: 1 } }}
        >
          <ToggleButton value="created">最新</ToggleButton>
          <ToggleButton value="updated">最近更新</ToggleButton>
          <ToggleButton value="members">成员数</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="AI 智能推荐团队配置">
            <Button
              size="small"
              variant="text"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
              onClick={handleRecommend}
              sx={{ color: '#f59e0b', fontSize: '0.75rem', minWidth: 'auto' }}
            >
              AI 推荐
            </Button>
          </Tooltip>
          <Tooltip title="刷新列表">
            <span>
              <IconButton size="small" onClick={loadTeams} disabled={loading}><RefreshIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="从 NvwaX 市场浏览并导入">
            <IconButton size="small" onClick={() => setMarketplaceOpen(true)} sx={{ color: '#10b981' }}>
              <AutoAwesomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="导入团队配置">
            <IconButton size="small" onClick={() => setImportDialogOpen(true)} sx={{ color: '#6366f1' }}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".proclaw-team.json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
      />

      {/* ============ AI 推荐 Alert Banner ============ */}
      {recommendation && !recommending && !dismissedRecom && (
        <Alert
          icon={<AutoAwesomeIcon sx={{ color: '#f59e0b' }} />}
          severity="info"
          sx={{ mb: 2, borderRadius: 1.5, '& .MuiAlert-message': { width: '100%' } }}
          action={
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Button size="small" onClick={() => setRecommendOpen(true)} sx={{ fontSize: '0.7rem' }}>查看详情</Button>
              <IconButton size="small" onClick={() => { setDismissedRecom(true); try { localStorage.setItem('dismissedTeamRecom', 'true'); } catch {} }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
            AI 根据你的业务数据，推荐创建「{recommendation.teamName}」团队
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            配置：{recommendation.members.map(m => m.role).join('、')} 共 {recommendation.members.length} 个 Agent
          </Typography>
        </Alert>
      )}

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 空状态 */}
      {!loading && sortedTeams.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500, mx: 'auto', backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 2 }}>
          <TeamIcon sx={{ fontSize: 64, color: '#6366f1', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>还没有 AI 团队</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            创建你的第一个 AI 团队，或从 NvwaX 市场导入团队配置
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
              sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              创建团队
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => setImportDialogOpen(true)}
              sx={{ borderColor: '#6366f1', color: '#6366f1' }}>
              导入团队
            </Button>
          </Box>
        </Paper>
      )}

      {/* 团队卡片列表 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {sortedTeams.map((team) => {
          const isPublished = team.publish_status === 'published';
          const teamColor = getTeamColor(team.category || '');
          return (
          <Card
            key={team.id}
            sx={{
              backgroundColor: (theme) => theme.palette.background.paper,
              borderRadius: 2,
              transition: 'all 0.2s',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: (theme) => `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
              '&:hover': { borderColor: '#6366f1', boxShadow: `0 6px 24px ${alpha('#6366f1', 0.18)}` },
              // 已发布团队呼吸边框动画
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              ...(isPublished ? {
                animation: 'teamBreathing 2.5s ease-in-out infinite',
                '@keyframes teamBreathing': {
                  '0%, 100%': {
                    borderColor: 'rgba(99,102,241,0.15)',
                    boxShadow: `0 1px 3px ${alpha('#6366f1', 0.05)}`,
                  },
                  '50%': {
                    borderColor: 'rgba(99,102,241,0.45)',
                    boxShadow: `0 4px 16px ${alpha('#6366f1', 0.12)}`,
                  },
                },
              } : {}),
            }}
            onClick={() => setDetailTeam(team)}
          >
            <CardContent sx={{ pb: 1 }}>
              {/* 右上角状态 Chip */}
              <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <Chip
                  label={PUBLISH_STATUS_MAP[team.publish_status] || team.publish_status}
                  size="small"
                  sx={{ height: 20, fontSize: '0.6rem', backgroundColor: PUBLISH_STATUS_COLOR[team.publish_status] + '22',
                    color: PUBLISH_STATUS_COLOR[team.publish_status] }}
                />
              </Box>
              {/* 头部：头像 + 名称 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 0.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1.5, background: teamColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TeamIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, pt: 0.3 }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap title={team.name} sx={{ fontSize: '0.9rem', lineHeight: 1.3 }}>
                    {team.name}
                  </Typography>
                </Box>
              </Box>
              {/* 描述（1 行） */}
              {team.description && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ fontSize: '0.75rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
                  {team.description}
                </Typography>
              )}
              {/* 标签（最多 2 个） */}
              {team.tags?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                  {team.tags.slice(0, 2).map((tag) => (
                    <Chip key={tag} label={tag} size="small"
                      sx={{ height: 18, fontSize: '0.55rem', backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
                  ))}
                </Box>
              )}
              {/* 成员头像阵列 + 成员数 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {team.members && team.members.length > 0 && (
                  <AvatarGroup total={team.members.length} max={3}
                    sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: '0.55rem', border: '2px solid #1e293b' } }}
                  >
                    {team.members.slice(0, 3).map((m, mi) => (
                      <Avatar key={mi}
                        sx={{
                          background: ['linear-gradient(135deg,#6366f1,#a855f7)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#10b981,#34d399)'][mi % 3],
                          fontWeight: 700,
                        }}
                      >
                        {m.role.charAt(0)}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                )}
                {team.members?.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {team.members.length} 成员
                  </Typography>
                )}
              </Box>
            </CardContent>
            <CardActions sx={{ pt: 0, justifyContent: 'flex-end', gap: 0 }}>
              <Tooltip title="对话">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate('/chat/' + buildGroupId(team.id)); }}>
                  <ChatIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuTeam(team.id); }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={menuTeam === team.id ? document.activeElement as HTMLElement : null}
                open={menuTeam === team.id}
                onClose={() => setMenuTeam(null)}
              >
                <MenuItem onClick={() => { setMenuTeam(null); setDetailTeam(team); }}>查看详情</MenuItem>
                <MenuItem onClick={() => { setMenuTeam(null); setEditTeam(team); }}>编辑</MenuItem>
                <MenuItem onClick={() => { setMenuTeam(null); handleExport(team); }}>导出</MenuItem>
                <MenuItem onClick={() => { setMenuTeam(null); handleTogglePublish(team); }}>
                  {team.publish_status === 'published' ? '取消发布' : '发布'}
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setMenuTeam(null); setDeleteTarget(team.id); }} sx={{ color: '#ef4444' }}>删除</MenuItem>
              </Menu>
            </CardActions>
          </Card>
        );
        })}
      </Box>
      </>
      )}

      {/* ============ 创建对话框 ============ */}
      <CreateTeamDialog open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={(team) => { setTeams((prev) => [team, ...prev]); setCreateOpen(false); setSnackbar(`创建成功: ${team.name}`); }}
        onImportFile={() => { fileInputRef.current?.click(); }}
        existingNames={existingTeamNames} />

      {/* ============ 详情对话框 ============ */}
      {detailTeam && (
        <TeamDetailDialog team={detailTeam} onClose={() => setDetailTeam(null)}
          onEdit={(t) => { setDetailTeam(null); setEditTeam(t); }}
          onDelete={(id) => { setDetailTeam(null); setDeleteTarget(id); }}
          onExport={handleExport}
          onTogglePublish={handleTogglePublish}
          onChat={() => {
            setDetailTeam(null);
            navigate('/chat/' + buildGroupId(detailTeam.id));
          }} />
      )}

      {/* ============ 编辑对话框 ============ */}
      {editTeam && (
        <EditTeamDialog team={editTeam} onClose={() => setEditTeam(null)}
          onSaved={(updated) => { setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t))); setEditTeam(null); setSnackbar('团队已更新'); }} />
      )}

      {/* ============ 删除确认 ============ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent><DialogContentText>确定要删除这个 AI 团队吗？此操作不可撤销。</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => deleteTarget && handleDelete(deleteTarget)}>删除</Button>
        </DialogActions>
      </Dialog>

      {/* ============ AI 智能推荐对话框 ============ */}
      <Dialog open={recommendOpen} onClose={() => setRecommendOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#f59e0b' }} /> AI 智能推荐团队配置
          </Box>
          <IconButton onClick={() => setRecommendOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {recommending && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography color="text.secondary">正在分析您的业务数据...</Typography>
              <LinearProgress sx={{ mt: 2, maxWidth: 300, mx: 'auto', borderRadius: 1 }} />
            </Box>
          )}

          {recommendError && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Typography color="error">{recommendError}</Typography>
            </Paper>
          )}

          {recommendation && !recommending && (
            <Box>
              {/* 团队名称 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: 1.5, background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{recommendation.teamName}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    <Chip label={recommendation.category} size="small"
                      sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }} />
                    {recommendation.tags.map((t) => (
                      <Chip key={t} label={t} size="small"
                        sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* 业务画像摘要 */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid #333' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>📊 业务画像</Typography>
                <Typography variant="body2" color="text.secondary">{recommendation.profileSummary}</Typography>
                {recommendation.profileSummary === '暂无业务数据' && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    当前暂无业务数据，推荐结果基于默认配置生成。填写产品、库存、销售等数据后可获得更精准的推荐。
                  </Typography>
                )}
              </Paper>

              {/* 推荐分析 */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Typography variant="subtitle2" color="#fbbf24" gutterBottom>💡 分析依据</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {recommendation.analysis}
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* 推荐成员 */}
              <Typography variant="subtitle2" color="primary" gutterBottom>
                🤖 推荐 Agent 成员（{recommendation.members.length} 个）
              </Typography>
              {recommendation.members.map((m, i) => (
                <Paper key={i} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1, background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.3 }}>
                    <Typography variant="caption" color="white" fontWeight={600}>{m.role.charAt(0)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{m.role}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.responsibilities}</Typography>
                  </Box>
                  <Chip label={`#${(m.sort_order ?? i) + 1}`} size="small"
                    sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(168,85,247,0.1)', color: '#a78bfa' }} />
                </Paper>
              ))}

              {/* 需求描述（折叠预览） */}
              {recommendation.requirementDescription && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid #333' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>📝 需求描述</Typography>
                  <Typography variant="body2" color="text.secondary"
                    sx={{ whiteSpace: 'pre-line', maxHeight: 200, overflow: 'auto' }}>
                    {recommendation.requirementDescription}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setRecommendOpen(false)}>关闭</Button>
          {recommendation && (
            <>
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenInNvwaX}
                sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#34d399', backgroundColor: 'rgba(16,185,129,0.08)' } }}
              >
                在 NvwaX 中创建虚拟公司
              </Button>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleCreateFromRecommend}
                sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                在 ProClaw 中创建团队
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ============ 导入方式选择对话框 ============ */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileDownloadIcon sx={{ color: '#6366f1' }} /> 导入 AI 团队
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择导入方式：从 NVwaX Agent 市场在线导入，或从本地配置文件导入。
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => {
                setImportDialogOpen(false);
                setMarketplaceOpen(true);
              }}
              sx={{
                justifyContent: 'flex-start',
                borderColor: '#10b981',
                color: '#10b981',
                '&:hover': { borderColor: '#34d399', backgroundColor: 'rgba(16,185,129,0.08)' },
                py: 1.5,
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" fontWeight={600}>从 NvwaX Agent 市场导入</Typography>
                <Typography variant="caption" color="text.secondary">
                  浏览在线市场，选择虚拟公司配置并导入
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<FileDownloadIcon />}
              onClick={() => {
                setImportDialogOpen(false);
                fileInputRef.current?.click();
              }}
              sx={{
                justifyContent: 'flex-start',
                borderColor: '#6366f1',
                color: '#6366f1',
                '&:hover': { borderColor: '#818cf8', backgroundColor: 'rgba(99,102,241,0.08)' },
                py: 1.5,
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body1" fontWeight={600}>从本地文件导入</Typography>
                <Typography variant="caption" color="text.secondary">
                  选择已导出的 .proclaw-team.json 配置文件
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>

      {/* NvwaX 市场对话框 */}
      <MarketplaceDialog
        open={marketplaceOpen}
        onClose={() => setMarketplaceOpen(false)}
        onImportAiTeam={(aiteam) => {
          // 将市场中选择的 AiTeam 导入到本地
          const teamJson = JSON.stringify({
            team_name: aiteam.name,
            team_config: {
              description: aiteam.description || '',
              members: aiteam.members?.map((m) => ({
                agent_id: m.agent_id,
                role: m.role || '成员',
              })) || [],
            },
            metadata: {
              source: 'nvwax-marketplace',
              nvwax_id: aiteam.id,
              imported_at: new Date().toISOString(),
            },
          });
          safeInvoke('import_team', { teamJson })
            .then(() => {
              setSnackbar(`已导入 "${aiteam.name}"`);
              loadTeams();
              // API 自动打通：检查 Token 余额
              NvwaXService.checkBalanceAndAlert().catch(() => {});
            })
            .catch((err) => {
              setSnackbar('导入失败: ' + String(err));
            });
          setMarketplaceOpen(false);
        }}
      />

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} />

      {/* Agent 内联对话框 */}
      <BapSettingsPanel open={secretaryOpen} onClose={() => setSecretaryOpen(false)} />
      <Dialog open={ceoConfigOpen} onClose={() => setCeoConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AgentIcon sx={{ color: '#FF3B30' }} /> CEO Agent 配置
        </DialogTitle>
        <DialogContent>
          <PreferenceSettings />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCeoConfigOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================
// 创建团队对话框
// ============================================================

/** 创建团队的预设模板 */
const TEAM_TEMPLATES = [
  {
    id: 'ai-business',
    label: 'AI 经营团队',
    description: '库存优化 + 销售预测 + 业务分析 + 采购顾问 + 财务分析 + 客服 + 智能找图',
    category: '通用经营',
    tags: ['库存管理', '销售预测', '数据分析', '采购管理', '财务管理', '客户服务', '智能找图'],
    members: [
      { agent_id: 'builtin-inventory-optimizer', role: '库存优化师', responsibilities: '监控库存水平，预警低库存商品，优化安全库存设置，识别滞销品并建议清仓策略。', sort_order: 0 },
      { agent_id: 'builtin-sales-forecaster', role: '销售预测分析师', responsibilities: '分析历史销售趋势，预测未来销量，识别季节性波动，辅助采购决策。', sort_order: 1 },
      { agent_id: 'builtin-business-analyst', role: '业务分析师', responsibilities: '多维度业务分析，KPI 监控与解读，生成经营报表和月度报告。', sort_order: 2 },
      { agent_id: 'builtin-purchase-advisor', role: '采购顾问', responsibilities: '根据库存和销售数据生成采购建议，优化采购批量和频率，管理供应商交付评估。', sort_order: 3 },
      { agent_id: 'builtin-financial-advisor', role: '财务分析师', responsibilities: '监控现金流健康度，分析应收应付结构，评估定价策略和利润率。', sort_order: 4 },
      { agent_id: 'builtin-cs-agent', role: '客户服务助手', responsibilities: '自动处理客户咨询、订单查询，维护客户信息，跟踪售后问题。', sort_order: 5 },
      { agent_id: 'builtin-image-searcher', role: 'AI智能找图', responsibilities: '根据商品名称和描述自动搜索高质量产品图片，支持 Pexels/Pixabay 双源搜索，单商品精搜和批量匹配双模式，智能关键词优化以提升命中率。', sort_order: 6 },
    ],
  },
  {
    id: 'ecommerce-cs',
    label: '电商客服团队',
    description: '售前咨询 + 售后服务 + 订单处理 + 客户回访',
    category: '客服',
    tags: ['客户服务', '售后', '订单管理'],
    members: [
      { agent_id: 'ec-presales', role: '售前咨询顾问', responsibilities: '产品推荐、促销活动咨询', sort_order: 0 },
      { agent_id: 'ec-after-sales', role: '售后服务专员', responsibilities: '退换货处理、投诉解决', sort_order: 1 },
      { agent_id: 'ec-order', role: '订单处理员', responsibilities: '订单跟踪、物流查询', sort_order: 2 },
    ],
  },
  {
    id: 'data-analysis',
    label: '数据分析团队',
    description: '业务分析 + 销售预测 + 财务分析 + 数据可视化',
    category: '数据分析',
    tags: ['数据分析', '销售预测', '财务分析'],
    members: [
      { agent_id: 'da-analyst', role: '业务分析师', responsibilities: 'KPI 监控与解读', sort_order: 0 },
      { agent_id: 'da-forecaster', role: '销售预测分析师', responsibilities: '销量预测与趋势分析', sort_order: 1 },
      { agent_id: 'da-finance', role: '财务分析师', responsibilities: '现金流分析与利润评估', sort_order: 2 },
    ],
  },
];

function CreateTeamDialog({ open, onClose, onCreated, onImportFile, existingNames }: {
  open: boolean; onClose: () => void;
  onCreated: (team: AiTeam) => void;
  onImportFile?: () => void;
  existingNames?: string[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const payload: CreateTeamPayload = { name: name.trim(), description: description.trim() || undefined, category: category.trim() || undefined, tags };
      const team = await safeInvoke<AiTeam>('create_team', { payload });
      if (team) {
        setSelectedTemplate(null);
        onCreated(team);
      }
    } catch (err) {
      console.error('Create team failed:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddIcon sx={{ color: '#6366f1' }} /> 创建 AI 团队
      </DialogTitle>
      <DialogContent>
        {/* 预设模板选择 */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          选择预设模板（可选）
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {TEAM_TEMPLATES.map((tmpl) => {
            const nameExists = existingNames?.includes(tmpl.label);
            return (
              <Tooltip key={tmpl.id} title={nameExists ? `「${tmpl.label}」已存在` : tmpl.description}>
                <Chip
                  label={tmpl.label + (nameExists ? ' (已存在)' : '')}
                  variant={selectedTemplate === tmpl.id ? 'filled' : 'outlined'}
                  disabled={nameExists}
                  onClick={() => {
                    if (nameExists) return;
                    if (selectedTemplate === tmpl.id) {
                      setSelectedTemplate(null);
                      setName(''); setDescription(''); setCategory(''); setTags([]);
                    } else {
                      setSelectedTemplate(tmpl.id);
                      setName(tmpl.label);
                      setDescription(tmpl.description);
                      setCategory(tmpl.category);
                      setTags([...tmpl.tags]);
                    }
                  }}
                  sx={{
                    cursor: nameExists ? 'not-allowed' : 'pointer',
                    ...(selectedTemplate === tmpl.id ? { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1' } : {}),
                    ...(nameExists ? { opacity: 0.5, borderColor: 'rgba(239,68,68,0.3)', color: 'text.disabled' } : {}),
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
        <TextField autoFocus fullWidth label="团队名称" required value={name}
          onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth label="描述" multiline rows={3} value={description}
          onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth label="分类 (如: 客服、营销、开发)" value={category}
          onChange={(e) => setCategory(e.target.value)} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField size="small" fullWidth label="添加标签" value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
          <Button variant="outlined" onClick={handleAddTag} sx={{ whiteSpace: 'nowrap' }}>添加</Button>
        </Box>
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <Chip key={t} label={t} size="small" onDelete={() => setTags(tags.filter((x) => x !== t))}
                sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={() => { onClose(); onImportFile?.(); }}
          sx={{ textTransform: 'none', fontSize: '0.75rem', mr: 'auto' }}>
          从文件导入...
        </Button>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!name.trim() || creating}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          {creating ? <CircularProgress size={18} color="inherit" /> : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// 团队详情对话框
// ============================================================

/** 根据 Agent ID/角色 返回 emoji 头像 */
function getAgentEmoji(agentId: string, role: string): string {
  const map: [string[], string][] = [
    [['ceo'], '🧠'],
    [['财务', 'financial', 'finance'], '💰'],
    [['客户', 'customer', '客服', 'crm'], '🤝'],
    [['库存', 'stock', 'inventory'], '📦'],
    [['采购', 'purchase', 'buy'], '🛒'],
    [['销售', 'sell', 'sales'], '💼'],
    [['业务', 'analyst', 'business'], '📈'],
    [['运营', 'social'], '📢'],
    [['文案', '写作', '内容', 'content'], '✍️'],
    [['转化', 'conversion'], '📊'],
    [['seo', '搜索'], '🔍'],
    [['网站', 'site', 'analytics'], '🌐'],
    [['文档', 'document', 'doc'], '📄'],
    [['任务', 'task'], '📋'],
    [['人事', 'hr', 'human'], '👥'],
    [['图片', '找图', 'image'], '🖼️'],
    [['售后', 'after-sales'], '🛡️'],
    [['订单', 'order'], '📋'],
    [['售前', 'presales'], '🎯'],
  ];
  const lower = (agentId + role).toLowerCase();
  for (const [keys, emoji] of map) {
    if (keys.some(k => lower.includes(k))) return emoji;
  }
  return '🤖';
}

function TeamDetailDialog({ team, onClose, onEdit, onDelete, onExport, onTogglePublish, onChat }: {
  team: AiTeam; onClose: () => void;
  onEdit: (t: AiTeam) => void;
  onDelete: (id: string) => void;
  onExport: (t: AiTeam) => void;
  onTogglePublish: (t: AiTeam) => void;
  onChat?: (memberRole?: string) => void;
}) {
  const [detailTab, setDetailTab] = useState(0);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('zh-CN'); } catch { return d; }
  };

  const workLogs = team ? getWorkLogsGroupedByDate(team.id) : {};
  const workLogDates = Object.keys(workLogs).sort((a, b) => b.localeCompare(a));

  const STATUS_LABELS: Record<string, string> = {
    completed: '已完成',
    in_progress: '进行中',
    failed: '失败',
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TeamIcon sx={{ color: '#6366f1' }} /> {team.name}
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none' } }}>
          <Tab label="信息" />
          <Tab label={`工作日志 (${Object.keys(workLogs).reduce((s, k) => s + workLogs[k].length, 0)})`} />
        </Tabs>
      </Box>
      <DialogContent dividers>
        {detailTab === 0 ? (
          <>
            {/* 基本信息 */}
            <Typography variant="subtitle2" color="primary" gutterBottom>基本信息</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">名称</Typography>
                <Typography variant="body2">{team.name}</Typography>
              </Card>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">版本</Typography>
                <Typography variant="body2">v{team.version}</Typography>
              </Card>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Chip label={PUBLISH_STATUS_MAP[team.publish_status]} size="small"
                  sx={{ backgroundColor: PUBLISH_STATUS_COLOR[team.publish_status] + '22', color: PUBLISH_STATUS_COLOR[team.publish_status], height: 22 }} />
              </Card>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">分类</Typography>
                <Typography variant="body2">{team.category || '未分类'}</Typography>
              </Card>
            </Box>

            {team.description && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>描述</Typography>
                <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                  <Typography variant="body2" color="text.secondary">{team.description}</Typography>
                </Card>
              </Box>
            )}

            {/* 标签 */}
            {team.tags?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>标签</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {team.tags.map((t) => (
                    <Chip key={t} label={t} size="small" sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
                  ))}
                </Box>
              </Box>
            )}

            {/* 成员 - 可点击发起对话 */}
            {team.members?.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>团队成员 ({team.members.length})</Typography>
                {team.members.map((m, i) => (
                  <Card
                    key={i}
                    variant="outlined"
                    sx={{
                      p: 1.5, mb: 1, bgcolor: 'transparent',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      cursor: onChat ? 'pointer' : 'default',
                      '&:hover': onChat ? { bgcolor: 'rgba(99,102,241,0.08)' } : {},
                    }}
                    onClick={() => onChat?.(m.role)}
                  >
                    <Box sx={{ width: 36, height: 36, borderRadius: 1, background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
                      {getAgentEmoji(m.agent_id, m.role)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{m.role}</Typography>
                      {m.responsibilities && (
                        <Typography variant="caption" color="text.secondary">{m.responsibilities}</Typography>
                      )}
                    </Box>
                    {onChat && (
                      <Tooltip title="发起对话">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onChat?.(m.role); }} sx={{ ml: 0.5 }}>
                          <ChatIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Chip label={`排序: ${m.sort_order ?? i}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                  </Card>
                ))}
              </Box>
            )}

            {/* 工作流预览 */}
            {team.workflow && Object.keys(team.workflow).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>工作流配置</Typography>
                <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent', maxHeight: 150, overflow: 'auto' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(team.workflow, null, 2)}
                  </Typography>
                </Card>
              </Box>
            )}

            {/* 时间 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography variant="body2">{formatDate(team.created_at)}</Typography>
              </Card>
              <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'transparent' }}>
                <Typography variant="caption" color="text.secondary">更新时间</Typography>
                <Typography variant="body2">{formatDate(team.updated_at)}</Typography>
              </Card>
            </Box>
          </>
        ) : (
          /* 工作日志 Tab */
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="primary">工作日志</Typography>
              <IconButton size="small" onClick={() => { setRefreshingLogs(true); setTimeout(() => setRefreshingLogs(false), 300); }} disabled={refreshingLogs}>
                <RefreshIcon fontSize="small" sx={{ animation: refreshingLogs ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Box>
            {workLogDates.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">暂无工作日志</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  AI 团队开始工作后，日志将自动记录在这里
                </Typography>
              </Box>
            ) : (
              workLogDates.map((date) => (
                <Box key={date} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6366f1', flexShrink: 0 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.85rem' }}>
                      {date}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {workLogs[date].length} 条记录
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'relative', pl: 3 }}>
                    {/* 垂直时间线 */}
                    <Box sx={{ position: 'absolute', left: 3, top: 4, bottom: 4, width: 2, backgroundColor: 'rgba(99,102,241,0.12)' }} />
                    {workLogs[date].map((log, logIdx) => (
                      <Box key={log.id} sx={{ position: 'relative', pb: logIdx < workLogs[date].length - 1 ? 2 : 0 }}>
                        {/* 时间线圆点 */}
                        <Box sx={{
                          position: 'absolute', left: -21, top: 4,
                          width: 12, height: 12, borderRadius: '50%',
                          backgroundColor: log.status === 'completed' ? '#10b981' :
                            log.status === 'in_progress' ? '#f59e0b' : '#ef4444',
                          border: '2px solid',
                          borderColor: log.status === 'completed' ? 'rgba(16,185,129,0.2)' :
                            log.status === 'in_progress' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                          zIndex: 1,
                        }} />
                        <Paper elevation={0} sx={{
                          p: 1.5, borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: log.status === 'completed' ? 'rgba(16,185,129,0.12)' :
                            log.status === 'in_progress' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                          backgroundColor: log.status === 'completed' ? 'rgba(16,185,129,0.03)' :
                            log.status === 'in_progress' ? 'rgba(245,158,11,0.03)' : 'rgba(239,68,68,0.03)',
                        }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{
                                width: 22, height: 22, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: log.status === 'completed' ? 'rgba(16,185,129,0.15)' :
                                  log.status === 'in_progress' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                              }}>
                                <Typography sx={{
                                  fontSize: '0.65rem',
                                  color: log.status === 'completed' ? '#10b981' :
                                    log.status === 'in_progress' ? '#f59e0b' : '#ef4444',
                                }}>
                                  {log.status === 'completed' ? '✓' : log.status === 'in_progress' ? '◷' : '✕'}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {new Date(log.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                            <Chip
                              label={STATUS_LABELS[log.status] || log.status}
                              size="small"
                              sx={{
                                height: 18, fontSize: '0.6rem',
                                backgroundColor: log.status === 'completed' ? 'rgba(16,185,129,0.15)' :
                                  log.status === 'in_progress' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                color: log.status === 'completed' ? '#10b981' :
                                  log.status === 'in_progress' ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem', mt: 0.5 }}>
                            {log.agent_role} - {log.action}
                          </Typography>
                          {log.result && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem', lineHeight: 1.5 }}>
                              {log.result}
                            </Typography>
                          )}
                        </Paper>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onDelete(team.id)} color="error" startIcon={<DeleteIcon />}>删除</Button>
        <Button onClick={() => onExport(team)} startIcon={<DownloadIcon />}>导出</Button>
        <Button onClick={() => onTogglePublish(team)} startIcon={team.publish_status === 'published' ? <UnpublishIcon /> : <PublishIcon />}>
          {team.publish_status === 'published' ? '取消发布' : '发布'}
        </Button>
        <Button onClick={() => onEdit(team)} startIcon={<EditIcon />}>编辑</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// 编辑团队对话框
// ============================================================
function EditTeamDialog({ team, onClose, onSaved }: {
  team: AiTeam; onClose: () => void;
  onSaved: (team: AiTeam) => void;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [category, setCategory] = useState(team.category || '');
  const [version, setVersion] = useState(team.version);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([...team.tags]);
  const [members, setMembers] = useState<TeamMember[]>([...(team.members || [])]);
  const [saving, setSaving] = useState(false);

  // 新增成员表单
  const [newRole, setNewRole] = useState('');
  const [newResp, setNewResp] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleAddMember = () => {
    if (!newRole.trim()) return;
    setMembers([...members, {
      agent_id: crypto.randomUUID(),
      role: newRole.trim(),
      responsibilities: newResp.trim() || undefined,
      sort_order: members.length,
    }]);
    setNewRole('');
    setNewResp('');
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: UpdateTeamPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        version,
        tags,
        members,
      };
      const updated = await safeInvoke<AiTeam>('update_team', { id: team.id, payload });
      if (updated) onSaved(updated);
    } catch (err) {
      console.error('Update team failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon sx={{ color: '#6366f1' }} /> 编辑团队
      </DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth label="团队名称" required value={name}
          onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        <TextField fullWidth label="描述" multiline rows={2} value={description}
          onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField fullWidth label="分类" value={category}
            onChange={(e) => setCategory(e.target.value)} />
          <TextField fullWidth label="版本号" value={version}
            onChange={(e) => setVersion(e.target.value)} />
        </Box>

        {/* 标签 */}
        <Typography variant="subtitle2" color="primary" gutterBottom>标签</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField size="small" fullWidth label="添加标签" value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
          <Button variant="outlined" size="small" onClick={handleAddTag}>添加</Button>
        </Box>
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {tags.map((t) => (
              <Chip key={t} label={t} size="small" onDelete={() => setTags(tags.filter((x) => x !== t))}
                sx={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
            ))}
          </Box>
        )}

        {/* 成员管理 */}
        <Typography variant="subtitle2" color="primary" gutterBottom>成员 ({members.length})</Typography>
        {members.map((m, i) => (
          <Paper key={i} sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>{m.role}</Typography>
              {m.responsibilities && <Typography variant="caption" color="text.secondary">{m.responsibilities}</Typography>}
            </Box>
            <IconButton size="small" onClick={() => handleRemoveMember(i)} color="error"><PersonRemoveIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField size="small" label="角色名称" value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }} />
          <TextField size="small" label="职责说明" value={newResp}
            onChange={(e) => setNewResp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }} />
          <Button variant="outlined" size="small" onClick={handleAddMember} startIcon={<PersonAddIcon />}>添加</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim() || saving}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// Agent 管理分页 — ProClaw 原生 Agent 卡片
// ============================================================
const AGENTS = [
  {
    id: 'ceo',
    name: 'CEO Agent',
    role: '公司主控官',
    status: '在线' as const,
    badge: '主控官' as const,
    desc: '虚拟公司主控官 · 传达宏观意图，协调所有 Agent · 决策确认与任务分派',
    icon: <AgentIcon sx={{ fontSize: 28, color: '#fff' }} />,
    gradient: 'linear-gradient(135deg, #FF3B30, #FF6B6B)',
    path: '/settings',
    action: '打开配置',
  },
  {
    id: 'secretary',
    name: '商务秘书',
    role: 'AI 商务秘书',
    status: '在线' as const,
    badge: '可对话' as const,
    desc: '辅助日常经营 · 自动呈报关键指标 · 学习老板偏好，主动预警',
    icon: <HeadsetIcon sx={{ fontSize: 28, color: '#fff' }} />,
    gradient: 'linear-gradient(135deg, #6366F1, #A855F7)',
    path: '/teams',
    action: '开始对话',
  },
  {
    id: 'cs',
    name: 'AI 客服',
    role: '智能客服',
    status: '在线' as const,
    badge: null as string | null,
    desc: '自动处理客户咨询与订单查询 · 维护问答库 · 支持多渠道接入',
    icon: <ChatIcon sx={{ fontSize: 28, color: '#fff' }} />,
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
    path: '/customer-service',
    action: '管理客服',
  },
];

function AgentManagementSection({ navigate, onOpenSecretary, onOpenCeoConfig }: {
  navigate: (path: string) => void;
  onOpenSecretary: () => void;
  onOpenCeoConfig: () => void;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mt: 0 }}>
      {AGENTS.map((agent) => {
        const handleClick = () => {
          if (agent.id === 'secretary') onOpenSecretary();
          else if (agent.id === 'ceo') onOpenCeoConfig();
          else navigate(agent.path);
        };
        return (
          <Card
            key={agent.id}
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s',
              cursor: 'pointer',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                borderColor: agent.id === 'ceo' ? '#FF3B30' : agent.id === 'secretary' ? '#6366F1' : '#10B981',
              },
            }}
            onClick={handleClick}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Agent 头像 */}
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    background: agent.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${agent.id === 'ceo' ? 'rgba(255,59,48,0.3)' : agent.id === 'secretary' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  }}
                >
                  {agent.icon}
                </Box>
                {/* 信息 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.9rem', lineHeight: 1.3 }}>
                      {agent.name}
                    </Typography>
                    {agent.badge && (
                      <Chip
                        label={agent.badge}
                        size="small"
                        sx={{
                          height: 18, fontSize: '0.55rem', fontWeight: 600,
                          backgroundColor: agent.id === 'ceo' ? 'rgba(255,59,48,0.12)' : 'rgba(99,102,241,0.12)',
                          color: agent.id === 'ceo' ? '#FF3B30' : '#6366F1',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                    <Box
                      sx={{
                        width: 6, height: 6, borderRadius: '50%',
                        backgroundColor: agent.status === '在线' ? '#10B981' : '#9CA3AF',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {agent.role} · {agent.status}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {agent.desc}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
