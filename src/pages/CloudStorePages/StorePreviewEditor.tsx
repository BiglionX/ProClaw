/**
 * 云商城预览编辑器 - 主编排组件
 * 组合手机模拟器 + 编辑面板，管理数据加载和保存逻辑
 */

import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Alert, CircularProgress, useMediaQuery, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import {
  Home as HomeIcon,
  Description as DetailIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import {
  getCloudStore,
  getStoreTheme,
  getSyncableProducts,
  updateStoreTheme,
  updateCloudStore,
  generateThemeWithAI,
  getStoreUrl,
} from '../../lib/cloudStoreService';
import { PreviewProvider, usePreviewContext, previewThemeToStoreTheme } from '../../components/CloudPreview/PreviewContext';
import PhoneSimulator from '../../components/CloudPreview/PhoneSimulator';
import H5StoreRenderer from '../../components/CloudPreview/H5StoreRenderer';
import EditPanel from '../../components/CloudPreview/EditPanel';
import type { PreviewProduct } from '../../components/CloudPreview/previewTypes';

interface StorePreviewEditorProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (e: string | null) => void;
}

export default function StorePreviewEditor(props: StorePreviewEditorProps) {
  return (
    <PreviewProvider>
      <StorePreviewEditorInner {...props} />
    </PreviewProvider>
  );
}

