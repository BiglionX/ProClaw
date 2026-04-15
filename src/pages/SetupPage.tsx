import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';

export default function SetupPage() {
  const navigate = useNavigate();
  const configured = isSupabaseConfigured;

  const handleDemoMode = () => {
    // 直接进入演示模式，使用模拟账号
    navigate('/login');
  };

  const handleConfigureSupabase = () => {
    // 打开文档链接
    window.open('https://supabase.com/docs/guides/getting-started', '_blank');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          🔧 ProClaw 首次设置
        </Typography>

        <Typography variant="body1" paragraph sx={{ mb: 3 }}>
          欢迎使用 ProClaw Desktop！在开始之前，请选择您的使用模式：
        </Typography>

        {/* 演示模式 */}
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>推荐新手使用</strong> - 无需任何配置，立即体验所有功能
          </Alert>

          <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎮 演示模式 (Demo Mode)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 使用本地数据库存储数据
              <br />
              • 预置模拟账号快速登录
              <br />
              • 所有核心功能完整可用
              <br />• 数据仅保存在本地，不会同步到云端
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleDemoMode}
              sx={{ mt: 1 }}
            >
              进入演示模式
            </Button>
          </Paper>
        </Box>

        {/* 云端模式 */}
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>适合生产环境</strong> - 需要配置 Supabase 账号
          </Alert>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ☁️ 云端模式 (Cloud Mode)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • 数据自动同步到云端
              <br />
              • 支持多设备访问
              <br />
              • 实时协作功能
              <br />• 需要免费 Supabase 账号
            </Typography>

            {configured ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ Supabase 已配置，您可以直接登录
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleConfigureSupabase}
                  sx={{ mr: 2 }}
                >
                  查看配置教程
                </Button>
                <Button variant="contained" onClick={() => navigate('/login')}>
                  我已配置，去登录
                </Button>
              </Box>
            )}
          </Paper>
        </Box>

        {/* 提示信息 */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            💡 <strong>提示：</strong>您可以在任何时候通过设置页面切换模式。
            演示账号：<code>boss</code> / <code>IamBigBoss</code>
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
}
