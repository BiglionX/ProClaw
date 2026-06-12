/**
 * 云商城预览编辑器 - 状态管理 Context
 * 管理预览配置、商城信息、商品数据，提供实时联动能力
 */

import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { CloudStore, StoreTheme } from '../../lib/cloudStoreService';
import type {
  PreviewConfig,
  PreviewThemeConfig,
  PreviewProduct,
  PreviewPage,
} from './previewTypes';
import { DEFAULT_PREVIEW_CONFIG, DEFAULT_PREVIEW_THEME } from './previewTypes';

// ========== Context 值接口 ==========

export interface PreviewContextValue {
  /** 预览配置 */
  config: PreviewConfig;
  /** 商城信息 */
  store: CloudStore | null;
  /** 商品列表 */
  products: PreviewProduct[];
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 当前预览页面 */
  currentPage: PreviewPage;
  /** 当前选中的商品（详情页预览用） */
  selectedProduct: PreviewProduct | null;
  /** 加载状态 */
  loading: boolean;
  /** 保存中状态 */
  saving: boolean;

  // Actions
  /** 更新主题配置（部分更新） */
  updateTheme: (partial: Partial<PreviewThemeConfig>) => void;
  /** 更新预览配置（部分更新） */
  updateConfig: (partial: Partial<PreviewConfig>) => void;
  /** 切换商品上架状态 */
  toggleProduct: (productId: string, visible: boolean) => void;
  /** 选择商品（进入详情页预览） */
  selectProduct: (product: PreviewProduct | null) => void;
  /** 切换预览页面 */
  setPage: (page: PreviewPage) => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置保存中状态 */
  setSaving: (saving: boolean) => void;
  /** 初始化数据 */
  initData: (data: {
    store: CloudStore | null;
    theme: StoreTheme | null;
    products: PreviewProduct[];
  }) => void;
  /** 重置为初始配置（丢弃未保存的修改） */
  reset: () => void;
  /** 标记为已保存 */
  markSaved: () => void;
}

/**
 * 轻量级深比较 - 仅支持纯数据对象（不含函数/循环引用）
 * 用于避免 JSON.stringify 性能开销 + 避免 undefined 字段误判
 */
function isShallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isShallowEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!isShallowEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

// ========== Provider ==========

interface PreviewProviderProps {
  children: ReactNode;
}