function StorePreviewEditorInner({
  setError, setSuccessMessage,
}: StorePreviewEditorProps) {
  const ctx = usePreviewContext();

  // 响应式断点
  const isXl = useMediaQuery('(min-width: 1400px)');
  const isLg = useMediaQuery('(min-width: 1100px)');
  const isMd = useMediaQuery('(min-width: 900px)');
  const isStackLayout = !isMd; // < 900px 上下堆叠

  // 手机缩放比例
  const phoneScale = isXl ? 1 : isLg ? 0.85 : isMd ? 0.75 : 0.65;

  // 编辑面板宽度
  const panelWidth = isXl ? 400 : isLg ? 360 : 320;

  // 本地初始化加载状态
  const [initLoading, setInitLoading] = useState(true);

  // 从 ctx 解构稳定依赖，避免 useCallback 依赖整个 ctx 对象
  const {
    config,
    store,
    products,
    saving,
    setSaving,
    initData,
  } = ctx;

  // 加载数据
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setInitLoading(true);

        // 仅调用 getCloudStore 一次，避免双调用导致数据不一致
        const storeResult = await getCloudStore();
        const [themeData, products] = await Promise.all([
          storeResult ? getStoreTheme(storeResult.id).catch(() => null) : Promise.resolve(null),
          getSyncableProducts().catch(() => []),
        ]);

        if (cancelled) return;

        // 将 ProductSPU[] 转换为 PreviewProduct[]
        const previewProducts: PreviewProduct[] = products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.skus?.[0]?.sell_price || 0,
          images: p.images?.map(img => img.image_url).filter(Boolean) || [],
          category: p.category_id,
          stock: p.skus?.[0]?.current_stock || 0,
          is_on_sale: p.is_on_sale ?? p.status === 'on_sale',
        }));

        initData({
          store: storeResult,
          theme: themeData,
          products: previewProducts,
        });
      } catch (err) {
        if (cancelled) return;
        console.error('加载预览数据失败:', err);
        setError('加载预览数据失败');
      } finally {
        if (!cancelled) {
          setInitLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [setError, initData]);

  // 保存配置
  const handleSave = useCallback(async () => {
    if (!store) return;
    if (saving) return; // 并发安全
    try {
      setSaving(true);
      const themeUpdate = previewThemeToStoreTheme(config, store.id);
      await updateStoreTheme(store.id, themeUpdate);
      ctx.markSaved();
      setSuccessMessage('商城配置已保存！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [store, saving, config, ctx.markSaved, setSaving, setError, setSuccessMessage]);

  // AI 生成主题
  const handleAIGenerate = useCallback(async () => {
    if (!store) return;
    if (saving) return; // 并发安全
    try {
      setSaving(true);
      const newTheme = await generateThemeWithAI(store.id, '零售', config.categories, '¥0-1000');
      if (newTheme) {
        initData({
          store,
          theme: newTheme,
          products,
        });
        setSuccessMessage('AI 主题已生成！可在此基础上微调。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setSaving(false);
    }
  }, [store, saving, config.categories, products, initData, setSaving, setError, setSuccessMessage]);

  // 域名变更
  const handleDomainChange = useCallback(async (domain: string) => {
    if (!store) return;
    if (saving) return; // 并发安全
    try {
      setSaving(true);
      await updateCloudStore(store.id, { custom_domain: domain });
      // store 的 custom_domain 已变更，提示用户重新加载以看到最新状态
      setSuccessMessage(`自定义域名 ${domain} 已绑定！切换 Tab 后再返回即可看到最新状态。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '域名绑定失败');
    } finally {
      setSaving(false);
    }
  }, [store, saving, setSaving, setError, setSuccessMessage]);

  // 加载状态
  if (initLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: 'text.secondary' }}>加载预览数据...</Typography>
      </Box>
    );
  }

  // 未开通商城
  if (!store) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        请先在「商城概览」中开通云商城，然后才能使用预览编辑器。
      </Alert>
    );
  }

  const storeUrl = getStoreUrl(store);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        实时预览商城效果，编辑配置后即时生效。修改完成后点击「保存配置」持久化。
      </Alert>

      {/* 主布局：手机模拟器 + 编辑面板 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isStackLayout ? 'column' : 'row',
          gap: 3,
          alignItems: isStackLayout ? 'center' : 'flex-start',
        }}
      >
        {/* 左侧：手机模拟器 */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {/* 页面切换按钮 */}
          <ToggleButtonGroup
            value={ctx.currentPage}
            exclusive
            onChange={(_, v) => v && ctx.setPage(v)}
            size="small"
          >
            <ToggleButton value="home" sx={{ py: 0.5, px: 1.5, fontSize: 12 }}>
              <HomeIcon sx={{ fontSize: 14, mr: 0.5 }} /> 首页
            </ToggleButton>
            <ToggleButton value="product-detail" sx={{ py: 0.5, px: 1.5, fontSize: 12 }}>
              <DetailIcon sx={{ fontSize: 14, mr: 0.5 }} /> 详情
            </ToggleButton>
            <ToggleButton value="cart" sx={{ py: 0.5, px: 1.5, fontSize: 12 }}>
              <CartIcon sx={{ fontSize: 14, mr: 0.5 }} /> 购物车
            </ToggleButton>
          </ToggleButtonGroup>

          {/* 未保存指示器 */}
          {ctx.isDirty && (
            <Chip label="有未保存的修改" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
          )}

          {/* 手机模拟器 */}
          <PhoneSimulator scale={phoneScale} url={storeUrl}>
            <H5StoreRenderer />
          </PhoneSimulator>

          {/* 手机模拟器下方占位（补偿缩放后的空白） */}
          {phoneScale < 1 && (
            <Box sx={{ height: `calc(${-812 * (1 - phoneScale)}px)`, flexShrink: 0 }} />
          )}
        </Box>

        {/* 右侧：编辑面板 */}
        <Box
          sx={{
            width: isStackLayout ? '100%' : panelWidth,
            maxWidth: isStackLayout ? 500 : panelWidth,
            height: isStackLayout ? 600 : `calc(${812 * phoneScale}px + 80px)`,
            minHeight: 400,
            flexShrink: 0,
          }}
        >
          <EditPanel
            onSave={handleSave}
            onAIGenerate={handleAIGenerate}
            onDomainChange={handleDomainChange}
          />
        </Box>
      </Box>
    </Box>
  );
}
