import {
  Logout as LogoutIcon,
  GitHub as GitHubIcon,
  HelpOutline as HelpIcon,
  AccountCircle as UserIcon,
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
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/authStore';
import TokenDisplay from './TokenDisplay';

export default function TopBar() {
  const { user, logout, openLoginDialog } = useAuthStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    openLoginDialog();
  };

  const handleUserMenu = () => {
    setAnchorEl(null);
    navigate('/ucenter');
  };

  const handleLogin = () => {
    openLoginDialog();
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
          {user ? (
            <>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', py: 0.5, px: 1, borderRadius: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
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
                  个人中心
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
                bgcolor: '#ff3b30',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.8rem',
                '&:hover': { bgcolor: '#d32f2f' },
                textTransform: 'none',
              }}
            >
              登录
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
