import {
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import TokenDisplay from './TokenDisplay';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme => theme.zIndex.drawer + 1,
        backgroundColor: '#16213e',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: '#fff',
              fontSize: '1.3rem',
            }}
          >
            🦞 Proclaw
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <TokenDisplay />

        <Tooltip title="通知">
          <IconButton size="large" color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: user?.id?.startsWith('mock-') ? '#ff9800' : '#1976d2',
              fontSize: '0.9rem',
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              {user?.email?.split('@')[0] || '用户'}
            </Typography>
            {user?.id?.startsWith('mock-') && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ff9800',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                🎭 体验模式
              </Typography>
            )}
          </Box>
          <Tooltip title="退出登录">
            <IconButton size="small" color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
