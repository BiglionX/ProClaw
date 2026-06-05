import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import FloatingAgentChat from '../Agent/FloatingAgentChat';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RecruitButton from '../AgentMarket/RecruitButton';
import MarketDialog from '../AgentMarket/MarketDialog';
import { useAppModeStore } from '../../config/appMode';

const TOPBAR_HEIGHT = 64;

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.15,
      ease: 'easeIn' as const,
    },
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mode = useAppModeStore(state => state.mode);
  const location = useLocation();
  const [marketOpen, setMarketOpen] = useState(false);

  // 监听全局事件打开市场
  useEffect(() => {
    const handler = () => setMarketOpen(true);
    window.addEventListener('proclaw:open-market', handler);
    return () => window.removeEventListener('proclaw:open-market', handler);
  }, []);

  return (
    <Box
      sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC' }}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
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
