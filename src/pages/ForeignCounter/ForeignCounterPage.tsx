import { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import {
  Public as PublicIcon,
  LocalShipping as LogisticsIcon,
  Gavel as CustomsIcon,
  Translate as TranslateIcon,
  Science as DemoIcon,
} from '@mui/icons-material';
import TranslationsTab from './TranslationsTab';
import LogisticsTab from './LogisticsTab';
import CustomsTab from './CustomsTab';
import { useEffect } from 'react';
import { isDemoAccount } from '../../lib/aiTeamTokenService';
import { readDemoFlag } from '../../lib/demoFlag';

/**
 * 外贸柜台运营助手（ProClaw 1.0.0 内置）
 * 集成多语言翻译、国际物流跟踪、海关申报三个核心 Tab。
 * 演示账号下显示「演示数据」徽章。
 */
export default function ForeignCounterPage() {
  const [tab, setTab] = useState(0);
  const [demoFlag, setDemoFlag] = useState<boolean>(false);

  useEffect(() => {
    setDemoFlag(isDemoAccount() && !!readDemoFlag());
  }, []);

  return (
    <Box>
      {/* 页面标题 + 插件徽章 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          🌍 外贸柜台
        </Typography>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label="插件 v1.0.0"
          icon={<PublicIcon sx={{ fontSize: 16 }} />}
        />
        {demoFlag && (
          <Chip
            size="small"
            color="warning"
            label="🧪 演示数据"
            icon={<DemoIcon sx={{ fontSize: 16 }} />}
          />
        )}
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        多语言商品管理 · 国际物流跟踪 · 海关申报辅助 · 跨境结算管理
      </Typography>

      {demoFlag && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<DemoIcon />}>
          当前为演示账号，预置「外贸柜台运营助手」插件已自动注册。如需重置请前往
          「设置 → 重置演示数据」。
        </Alert>
      )}

      <Paper>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TranslateIcon />} label="多语言翻译" />
          <Tab icon={<LogisticsIcon />} label="物流跟踪" />
          <Tab icon={<CustomsIcon />} label="海关申报" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tab === 0 && <TranslationsTab />}
          {tab === 1 && <LogisticsTab />}
          {tab === 2 && <CustomsTab />}
        </Box>
      </Paper>
    </Box>
  );
}
