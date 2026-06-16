import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Close as CloseIcon,
  DeleteSweep as DeleteSweepIcon,
  DoneAll as DoneAllIcon,
  NotificationsNone as NotificationsNoneIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material';

import {
  useNotificationStore,
  type NotificationItem,
  type NotificationType,
} from '../../lib/notificationStore';

// ==================== 常量 ====================

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  task_completed:       { icon: '✅', color: '#10B981' },
  task_failed:         { icon: '❌', color: '#EF4444' },
  invitation_accepted: { icon: '🤝', color: '#6366F1' },
  low_stock:           { icon: '📦', color: '#F59E0B' },
  system:              { icon: '🔔', color: '#6B7280' },
  finance:             { icon: '💰', color: '#10B981' },
  agent_message:       { icon: '🤖', color: '#6366F1' },
  order_status:        { icon: '📋', color: '#FF3B30' },
  // PRD v12.0 灵活库存通知
  inventory_low_confidence: { icon: '⚠️', color: '#F59E0B' },
  inventory_negative_aging: { icon: '📉', color: '#EF4444' },
  inventory_calibration:    { icon: '🔧', color: '#6366F1' },
};

// ==================== 工具函数 ====================

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  if (hours < 48) return '昨天';
  return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function groupByDate(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, NotificationItem[]> = {};
  for (const item of items) {
    const date = new Date(item.createdAt);
    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = '昨天';
    } else {
      label = '更早';
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  // 保持顺序：今天 → 昨天 → 更早
  const order = ['今天', '昨天', '更早'];
  return order
    .filter(label => groups[label])
    .map(label => ({ label, items: groups[label] }));
}

// ==================== 子组件：NotificationItemRow ====================

function NotificationItemRow({ item }: { item: NotificationItem }) {
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const setPanelOpen = useNotificationStore(s => s.setPanelOpen);
  const navigate = useNavigate();
  const typeCfg = TYPE_CONFIG[item.type] || { icon: '🔔', color: '#6B7280' };

  const handleClick = () => {
    if (!item.isRead) markAsRead(item.id);
    if (item.actionPath) {
      navigate(item.actionPath);
      setPanelOpen(false);
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 1.5,
        mx: 1,
        borderRadius: 1.5,
        cursor: item.actionPath ? 'pointer' : 'default',
        backgroundColor: item.isRead ? 'transparent' : 'rgba(255,59,48,0.03)',
        borderLeft: item.isRead ? 'none' : '3px solid #FF3B30',
        pl: item.isRead ? 2.5 : 2.5, // 保持视觉对齐
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.02)',
        },
      }}
    >
      {/* 类型图标 */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: `${typeCfg.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1rem',
        }}
      >
        {typeCfg.icon}
      </Box>

      {/* 内容 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: item.isRead ? 400 : 600,
              fontSize: '0.8rem',
              color: '#1A1A2E',
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: '#999',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {timeAgo(item.createdAt)}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#666',
            lineHeight: 1.4,
            mt: 0.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.message}
        </Typography>
      </Box>
    </Box>
  );
}

// ==================== 主组件 ====================

export default function NotificationPanel() {
  const { notifications, panelOpen, isLoading, setPanelOpen, markAllAsRead, clearAll } =
    useNotificationStore(s => ({
      notifications: s.notifications,
      panelOpen: s.panelOpen,
      isLoading: s.isLoading,
      setPanelOpen: s.setPanelOpen,
      markAllAsRead: s.markAllAsRead,
      clearAll: s.clearAll,
    }));

  const [confirmOpen, setConfirmOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications],
  );

  const groups = useMemo(() => groupByDate(notifications), [notifications]);
  const hasNotifications = notifications.length > 0;
  const hasUnread = unreadCount > 0;

  const handleClearConfirm = () => {
    clearAll();
    setConfirmOpen(false);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        PaperProps={{
          sx: {
            width: 380,
            top: 64,
            height: 'calc(100vh - 64px)',
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        {/* 头部 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              通知中心
            </Typography>
            {unreadCount > 0 && (
              <Box
                sx={{
                  backgroundColor: '#FF3B30',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 10,
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Box>
            )}
          </Box>
          <IconButton size="small" onClick={() => setPanelOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 操作栏 */}
        {hasNotifications && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              px: 2.5,
              py: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              size="small"
              variant="text"
              startIcon={<DoneAllIcon />}
              disabled={!hasUnread}
              onClick={markAllAsRead}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              全部已读
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setConfirmOpen(true)}
              sx={{ fontSize: '0.75rem', textTransform: 'none', color: '#EF4444' }}
            >
              清空
            </Button>
          </Box>
        )}

        {/* 通知列表 */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            py: 1,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2 },
          }}
        >
          {isLoading ? (
            // 加载态
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" color="text.secondary">加载中...</Typography>
            </Box>
          ) : hasNotifications ? (
            groups.map(group => (
              <Box key={group.label}>
                {/* 分组标题 */}
                <Typography
                  sx={{
                    px: 2.5,
                    py: 1,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {group.label}（{group.items.length}）
                </Typography>
                {group.items.map(item => (
                  <NotificationItemRow key={item.id} item={item} />
                ))}
              </Box>
            ))
          ) : (
            // 空状态
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                暂无通知
              </Typography>
              <Typography variant="caption" color="text.secondary">
                当有系统通知或 AI 任务完成时，将在这里显示
              </Typography>
            </Box>
          )}
        </Box>

        {/* 底部提示 */}
        {hasNotifications && (
          <Box
            sx={{
              textAlign: 'center',
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: '#ccc' }}>
              没有更多通知了
            </Typography>
          </Box>
        )}
      </Drawer>

      {/* 清空确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>确认清空</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            确定要清空所有通知吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button color="error" variant="contained" disableElevation onClick={handleClearConfirm}>
            清空
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
