import {
  Add as ImportIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  Group as TeamIcon,
  OpenInNew as LinkIcon,
  Refresh as RefreshIcon,
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
  IconButton,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ImportedTeam {
  id: string;
  name: string;
  description?: string;
  category?: string;
  config_json: string;
  source: string;
  created_at: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<ImportedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载团队列表
  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<ImportedTeam[]>('get_teams');
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
    setImporting(true);
    try {
      const text = await file.text();
      // 验证 JSON
      JSON.parse(text);
      const team = await invoke<ImportedTeam>('import_team', { teamJson: text });
      setTeams(prev => [team, ...prev]);
      setSnackbar(`✅ 成功导入"${team.name}"`);
    } catch (err) {
      console.error('Import failed:', err);
      const msg = String(err);
      if (msg.includes('JSON')) {
        setSnackbar('❌ 文件格式错误，请确保是 .proclaw-team.json 文件');
      } else {
        setSnackbar('❌ 导入失败: ' + msg);
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 删除团队
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await invoke('delete_team', { id });
      setTeams(prev => prev.filter(t => t.id !== id));
      setSnackbar('已删除团队');
    } catch (err) {
      setSnackbar('删除失败: ' + String(err));
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  // 解析团队配置预览
  const getRoleCount = (configJson: string): number => {
    try {
      const config = JSON.parse(configJson);
      const roles = config.team_config?.roles;
      return Array.isArray(roles) ? roles.length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* 头部 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            AI 团队
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            从 NvwaX 市场导入的 AI 团队成员配置
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="刷新列表">
            <IconButton onClick={loadTeams} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <ImportIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #9333ea)' },
            }}
          >
            {importing ? '导入中...' : '导入团队'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".proclaw-team.json,.json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </Box>
      </Box>

      {/* 如何使用 */}
      {!loading && teams.length === 0 && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 500,
            mx: 'auto',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 2,
          }}
        >
          <TeamIcon sx={{ fontSize: 64, color: '#6366f1', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            还没有 AI 团队
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            前往{' '}
            <Typography
              component="a"
              href="https://nvwax.proclaw.cc/marketplace"
              target="_blank"
              rel="noopener"
              sx={{
                color: '#6366f1',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              NvwaX Agent 广场
            </Typography>{' '}
            选择团队，点击「集成到 ProClaw」下载团队配置文件，然后在此导入。
          </Typography>
          <Box
            component="ol"
            sx={{
              textAlign: 'left',
              display: 'inline-block',
              '& li': { mb: 1, color: 'text.secondary', fontSize: '0.875rem' },
            }}
          >
            <li>在 NvwaX 选择 AI 团队 → 点击右下角「集成到 ProClaw」</li>
            <li>点击「下载配置文件」保存 .proclaw-team.json 文件</li>
            <li>回到此页面点击「导入团队」选择该文件</li>
          </Box>
        </Paper>
      )}

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 团队卡片列表 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {teams.map(team => (
          <Card
            key={team.id}
            sx={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#6366f1',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)',
              },
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TeamIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    noWrap
                    title={team.name}
                  >
                    {team.name}
                  </Typography>
                  {team.category && (
                    <Chip
                      label={team.category}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(99,102,241,0.15)',
                        color: '#a5b4fc',
                        mt: 0.3,
                      }}
                    />
                  )}
                </Box>
              </Box>

              {team.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    mb: 1,
                  }}
                >
                  {team.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {getRoleCount(team.config_json)} 个角色
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  来源: {team.source === 'nvwax-marketplace' ? 'NvwaX' : team.source}
                </Typography>
              </Box>
            </CardContent>

            <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
              <Tooltip title="在 NvwaX 查看">
                <IconButton
                  size="small"
                  onClick={() => {
                    try {
                      const config = JSON.parse(team.config_json);
                      const tid = config.team_config?.id;
                      if (tid) {
                        window.open(
                          `https://nvwax.proclaw.cc/marketplace/team-skills/${tid}`,
                          '_blank',
                        );
                      }
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除团队">
                <IconButton
                  size="small"
                  onClick={() => setDeleteConfirm(team.id)}
                  sx={{ color: '#ef4444' }}
                >
                  {deletingId === team.id ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <DeleteIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除这个 AI 团队吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
}
