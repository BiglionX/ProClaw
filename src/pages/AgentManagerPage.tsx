import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAgentManagerStore, type AgentItem } from '../lib/agentManagerStore';
import { AgentMarketService } from '../lib/agentMarketService';
import { agentRuntime } from '../lib/agentRuntime';
import type { QuickAction } from '../lib/agentRuntime';
import AgentList from '../components/AgentManager/AgentList';
import AgentDetailDialog from '../components/AgentManager/AgentDetailDialog';
import AgentContainer from '../components/AgentRuntime/AgentContainer';

export default function AgentManagerPage() {
  const { agents, loading, error, fetchAgents, enableAgent, disableAgent, uninstallAgent } =
    useAgentManagerStore();
  const [detailAgent, setDetailAgent] = useState<AgentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openAgent, setOpenAgent] = useState<AgentItem | null>(null);
  const [updatesAvailable, setUpdatesAvailable] = useState<Map<string, string>>(new Map());
  const [enableError, setEnableError] = useState<string | null>(null);

  const fetchAndCheckUpdates = useCallback(async () => {
    await fetchAgents();
    // Agent 列表加载完成后检查更新
    const currentAgents = useAgentManagerStore.getState().agents;
    if (currentAgents.length > 0) {
      try {
        const updates = await AgentMarketService.checkAllAgentUpdates(
          currentAgents.map(a => ({ id: a.id, manifest: { id: a.manifest.id }, version: a.version }))
        );
        const updateMap = new Map<string, string>();
        updates.forEach(u => updateMap.set(u.agentId, u.latestVersion));
        setUpdatesAvailable(updateMap);
      } catch {
        // 静默失败，不影响核心功能
      }

      // 注册快捷操作
      for (const agent of currentAgents) {
        if (agent.enabled) {
          const actions: QuickAction[] = [
            {
              id: `${agent.id}:open`,
              label: `打开 ${agent.name}`,
              description: agent.manifest.description || '',
              context: 'global',
              triggerMethod: 'open',
              triggerParams: [],
            },
          ];
          agentRuntime.registerQuickActions(agent.id, actions);
        }
      }
    }
  }, [fetchAgents]);

  useEffect(() => {
    fetchAndCheckUpdates();

    // 每 30 分钟周期性检查更新
    const interval = setInterval(fetchAndCheckUpdates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAndCheckUpdates]);

  const handleToggle = async (agentId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await enableAgent(agentId);
      } else {
        await disableAgent(agentId);
      }
      setEnableError(null);
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUninstall = async (agentId: string) => {
    if (window.confirm('确定要卸载此 Agent 吗？所有相关数据将被清除。')) {
      await uninstallAgent(agentId);
      // 更新后去除更新徽标
      setUpdatesAvailable(prev => {
        const next = new Map(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const handleShowDetail = (agent: AgentItem) => {
    setDetailAgent(agent);
    setDetailOpen(true);
  };

  const handleOpenAgent = (agent: AgentItem) => {
    setOpenAgent(agent);
  };

  const handleUpdateSuccess = () => {
    setUpdatesAvailable(prev => {
      const next = new Map(prev);
      if (detailAgent) next.delete(detailAgent.id);
      return next;
    });
    fetchAgents();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Agent 管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            管理已安装的能力模块，启用、禁用或卸载
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => window.dispatchEvent(new CustomEvent('proclaw:open-market'))}
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
          }}
        >
          发现更多 Agent
        </Button>
      </Box>

      {/* 加载中 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1, mb: 2 }}>
          <Typography color="error" variant="body2">
            加载失败: {error}
          </Typography>
          <Button size="small" onClick={fetchAndCheckUpdates} sx={{ mt: 1 }}>
            重试
          </Button>
        </Box>
      )}

      {/* Agent 列表 */}
      {!loading && (
        <AgentList
          agents={agents}
          loading={false}
          onToggle={handleToggle}
          onUninstall={handleUninstall}
          onShowDetail={handleShowDetail}
          onOpen={handleOpenAgent}
          updatesAvailable={updatesAvailable}
        />
      )}

      {/* 详情弹窗 */}
      <AgentDetailDialog
        agent={detailAgent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdateSuccess={handleUpdateSuccess}
      />

      {/* 启用失败错误提示 */}
      <Snackbar
        open={!!enableError}
        autoHideDuration={6000}
        onClose={() => setEnableError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setEnableError(null)}>
          {enableError}
        </Alert>
      </Snackbar>

      {/* Agent 运行时预览弹窗 */}
      <Dialog
        open={!!openAgent}
        onClose={() => setOpenAgent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {openAgent?.name || 'Agent'} v{openAgent?.version}
          </Typography>
          <IconButton size="small" onClick={() => setOpenAgent(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: 500, p: 0 }}>
          {openAgent && (
            <AgentContainer
              agentId={openAgent.id}
              manifest={openAgent.manifest}
              assetsBaseUrl={`/agents/${openAgent.id}`}
              disabled={!openAgent.enabled}
              height="100%"
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
