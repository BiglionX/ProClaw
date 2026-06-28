/**
 * 插件商店独立页面
 * 复用 Teams 页面内的 AiPluginPanel（已使用 / 插件商店 双 Tab）
 * 路由：/plugin-store
 */
import { Box, Typography } from '@mui/material';
import AiPluginPanel from '../components/Teams/AiPluginPanel';
import { useOfflineGuard } from '../lib/hooks/useOfflineGuard';

export default function PluginStorePage() {
  // PRD v13.0 §4.7：插件商店必须登录，离线访客弹 UpgradeDialog
  useOfflineGuard('plugin-store');
  return (
    <Box>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          插件商店
        </Typography>
        <Typography variant="body1" color="text.secondary">
          浏览、安装和管理行业插件，扩展 ProClaw 的能力边界
        </Typography>
      </Box>

      <AiPluginPanel />
    </Box>
  );
}
