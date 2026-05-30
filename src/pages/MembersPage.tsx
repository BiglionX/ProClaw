import { Box, Typography } from '@mui/material';

export default function MembersPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        👥 会员管理
      </Typography>
      <Typography variant="body1" color="text.secondary">
        会员管理页面 - 会员档案、充值消费、积分管理、会员营销（各行业版通用）
      </Typography>
    </Box>
  );
}
