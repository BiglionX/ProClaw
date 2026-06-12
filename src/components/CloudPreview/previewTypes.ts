/**
 * 云商城预览编辑器 - 类型定义
 * 对齐 cloud-store 的 ThemeConfig，支持扩展主题配置
 */

/** 扩展的主题配置 - 对齐 cloud-store ThemeConfig */
export interface PreviewThemeConfig {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout: 'card' | 'list' | 'grid';
  style: 'modern' | 'classic' | 'minimal';
  font_family: string;
  border_radius: 'none' | 'small' | 'medium' | 'large';
  product_display: 'image_focus' | 'info_focus' | 'balanced';
  banner_style: 'carousel' | 'grid' | 'fullwidth';
}

/** 预览完整配置 */
export interface PreviewConfig {
  theme: PreviewThemeConfig;
  store_name: string;
  logo_url?: string;
  banner_images: string[];
  categories: string[];
  contact_info?: {
    phone?: string;
    wechat?: string;
    email?: string;
  };
}

/** 预览用商品数据 */
export interface PreviewProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  category?: string;
  stock: number;
  is_on_sale: boolean;
  description?: string;
}

/** 预览页面类型 */
export type PreviewPage = 'home' | 'product-detail' | 'cart';

/** 设备类型 */
export type DeviceType = 'iphone' | 'android';

/** 默认主题配置 */
export const DEFAULT_PREVIEW_THEME: PreviewThemeConfig = {
  primary_color: '#3B82F6',
  secondary_color: '#60A5FA',
  accent_color: '#F59E0B',
  layout: 'card',
  style: 'modern',
  font_family: 'system-ui, -apple-system, sans-serif',
  border_radius: 'medium',
  product_display: 'balanced',
  banner_style: 'carousel',
};

/** 默认预览配置 */
export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  theme: DEFAULT_PREVIEW_THEME,
  store_name: '我的商城',
  banner_images: [],
  categories: [],
};

/** 圆角值映射 */
export const BORDER_RADIUS_MAP: Record<PreviewThemeConfig['border_radius'], string> = {
  none: '0px',
  small: '4px',
  medium: '8px',
  large: '16px',
};

/** 字体选项 */
export const FONT_OPTIONS = [
  { label: '系统默认', value: 'system-ui, -apple-system, sans-serif' },
  { label: '苹方', value: 'PingFang SC, -apple-system, sans-serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
  { label: '思源黑体', value: 'Noto Sans SC, sans-serif' },
  { label: '思源宋体', value: 'Noto Serif SC, serif' },
];

/** 视觉风格选项 */
export const STYLE_OPTIONS = [
  { label: '现代', value: 'modern' as const },
  { label: '经典', value: 'classic' as const },
  { label: '极简', value: 'minimal' as const },
];

/** 商品展示模式选项 */
export const DISPLAY_OPTIONS = [
  { label: '图片优先', value: 'image_focus' as const },
  { label: '信息优先', value: 'info_focus' as const },
  { label: '均衡', value: 'balanced' as const },
];

/** Banner 样式选项 */
export const BANNER_STYLE_OPTIONS = [
  { label: '轮播', value: 'carousel' as const },
  { label: '网格', value: 'grid' as const },
  { label: '全宽', value: 'fullwidth' as const },
];
