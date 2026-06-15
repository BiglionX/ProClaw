/**
 * AI Team 群组成员列表弹窗
 *
 * 在 ContactsPage 点击群组头像时弹出，展示该群组所有成员。
 * 点击成员后跳转到 AgentProfilePage（/agent-profile/:agentId）。
 */

import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Group as GroupIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import type { AITeamGroupConfig } from '../../lib/contactService';
import {
  getAgentProfileOverride,
  resolveAgentDisplay,
  onProfileChanged,
} from '../../lib/agentProfileService';
import { AGENT_AVATAR_PRESETS, getDefaultAgentAvatar } from '../../types/agentAvatarLibrary';

interface TeamMembersDialogProps {
  open: boolean;
  groupConfig: AITeamGroupConfig | null;
  onClose: () => void;
  onMemberClick: (agentId: string) => void;
}

export default function TeamMembersDialog({
  open,
  groupConfig,
  onClose,
  onMemberClick,
}: TeamMembersDialogProps) {
  const [overrides, setOverrides] = useState<Record<string, { displayName: string; avatarUrl: string }>>({});
  const [loading, setLoading] = useState(false);

  // 加载成员的 override
  useEffect(() => {
    if (!open || !groupConfig) return;
    setLoading(true);
    (async () => {
      const result: Record<string, { displayName: string; avatarUrl: string }> = {};
      const members = Object.entries(groupConfig.members);
      for (const [agentId, member] of members) {
        const override = await getAgentProfileOverride(agentId);
        const resolved = resolveAgentDisplay(agentId, member.name, member.avatar, override);
        result[agentId] = {
          displayName: resolved.displayName,
          avatarUrl: resolved.avatarUrl,
        };
      }
      setOverrides(result);
      setLoading(false);
    })();

    // 订阅变更
    const unsubscribe = onProfileChanged(() => {
      (async () => {
        const result: Record<string, { displayName: string; avatarUrl: string }> = {};
        const members = Object.entries(groupConfig.members);
        for (const [agentId, member] of members) {
          const override = await getAgentProfileOverride(agentId);
          const resolved = resolveAgentDisplay(agentId, member.name, member.avatar, override);
          result[agentId] = {
            displayName: resolved.displayName,
            avatarUrl: resolved.avatarUrl,
          };
        }
        setOverrides(result);
      })();
    });
    return () => unsubscribe();
  }, [open, groupConfig]);

  if (!groupConfig) return null;

  const members = Object.entries(groupConfig.members);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon sx={{ color: groupConfig.color || '#ff6d00' }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {groupConfig.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {members.length} 位成员 · 点击成员查看介绍
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List disablePadding>
            {members.map(([agentId, member]) => {
              const override = overrides[agentId];
              const displayName = override?.displayName || member.name;
              const avatarSrc = override?.avatarUrl;
              return (
                <ListItemButton
                  key={agentId}
                  onClick={() => {
                    onClose();
                    onMemberClick(agentId);
                  }}
                  sx={{
                    py: 1.5,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={avatarSrc}
                      sx={{ bgcolor: 'primary.light' }}
                    >
                      {member.avatar}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600}>{displayName}</Typography>
                        {override?.displayName && override.displayName !== member.name && (
                          <Chip
                            label="自定义"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {member.role}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 静默使用以避免 unused import 警告
void AGENT_AVATAR_PRESETS;
void getDefaultAgentAvatar;
