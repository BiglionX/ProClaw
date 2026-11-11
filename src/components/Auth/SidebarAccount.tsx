/**
 * v13.1.1 SidebarAccount：侧边栏底部账号卡片
 * - 显示当前账号 + 角色（多角色支持）
 * - 点击展开菜单：账号设置 / 切换账号 / 创建新账号 / 删除账号 / 退出登录
 * - 切换账号调 switchAccount（无需密码）
 * - 删除账号调 deleteLocalAccount
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Menu, MenuItem, ListItemIcon, ListItemText, Typography, Divider, Tooltip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuthStore, LocalUser } from '../../lib/authStore';
import { roleLabel, isBoss, handleDeleteAccount } from './accountShared';
import { isDemoAccountUser, isTestJunkAccount } from './loginAccounts';

export default function SidebarAccount({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate();
  const { user, logout, refreshLocalUsers, localUsers, switchAccount } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const open = Boolean(anchorEl);

  if (!user) return null;

  const displayName = user.name || user.email?.split('@')[0] || '未命名';
  const initial = displayName.charAt(0).toUpperCase();
  const otherAccounts: LocalUser[] = localUsers.filter(u => u.id !== user.id);
  const testAccounts = otherAccounts.filter(isTestJunkAccount);
  const visibleAccounts = (showTestAccounts
    ? otherAccounts
    : otherAccounts.filter(account => !isTestJunkAccount(account))
  ).slice().sort((a, b) => Number(isDemoAccountUser(b)) - Number(isDemoAccountUser(a)));

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    if (anchorEl) {
      setAnchorEl(null);
      return;
    }
    setAnchorEl(e.currentTarget);
    refreshLocalUsers().catch(() => {});
  };
  const handleClose = () => setAnchorEl(null);

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/');
  };

  const handleSwitchTo = async (accountId: string) => {
    handleClose();
    try {
      await switchAccount(accountId);
    } catch (err) {
      console.error('切换账号失败:', err);
    }
  };

  const handleDelete = (accountId: string, name: string) => {
    handleClose();
    handleDeleteAccount(accountId, name);
  };

  return (
    <>
    <Tooltip title={collapsed ? `${displayName} · ${roleLabel(user.role)}` : ''} placement="right" arrow>
    <Box
      onClick={handleOpen}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 1.5,
        px: collapsed ? 1 : 2,
        py: 1.25,
        cursor: 'pointer',
        borderRadius: 1,
        mx: collapsed ? 0.5 : 1,
        mb: 0.5,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isBoss(user.role) ? '#FF3B30' : '#6366F1',
          fontSize: '0.85rem',
          fontWeight: 700,
        }}
      >
        {initial}
      </Avatar>
      {!collapsed && (
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.7rem',
            display: 'block',
            lineHeight: 1.2,
          }}
        >
          {roleLabel(user.role)}
        </Typography>
      </Box>
      )}
    </Box>
    </Tooltip>

    <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 240,
              bgcolor: '#1e1e1e',
              border: '1px solid #333',
              color: '#fff',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {user.email || '(本地账号)'}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {otherAccounts.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                pt: 1.5,
                pb: 0.5,
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
              }}
            >
              切换账号
            </Typography>
            {visibleAccounts.map(acc => (
              <MenuItem
                key={acc.id}
                onClick={() => handleSwitchTo(acc.id)}
                sx={{ py: 0.75 }}
              >
                <ListItemIcon>
                  <SwapHorizIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    isDemoAccountUser(acc)
                      ? `演示账号 · ${acc.name || acc.email || acc.id}`
                      : acc.name || acc.email || acc.id
                  }
                  secondary={roleLabel(acc.role)}
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                    sx: { color: 'rgba(255,255,255,0.4)' },
                  }}
                />
              </MenuItem>
            ))}
            {!showTestAccounts && testAccounts.length > 0 && (
              <MenuItem onClick={() => setShowTestAccounts(true)} sx={{ py: 0.75 }}>
                <ListItemText
                  primary={`当前有 ${testAccounts.length} 个测试账号，点击展开`}
                  primaryTypographyProps={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}
                />
              </MenuItem>
            )}
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)', my: 0.5 }} />
          </>
        )}

        <MenuItem onClick={() => { handleClose(); navigate('/register'); }}>
          <ListItemIcon>
            <AddCircleOutlineIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
          </ListItemIcon>
          <ListItemText primary="创建新本地账号" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </MenuItem>

        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
          </ListItemIcon>
          <ListItemText primary="账号设置" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); navigate('/ucenter'); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.6)' }} />
          </ListItemIcon>
          <ListItemText primary="个人中心" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </MenuItem>

        {otherAccounts.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)', my: 0.5 }} />
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                px: 2,
                pt: 0.5,
                pb: 0.5,
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
              }}
            >
              删除账号
            </Typography>
            {visibleAccounts.map(acc => (
              <MenuItem
                key={`del-${acc.id}`}
                onClick={() => handleDelete(acc.id, acc.name || acc.email || acc.id)}
                sx={{ py: 0.75, color: '#ef4444' }}
              >
                <ListItemIcon>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: '#ef4444' }} />
                </ListItemIcon>
                <ListItemText
                  primary={acc.name || acc.email || acc.id}
                  secondary="删除本地账号"
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                    sx: { color: 'rgba(239,68,68,0.7)' },
                  }}
                />
              </MenuItem>
            ))}
          </>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />

        <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} />
          </ListItemIcon>
          <ListItemText primary="退出登录" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </MenuItem>
      </Menu>
    </>
  );
}