export function PreviewProvider({ children }: PreviewProviderProps) {
  const [config, setConfig] = useState<PreviewConfig>({ ...DEFAULT_PREVIEW_CONFIG });
  const [savedConfig, setSavedConfig] = useState<PreviewConfig>({ ...DEFAULT_PREVIEW_CONFIG });
  const [store, setStore] = useState<CloudStore | null>(null);
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [savedProducts, setSavedProducts] = useState<PreviewProduct[]>([]);
  const [currentPage, setCurrentPage] = useState<PreviewPage>('home');
  const [selectedProduct, setSelectedProduct] = useState<PreviewProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 缓存 config/savedConfig/products/savedProducts 的稳定引用，避免 useCallback 依赖重建
  const configRef = useRef(config);
  configRef.current = config;
  const savedConfigRef = useRef(savedConfig);
  savedConfigRef.current = savedConfig;
  const productsRef = useRef(products);
  productsRef.current = products;
  const savedProductsRef = useRef(savedProducts);
  savedProductsRef.current = savedProducts;

  // 使用轻量级深比较，避免 JSON.stringify 性能问题与 undefined 误判
  const isDirty = useMemo(() => {
    if (!isShallowEqual(configRef.current, savedConfigRef.current)) return true;
    // 商品上下架状态变更也算 dirty
    if (productsRef.current.length !== savedProductsRef.current.length) return true;
    for (let i = 0; i < productsRef.current.length; i++) {
      if (productsRef.current[i].is_on_sale !== savedProductsRef.current[i].is_on_sale) return true;
    }
    return false;
  }, [config, savedConfig, products, savedProducts]);

  const updateTheme = useCallback((partial: Partial<PreviewThemeConfig>) => {
    setConfig(prev => ({
      ...prev,
      theme: { ...prev.theme, ...partial },
    }));
  }, []);

  const updateConfig = useCallback((partial: Partial<PreviewConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const toggleProduct = useCallback((productId: string, visible: boolean) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, is_on_sale: visible } : p))
    );
  }, []);

  const selectProduct = useCallback((product: PreviewProduct | null) => {
    setSelectedProduct(product);
    setCurrentPage(product ? 'product-detail' : 'home');
  }, []);

  const setPage = useCallback((page: PreviewPage) => {
    setCurrentPage(page);
    if (page === 'home') {
      setSelectedProduct(null);
    }
  }, []);

  const initData = useCallback((data: {
    store: CloudStore | null;
    theme: StoreTheme | null;
    products: PreviewProduct[];
  }) => {
    setStore(data.store);
    setProducts(data.products);

    // 将 StoreTheme 转换为 PreviewConfig
    const theme = data.theme;
    const themeData = theme?.theme_data || {};

    const previewTheme: PreviewThemeConfig = {
      primary_color: theme?.primary_color || DEFAULT_PREVIEW_THEME.primary_color,
      secondary_color: theme?.secondary_color || DEFAULT_PREVIEW_THEME.secondary_color,
      accent_color: (themeData.accent_color as string) || DEFAULT_PREVIEW_THEME.accent_color,
      layout: (theme?.layout_style === 'list' ? 'list' : 'card') as PreviewThemeConfig['layout'],
      style: (themeData.style as PreviewThemeConfig['style']) || DEFAULT_PREVIEW_THEME.style,
      font_family: theme?.font_family || DEFAULT_PREVIEW_THEME.font_family,
      border_radius: (themeData.border_radius as PreviewThemeConfig['border_radius']) || DEFAULT_PREVIEW_THEME.border_radius,
      product_display: (themeData.product_display as PreviewThemeConfig['product_display']) || DEFAULT_PREVIEW_THEME.product_display,
      banner_style: (themeData.banner_style as PreviewThemeConfig['banner_style']) || DEFAULT_PREVIEW_THEME.banner_style,
    };

    // 从商品中提取分类
    const categories = [...new Set(data.products.map(p => p.category).filter(Boolean))] as string[];

    const newConfig: PreviewConfig = {
      theme: previewTheme,
      store_name: data.store?.subdomain || '我的商城',
      logo_url: theme?.logo_url,
      banner_images: theme?.banner_images || [],
      categories,
    };

    setConfig(newConfig);
    setSavedConfig(newConfig);
    setSavedProducts(data.products);
    setCurrentPage('home');
    setSelectedProduct(null);
  }, []);

  // 引用最新 savedConfig/savedProducts，使 reset/markSaved 回调引用稳定
  const reset = useCallback(() => {
    setConfig(savedConfigRef.current);
    setProducts(savedProductsRef.current);
    setCurrentPage('home');
    setSelectedProduct(null);
  }, []);

  const markSaved = useCallback(() => {
    setSavedConfig(configRef.current);
    setSavedProducts(productsRef.current);
  }, []);

  const value = useMemo<PreviewContextValue>(() => ({
    config,
    store,
    products,
    isDirty,
    currentPage,
    selectedProduct,
    loading,
    saving,
    updateTheme,
    updateConfig,
    toggleProduct,
    selectProduct,
    setPage,
    setLoading,
    setSaving,
    initData,
    reset,
    markSaved,
  }), [
    config, store, products, isDirty, currentPage, selectedProduct, loading, saving,
    updateTheme, updateConfig, toggleProduct, selectProduct, setPage, initData, reset, markSaved,
  ]);

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  );
}

// ========== Hook ==========

export function usePreviewContext(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error('usePreviewContext must be used within a PreviewProvider');
  }
  return ctx;
}

// ========== 工具函数：PreviewConfig → StoreTheme 转换 ==========

/**
 * 将 PreviewThemeConfig 转换为后端 StoreTheme 格式
 */
export function previewThemeToStoreTheme(
  config: PreviewConfig,
  storeId: string,
): Partial<StoreTheme> {
  return {
    store_id: storeId,
    primary_color: config.theme.primary_color,
    secondary_color: config.theme.secondary_color,
    layout_style: config.theme.layout === 'grid' ? 'card' : config.theme.layout,
    font_family: config.theme.font_family,
    logo_url: config.logo_url,
    banner_images: config.banner_images,
    theme_data: {
      accent_color: config.theme.accent_color,
      style: config.theme.style,
      border_radius: config.theme.border_radius,
      product_display: config.theme.product_display,
      banner_style: config.theme.banner_style,
    },
  };
}
