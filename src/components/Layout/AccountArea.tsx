/**
 * PRD v13.0 §5.1 侧边栏底部账号区
 *
 * 三态视觉：
 *  - offline：灰色默认头像 + 「未登录」+ 🔓 → 跳 /settings?tab=account
 *  - local  ：彩色头像（hash）+ 用户名 + ⚙️ → 下拉菜单
 *  - premium：彩色头像 + 彩色「云」徽章 + 用户名 + ⚙️ → 下拉菜单
 *  - demo   ：紫红头像 + 「演示」+ 用户名 + 🧪 → 下拉菜单
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  LockOpen as LockOpenIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  SwapHoriz as SwapIcon,
  Cloud as CloudIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useAuthStore, IdentityState } from '../../lib/authStore';

/** 字符串 → 颜色（用于离线访客/本地账号头像） */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + (hash << 5) - hash;
  }
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  return colors[Math.abs(hash) % colors.length];
}

function firstChar(text: string): string {
  if (!text) return 'G';
  return text.charAt(0).toUpperCase();
}

const STATE_LABEL: Record<IdentityState, string> = {
  offline: '未登录',
  local: '本地',
  premium: '云端',
  demo: '演示',
};

interface AccountAreaProps {
  collapsed?: boolean;
}

export default function AccountArea({ collapsed = false }: AccountAreaProps) {
  const navigate = useNavigate();
  const {
    user,
    localAccount,
    identityState,
    logout,
    logoutLocal,
  } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const displayName = useMemo(() => {
    if (identityState === 'offline') return '未登录';
    if (user) return user.email?.split('@')[0] || user.id.slice(0, 8);
    if (localAccount) return localAccount.displayName || localAccount.username;
    return '未登录';
  }, [user, localAccount, identityState]);

  const avatarColor = useMemo(() => {
    if (identityState === 'offline') return '#9E9E9E';
    if (identityState === 'demo') return '#9C27B0';
    if (user) return stringToColor(user.id);
    if (localAccount) return stringToColor(localAccount.id);
    return '#9E9E9E';
  }, [user, localAccount, identityState]);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (identityState === 'offline') {
      navigate('/settings?tab=account');
    } else {
      setAnchorEl(e.currentTarget);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleSwitchAccount = () => {
    handleClose();
    navigate('/settings?tab=account');
  };

  const handleLogout = async () => {
    handleClose();
    if (identityState === 'local') {
      await logoutLocal();
    } else if (identityState === 'premium' || identityState === 'demo') {
      await logout();
    }
  };

  const handleManageCloud = () => {
    handleClose();
    window.open('https://proclaw.cc', '_blank');
  };

  // 折叠态：只显示头像 + 提示气泡
  if (collapsed) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <Tooltip title={`${STATE_LABEL[identityState]} · ${displayName}`} placement="right" arrow>
          <IconButton
            size="small"
            onClick={handleClick}
            sx={{
              p: 0.5,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: avatarColor,
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {identityState === 'offline' ? 'G' : firstChar(displayName)}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: avatarColor,
            fontSize: '0.95rem',
            fontWeight: 700,
          }}
        >
          {identityState === 'offline' ? 'G' : firstChar(displayName)}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 110,
              }}
            >
              {displayName}
            </Typography>
            {identityState === 'premium' && (
              <CloudIcon sx={{ fontSize: 14, color: '#FF9800' }} />
            )}
            {identityState === 'demo' && (
              <ScienceIcon sx={{ fontSize: 14, color: '#9C27B0' }} />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: identityState === 'offline' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.55)',
              fontSize: '0.7rem',
            }}
          >
            {identityState === 'offline' && (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <LockOpenIcon sx={{ fontSize: 12 }} /> 点击登录
              </Box>
            )}
            {identityState === 'local' && '本地账号'}
            {identityState === 'premium' && (user?.email || '云端账号')}
            {identityState === 'demo' && '演示账号'}
          </Typography>
        </Box>
        {identityState !== 'offline' && (
          <Tooltip title="账号设置" placement="top" arrow>
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              backgroundColor: '#1E1E2E',
              color: '#e0e0e0',
              border: '1px solid rgba(255,255,255,0.08)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: avatarColor,
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {firstChar(displayName)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }} noWrap>
                {displayName}
              </Typography>
              <Chip
                label={STATE_LABEL[identityState]}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  mt: 0.25,
                  backgroundColor: avatarColor,
                  color: '#fff',
                }}
              />
            </Box>
          </Box>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <MenuItem onClick={() => { handleClose(); navigate('/settings?tab=account'); }}>
          <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
          <ListItemText>账号设置</ListItemText>
        </MenuItem>
        {identityState === 'local' && (
          <MenuItem onClick={handleSwitchAccount}>
            <ListItemIcon><SwapIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
            <ListItemText>切换本地账号</ListItemText>
          </MenuItem>
        )}
        {identityState === 'premium' && (
          <MenuItem onClick={handleManageCloud}>
            <ListItemIcon><CloudIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
            <ListItemText>管理云端订阅</ListItemText>
          </MenuItem>
        )}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} /></ListItemIcon>
          <ListItemText sx={{ color: '#EF4444' }}>退出账号</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
