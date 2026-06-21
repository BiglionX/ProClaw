/**
 * 插件详情 Dialog - 展示 IndustryPluginManifest 全部字段
 * 入口：点击已使用 Tab 任意 PluginCard → setDetailPlugin(pl) → 弹此 Dialog
 */
function PluginDetailDialog(props: {
  plugin: InstalledPluginInfo | null;
  onClose: () => void;
}) {
  const pl = props.plugin;
  if (!pl) return null;
  const m: any = pl.manifest || {};
  const color = INDUSTRY_COLORS[m.category || pl.plugin_id] || '#1976d2';
  const displayIcon = m.icon || '\u{1F50C}';
  const installDate = pl.installed_at ? new Date(pl.installed_at) : null;
  const updateDate = m.updated_at || m.updatedAt ? new Date(m.updated_at || m.updatedAt) : null;

  // features 字段兼容多种 manifest schema (modules / commands / pages)
  const modules: string[] = m.features?.modules || [];
  const commands: any[] = m.features?.commands || [];
  const pages: any[] = m.features?.pages || [];
  const permissions: string[] = m.permissions || [];
  const navEntries: any[] = m.navigation || m.nav || [];

  return (
    <Dialog open={!!pl} onClose={props.onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '88vh' } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5,
          background: 'linear-gradient(135deg, ' + color + '15 0%, ' + color + '05 100%)',
          borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 2, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2.2rem', backgroundColor: color + '20', flexShrink: 0 }}>
            {displayIcon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={700} noWrap>{pl.name || m.name || pl.plugin_id}</Typography>
              {pl.builtin && (
                <Chip label="内置" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
              {m.category && (
                <Chip label={m.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
              {pl.plugin_id} · v{pl.version}
            </Typography>
            {m.author && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {'作者：' + (typeof m.author === 'string' ? m.author : m.author?.name || '-')}
              </Typography>
            )}
          </Box>
          <IconButton onClick={props.onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>{'\u63D2\u4EF6\u63CF\u8FF0'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {m.description || '\u6682\u65E0\u63CF\u8FF0'}
          </Typography>
        </Box>

        {(modules.length > 0 || commands.length > 0 || pages.length > 0) && (
          <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon fontSize="small" sx={{ color }} />{'\u529F\u80FD\u7279\u6027'}
            </Typography>
            {modules.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{'\u529F\u80FD\u6A21\u5757'}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {modules.map((mod) => (
                    <Chip key={mod} label={mod} size="small" sx={{ backgroundColor: color + '15', color, fontWeight: 500 }} />
                  ))}
                </Box>
              </Box>
            )}
            {commands.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{'\u547D\u4EE4\u5217\u8868\uFF08' + commands.length + '\uFF09'}</Typography>
                <List dense disablePadding>
                  {commands.slice(0, 8).map((cmd: any, idx: number) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <LaunchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.name || cmd.id || 'command-' + idx}
                        secondary={cmd.description || ''}
                        primaryTypographyProps={{ variant: 'body2', sx: { fontFamily: 'monospace' } }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                  {commands.length > 8 && (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 4 }}>
                      {'...还\u6709 ' + (commands.length - 8) + ' \u6761\u547D\u4EE4'}
                    </Typography>
                  )}
                </List>
              </Box>
            )}
            {pages.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">{'\u5185\u7F6E\u9875\u9762\uFF08' + pages.length + '\uFF09'}</Typography>
                <List dense disablePadding>
                  {pages.slice(0, 6).map((pg: any, idx: number) => (
                    <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <StorageIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={pg.title || pg.path || pg.name || 'page-' + idx}
                        secondary={pg.path || ''}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption', sx: { fontFamily: 'monospace' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {navEntries.length > 0 && (
          <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CategoryIcon fontSize="small" sx={{ color }} />{'\u6CE8\u518C\u8DEF\u7531'}
            </Typography>
            <List dense disablePadding>
              {navEntries.map((nav: any, idx: number) => (
                <ListItem key={idx} sx={{ px: 0, py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={(typeof nav === 'string' ? nav : nav.label || nav.title) + '  \u2192  ' + (typeof nav === 'string' ? '' : nav.path || '')}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {permissions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" sx={{ color: 'warning.main' }} />{'\u6743\u9650\u8981\u6C42'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {permissions.map((p) => (
                  <Chip key={p} label={p} size="small" color="warning" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                ))}
              </Box>
            </Box>
          )}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />{'\u5B89\u88C5\u4FE1\u606F'}
            </Typography>
            {installDate && (
              <Typography variant="body2" color="text.secondary">
                {'\u5B89\u88C5\u65F6\u95F4\uFF1A' + installDate.toLocaleString('zh-CN')}
              </Typography>
            )}
            {updateDate && (
              <Typography variant="body2" color="text.secondary">
                {'\u6700\u540E\u66F4\u65B0\uFF1A' + updateDate.toLocaleString('zh-CN')}
              </Typography>
            )}
            {pl.path && (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 0.5, wordBreak: 'break-all' }}>
                {'\u8DEF\u5F84\uFF1A' + pl.path}
              </Typography>
            )}
            {pl.size != null && (
              <Typography variant="body2" color="text.secondary">
                {'\u5927\u5C0F\uFF1A' + (pl.size > 1024 * 1024 ? (pl.size / 1024 / 1024).toFixed(2) + ' MB' : (pl.size / 1024).toFixed(1) + ' KB')}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={props.onClose} variant="contained" sx={{ textTransform: 'none' }}>{'\u5173\u95ED'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * AI 插件面板 - 内置浏览器双Tab容器
 *
 * Tab1: 已使用 - 已安装插件卡片网格
 * Tab2: 插件商店 - 从商店API加载并过滤已安装插件
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, IconButton, Switch, Tab, Tabs, TextField, Typography,
  alpha, InputAdornment, Select, MenuItem, FormControl,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  DeleteOutline as DeleteIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Star as StarIcon,
  History as HistoryIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import { IndustryPluginManifest } from '../../config/appMode';
import { pluginLoader } from '../../lib/pluginLoader';
import {
  useInstalledPlugins,
  useInvalidatePlugins,
  usePluginStore,
  type InstalledPluginInfo,
  type PluginStoreCard,
} from '../../lib/hooks/usePlugins';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'retail', label: '零售' },
  { id: 'inventory', label: '进销存' },
  { id: 'catering', label: '餐饮' },
  { id: 'beauty', label: '美业' },
  { id: 'pet', label: '宠物' },
  { id: 'cloud-proclaw', label: '云服务' },
];

const INDUSTRY_COLORS: Record<string, string> = {
  retail: '#e74c3c',
  inventory: '#111827',
  catering: '#e74c3c',
  beauty: '#ec4899',
  pet: '#f59e0b',
  'cloud-proclaw': '#0ea5e5',
};

function extractTags(manifest: IndustryPluginManifest | null | undefined): string[] {
  if (!manifest) return [];
  if (manifest.tags && manifest.tags.length > 0) return manifest.tags;
  if (manifest.features?.modules) return manifest.features.modules.slice(0, 4);
  return [];
}

export default function AiPluginPanel() {
  const [pluginTab, setPluginTab] = useState(0);
  const invalidatePlugins = useInvalidatePlugins();
  const { data: installedData, isLoading: loadingInstalled } = useInstalledPlugins();
  const { data: storeItems = [], isLoading: loadingStore } = usePluginStore(pluginTab === 1);
  const installedPlugins = installedData?.plugins ?? [];
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);
  const [detailPlugin, setDetailPlugin] = useState<InstalledPluginInfo | null>(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'downloads' | 'newest'>('downloads');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (installedData?.enabledMap) {
      setEnabledMap(installedData.enabledMap);
    }
  }, [installedData?.enabledMap]);

  const installedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of installedPlugins) {
      if (p.plugin_id) ids.add(p.plugin_id);
      if (p.id) ids.add(p.id);
    }
    return ids;
  }, [installedPlugins]);

  const handleToggleEnabled = async (pluginId: string, enabled: boolean) => {
    const fn = enabled ? pluginLoader.enablePlugin : pluginLoader.disablePlugin;
    const ok = await fn(pluginId);
    if (ok) {
      setEnabledMap((prev) => ({ ...prev, [pluginId]: enabled }));
      setSnackbar({ message: enabled ? '已启用' : '已禁用', severity: 'success' });
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      await pluginLoader.uninstallPlugin(pluginId);
      setSnackbar({ message: '已卸载', severity: 'success' });
      await invalidatePlugins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setSnackbar({ message: '卸载失败: ' + message, severity: 'error' });
    }
    setUninstallConfirm(null);
  };

  const handleInstall = async (card: PluginStoreCard) => {
    setInstallingId(card.id);
    const url = 'https://flowhub.proclaw.cc/api/plugins/' + card.id + '/download/' + card.version;
    const ok = await pluginLoader.downloadAndInstall(card.id, card.version, url);
    if (ok) {
      setSnackbar({ message: '已安装 ' + card.name, severity: 'success' });
      await invalidatePlugins();
    } else {
      setSnackbar({ message: '安装 ' + card.name + ' 失败', severity: 'error' });
    }
    setInstallingId(null);
  };

  const filteredStoreItems = useMemo(() => {
    let list = storeItems.filter((item) => !installedIds.has(item.id));
    if (category !== 'all') list = list.filter((c) => c.id === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest')
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      return (b.downloads || 0) - (a.downloads || 0);
    });
    return list;
  }, [storeItems, installedIds, category, search, sortBy]);

  function PluginCard(p: {
    id: string;
    name: string;
    version: string;
    description: string;
    icon: string;
    tags: string[];
    installed: boolean;
    onShowDetail?: () => void;
  }) {
    const color = INDUSTRY_COLORS[p.id] || '#6b7280';
    const displayIcon = p.icon || '\u{1F50C}';
    return (
      <Card key={p.id}
        onClick={p.onShowDetail}
        sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', transition: 'all 0.2s',
          cursor: p.onShowDetail ? 'pointer' : 'default',
          '&:hover': p.onShowDetail
            ? { transform: 'translateY(-2px)', boxShadow: (t) => '0 6px 20px ' + alpha(t.palette.common.black, 0.08), borderColor: color }
            : {} }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, backgroundColor: color + '15' }}>
              {displayIcon}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>{p.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{p.id} · v{p.version}</Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.5, mb: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
            {p.description || '\u65E0\u63CF\u8FF0'}
          </Typography>
          {p.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
              {p.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.6rem', backgroundColor: color + '10', color: color }} />
              ))}
            </Box>
          )}
          <Divider sx={{ mb: 1.5 }} />
          {p.installed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Switch checked={enabledMap[p.id] !== false} size="small"
                  onChange={(_, checked) => handleToggleEnabled(p.id, checked)} />
                <Typography variant="caption" color={enabledMap[p.id] !== false ? '#10B981' : 'text.disabled'}>
                  {enabledMap[p.id] !== false ? '\u5DF2\u542F\u7528' : '\u5DF2\u7981\u7528'}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setUninstallConfirm(p.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {'\u2193'} {(storeItems.find((s) => s.id === p.id)?.downloads) || 0}
              </Typography>
              <Button size="small" variant="contained"
                startIcon={installingId === p.id ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                disabled={installingId === p.id}
                onClick={() => { const sc = storeItems.find((s) => s.id === p.id); if (sc) handleInstall(sc); }}
                sx={{ textTransform: 'none', fontSize: '0.75rem', backgroundColor: color,
                  '&:hover': { backgroundColor: color, opacity: 0.85 } }}>
                {installingId === p.id ? '...' : '\u5B89\u88C5'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Tabs value={pluginTab} onChange={(_, v) => setPluginTab(v)}
        sx={{ mb: 2, minHeight: 40, backgroundColor: (t) => alpha(t.palette.primary.main, 0.04), borderRadius: 1.5,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5, backgroundColor: '#10B981' },
          '& .MuiTab-root': { textTransform: 'none', minHeight: 40, py: 0.5, fontWeight: 500, fontSize: '0.9rem' },
          '& .Mui-selected': { fontWeight: 700, color: '#10B981 !important' } }}>
        <Tab label={'\u5DF2\u4F7F\u7528'} icon={<CheckCircleIcon />} iconPosition="start"
          sx={{ color: pluginTab === 0 ? '#10B981' : 'text.secondary' }} />
        <Tab label={'\u63D2\u4EF6\u5546\u5E97'} icon={<ExtensionIcon />} iconPosition="start"
          sx={{ color: pluginTab === 1 ? '#10B981' : 'text.secondary' }} />
      </Tabs>
      <Divider sx={{ mb: 2 }} />

      {/* Tab 0: installed */}
      {pluginTab === 0 && (
        <Box>
          {loadingInstalled && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}
          {!loadingInstalled && installedPlugins.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>{'\u6682\u65E0\u5DF2\u5B89\u88C5\u7684\u884C\u4E1A\u63D2\u4EF6'}</Typography>
              <Typography variant="body2" color="text.secondary">{'\u524D\u5F80\u300C\u63D2\u4EF6\u5546\u5E97\u300D\u5B89\u88C5\u884C\u4E1A\u5DE5\u4F5C\u6D41\u63D2\u4EF6'}</Typography>
            </Box>
          )}
          {!loadingInstalled && installedPlugins.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {/* UI 层防御去重:即使 pluginLoader 返回了重复的 plugin_id（比如 BUILTIN + dynamic 双注册），
                  仍然只渲染 1 张 PluginCard 避免看到 2 个一样的"外贸柜台运营助手" */}
              {Array.from(
                new Map(
                  installedPlugins.map((p: any) => [p.plugin_id || p.id || '', p] as const)
                ).values()
              ).map((pl) => {
                const m = pl.manifest || ({} as IndustryPluginManifest);
                return <PluginCard key={pl.plugin_id} id={pl.plugin_id} name={pl.name} version={pl.version}
                  description={m.description || ''} icon={m.icon || ''} tags={extractTags(m)} installed={true}
                  onShowDetail={() => setDetailPlugin(pl)} />;
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: store */}
      {pluginTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center', p: 1.5,
            backgroundColor: (t) => alpha(t.palette.background.paper, 0.5), borderRadius: 1.5,
            border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <Chip key={cat.id} label={cat.label} size="small" onClick={() => setCategory(cat.id)}
                  variant={category === cat.id ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', height: 28, fontSize: '0.75rem',
                    ...(category === cat.id ? { backgroundColor: '#10B981', color: '#fff', fontWeight: 600 } : {}) }} />
              ))}
            </Box>
            <Box sx={{ flex: 1 }} />
            <TextField size="small" placeholder={'\u641C\u7D22\u63D2\u4EF6...'} value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 180 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                sx: { fontSize: '0.8rem' } }} />
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} sx={{ fontSize: '0.8rem' }}>
                <MenuItem value="downloads" sx={{ fontSize: '0.8rem' }}>{'\u6309\u4E0B\u8F7D\u91CF'}</MenuItem>
                <MenuItem value="newest" sx={{ fontSize: '0.8rem' }}>{'\u6700\u65B0\u53D1\u5E03'}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loadingStore && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}

          {!loadingStore && filteredStoreItems.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {installedIds.size > 0 && storeItems.length > 0
                  ? '\u6240\u6709\u63D2\u4EF6\u5DF2\u5B89\u88C5'
                  : search ? '\u6682\u65E0\u5339\u914D\u7684\u63D2\u4EF6' : '\u63D2\u4EF6\u5546\u5E97\u6682\u65E0\u53EF\u7528\u63D2\u4EF6'}
              </Typography>
              {search && <Typography variant="caption" color="text.secondary">{'\u5C1D\u8BD5\u4FEE\u6539\u641C\u7D22\u5173\u952E\u8BCD\u300C' + search + '\u300D'}</Typography>}
            </Box>
          )}

          {!loadingStore && filteredStoreItems.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {filteredStoreItems.map((c) =>
                <PluginCard key={c.id} id={c.id} name={c.name} version={c.version}
                  description={c.description} icon={c.icon} tags={c.tags} installed={false} />)}
            </Box>
          )}
        </Box>
      )}

      <Dialog open={!!uninstallConfirm} onClose={() => setUninstallConfirm(null)}>
        <DialogTitle>{'\u786E\u8BA4\u5378\u8F7D\u63D2\u4EF6\uFF1F'}</DialogTitle>
        <DialogContent>
          <DialogContentText>{'\u5378\u8F7D\u5C06\u5220\u9664\u63D2\u4EF6\u6587\u4EF6\u548C\u6570\u636E\u3002\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002'}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallConfirm(null)}>{'\u53D6\u6D88'}</Button>
          <Button onClick={() => { if (uninstallConfirm) handleUninstall(uninstallConfirm); }} color="error" variant="contained">
            {'\u786E\u8BA4\u5378\u8F7D'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>

      {/* 插件详情弹窗：点击任意已使用 Tab 卡片触发 */}
      <PluginDetailDialog plugin={detailPlugin} onClose={() => setDetailPlugin(null)} />
    </Box>
  );
}
