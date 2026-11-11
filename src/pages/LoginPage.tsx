import { Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { checkPasswordStrength } from '../components/Auth/accountShared';
import LoginAccountPicker from '../components/Auth/LoginAccountPicker';
import { isDemoAccountUser } from '../components/Auth/loginAccounts';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, localUsers, refreshLocalUsers, switchAccount, isLoading, error, clearError } = useAuthStore();
  // React 规则：所有 hooks 必须在 early return 之前调用，否则 user 从 null→object 切换时
  // 会触发 "Rendered fewer hooks than expected" 错误并卸载组件（v13.1.1 P0-2 回归修复）
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    refreshLocalUsers().catch(() => {});
  }, [refreshLocalUsers]);

  // v13.1.1 P0-2：已登录用户访问 /login 自动跳首页
  if (user) {
    return <Navigate to="/" replace />;
  }

  const pwdCheck = checkPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!pwdCheck.ok) {
      setLocalError(pwdCheck.hint);
      return;
    }
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      // v13.1.1: 后端 keyring 失败时必须给用户看错误，否则静默“无法注册”
      setLocalError(err?.message || '登录失败，请查看密码强度或重试');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <img 
              src="/proclaw-logo.png" 
              alt="ProClaw Logo" 
              style={{ width: 40, height: 40, marginRight: 12 }} 
            />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              ProClaw
            </Typography>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            AI-Powered Business Operating System
          </Typography>

          {/* v13.1.1 提示：本地账号模式 - 首次启动将引导创建账号 */}
          <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(0,0,0,0.03)', border: '1px solid #ddd' }}>
            <Typography variant="body2">
              <strong>本地账号模式</strong>
              <br />
              提交邮箱与密码即可创建本地账号并自动登录。
              <br />
              密码由系统原生凭据存储保护（Windows Credential Manager / macOS Keychain）。
            </Typography>
          </Alert>

          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => { clearError(); setLocalError(null); }}>
              {error || localError}
            </Alert>
          )}

          {localUsers.length > 0 && (
            <LoginAccountPicker
              accounts={localUsers}
              isLoading={isLoading}
              theme="light"
              onSwitch={async (accountId) => {
                setLocalError(null);
                clearError();
                try {
                  await switchAccount(accountId);
                  navigate('/');
                } catch (err: any) {
                  setLocalError(err?.message || '切换账号失败');
                }
              }}
            />
          )}
          {localUsers.length > 0 && !localUsers.some(isDemoAccountUser) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              还没有演示账号 boss@proclaw.demo。重新打开应用后会自动补上，进入后可以看到演示商品和订单。
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                邮箱
              </Typography>
              <TextField
                fullWidth
                placeholder="请输入邮箱"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: '#ddd',
                    },
                    '&:hover fieldset': {
                      borderColor: '#999',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#666',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#333',
                    fontSize: '15px',
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                密码
              </Typography>
              <TextField
                fullWidth
                placeholder="请输入密码"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: '#ddd',
                    },
                    '&:hover fieldset': {
                      borderColor: '#999',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#666',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#333',
                    fontSize: '15px',
                  },
                }}
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={isLoading}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : '登录'}
            </Button>

            {/* 跳转到引导页创建完整账号（v13.1.1 首选入口） */}
            <Button
              fullWidth
              variant="text"
              size="small"
              type="button"
              onClick={() => navigate('/welcome')}
              sx={{ mb: 1, color: '#1976d2' }}
            >
              首次使用？创建新本地账号 →
            </Button>

            {/* v13.1.1：OIDC 登录已停用，本地账号模式不依赖外部服务 */}
            <Typography variant="caption" align="center" sx={{ display: 'block', mt: 3, color: 'rgba(0,0,0,0.45)' }}>
              本地账号模式 · 密码仅存储于本机系统凭据库
            </Typography>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
