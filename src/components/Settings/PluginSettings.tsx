/**
 * 桌面端插件管理面板
 *
 * 在系统设置中提供插件管理功能：
 * - 展示已安装插件列表
 * - 启用/禁用插件
 * - 查看插件详情（版本、权限、功能）
 * - 卸载插件
 * - 配置插件设置（settings_schema）
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Switch,
  Typography,
  Avatar,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  DeleteOutline as DeleteIcon,
  InfoOutlined as InfoIcon,
  SettingsOutlined as SettingsIcon,
  Extension as ExtensionIcon,
  SystemUpdateAlt as UpdateIcon,
} from '@mui/icons-material';
import { pluginLoader } from '../../lib/pluginLoader';
import type { IndustryPluginManifest } from '../../config/appMode';

/** 插件信息（来自 Tauri 后端） */
interface InstalledPluginInfo {
  plugin_id: string;
  name: string;
  version: string;
  install_path: string;
  manifest: IndustryPluginManifest;
}

export default function PluginSettings() {
  const [plugins, setPlugins] = useState<InstalledPluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<InstalledPluginInfo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState<Record<string, boolean>>({});
  const [updateInfo, setUpdateInfo] = useState<Record<string, {
    has_update: boolean;
    latest_version: string;
    download_url: string | null;
    package_hash: string | null;
    changelog: string | null;
    is_force_update: boolean;
  }>>({});

  /** 加载已安装的插件列表及启用状态 */
  const loadPlugins = async () => {
    setLoading(true);
    try {
      const installed = await pluginLoader.getInstalledPlugins();
      setPlugins(installed || []);
      // 加载持久化的启用状态
      const statuses = await pluginLoader.getAllPluginEnabledStatuses();
      const map: Record<string, boolean> = {};
      for (const s of statuses) {
        map[s.plugin_id] = s.enabled;
      }
      setEnabledMap(map);
    } catch (err) {
      console.error('加载插件列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  /** 查看插件详情 */
  const handleShowDetail = (plugin: InstalledPluginInfo) => {
    setSelectedPlugin(plugin);
    setDetailOpen(true);
  };

  /** 卸载插件 */
  const handleUninstall = async (pluginId: string) => {
    try {
      const success = await pluginLoader.uninstallPlugin(pluginId);
      if (success) {
        setSnackbar({ message: '插件已卸载', severity: 'success' });
        await loadPlugins();
      } else {
        setSnackbar({ message: '卸载插件失败', severity: 'error' });
      }
    } catch (err: any) {
      setSnackbar({ message: `卸载失败: ${err.message}`, severity: 'error' });
    }
    setUninstallConfirm(null);
  };

  /** 切换插件启用状态（持久化到 Rust 后端） */
  const handleToggleEnabled = async (pluginId: string, enabled: boolean) => {
    const success = enabled
      ? await pluginLoader.enablePlugin(pluginId)
      : await pluginLoader.disablePlugin(pluginId);
    if (success) {
      setEnabledMap((prev) => ({ ...prev, [pluginId]: enabled }));
      setSnackbar({
        message: enabled ? '插件已启用' : '插件已禁用',
        severity: 'success',
      });
    } else {
      setSnackbar({
        message: '操作失败，请重试',
        severity: 'error',
      });
    }
  };

  /** 检查插件更新 */
  const handleCheckUpdate = async (pluginId: string, currentVersion: string) => {
    setCheckingUpdates((prev) => ({ ...prev, [pluginId]: true }));
    try {
      // 默认商店 API 地址（实际应从配置读取）
      const storeApiUrl = 'https://flowhub.proclaw.cc';
      const result = await pluginLoader.checkUpdate(pluginId, currentVersion, storeApiUrl);
      if (result) {
        setUpdateInfo((prev) => ({ ...prev, [pluginId]: result }));
        if (result.has_update) {
          setSnackbar({
            message: `发现新版本 v${result.latest_version}${result.is_force_update ? '（强制更新）' : ''}`,
            severity: 'success',
          });
        } else {
          setSnackbar({ message: '当前已是最新版本', severity: 'success' });
        }
      } else {
        setSnackbar({ message: '检查更新失败（无法连接商店）', severity: 'error' });
      }
    } catch (err: any) {
      setSnackbar({ message: `检查更新失败: ${err.message}`, severity: 'error' });
    } finally {
      setCheckingUpdates((prev) => ({ ...prev, [pluginId]: false }));
    }
  };

  /** 应用插件更新 */
  const handleApplyUpdate = async (pluginId: string) => {
    const info = updateInfo[pluginId];
    if (!info || !info.download_url) {
      setSnackbar({ message: '无可用的更新包', severity: 'error' });
      return;
    }
    setSnackbar({ message: `正在下载并应用 v${info.latest_version}...`, severity: 'success' });
    const result = await pluginLoader.applyUpdate(pluginId, info.download_url, info.latest_version);
    if (result) {
      setSnackbar({ message: result, severity: 'success' });
      // 清除更新信息，重新加载插件列表
      setUpdateInfo((prev) => {
        const next = { ...prev };
        delete next[pluginId];
        return next;
      });
      await loadPlugins();
    } else {
      setSnackbar({ message: '应用更新失败', severity: 'error' });
    }
  };

  /** 渲染风险等级颜色 */
  const getRiskColor = (perm: string): string => {
    if (perm.includes('read:*') || perm.includes('write:*') || perm.includes('filesystem')) return 'error';
    if (perm.includes('create_table') || perm.includes('printer') || perm.includes('network')) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">加载已安装的插件...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* 插件列表 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ExtensionIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">已安装的插件 ({plugins.length})</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {plugins.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                暂无已安装的行业插件
              </Typography>
              <Typography variant="body2" color="text.secondary">
                请访问插件商店安装行业工作流插件
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {plugins.map((plugin, index) => (
                <Box key={plugin.plugin_id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleShowDetail(plugin)}
                          title="查看详情"
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                        {checkingUpdates[plugin.plugin_id] ? (
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                            检查中...
                          </Typography>
                        ) : updateInfo[plugin.plugin_id]?.has_update ? (
                          <>
                            <Chip
                              label={`v${updateInfo[plugin.plugin_id].latest_version} 可用`}
                              size="small"
                              color="warning"
                              variant="filled"
                              sx={{ height: 20, fontSize: '0.7rem', cursor: 'pointer' }}
                              onClick={() => handleApplyUpdate(plugin.plugin_id)}
                            />
                          </>
                        ) : (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleCheckUpdate(plugin.plugin_id, plugin.version)}
                            title="检查更新"
                          >
                            <UpdateIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => setUninstallConfirm(plugin.plugin_id)}
                          title="卸载"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Switch
                          checked={enabledMap[plugin.plugin_id] !== false}
                          size="small"
                          onChange={(_, checked) => handleToggleEnabled(plugin.plugin_id, checked)}
                        />
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'grey.200' }}>
                        {plugin.manifest.icon || '🔌'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{plugin.name}</Typography>
                          <Chip
                            label={`v${plugin.version}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Chip
                            label={plugin.manifest.category || 'official'}
                            size="small"
                            color={plugin.manifest.category === 'third-party' ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 400 }}>
                          {plugin.manifest.description || plugin.plugin_id}
                        </Typography>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 插件详情对话框 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedPlugin && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '1.5rem' }}>{selectedPlugin.manifest.icon}</span>
                <Box>
                  <Typography variant="h6">{selectedPlugin.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPlugin.plugin_id} · v{selectedPlugin.version}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* 描述 */}
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedPlugin.manifest.description}
              </Typography>

              {/* 功能模块 */}
              {selectedPlugin.manifest.features && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    功能模块
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedPlugin.manifest.features.modules.map((mod) => (
                      <Chip key={mod} label={mod} size="small" variant="outlined" />
                    ))}
                    {selectedPlugin.manifest.features.dashboards.map((dash) => (
                      <Chip key={dash} label={`📊 ${dash}`} size="small" variant="outlined" color="primary" />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 导航项 */}
              {selectedPlugin.manifest.navigation?.add?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    新增导航
                  </Typography>
                  {selectedPlugin.manifest.navigation.add.map((item) => (
                    <Typography key={item.path} variant="body2" color="text.secondary">
                      {item.icon} {item.text} → {item.path}
                    </Typography>
                  ))}
                </Box>
              )}

              {/* 权限声明 */}
              {selectedPlugin.manifest.permissions && selectedPlugin.manifest.permissions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    权限声明 ({selectedPlugin.manifest.permissions.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedPlugin.manifest.permissions.map((perm) => (
                      <Chip
                        key={perm}
                        label={perm}
                        size="small"
                        color={getRiskColor(perm) as any}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 安装路径 */}
              <Typography variant="caption" color="text.disabled" display="block">
                安装路径: {selectedPlugin.install_path}
              </Typography>
            </DialogContent>
            <DialogActions>
              {selectedPlugin.manifest.settingsSchema && (
                <Button startIcon={<SettingsIcon />} onClick={() => setDetailOpen(false)}>
                  配置
                </Button>
              )}
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 卸载确认对话框 */}
      <Dialog
        open={!!uninstallConfirm}
        onClose={() => setUninstallConfirm(null)}
      >
        <DialogTitle>确认卸载插件？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            卸载将删除插件文件和相关数据。此操作不可撤销，是否继续？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallConfirm(null)}>取消</Button>
          <Button
            onClick={() => uninstallConfirm && handleUninstall(uninstallConfirm)}
            color="error"
            variant="contained"
          >
            确认卸载
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示 Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
