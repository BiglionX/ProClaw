import { Box, Typography, Paper } from '@mui/material';
import AgentChat from '../../components/Agent/AgentChat';
import QuickActions from '../../components/Agent/QuickActions';

export default function AgentPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 1,
          }}
        >
          🤖 经营智能体
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
        >
          AI 驱动的商业助手 - 管理您的产品、库存和销售
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <QuickActions />
        <AgentChat />
      </Box>
    </Box>
  );
}
