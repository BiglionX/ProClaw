import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAuthStore } from '../../lib/authStore';
import { MOCK_PASSWORD } from '../../lib/authStore';

export default function LoginDialog() {
  const {
    login,
    isLoading,
    error,
    clearError,
    loginDialogOpen,
    closeLoginDialog,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      closeLoginDialog();
      setEmail('');
      setPassword('');
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const handleQuickLogin = async () => {
    clearError();
    try {
      await login('boss', MOCK_PASSWORD);
      closeLoginDialog();
      setEmail('');
      setPassword('');
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      closeLoginDialog();
    }
  };

  return (
    <Dialog
      open={loginDialogOpen}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e1e',
          borderRadius: 2,
          border: '1px solid #333',
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        {/* Logo + 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Box
            component="img"
            src="/proclaw-logo.png"
            alt="ProClaw Logo"
            sx={{
              width: 40,
              height: 40,
              objectFit: 'contain',
              mr: 1.5,
            }}
          />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
            ProClaw
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mb: 3, color: 'rgba(255,255,255,0.5)' }}
        >
          AI-Powered Business Operating System
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
              邮箱 / 用户名
            </Typography>
            <TextField
              fullWidth
              placeholder="请输入邮箱或用户名"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#ff3b30' },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  fontSize: '15px',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.7)' }}>
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
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#ff3b30' },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  fontSize: '15px',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.3)',
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
            sx={{
              mb: 2,
              bgcolor: '#ff3b30',
              '&:hover': { bgcolor: '#d32f2f' },
              '&.Mui-disabled': { bgcolor: '#555' },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.2,
            }}
          >
            {isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '登录'}
          </Button>

          {/* 快速登录按钮 */}
          <Button
            fullWidth
            variant="outlined"
            size="medium"
            onClick={handleQuickLogin}
            disabled={isLoading}
            sx={{
              mb: 2,
              borderColor: '#555',
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { borderColor: '#888', color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
              textTransform: 'none',
              py: 1,
            }}
          >
            ⚡ 一键体验 (boss)
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              href="#"
              variant="body2"
              underline="hover"
              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ff3b30' } }}
              onClick={(e) => {
                e.preventDefault();
                // 注册功能保留但不强制跳转
              }}
            >
              还没有账号? 立即注册
            </Link>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
}
