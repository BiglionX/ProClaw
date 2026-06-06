/**
 * AI 插件面板 - 内置浏览器双Tab容器
 *
 * Tab1: 已使用 - 已安装插件卡片网格
 * Tab2: 插件商店 - 从商店API加载并过滤已安装插件
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, IconButton, Switch, Tab, Tabs, TextField, Typography,
  alpha, InputAdornment, Select, MenuItem, FormControl,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions,
} from '@mui/material';
import {
  Extension as ExtensionIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { PluginManager, IndustryPluginManifest } from '../../config/appMode';
import { pluginLoader } from '../../lib/pluginLoader';

/** 插件商店卡片数据 */
interface StoreCard {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  downloads: number;
  tags: string[];
  published_at: string;
}

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

const STORE_API_URL = 'https://flowhub.proclaw.cc';

interface InstalledPluginInfo {
  plugin_id: string;
  name: string;
  version: string;
  install_path: string;
  manifest: IndustryPluginManifest;
}

function extractTags(manifest: IndustryPluginManifest | null | undefined): string[] {
  if (!manifest) return [];
  if (manifest.tags && manifest.tags.length > 0) return manifest.tags;
  if (manifest.features?.modules) return manifest.features.modules.slice(0, 4);
  return [];
}

export default function AiPluginPanel() {
  const [pluginTab, setPluginTab] = useState(0);

  // installed state
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPluginInfo[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});
  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);

  // store state
  const [storeItems, setStoreItems] = useState<StoreCard[]>([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'downloads' | 'newest'>('downloads');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const loadInstalled = useCallback(async () => {
    setLoadingInstalled(true);
    try {
      const installed = await pluginLoader.getInstalledPlugins();
      setInstalledPlugins(installed || []);
      const statuses = await pluginLoader.getAllPluginEnabledStatuses();
      const map: Record<string, boolean> = {};
      for (const s of statuses) map[s.plugin_id] = s.enabled;
      setEnabledMap(map);
      const ids = new Set<string>();
      for (const p of (installed || [])) {
        if (p.plugin_id) ids.add(p.plugin_id);
        if (p.id) ids.add(p.id);
      }
      setInstalledIds(ids);
    } catch (err) {
      console.error('load installed plugins error:', err);
    } finally {
      setLoadingInstalled(false);
    }
  }, []);

  useEffect(() => { loadInstalled(); }, [loadInstalled]);

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
      await loadInstalled();
    } catch (err: any) {
      setSnackbar({ message: '卸载失败: ' + (err.message || ''), severity: 'error' });
    }
    setUninstallConfirm(null);
  };

  const loadStore = async () => {
    setLoadingStore(true);
    try {
      const [rawInstalled, rawStore] = await Promise.all([
        pluginLoader.getInstalledPlugins().catch(() => []),
        PluginManager.getInstance().getStorePlugins(STORE_API_URL).catch(() => []),
      ]);
      const installed = new Set<string>();
      for (const p of rawInstalled) {
        if (p.plugin_id) installed.add(p.plugin_id);
        if (p.id) installed.add(p.id);
      }
      setInstalledIds(installed);

      const cards: StoreCard[] = [];
      for (const item of rawStore) {
        let manifest: IndustryPluginManifest | null = null;
        if ((item as any).manifest) manifest = (item as any).manifest;
        else if ((item as any).manifest_json) {
          try { manifest = JSON.parse((item as any).manifest_json); } catch { /* ignore */ }
        }
        cards.push({
          id: item.id,
          name: item.name,
          version: item.version,
          description: item.description || '',
          icon: item.icon || '',
          downloads: (item as any).downloads || 0,
          tags: extractTags(manifest),
          published_at: (item as any).published_at || '',
        });
      }
      setStoreItems(cards);
    } catch (err) {
      console.error('load store error:', err);
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => { if (pluginTab === 1) loadStore(); }, [pluginTab]);

  const handleInstall = async (card: StoreCard) => {
    setInstallingId(card.id);
    const url = STORE_API_URL + '/api/plugins/' + card.id + '/download/' + card.version;
    const ok = await pluginLoader.downloadAndInstall(card.id, card.version, url);
    if (ok) {
      setSnackbar({ message: '已安装 ' + card.name, severity: 'success' });
      await loadStore();
      await loadInstalled();
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

  function PluginCard(p: { id: string; name: string; version: string; description: string; icon: string; tags: string[]; installed: boolean }) {
    const color = INDUSTRY_COLORS[p.id] || '#6b7280';
    const displayIcon = p.icon || '\u{1F50C}';
    return (
      <Card key={p.id} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', transition: 'all 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: (t) => '0 6px 20px ' + alpha(t.palette.common.black, 0.08), borderColor: color } }}>
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
              {installedPlugins.map((pl) => {
                const m = pl.manifest || ({} as IndustryPluginManifest);
                return <PluginCard key={pl.plugin_id} id={pl.plugin_id} name={pl.name} version={pl.version}
                  description={m.description || ''} icon={m.icon || ''} tags={extractTags(m)} installed={true} />;
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
    </Box>
  );
}
