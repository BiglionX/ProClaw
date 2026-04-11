import { Box, Typography, Paper } from '@mui/material';

export default function SettingsPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          ⚙️ 设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          系统配置和偏好设置
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          🚧 设置页面开发中...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          将配置数据库、同步和 AI 连接设置
        </Typography>
      </Paper>
    </Box>
  );
}
