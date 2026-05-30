/**
 * ProClaw-Light 媒体库服务
 * 统一的图片/视频资产管理中心
 */

export interface MediaAsset {
  id: string;
  name: string;
  file_type: 'image' | 'video';
  data_url?: string;        // base64 数据（浏览器模式）
  file_path?: string;       // 本地文件路径 (Tauri fs)
  thumbnail_data_url?: string;
  mime_type: string;
  file_size: number;
  category_id?: string;
  tags: string[];
  alt_text?: string;
  linked_product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface MediaCategory {
  id: string;
  name: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
}

const STORAGE_KEY_ASSETS = 'proclaw-light-media-assets';
const STORAGE_KEY_CATEGORIES = 'proclaw-light-media-categories';

// ===== 默认分类 =====
const DEFAULT_CATEGORIES: MediaCategory[] = [
  { id: 'cat-product', name: '商品图', parent_id: undefined, sort_order: 1, created_at: new Date().toISOString() },
  { id: 'cat-poster', name: '海报素材', parent_id: undefined, sort_order: 2, created_at: new Date().toISOString() },
  { id: 'cat-video', name: '短视频', parent_id: undefined, sort_order: 3, created_at: new Date().toISOString() },
  { id: 'cat-banner', name: 'Banner', parent_id: undefined, sort_order: 4, created_at: new Date().toISOString() },
  { id: 'cat-other', name: '其他', parent_id: undefined, sort_order: 5, created_at: new Date().toISOString() },
];

function readAssets(): MediaAsset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ASSETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAssets(assets: MediaAsset[]): void {
  localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
}

function readCategories(): MediaCategory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  // 初始化默认分类
  saveCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

function saveCategories(categories: MediaCategory[]): void {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

// ===== 公开 API =====

export function getMediaAssets(options?: {
  category_id?: string;
  tag?: string;
  search?: string;
  file_type?: 'image' | 'video';
}): MediaAsset[] {
  let assets = readAssets();
  if (options?.category_id) {
    assets = assets.filter(a => a.category_id === options.category_id);
  }
  if (options?.tag) {
    assets = assets.filter(a => a.tags.includes(options.tag!));
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    assets = assets.filter(a => a.name.toLowerCase().includes(q) || a.alt_text?.toLowerCase().includes(q));
  }
  if (options?.file_type) {
    assets = assets.filter(a => a.file_type === options.file_type);
  }
  return assets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getMediaAssetById(id: string): MediaAsset | undefined {
  return readAssets().find(a => a.id === id);
}

export function addMediaAsset(asset: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'>): MediaAsset {
  const assets = readAssets();
  const now = new Date().toISOString();
  const newAsset: MediaAsset = {
    ...asset,
    id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: now,
    updated_at: now,
  };
  assets.unshift(newAsset);
  saveAssets(assets);
  return newAsset;
}

export function updateMediaAsset(id: string, updates: Partial<MediaAsset>): boolean {
  const assets = readAssets();
  const index = assets.findIndex(a => a.id === id);
  if (index === -1) return false;
  assets[index] = { ...assets[index], ...updates, updated_at: new Date().toISOString() };
  saveAssets(assets);
  return true;
}

export function deleteMediaAsset(id: string): boolean {
  const assets = readAssets();
  const filtered = assets.filter(a => a.id !== id);
  if (filtered.length === assets.length) return false;
  saveAssets(filtered);
  return true;
}

export function getMediaStats() {
  const assets = readAssets();
  return {
    total: assets.length,
    images: assets.filter(a => a.file_type === 'image').length,
    videos: assets.filter(a => a.file_type === 'video').length,
    totalSize: assets.reduce((s, a) => s + a.file_size, 0),
  };
}

// ===== 分类管理 =====

export function getMediaCategories(): MediaCategory[] {
  return readCategories().sort((a, b) => a.sort_order - b.sort_order);
}

export function addMediaCategory(name: string, parent_id?: string): MediaCategory {
  const categories = readCategories();
  const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
  const newCat: MediaCategory = {
    id: `mcat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name,
    parent_id,
    sort_order: maxOrder + 1,
    created_at: new Date().toISOString(),
  };
  categories.push(newCat);
  saveCategories(categories);
  return newCat;
}

export function deleteMediaCategory(id: string): boolean {
  let categories = readCategories();
  const filtered = categories.filter(c => c.id !== id);
  if (filtered.length === categories.length) return false;
  saveCategories(filtered);
  // 同时清除该分类下的资产分类引用
  const assets = readAssets();
  let changed = false;
  const updatedAssets = assets.map(a => {
    if (a.category_id === id) {
      changed = true;
      return { ...a, category_id: undefined };
    }
    return a;
  });
  if (changed) saveAssets(updatedAssets);
  return true;
}

// ===== 标签管理 =====

export function getAllMediaTags(): string[] {
  const assets = readAssets();
  const tagSet = new Set<string>();
  assets.forEach(a => a.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

// ===== 文件处理工具 =====

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileType(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
