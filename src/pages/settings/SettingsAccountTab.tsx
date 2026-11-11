/**
 * v13.1.1 SettingsAccountTab：设置中心账号管理
 * - 当前账号信息（只读）
 * - 切换账号列表（含删除入口）
 * - 创建新账号表单
 * - 退出登录按钮
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Button, Card, CardContent, Chip, Divider, Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../../lib/authStore';
import {
  AccountListCard,
  CreateAccountForm,
  roleLabel,
  isBoss,
  handleDeleteAccount,
} from '../../components/Auth/accountShared';

export default function SettingsAccountTab() {
  const navigate = useNavigate();
  const { user, localUsers, isLoading, refreshLocalUsers, switchAccount, logout } = useAuthStore();

  useEffect(() => {
    refreshLocalUsers().catch(() => {});
  }, [refreshLocalUsers]);

  if (!user) return null;

  const handleSwitch = async (accountId: string) => {
    try {
      await switchAccount(accountId);
    } catch (err: any) {
      console.error('切换账号失败:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Box>
      {/* 当前账号 */}
      <Card sx={{ mb: 3, bgcolor: '#1e1e1e', border: '1px solid #333' }}>
        <CardContent>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            当前账号
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: isBoss(user.role) ? '#FF3B30' : '#6366F1',
                fontSize: '1.5rem',
                fontWeight: 700,
                mr: 2,
              }}
            >
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                {user.name || '(未命名)'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {user.email || '(本地账号)'}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={roleLabel(user.role || 'user')}
                  size="small"
                  sx={{
                    bgcolor: isBoss(user.role) ? 'rgba(255,59,48,0.15)' : 'rgba(99,102,241,0.15)',
                    color: isBoss(user.role) ? '#ff8a80' : '#a5b4fc',
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              borderColor: '#ef4444',
              color: '#ef4444',
              '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' },
              textTransform: 'none',
            }}
          >
            退出当前账号
          </Button>
        </CardContent>
      </Card>

      {/* 切换账号列表（含删除按钮） */}
      {localUsers.length > 0 && (
        <AccountListCard
          currentUserId={user.id}
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
          <CreateAccountForm theme="dark" showDisplayName />
        </CardContent>
      </Card>
    </Box>
  );
}
