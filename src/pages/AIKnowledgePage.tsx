import {
  Help as HelpIcon,
  LibraryBooks as LibraryBooksIcon,
  PermMedia as PermMediaIcon,
} from '@mui/icons-material';
import {
  Box,
  Divider,
  Paper,
  Stack,
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 顶部标题栏：左侧标题 + 右侧水平 Tab */}
      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          backgroundColor: 'background.paper',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
            AI 知识库
          </Typography>
          <Typography variant="caption" color="text.secondary">
            管理媒体素材、客服问答和业务资料
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.id;
            const count = counts[tab.countKey];
            return (
              <Box key={tab.id} sx={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 18 }} />
                )}
                <Box
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.3,
                    cursor: 'pointer',
                    borderRadius: 0.8,
                    color: isActive ? '#6366f1' : 'text.secondary',
                    backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.04)',
                      color: isActive ? '#6366f1' : 'text.primary',
                    },
                    transition: 'all 0.15s',
                  }}
                >
                  <Box component="span" sx={{ display: 'flex', fontSize: '0.85rem', opacity: isActive ? 1 : 0.6 }}>
                    {tab.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                    }}
                  >
                    {tab.label}
                  </Typography>
                  {count > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        color: isActive ? '#6366f1' : 'text.disabled',
                        ml: 0.2,
                      }}
                    >
                      {count}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {/* 内容面板 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {activeTab === 'media' && <MediaLibraryPage />}
        {activeTab === 'qa' && <QALibraryPage />}
        {activeTab === 'knowledge' && <KnowledgeBasePage />}
      </Box>
    </Box>
  );
}
