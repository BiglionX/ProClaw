import {
  Logout as LogoutIcon,
  GitHub as GitHubIcon,
  HelpOutline as HelpIcon,
  AccountCircle as UserIcon,
  ChevronRight as BreadcrumbSeparator,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  ListItemIcon,
  Breadcrumbs,
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import { useNotificationStore } from '../../lib/notificationStore';
import NotificationPanel from './NotificationPanel';
import TokenDisplay from './TokenDisplay';

/** 页面路径到中文名的映射 */
const PATH_LABELS: Record<string, string> = {
  '/datacenter': '数据中心',
  '/products': '商品库',
  '/supplychain': '供应链',
  '/sales': '销售管理',
  '/inventory': '库存管理',
  '/teams': 'AI 团队',
  '/ai-knowledge': 'AI 知识库',
  '/customer-service': 'AI 客服',
  '/ucenter': '用户中心',
  '/settings': '设置',
  '/messages': '消息',
  '/contacts': '联系人',
  '/chat': '聊天',
  '/call': '通话',
  '/shop': '云商城',
  '/agents': 'Agent 管理',
  '/finance-agent': '财务 Agent',
  '/project-overview': '项目概览',
  '/operations': '运营中心',
};

function useBreadcrumbs(pathname: string): string[] {
  // 从路径中提取面包屑层级
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const subPath = '/' + segments.slice(0, i + 1).join('/');
    const label = PATH_LABELS[subPath];
    if (label) {
      crumbs.push(label);
    }
  }
  if (crumbs.length === 0) {
    crumbs.push('数据中心');
  }
  return crumbs;
}

export default function TopBar() {
  const { user, logout, openLoginDialog } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const breadcrumbs = useBreadcrumbs(location.pathname);
  const unreadCount = useNotificationStore(s => s.notifications.filter(n => !n.isRead).length);
  const togglePanel = useNotificationStore(s => s.togglePanel);
  const startMockAutoPush = useNotificationStore(s => s.startMockAutoPush);
  const stopMockAutoPush = useNotificationStore(s => s.stopMockAutoPush);

  // 启动模拟自动推送（Phase 1 演示用，Phase 2 替换为 WebSocket）
  useEffect(() => {
    startMockAutoPush();
    return () => stopMockAutoPush();
  }, [startMockAutoPush, stopMockAutoPush]);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    openLoginDialog();
  };

  const handleUserMenu = () => {
    setAnchorEl(null);
    navigate('/ucenter');
  };

  const handleSettingsMenu = () => {
    setAnchorEl(null);
    navigate('/settings');
  };

  const handleLogin = () => {
    openLoginDialog();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme => theme.zIndex.drawer + 1,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #1A1A2E 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Toolbar>
        {/* Logo + 品牌名 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mr: 3,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              background: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            P
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 50%, #6366F1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px',
            }}
          >
            ProClaw
          </Typography>
        </Box>

        {/* 面包屑导航 */}
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={
            <BreadcrumbSeparator sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }} />
          }
          sx={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {breadcrumbs.map((label, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{
                color: index === breadcrumbs.length - 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                fontSize: '0.85rem',
              }}
            >
              {label}
            </Typography>
          ))}
        </Breadcrumbs>

        <Box sx={{ flexGrow: 1 }} />

        {/* 全局搜索入口 */}
        <Tooltip title="搜索 (⌘K)">
          <Chip
            icon={<span style={{ opacity: 0.5 }}>🔍</span>}
            label="搜索..."
            variant="outlined"
            size="small"
            onClick={() => {
              // Phase 2 完善搜索逻辑
              console.log('Global search clicked');
            }}
            sx={{
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.12)',
              mr: 1,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'rgba(255,255,255,0.7)',
              },
              '& .MuiChip-label': {
                fontSize: '0.75rem',
              },
            }}
          />
        </Tooltip>

        {/* 通知中心入口 */}
        <Tooltip title="通知中心">
          <IconButton
            size="large"
            color="inherit"
            onClick={togglePanel}
            sx={{
              mr: 0.5,
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: '#fff' },
              position: 'relative',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            {/* 未读徽章 */}
            <Box
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#FF3B30',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'badgePulse 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '@keyframes badgePulse': {
                  '0%': { transform: 'scale(0)' },
                  '60%': { transform: 'scale(1.2)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Box>
          </IconButton>
        </Tooltip>

        {/* GitHub链接 */}
        <Tooltip title="GitHub">
          <IconButton
            size="large"
            color="inherit"
            sx={{
              mr: 0.5,
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: '#FF3B30' },
            }}
            onClick={() => window.open('https://github.com/your-org/proclaw', '_blank')}
          >
            <GitHubIcon />
          </IconButton>
        </Tooltip>

        {/* 帮助文档 */}
        <Tooltip title="帮助文档">
          <IconButton
            size="large"
            color="inherit"
            sx={{
              mr: 0.5,
              color: 'rgba(255,255,255,0.6)',
              '&:hover': { color: '#FF3B30' },
            }}
            onClick={() => window.open('https://docs.proclaw.cc', '_blank')}
          >
            <HelpIcon />
          </IconButton>
        </Tooltip>

        <TokenDisplay />

        {/* 用户头像下拉（仅保留头像，文字信息移入 Sidebar） */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user ? (
            <>
              {/* 头像 + 状态（垂直排列） */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    p: 0.5,
                    border: '2px solid transparent',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: user?.id?.startsWith('mock-') ? '#888' : '#6366F1',
                      fontSize: '0.8rem',
                    }}
                  >
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>

                {/* 在线状态标识 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6rem', lineHeight: 1 }}
                  >
                    在线 · 标准版
                  </Typography>
                </Box>
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 0.5, minWidth: 180 } } }}
              >
                <MenuItem onClick={handleUserMenu}>
                  <ListItemIcon><UserIcon fontSize="small" /></ListItemIcon>
                  用户中心
                </MenuItem>
                <MenuItem onClick={handleSettingsMenu}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  设置
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                  退出登录
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              disableElevation
              onClick={handleLogin}
              sx={{
                bgcolor: '#FF3B30',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.8rem',
                '&:hover': { bgcolor: '#D32F2F' },
                textTransform: 'none',
              }}
            >
              登录
            </Button>
          )}
        </Box>
      </Toolbar>
      <NotificationPanel />
    </AppBar>
  );
}
