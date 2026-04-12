import { Box } from '@mui/material';
import FloatingAgentChat from '../Agent/FloatingAgentChat';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const TOPBAR_HEIGHT = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}
    >
      <TopBar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${TOPBAR_HEIGHT}px`,
          p: 2,
          pb: 8, // 为浮动按钮留出空间
        }}
      >
        {children}
      </Box>
      {/* 浮动 AI 智能体对话 */}
      <FloatingAgentChat />
    </Box>
  );
}
