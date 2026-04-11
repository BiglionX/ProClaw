import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../lib/authStore';
import { useNavigate } from 'react-router-dom';

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
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#16213e',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />

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
              bgcolor: '#1976d2',
              fontSize: '0.9rem',
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.85rem',
            }}
          >
            {user?.email || '用户'}
          </Typography>
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
