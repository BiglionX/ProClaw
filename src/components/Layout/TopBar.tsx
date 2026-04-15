import {
  Logout as LogoutIcon,
  GitHub as GitHubIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
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
        backgroundColor: '#1a1a1a',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        borderBottom: '1px solid #333',
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
            ProClaw
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.7rem',
              ml: 1,
            }}
          >
            AI Business OS
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* GitHub链接 */}
        <Tooltip title="GitHub">
          <IconButton 
            size="large" 
            color="inherit" 
            sx={{ 
              mr: 1,
              '&:hover': {
                color: '#ff3b30',
              }
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
              mr: 1,
              '&:hover': {
                color: '#ff3b30',
              }
            }}
            onClick={() => window.open('https://docs.proclaw.cc', '_blank')}
          >
            <HelpIcon />
          </IconButton>
        </Tooltip>

        <TokenDisplay />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: user?.id?.startsWith('mock-') ? '#888' : '#666',
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
                  color: '#aaa',
                  fontSize: '0.7rem',
                  display: 'block',
                }}
              >
                体验模式
              </Typography>
            )}
          </Box>
          <Tooltip title="退出登录">
            <IconButton 
              size="small" 
              color="inherit" 
              onClick={handleLogout}
              sx={{
                '&:hover': {
                  color: '#ff3b30',
                }
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
