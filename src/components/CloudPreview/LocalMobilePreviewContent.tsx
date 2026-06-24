/**
 * 演示商城本地手机预览（不依赖 iframe / 远端部署）
 */

import { useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import {
  createDemoCloudStoreStub,
  DEMO_CLOUD_STORE_STUB_ID,
} from '../../lib/cloudStoreService';
import { useCloudStore, useStoreTheme, useSyncableProducts } from '../../lib/hooks/useCloudStore';
import { DEMO_EMAIL, isDemoAccount } from '../../lib/aiTeamTokenService';
import { useAuthStore } from '../../lib/authStore';
import { PreviewProvider, usePreviewContext } from './PreviewContext';
import H5StoreRenderer from './H5StoreRenderer';
import type { PreviewProduct } from './previewTypes';

function LocalPreviewInner() {
  const authUser = useAuthStore((s) => s.user);
  const demoMode =
    authUser?.email === DEMO_EMAIL ||
    authUser?.id === 'mock-boss-001' ||
    isDemoAccount();
  const { data: storeData, isLoading: storeLoading } = useCloudStore();
  const effectiveStore = storeData ?? (demoMode ? createDemoCloudStoreStub() : null);
  const isStub = effectiveStore?.id === DEMO_CLOUD_STORE_STUB_ID;
  const { data: themeData, isLoading: themeLoading } = useStoreTheme(
    effectiveStore?.id,
    !!effectiveStore && !isStub,
  );
  const { data: productList = [], isLoading: productsLoading, refetch } = useSyncableProducts();
  const { initData, store } = usePreviewContext();
  const lastSig = useRef('');

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener('proclaw:demo-bootstrapped', refresh);
    window.addEventListener('proclaw:products-changed', refresh);
    return () => {
      window.removeEventListener('proclaw:demo-bootstrapped', refresh);
      window.removeEventListener('proclaw:products-changed', refresh);
    };
  }, [refetch]);

  const loading =
    storeLoading || productsLoading || (!!effectiveStore && !isStub && themeLoading);

  useEffect(() => {
    if (loading || !effectiveStore) return;
    const sig = `${productList.length}:${productList.map((p) => p.id).join(',')}`;
    if (sig === lastSig.current && store) return;
    lastSig.current = sig;
    const previewProducts: PreviewProduct[] = productList.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.skus?.[0]?.sell_price || 0,
      images: p.images?.map((img) => img.image_url).filter(Boolean) || [],
      category: p.category_id,
      stock: p.skus?.[0]?.current_stock || 0,
      is_on_sale: p.is_on_sale ?? p.status === 'on_sale',
    }));
    initData({
      store: effectiveStore,
      theme: themeData ?? null,
      products: previewProducts,
    });
  }, [loading, effectiveStore, themeData, productList, initData, store]);

  if (loading && !store) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
        <Typography variant="caption" sx={{ ml: 1.5, color: 'text.secondary' }}>
          加载本地演示商品...
        </Typography>
      </Box>
    );
  }

  return <H5StoreRenderer />;
}

export default function LocalMobilePreviewContent() {
  return (
    <PreviewProvider>
      <LocalPreviewInner />
    </PreviewProvider>
  );
}
