import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import FloatingAgentChat from '../Agent/FloatingAgentChat';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RecruitButton from '../AgentMarket/RecruitButton';
import MarketDialog from '../AgentMarket/MarketDialog';
import WelcomeTour from '../Demo/WelcomeTour';
import { GlobalRequireUpgradeDialog } from '../Auth/RequireUpgrade';
import { useAppModeStore } from '../../config/appMode';
import { useAuthStore } from '../../lib/authStore';
import { isDemoAccount } from '../../lib/aiTeamTokenService';
import callConnectionService from '../../services/callConnectionService';

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
  const user = useAuthStore(state => state.user);
  const [marketOpen, setMarketOpen] = useState(false);
  const [recruitVisible, setRecruitVisible] = useState(() => {
    return localStorage.getItem('proclaw:recruit-visible') !== 'false';
  });

  const handleRecruitClose = () => {
    setRecruitVisible(false);
    localStorage.setItem('proclaw:recruit-visible', 'false');
  };

  // 监听全局事件打开市场
  useEffect(() => {
    const handler = () => setMarketOpen(true);
    window.addEventListener('proclaw:open-market', handler);
    return () => window.removeEventListener('proclaw:open-market', handler);
  }, []);

  // 演示账号登录后自动注入测试数据包（产品 / 云商城 / AI Team / 插件）
  // 幂等：内部通过 localStorage flag 判断首次执行
  useEffect(() => {
    if (!user || !isDemoAccount()) return;
    let cancelled = false;
    (async () => {
      try {
        const { bootstrapDemoData } = await import('../../lib/demoBootstrap');
        if (cancelled) return;
        await bootstrapDemoData({ silent: true });
        // 通知各页面刷新
        if (!cancelled && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('proclaw:teams-changed'));
          window.dispatchEvent(new CustomEvent('proclaw:agents-changed'));
          window.dispatchEvent(new CustomEvent('proclaw:products-changed'));
          window.dispatchEvent(new CustomEvent('proclaw:demo-bootstrapped'));
          window.dispatchEvent(new CustomEvent('proclaw:cloud-store-changed'));
        }
      } catch (err) {
        console.warn('[AppLayout] 演示数据引导失败：', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  // Phase 4: WebSocket + CallManager (Tauri local JWT — not Supabase mock)
  useEffect(() => {
    callConnectionService.connect().catch((err) => {
      console.warn('[AppLayout] Call connection setup failed:', err);
    });
    return () => {
      callConnectionService.disconnect();
    };
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
      {mode !== 'light' && recruitVisible && (
        <RecruitButton onClick={() => setMarketOpen(true)} onClose={handleRecruitClose} />
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
      {/* 演示账号首次登录欢迎提示 */}
      <WelcomeTour />

      {/* PRD v13.0 §9：全局增值能力拦截对话框 */}
      <GlobalRequireUpgradeDialog />
    </Box>
  );
}
