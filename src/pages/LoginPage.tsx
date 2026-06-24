import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';
import { MOCK_PASSWORD } from '../lib/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithOidc, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOidcLoading, setIsOidcLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
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
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
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

          {/* 模拟账号提示 */}
          <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(0,0,0,0.03)', border: '1px solid #ddd' }}>
            <Typography variant="body2">
              <strong>快速体验账号</strong>
              <br />
              用户名: <code>boss</code>
              <br />
              密码: <code>{MOCK_PASSWORD}</code>
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
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

            {/* 快速登录按钮 */}
            <Button
              fullWidth
              variant="outlined"
              size="medium"
              onClick={async () => {
                try {
                  await login('boss', MOCK_PASSWORD);
                  navigate('/');
                } catch (err) {
                  console.error('Quick login failed:', err);
                }
              }}
              sx={{ mb: 2, borderColor: '#666', color: '#666' }}
            >
              ⚡ 一键体验 (boss)
            </Button>

            {/* OIDC 登录区域 */}
            <div data-testid="oidc-section-check" style={{display:'none'}}>OIDC section rendered</div>

            <Box sx={{ my: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flex: 1, borderBottom: 1, borderColor: 'divider' }}></Box>
              <Typography variant="body2" color="text.secondary" sx={{ mx: 2 }}>
                或
              </Typography>
              <Box sx={{ flex: 1, borderBottom: 1, borderColor: 'divider' }}></Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              data-testid="oidc-login-button"
              onClick={async () => {
                try {
                  setIsOidcLoading(true);
                  const authUrl = await loginWithOidc();
                  window.open(authUrl, '_blank');
                } catch (err) {
                  console.error('OIDC login failed:', err);
                } finally {
                  setIsOidcLoading(false);
                }
              }}
              sx={{ mb: 2, bgcolor: '#0F62FE', '&:hover': { bgcolor: '#0D47A1' } }}
              disabled={isOidcLoading}
            >
              {isOidcLoading ? <CircularProgress size={24} /> : '🔑 使用 ProClaw 账号登录'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link href="/register" variant="body2" underline="hover">
                还没有账号? 立即注册
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
