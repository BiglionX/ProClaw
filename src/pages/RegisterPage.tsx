/**
 * v13.1.1 RegisterPage：本地账号管理页
 * - 已存在本地账号 → 显示账号列表 + 创建新账号表单
 * - 无账号 → 引导用户创建第一个本地账号
 * 入口：SidebarAccount 菜单 / SettingsAccountTab / /register 路由
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Button, Card, CardContent, Divider, Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../lib/authStore';
import {
  AccountListCard,
  CreateAccountForm,
  roleLabel,
  isBoss,
  handleDeleteAccount,
} from '../components/Auth/accountShared';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, localUsers, isLoading, refreshLocalUsers, switchAccount, logout } = useAuthStore();

  useEffect(() => {
    refreshLocalUsers().catch(() => {});
  }, [refreshLocalUsers]);

  const handleSwitch = async (accountId: string) => {
    try {
      await switchAccount(accountId);
      navigate('/');
    } catch (err: any) {
      console.error('切换账号失败:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', py: 6, px: 2 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        {/* 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <Box
            component="img"
            src="/proclaw-logo.png"
            alt="ProClaw Logo"
            sx={{ width: 40, height: 40, mr: 1.5 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
            ProClaw 本地账号
          </Typography>
        </Box>

        {/* 当前账号 + 退出 */}
        {user && (
          <Card sx={{ mb: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                当前账号
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: isBoss(user.role) ? '#FF3B30' : '#6366F1',
                    fontWeight: 700,
                    mr: 2,
                  }}
                >
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                    {user.name || '(未命名)'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {roleLabel(user.role)}
                    {user.email && ` · ${user.email}`}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  sx={{
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
                    textTransform: 'none',
                  }}
                >
                  退出
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 已有账号列表（含删除入口） */}
        {localUsers.length > 0 && (
          <AccountListCard
            currentUserId={user?.id ?? null}
            accounts={localUsers}
            isLoading={isLoading}
            onSwitch={handleSwitch}
            onDelete={handleDeleteAccount}
            showHeader
          />
        )}

        {/* 创建新账号 */}
        <Card sx={{ bgcolor: '#1e1e1e', border: '1px solid #333' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {localUsers.length === 0 ? '🚀 创建你的第一个本地账号' : '➕ 创建新本地账号'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, mb: 2 }}>
              密码由系统原生凭据存储保护（Windows Credential Manager / macOS Keychain）。
            </Typography>
            <CreateAccountForm theme="dark" showDisplayName />
          </CardContent>
        </Card>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }} />
        <Typography
          variant="caption"
          align="center"
          sx={{ display: 'block', color: 'rgba(255,255,255,0.35)' }}
        >
          v13.1.1 本地账号无登录模式 · 数据仅存储于本机
        </Typography>
      </Box>
    </Box>
  );
}
