import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { AgentMarketService, type MarketAgentItem } from '../../lib/agentMarketService';
import { useAgentManagerStore } from '../../lib/agentManagerStore';
import { LONG_OUTBOUND_TIMEOUT_MS, OUTBOUND_ERROR_MESSAGE, withTimeoutPromise } from '../../lib/fetchWithTimeout';
import PermissionConfirmDialog from './PermissionConfirmDialog';

interface MarketDialogProps {
  open: boolean;
  onClose: () => void;
  onAgentInstalled: () => void;
}

export default function MarketDialog({ open, onClose, onAgentInstalled }: MarketDialogProps) {
  const [agents, setAgents] = useState<MarketAgentItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installingAgent, setInstallingAgent] = useState<MarketAgentItem | null>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const pageSize = 20;
  const installedAgents = useAgentManagerStore(s => s.agents);
  const installedIds = new Set(installedAgents.map(a => a.manifest.id));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      // 加载分类
      AgentMarketService.getCategories().then(cats => setCategories(cats));
      loadAgents(true);
    }
  }, [open, selectedCategory]);

  // 搜索去抖 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadAgents(true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    if (open) {
      useAgentManagerStore.getState().fetchAgents();
    }
  }, [open]);

  async function loadAgents(resetPage = false) {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) {
      setPage(1);
    }
    setLoading(currentPage === 1);
    setLoadingMore(currentPage > 1);
    setLoadError(null);
    try {
      const result = await withTimeoutPromise(
        () => AgentMarketService.getAgents(selectedCategory, searchText || undefined, currentPage, pageSize),
        LONG_OUTBOUND_TIMEOUT_MS,
      );
      if (resetPage) {
        setAgents(result.agents);
      } else {
        setAgents(prev => [...prev, ...result.agents]);
      }
      setTotal(result.total);
    } catch (err) {
      console.error('[MarketDialog] 加载 Agent 列表失败:', err);
      setLoadError(OUTBOUND_ERROR_MESSAGE);
    }
    setLoading(false);
    setLoadingMore(false);
  }

  async function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    try {
      const result = await withTimeoutPromise(
        () => AgentMarketService.getAgents(selectedCategory, searchText || undefined, nextPage, pageSize),
        LONG_OUTBOUND_TIMEOUT_MS,
      );
      setAgents(prev => [...prev, ...result.agents]);
    } catch (err) {
      console.error('[MarketDialog] 加载更多失败:', err);
      setLoadError(OUTBOUND_ERROR_MESSAGE);
    }
    setLoadingMore(false);
  }

  const hasMore = agents.length < total;

  function handleInstallClick(agent: MarketAgentItem) {
    setInstallingAgent(agent);
    setPermDialogOpen(true);
  }

  async function handleConfirmInstall() {
    if (!installingAgent) return;
    setInstalling(true);
    setInstallError(null);
    try {
      const result = await withTimeoutPromise(
        () => AgentMarketService.installAgent(installingAgent.id),
        LONG_OUTBOUND_TIMEOUT_MS,
      );
      if (result.success) {
        setPermDialogOpen(false);
        setInstallingAgent(null);
        // 刷新已安装列表
        await useAgentManagerStore.getState().fetchAgents();
        onAgentInstalled();
      } else {
        setInstallError('安装失败，请重试');
      }
    } catch (err) {
      console.error('[MarketDialog] 安装失败:', err);
      setInstallError(OUTBOUND_ERROR_MESSAGE);
    }
    setInstalling(false);
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Agent 市场</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* 加载错误提示 */}
          {loadError && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ color: '#dc2626', flex: 1 }}>
                {loadError}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<RefreshIcon />}
                onClick={() => loadAgents(true)}
                sx={{ textTransform: 'none' }}
              >
                重试
              </Button>
            </Box>
          )}

          {/* 安装错误提示 */}
          {installError && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ color: '#dc2626', flex: 1 }}>
                {installError}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => setInstallError(null)}
                sx={{ textTransform: 'none' }}
              >
                知道了
              </Button>
            </Box>
          )}

          {/* 搜索 */}
          <TextField
            fullWidth
            size="small"
            placeholder="搜索 Agent..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} /> }}
            sx={{ mb: 2 }}
          />

          {/* 分类标签 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <Chip
                key={cat}
                label={cat}
                clickable
                color={selectedCategory === cat ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(cat)}
                size="small"
              />
            ))}
          </Box>

          {/* 安装进度条 */}
          {installing && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                正在安装 {installingAgent?.name}...
              </Typography>
            </Box>
          )}

          {/* 列表加载中 */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          )}

          {/* Agent 列表 */}
          {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {agents.map(agent => {
              const isInstalled = installedIds.has(agent.id);
              return (
              <Box
                key={agent.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  opacity: isInstalled ? 0.6 : 1,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                {/* Agent 图标 */}
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    bgcolor: '#ff3b30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <span className="material-icons">{agent.icon}</span>
                </Box>

                {/* 信息 */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {agent.name}
                    {isInstalled && (
                      <Chip label="已安装" size="small" color="success" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {agent.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.disabled">{agent.author}</Typography>
                    <Typography variant="caption" color="text.disabled">|</Typography>
                    <Typography variant="caption" color="text.disabled">{agent.category}</Typography>
                    <Typography variant="caption" color="text.disabled">|</Typography>
                    <Typography variant="caption" color="text.disabled">{agent.downloads} 次安装</Typography>
                  </Box>
                </Box>

                {/* 安装按钮 */}
                {!isInstalled && (
                <Button
                  variant={agent.price === 0 ? 'outlined' : 'contained'}
                  size="small"
                  onClick={() => handleInstallClick(agent)}
                  disabled={installing}
                  sx={{ flexShrink: 0 }}
                >
                  {agent.price === 0 ? '免费安装' : `¥${agent.price}/月`}
                </Button>
                )}
              </Box>
              );
            })}

            {/* 加载更多按钮 */}
            {hasMore && (
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  sx={{ minWidth: 160 }}
                >
                  {loadingMore ? '加载中...' : `加载更多 (${agents.length}/${total})`}
                </Button>
              </Box>
            )}
          </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 权限确认弹窗 */}
      <PermissionConfirmDialog
        agent={installingAgent}
        open={permDialogOpen}
        onClose={() => setPermDialogOpen(false)}
        onConfirm={handleConfirmInstall}
      />
    </>
  );
}
