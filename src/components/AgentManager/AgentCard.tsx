import {
  Badge,
  Box,
  Card,
  Chip,
  IconButton,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  DeleteOutline as UninstallIcon,
  InfoOutlined as InfoIcon,
  Extension as AgentIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import type { AgentItem } from '../../lib/agentManagerStore';

interface AgentCardProps {
  agent: AgentItem;
  onToggle: (agentId: string, enabled: boolean) => void;
  onUninstall: (agentId: string) => void;
  onShowDetail: (agent: AgentItem) => void;
  onOpen?: (agent: AgentItem) => void;
  hasUpdate?: boolean;
}

export default function AgentCard({ agent, onToggle, onUninstall, onShowDetail, onOpen, hasUpdate }: AgentCardProps) {
  return (
    <Card
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        gap: 2,
        opacity: agent.enabled ? 1 : 0.6,
        transition: 'opacity 0.2s',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      {/* Agent 图标 */}
      <Badge
        color="warning"
        variant="dot"
        invisible={!hasUpdate}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ badge: { style: { width: 10, height: 10 } } }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: agent.is_builtin ? '#1976d2' : '#ff3b30',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AgentIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
      </Badge>

      {/* Agent 信息 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {agent.name}
          </Typography>
          {agent.is_builtin && (
            <Chip label="内置" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
          {agent.manifest.description || '暂无描述'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.disabled">
            v{agent.version}
          </Typography>
          {agent.manifest.author && (
            <Typography variant="caption" color="text.disabled">
              {agent.manifest.author}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="打开 Agent">
          <IconButton size="small" onClick={() => onOpen?.(agent)}>
            <OpenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="查看详情">
          <IconButton size="small" onClick={() => onShowDetail(agent)}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={agent.enabled ? '禁用' : '启用'}>
          <Switch
            checked={agent.enabled}
            onChange={(_, checked) => onToggle(agent.id, checked)}
            size="small"
          />
        </Tooltip>

        {!agent.is_builtin && (
          <Tooltip title="卸载">
            <IconButton size="small" color="error" onClick={() => onUninstall(agent.id)}>
              <UninstallIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Card>
  );
}
