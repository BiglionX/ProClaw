/**
 * 上下文指示器组件
 * 当与 CEO Agent 聊天时，在输入框上方显示当前活跃的项目目标
 */

import { Chip, Box, Popover, Typography, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import { LightbulbOutlined as GoalIcon, Close as CloseIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { proclawContext, PcpEntry } from '../../lib/ceoController';

const CEO_AGENT_ID = 'ceo-agent';

interface ContextIndicatorProps {
  /** 当前聊天对象的联系人 ID */
  contactId?: string;
}

export default function ContextIndicator({ contactId }: ContextIndicatorProps) {
  const [activeEntries, setActiveEntries] = useState<PcpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const isCEO = contactId === CEO_AGENT_ID;

  useEffect(() => {
    if (isCEO) {
      loadContext();
    }
  }, [isCEO]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const entries = await proclawContext.query({ status: 'active' });
      setActiveEntries(entries);
    } catch (e) {
      console.error('Failed to load PCP entries:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!isCEO) return null;

  const topEntries = activeEntries.slice(0, 3);
  const remaining = activeEntries.length - 3;

  return (
    <Box sx={{ px: 2, pb: 0.5 }}>
      {/* 上下文标题条 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.5,
          px: 1,
          borderRadius: 1,
          bgcolor: '#fff8e1',
          border: '1px solid #ffe082',
          cursor: 'pointer',
          minHeight: 32,
        }}
        onClick={handleClick}
      >
        <GoalIcon sx={{ fontSize: 16, color: '#f57c00' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, flex: 1 }}>
          {loading ? (
            <CircularProgress size={12} sx={{ mr: 1 }} />
          ) : activeEntries.length > 0 ? (
            <>
              活跃项目目标: {' '}
              {topEntries.map((e) => (
                <Chip
                  key={e.id}
                  label={`${e.title || e.context_type}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    mx: 0.25,
                    borderColor: '#ffe082',
                    bgcolor: 'rgba(255,255,255,0.8)',
                  }}
                />
              ))}
              {remaining > 0 && (
                <Typography variant="caption" color="text.disabled" component="span" sx={{ ml: 0.5 }}>
                  +{remaining} 更多
                </Typography>
              )}
            </>
          ) : (
            '暂无活跃项目目标 - 向 CEO Agent 描述您的业务方向'
          )}
        </Typography>
      </Box>

      {/* 展开详情弹出框 */}
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 360, maxHeight: 400, p: 1.5 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            项目上下文 ({activeEntries.length})
          </Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {activeEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            暂无活跃项目上下文条目
          </Typography>
        ) : (
          <List dense disablePadding>
            {activeEntries.map(entry => (
              <ListItem key={entry.id} disableGutters sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{
                        px: 0.6, py: 0.15, borderRadius: 0.5,
                        bgcolor: getContextTypeColor(entry.context_type),
                        color: 'white', fontWeight: 600, fontSize: '0.6rem',
                      }}>
                        {entry.context_type.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {entry.title || '无标题'}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      {entry.description && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                          {entry.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.3 }}>
                        <Typography variant="caption" color="text.disabled">
                          优先级: {entry.priority ?? '-'}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          创建者: {entry.created_by}
                        </Typography>
                      </Box>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 1, textAlign: 'right' }}>
          <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }}
            onClick={() => {
              handleClose();
              window.dispatchEvent(new CustomEvent('proclaw:open-project-overview'));
            }}>
            查看完整仪表板 →
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
}

function getContextTypeColor(contextType: string): string {
  const colors: Record<string, string> = {
    vision: '#7c4dff',
    goal: '#00c853',
    constraint: '#ff1744',
    milestone: '#2979ff',
    decision: '#ff9100',
  };
  return colors[contextType] || '#757575';
}
