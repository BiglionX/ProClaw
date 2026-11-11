/**
 * v13.1.1 NoUserWelcome
 */
import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Alert } from '@mui/material';
import { useAuthStore } from '../../lib/authStore';
import { CreateAccountForm } from './accountShared';
import LoginAccountPicker from './LoginAccountPicker';

export default function NoUserWelcome() {
  const { localUsers, refreshLocalUsers, switchAccount } = useAuthStore();
  useEffect(() => { refreshLocalUsers().catch(() => {}); }, [refreshLocalUsers]);
  const handleSwitch = async (id: string) => { try { await switchAccount(id); } catch (e) { console.error(e); } };
  const isFirstTime = localUsers.length === 0;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 480, width: '100%', bgcolor: '#1e1e1e', border: '1px solid #333' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box component="img" src="/proclaw-logo.png" alt="ProClaw Logo" sx={{ width: 48, height: 48, mr: 1.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>ProClaw</Typography>
          </Box>
          <Typography variant="body2" align="center" sx={{ mb: 3, color: 'rgba(255,255,255,0.5)' }}>
            AI-Powered Business Operating System
          </Typography>
          <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(0,123,255,0.08)' }}>
            <Typography variant="body2">
              <strong>{isFirstTime ? '欢迎使用 ProClaw' : '检测到已有本地账号'}</strong>
              <br />
              {isFirstTime
                ? '创建你的第一个本地账号以开始使用。账号信息仅存储在本机，由系统原生凭据管理保护。'
                : '点击下方账号即可激活（无需密码）。也可创建新本地账号。'}
            </Typography>
          </Alert>
          {!isFirstTime && (
            <LoginAccountPicker accounts={localUsers} onSwitch={handleSwitch} theme="dark" />
          )}
          <CreateAccountForm theme="dark" showDisplayName={isFirstTime} />
          <Typography variant="caption" align="center" sx={{ display: 'block', mt: 3, color: 'rgba(255,255,255,0.35)' }}>
            v13.1.1 本地账号无登录模式 · 数据仅存储于本机
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}