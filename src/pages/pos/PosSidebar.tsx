import { Box, Typography } from '@mui/material';

export default function PosSidebar() {
  return (
    <Box sx={{ p: 2, borderRight: '1px solid #333', minWidth: 200 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>POS 侧边栏</Typography>
    </Box>
  );
}
