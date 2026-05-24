import {
  Add as AddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FileDownload as FileDownloadIcon,
  Group as TeamIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Public as PublishIcon,
  PublicOff as UnpublishIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
} from '@mui/icons-material';
import {
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
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiTeam, CreateTeamPayload, TeamMember, UpdateTeamPayload } from '../lib/teamTypes';
import { PUBLISH_STATUS_MAP, PUBLISH_STATUS_COLOR } from '../lib/teamTypes';
import { useAuthStore } from '../lib/authStore';
import {
  generateTeamRecommendation,
  createRecommendedTeam,
  buildNvwaXUrl,
  generateCrossAuthToken,
  type TeamRecommendation,
} from '../lib/aiTeamRecommendationService';

export default function TeamsPage() {
  const [teams, setTeams] = useState<AiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 对话框状态
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<AiTeam | null>(null);
  const [editTeam, setEditTeam] = useState<AiTeam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  // 导入方式选择对话框
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 智能推荐状态
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<TeamRecommendation | null>(null);
  const [recommendError, setRecommendError] = useState('');

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<AiTeam[]>('get_teams');
      setTeams(result);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setSnackbar('加载团队列表失败: ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 导入团队
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      JSON.parse(text); // 验证
      const team = await invoke<AiTeam>('import_team', { teamJson: text });
      setTeams((prev) => [team, ...prev]);
      setSnackbar(`成功导入"${team.name}"`);
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
      await invoke('delete_team', { id });
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
      const updated = await invoke<AiTeam>('update_team', {
        id: team.id,
        payload: { publish_status: newStatus },
      });
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSnackbar(newStatus === 'published' ? '已发布到市场' : '已取消发布');
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

  // 筛选数据
  const filteredTeams = teams.filter((t) => {
    if (selectedTab === 0) return true; // 全部
    if (selectedTab === 1) return t.publish_status === 'published';
    if (selectedTab === 2) return t.publish_status === 'private';
    return true;
  });

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>AI 团队</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理你的 AI 团队，组合多个 Agent 协同工作
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="AI 分析业务数据，智能推荐团队配置">
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleRecommend}
              sx={{ borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { borderColor: '#fbbf24', backgroundColor: 'rgba(245,158,11,0.08)' } }}
            >
              AI 智能推荐
            </Button>
          </Tooltip>
          <Tooltip title="刷新列表">
            <IconButton onClick={loadTeams} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ borderColor: '#6366f1', color: '#6366f1' }}
          >
            导入
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
          >
            创建团队
          </Button>
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
        </Box>
      </Box>

      {/* 标签页筛选 */}
      <Tabs
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none' } }}
      >
        <Tab label={`全部 (${teams.length})`} />
        <Tab label={`已发布 (${teams.filter((t) => t.publish_status === 'published').length})`} />
        <Tab label={`私有 (${teams.filter((t) => t.publish_status === 'private').length})`} />
      </Tabs>

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 空状态 */}
      {!loading && filteredTeams.length === 0 && (
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
        {filteredTeams.map((team) => (
          <Card key={team.id} sx={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: 2, transition: 'all 0.2s',
            '&:hover': { borderColor: '#6366f1', boxShadow: '0 4px 20px rgba(99,102,241,0.15)' } }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 1.5, background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TeamIcon sx={{ color: '#fff', fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap title={team.name}>{team.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
                    <Chip
                      label={PUBLISH_STATUS_MAP[team.publish_status] || team.publish_status}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', backgroundColor: PUBLISH_STATUS_COLOR[team.publish_status] + '22',
                        color: PUBLISH_STATUS_COLOR[team.publish_status] }}
                    />
                    <Chip label={`v${team.version}`} size="small"
                      sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.05)', color: '#999' }} />
                    {team.members?.length > 0 && (
                      <Chip label={`${team.members.length}成员`} size="small"
                        sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(168,85,247,0.1)', color: '#a78bfa' }} />
                    )}
                  </Box>
                </Box>
              </Box>
              {team.description && (
                <Typography variant="body2" color="text.secondary"
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1 }}>
                  {team.description}
                </Typography>
              )}
              {team.tags?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {team.tags.slice(0, 4).map((tag) => (
                    <Chip key={tag} label={tag} size="small"
                      sx={{ height: 20, fontSize: '0.6rem', backgroundColor: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }} />
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">{team.category || '未分类'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {team.source === 'nvwax-marketplace' ? '来源: NvwaX' : '本地创建'}
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ pt: 0, justifyContent: 'flex-end', gap: 0.5 }}>
              <Tooltip title="查看详情"><IconButton size="small" onClick={() => setDetailTeam(team)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="编辑"><IconButton size="small" onClick={() => setEditTeam(team)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="导出"><IconButton size="small" onClick={() => handleExport(team)}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title={team.publish_status === 'published' ? '取消发布' : '发布'}>
                <IconButton size="small" onClick={() => handleTogglePublish(team)}
                  sx={{ color: team.publish_status === 'published' ? '#10b981' : '#6b7280' }}>
                  {team.publish_status === 'published' ? <UnpublishIcon fontSize="small" /> : <PublishIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="删除"><IconButton size="small" onClick={() => setDeleteTarget(team.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* ============ 创建对话框 ============ */}
      <CreateTeamDialog open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={(team) => { setTeams((prev) => [team, ...prev]); setCreateOpen(false); setSnackbar(`创建成功: ${team.name}`); }} />

      {/* ============ 详情对话框 ============ */}
      {detailTeam && (
        <TeamDetailDialog team={detailTeam} onClose={() => setDetailTeam(null)}
          onEdit={(t) => { setDetailTeam(null); setEditTeam(t); }}
          onDelete={(id) => { setDetailTeam(null); setDeleteTarget(id); }}
          onExport={handleExport}
          onTogglePublish={handleTogglePublish} />
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
              startIcon={<OpenInNewIcon />}
              onClick={() => {
                const nvwaxBase = import.meta.env.VITE_NVWAX_URL || 'http://localhost:3000';
                const userEmail = useAuthStore.getState().user?.email;
                // 构建市场 URL，附带跨服务预授权 Token
                const params = new URLSearchParams();
                params.set('ref', 'proclaw');
                if (userEmail) {
                  params.set('proclaw_token', generateCrossAuthToken(userEmail));
                  params.set('proclaw_email', encodeURIComponent(userEmail));
                }
                window.open(`${nvwaxBase}/marketplace?${params.toString()}`, '_blank');
                setImportDialogOpen(false);
                setSnackbar('已打开 NVwaX Agent 市场' + (userEmail ? '（已自动登录）' : ''));
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
                <Typography variant="body1" fontWeight={600}>从 NVwaX Agent 市场导入</Typography>
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

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
}

// ============================================================
// 创建团队对话框
// ============================================================
function CreateTeamDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void;
  onCreated: (team: AiTeam) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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
      const team = await invoke<AiTeam>('create_team', { payload });
      onCreated(team);
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
        <TextField autoFocus fullWidth label="团队名称" required value={name}
          onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
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
function TeamDetailDialog({ team, onClose, onEdit, onDelete, onExport, onTogglePublish }: {
  team: AiTeam; onClose: () => void;
  onEdit: (t: AiTeam) => void;
  onDelete: (id: string) => void;
  onExport: (t: AiTeam) => void;
  onTogglePublish: (t: AiTeam) => void;
}) {
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('zh-CN'); } catch { return d; }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TeamIcon sx={{ color: '#6366f1' }} /> {team.name}
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* 基本信息 */}
        <Typography variant="subtitle2" color="primary" gutterBottom>基本信息</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">名称</Typography>
            <Typography variant="body2">{team.name}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">版本</Typography>
            <Typography variant="body2">v{team.version}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">状态</Typography>
            <Chip label={PUBLISH_STATUS_MAP[team.publish_status]} size="small"
              sx={{ backgroundColor: PUBLISH_STATUS_COLOR[team.publish_status] + '22', color: PUBLISH_STATUS_COLOR[team.publish_status], height: 22 }} />
          </Paper>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">分类</Typography>
            <Typography variant="body2">{team.category || '未分类'}</Typography>
          </Paper>
        </Box>

        {team.description && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>描述</Typography>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
              <Typography variant="body2" color="text.secondary">{team.description}</Typography>
            </Paper>
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

        {/* 成员 */}
        {team.members?.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>团队成员 ({team.members.length})</Typography>
            {team.members.map((m, i) => (
              <Paper key={i} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 1, background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography variant="caption" color="white" fontWeight={600}>{m.role.charAt(0)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{m.role}</Typography>
                  {m.responsibilities && (
                    <Typography variant="caption" color="text.secondary">{m.responsibilities}</Typography>
                  )}
                </Box>
                <Chip label={`排序: ${m.sort_order ?? i}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              </Paper>
            ))}
          </Box>
        )}

        {/* 工作流预览 */}
        {team.workflow && Object.keys(team.workflow).length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>工作流配置</Typography>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', maxHeight: 150, overflow: 'auto' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(team.workflow, null, 2)}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* 时间 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">创建时间</Typography>
            <Typography variant="body2">{formatDate(team.created_at)}</Typography>
          </Paper>
          <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">更新时间</Typography>
            <Typography variant="body2">{formatDate(team.updated_at)}</Typography>
          </Paper>
        </Box>
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
      const updated = await invoke<AiTeam>('update_team', { id: team.id, payload });
      onSaved(updated);
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
