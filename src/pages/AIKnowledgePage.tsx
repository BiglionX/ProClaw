import {
  Help as HelpIcon,
  LibraryBooks as LibraryBooksIcon,
  PermMedia as PermMediaIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  OutlinedInput,
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

  // 计算知识库健康度
  const totalItems = counts.media + counts.qa + counts.knowledge;
  const healthScore = Math.min(Math.round((totalItems / 50) * 100), 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 顶部标题栏：左侧标题 + 健康度评分 + 右侧水平 Tab */}
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

        {/* 知识库健康度评分 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={healthScore}
              size={36}
              thickness={4}
              sx={{
                color: healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#FF3B30',
              }}
            />
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: healthScore >= 70 ? '#10B981' : healthScore >= 40 ? '#F59E0B' : '#FF3B30' }}>
                {healthScore}%
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', display: 'block', color: 'text.primary' }}>
              知识库完整度
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
              {totalItems} 条内容
            </Typography>
          </Box>
        </Box>

        {/* 右侧 Chip 按钮式 Tab 切换 */}
        <Stack direction="row" spacing={1} alignItems="center">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = counts[tab.countKey];
            return (
              <Chip
                key={tab.id}
                icon={<Box component="span" sx={{ display: 'flex', fontSize: '0.8rem', color: isActive ? '#6366f1' : 'rgba(0,0,0,0.4)' }}>{tab.icon}</Box>}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: isActive ? 600 : 400, fontSize: '0.75rem' }}>
                      {tab.label}
                    </Typography>
                    {count > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 500, color: isActive ? '#6366f1' : 'text.disabled' }}>
                        {count}
                      </Typography>
                    )}
                  </Box>
                }
                onClick={() => setActiveTab(tab.id)}
                variant={isActive ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  height: 32,
                  borderRadius: 2,
                  borderColor: isActive ? '#6366f1' : 'rgba(0,0,0,0.12)',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: isActive ? '#6366f1' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.04)',
                    borderColor: isActive ? '#6366f1' : 'rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.15s',
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* AI 问答搜索栏 */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <OutlinedInput
          placeholder="🔍 向知识库提问…"
          size="small"
          fullWidth
          startAdornment={
            <InputAdornment position="start">
              <SmartToyIcon sx={{ fontSize: 18, color: '#FF3B30' }} />
            </InputAdornment>
          }
          sx={{
            borderRadius: 2,
            backgroundColor: 'rgba(99,102,241,0.03)',
            '& fieldset': { borderColor: 'rgba(99,102,241,0.15)' },
            '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
          }}
        />
      </Box>

      {/* 内容面板 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {activeTab === 'media' && <MediaLibraryPage />}
        {activeTab === 'qa' && <QALibraryPage />}
        {activeTab === 'knowledge' && <KnowledgeBasePage />}
      </Box>
    </Box>
  );
}
