import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import FloatingAgentChat from '../Agent/FloatingAgentChat';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RecruitButton from '../AgentMarket/RecruitButton';
import MarketDialog from '../AgentMarket/MarketDialog';
import { useAppModeStore } from '../../config/appMode';

const TOPBAR_HEIGHT = 64;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mode = useAppModeStore(state => state.mode);
  const [marketOpen, setMarketOpen] = useState(false);

  // 监听全局事件打开市场
  useEffect(() => {
    const handler = () => setMarketOpen(true);
    window.addEventListener('proclaw:open-market', handler);
    return () => window.removeEventListener('proclaw:open-market', handler);
  }, []);

  return (
    <Box
      sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f8f8' }}
    >
      <TopBar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${TOPBAR_HEIGHT}px`,
          p: 2,
          pb: 10, // 为浮动按钮留出更多空间
        }}
      >
        {children}
      </Box>
      {/* Light 版隐藏市场招募按钮和弹窗 */}
      {mode !== 'light' && (
        <RecruitButton onClick={() => setMarketOpen(true)} />
      )}
      {/* 浮动 AI 智能体对话 */}
      <FloatingAgentChat />
      {/* 市场弹窗 */}
      {mode !== 'light' && (
        <MarketDialog
          open={marketOpen}
          onClose={() => setMarketOpen(false)}
          onAgentInstalled={() => {
            // 安装后刷新 Agent 管理页面
            window.dispatchEvent(new CustomEvent('proclaw:agents-changed'));
          }}
        />
      )}
    </Box>
  );
}
