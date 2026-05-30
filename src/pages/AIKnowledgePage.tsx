import {
  Help as HelpIcon,
  LibraryBooks as LibraryBooksIcon,
  PermMedia as PermMediaIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getMediaStats } from '../lib/mediaLibraryService';
import { getQAStats } from '../lib/qaLibraryService';
import { getKnowledgeStats } from '../lib/knowledgeBaseService';
import MediaLibraryPage from './MediaLibraryPage';
import QALibraryPage from './QALibraryPage';
import KnowledgeBasePage from './KnowledgeBasePage';

type KnowledgeTab = 'media' | 'qa' | 'knowledge';

interface TabInfo {
  id: KnowledgeTab;
  icon: React.ReactNode;
  label: string;
  countKey: 'media' | 'qa' | 'knowledge';
}

const TABS: TabInfo[] = [
  { id: 'media', icon: <PermMediaIcon />, label: '媒体库', countKey: 'media' },
  { id: 'qa', icon: <HelpIcon />, label: '问答库', countKey: 'qa' },
  { id: 'knowledge', icon: <LibraryBooksIcon />, label: '资料库', countKey: 'knowledge' },
];

export default function AIKnowledgePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('media');
  const [counts, setCounts] = useState({ media: 0, qa: 0, knowledge: 0 });

  const refreshCounts = () => {
    setCounts({
      media: getMediaStats().total,
      qa: getQAStats().total,
      knowledge: getKnowledgeStats().total,
    });
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧 Tab 面板 */}
      <Paper
        elevation={0}
        sx={{
          width: 200,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            AI 知识库
          </Typography>
          <Typography variant="caption" color="text.secondary">
            管理媒体素材、客服问答和业务资料
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, py: 1 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = counts[tab.countKey];
            return (
              <Box
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  mx: 1,
                  borderRadius: 1,
                  backgroundColor: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: isActive ? '#6366f1' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.04)',
                  },
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.04)',
                    color: isActive ? '#6366f1' : 'text.secondary',
                    flexShrink: 0,
                  }}
                >
                  {tab.icon}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.85rem',
                  }}
                >
                  {tab.label}
                </Typography>
                <Chip
                  label={count}
                  size="small"
                  sx={{
                    height: 20,
                    minWidth: 28,
                    fontSize: '0.65rem',
                    backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.06)',
                    color: isActive ? '#6366f1' : 'text.secondary',
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* 右侧内容面板 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {activeTab === 'media' && <MediaLibraryPage />}
        {activeTab === 'qa' && <QALibraryPage />}
        {activeTab === 'knowledge' && <KnowledgeBasePage />}
      </Box>
    </Box>
  );
}
