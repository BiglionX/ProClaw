import { Box, Paper, Typography } from '@mui/material';

export default function ProductsPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          📦 产品库
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理您的产品、分类和 BOM
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
          🚧 产品库模块开发中...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          将从 Web 版产品库迁移到桌面端
        </Typography>
      </Paper>
    </Box>
  );
}
