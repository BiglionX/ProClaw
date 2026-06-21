import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PluginManager, type IndustryPluginManifest } from '../../config/appMode';
import { listPluginManifests } from '../manifestRegistry';
import { pluginLoader } from '../pluginLoader';

export interface InstalledPluginInfo {
  plugin_id: string;
  name: string;
  version: string;
  install_path: string;
  manifest: IndustryPluginManifest;
  isBuiltin?: boolean;
  installed_at?: string;
  builtin?: boolean;
  path?: string;
  size?: number;
  id?: string;
}

export interface PluginStoreCard {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  downloads: number;
  tags: string[];
  published_at: string;
}

export const pluginsQueryKey = ['plugins'] as const;

const STORE_API_URL = 'https://flowhub.proclaw.cc';

function extractTags(manifest: IndustryPluginManifest | null | undefined): string[] {
  if (!manifest) return [];
  if (manifest.tags && manifest.tags.length > 0) return manifest.tags;
  if (manifest.features?.modules) return manifest.features.modules.slice(0, 4);
  return [];
}

function getLocalStoreFallback(): PluginStoreCard[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'retail-pos',
      name: '零售收银 POS',
      version: '1.0.0',
      description: '完整的零售门店收银、扫码、打印小票、库存联动一体化方案',
      icon: '🛒',
      downloads: 1280,
      tags: ['零售', 'POS', '进销存'],
      published_at: now,
    },
    {
      id: 'beauty-booking',
      name: '美业预约系统',
      version: '1.2.0',
      description: '美容院、美发、美甲等服务的预约、会员卡、技师排班一站式管理',
      icon: '💇',
      downloads: 856,
      tags: ['美业', '预约', '会员'],
      published_at: now,
    },
    {
      id: 'catering-kds',
      name: '餐饮 KDS 后厨显示',
      version: '2.0.0',
      description: '后厨实时显示订单状态,出餐提醒,出品顺序智能调度',
      icon: '🍳',
      downloads: 2103,
      tags: ['餐饮', '后厨', '出餐'],
      published_at: now,
    },
    {
      id: 'pet-medical',
      name: '宠物医院管理',
      version: '1.5.0',
      description: '宠物诊疗档案、疫苗提醒、寄养预约、商品销售一站式',
      icon: '🐶',
      downloads: 654,
      tags: ['宠物', '医疗', '寄养'],
      published_at: now,
    },
    {
      id: 'cloud-backup-pro',
      name: '云端备份 Pro',
      version: '3.1.0',
      description: 'ProClaw 业务数据云端加密备份,7 天循环,一键恢复',
      icon: '☁️',
      downloads: 3210,
      tags: ['云服务', '备份', '安全'],
      published_at: now,
    },
  ];
}

async function fetchInstalledPlugins(): Promise<{
  plugins: InstalledPluginInfo[];
  enabledMap: Record<string, boolean>;
}> {
  const installed = await pluginLoader.getInstalledPlugins();
  const builtinManifests = listPluginManifests().filter((m) => m.builtin);
  const builtinItems: InstalledPluginInfo[] = builtinManifests
    .filter((m) => !(installed || []).some((p: { plugin_id: string }) => p.plugin_id === m.id))
    .map((m) => ({
      plugin_id: m.id,
      name: m.name,
      version: m.version,
      install_path: 'builtin',
      manifest: m as unknown as IndustryPluginManifest,
      isBuiltin: true,
      builtin: true,
    }));
  const plugins: InstalledPluginInfo[] = [...(installed || []), ...builtinItems];
  const statuses = await pluginLoader.getAllPluginEnabledStatuses();
  const enabledMap: Record<string, boolean> = {};
  for (const s of statuses) {
    enabledMap[s.plugin_id] = s.enabled;
  }
  for (const b of builtinItems) {
    if (enabledMap[b.plugin_id] === undefined) {
      enabledMap[b.plugin_id] = true;
    }
  }
  return { plugins, enabledMap };
}

async function fetchPluginStore(): Promise<PluginStoreCard[]> {
  const rawStore = await PluginManager.getInstance()
    .getStorePlugins(STORE_API_URL)
    .catch(() => []);
  const sourceList = rawStore.length > 0 ? rawStore : getLocalStoreFallback();
  if (rawStore.length === 0) {
    console.info('[usePluginStore] 商店 API 不可达,使用本地推荐列表');
  }
  const cards: PluginStoreCard[] = [];
  for (const item of sourceList) {
    let manifest: IndustryPluginManifest | null = null;
    const raw = item as unknown as {
      manifest?: IndustryPluginManifest;
      manifest_json?: string;
    };
    if (raw.manifest) {
      manifest = raw.manifest;
    } else if (raw.manifest_json) {
      try {
        manifest = JSON.parse(raw.manifest_json);
      } catch {
        /* ignore */
      }
    }
    cards.push({
      id: item.id,
      name: item.name,
      version: item.version,
      description: item.description || '',
      icon: item.icon || '',
      downloads: (item as { downloads?: number }).downloads || 0,
      tags: extractTags(manifest),
      published_at: (item as { published_at?: string }).published_at || '',
    });
  }
  return cards;
}

export function useInstalledPlugins(enabled = true) {
  return useQuery({
    queryKey: [...pluginsQueryKey, 'installed'],
    queryFn: fetchInstalledPlugins,
    enabled,
  });
}

export function usePluginStore(enabled = true) {
  return useQuery({
    queryKey: [...pluginsQueryKey, 'store'],
    queryFn: fetchPluginStore,
    enabled,
  });
}

export function useInvalidatePlugins() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: pluginsQueryKey });
}