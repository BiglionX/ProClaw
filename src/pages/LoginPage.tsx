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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          <Typography variant="h5" component="h1" gutterBottom align="center">
            🦞 Proclaw Desktop
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            AI-Powered Business Operating System
          </Typography>

          {/* 模拟账号提示 */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              🚀 <strong>快速体验账号</strong>
              <br />
              用户名: <code>boss</code>
              <br />
              密码: <code>IamBigBoss</code>
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
                      borderColor: '#1976d2',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
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
                      borderColor: '#1976d2',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
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
                  await login('boss', 'IamBigBoss');
                  navigate('/');
                } catch (err) {
                  console.error('Quick login failed:', err);
                }
              }}
              sx={{ mb: 2, borderColor: '#1976d2', color: '#1976d2' }}
            >
              ⚡ 一键体验 (boss)
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
