import { Box, Typography } from '@mui/material';
import { Extension as AgentIcon } from '@mui/icons-material';
import AgentCard from './AgentCard';
import type { AgentItem } from '../../lib/agentManagerStore';

interface AgentListProps {
  agents: AgentItem[];
  loading: boolean;
  onToggle: (agentId: string, enabled: boolean) => void;
  onUninstall: (agentId: string) => void;
  onShowDetail: (agent: AgentItem) => void;
  onOpen?: (agent: AgentItem) => void;
  /** agentId -> latestVersion 映射 */
  updatesAvailable?: Map<string, string>;
}

export default function AgentList({ agents, loading, onToggle, onUninstall, onShowDetail, onOpen, updatesAvailable }: AgentListProps) {
  if (!loading && agents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          color: 'text.disabled',
        }}
      >
        <AgentIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
        <Typography variant="h6" gutterBottom>
          尚未安装任何 Agent
        </Typography>
        <Typography variant="body2" color="text.secondary">
          前往 Agent 市场发现并安装更多能力模块
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {agents.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onToggle={onToggle}
          onUninstall={onUninstall}
          onShowDetail={onShowDetail}
          onOpen={onOpen}
          hasUpdate={updatesAvailable?.has(agent.id) ?? false}
        />
      ))}
    </Box>
  );
}
