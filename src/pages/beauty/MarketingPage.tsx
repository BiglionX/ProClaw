import { Box, Typography } from '@mui/material';

export default function MarketingPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#ec4899' }}>
        📢 营销活动
      </Typography>
      <Typography variant="body1" color="text.secondary">
        营销活动页面 - 活动列表、活动模板、效果分析、微信模板消息
      </Typography>
    </Box>
  );
}
