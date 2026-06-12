/**
 * H5 商城页面渲染器
 * 在桌面端本地渲染商城预览，忠实复制 cloud-store/[store]/page.tsx 的视觉结构
 * 数据源来自 PreviewContext，实现编辑面板与预览的实时联动
 */

import { Box, Typography, Chip } from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMemo } from 'react';
import { usePreviewContext } from './PreviewContext';
import { BORDER_RADIUS_MAP } from './previewTypes';
import type { PreviewProduct, PreviewThemeConfig } from './previewTypes';

// 当前年份作为模块常量，避免每次 render 重复创建 Date 对象
const CURRENT_YEAR = new Date().getFullYear();

export default function H5StoreRenderer() {
  const { config, products, currentPage, selectedProduct, selectProduct } = usePreviewContext();
  const { theme } = config;

  const visibleProducts = useMemo(
    () => products.filter(p => p.is_on_sale),
    [products]
  );
  const borderRadius = BORDER_RADIUS_MAP[theme.border_radius];

  if (currentPage === 'product-detail' && selectedProduct) {
    return <ProductDetailPage product={selectedProduct} theme={theme} onBack={() => selectProduct(null)} />;
  }

  return (
    <Box sx={{ fontFamily: theme.font_family, minHeight: '100%', bgcolor: '#f9fafb' }}>
      {/* ===== Header 导航栏 ===== */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          bgcolor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          pt: '54px', // 留出状态栏空间
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          {/* Logo + 商城名 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {config.logo_url ? (
              <Box
                component="img"
                src={config.logo_url}
                alt={config.store_name}
                sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
              />
            ) : (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: theme.primary_color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {config.store_name.charAt(0).toUpperCase()}
                </Typography>
              </Box>
            )}
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.primary_color }}>
              {config.store_name}
            </Typography>
          </Box>

          {/* 右侧操作 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon sx={{ fontSize: 20, color: 'grey.500' }} />
            <CartIcon sx={{ fontSize: 20, color: 'grey.500' }} />
          </Box>
        </Box>
      </Box>

      {/* ===== Banner 轮播图 ===== */}
      {config.banner_images.length > 0 ? (
        <Box
          sx={{
            width: '100%',
            height: 160,
            backgroundImage: `url(${config.banner_images[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
              欢迎来到 {config.store_name}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: 100,
            bgcolor: theme.primary_color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
            {config.store_name}
          </Typography>
        </Box>
      )}

      {/* ===== 分类导航 ===== */}
      {config.categories.length > 0 && (
        <Box
          sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid #e5e7eb',
            px: 2,
            py: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
            <Chip
              label="全部商品"
              size="small"
              sx={{
                bgcolor: theme.primary_color,
                color: '#fff',
                fontSize: 12,
                height: 28,
                '& .MuiChip-label': { px: 1.5 },
              }}
            />
            {config.categories.map(cat => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: 12,
                  height: 28,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '& .MuiChip-label': { px: 1.5 },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ===== 商品列表 ===== */}
      <Box sx={{ px: 2, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
            热门商品
          </Typography>
          <Typography sx={{ fontSize: 12, color: theme.primary_color }}>
            查看全部 →
          </Typography>
        </Box>

        {visibleProducts.length > 0 ? (
          <ProductGrid
            products={visibleProducts}
            theme={theme}
            borderRadius={borderRadius}
            onProductClick={selectProduct}
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 32, mb: 1 }}>📦</Typography>
            <Typography sx={{ fontSize: 14, color: '#6b7280' }}>暂无商品</Typography>
            <Typography sx={{ fontSize: 12, color: '#9ca3af', mt: 0.5 }}>
              该商城暂未上架任何商品
            </Typography>
          </Box>
        )}
      </Box>

      {/* ===== Footer 页脚 ===== */}
      <Box sx={{ bgcolor: '#1f2937', px: 2, py: 3, mt: 3 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff', mb: 0.5 }}>
          {config.store_name}
        </Typography>
        <Typography sx={{ fontSize: 11, color: '#9ca3af', mb: 1.5 }}>
          由 ProClaw Shop 提供支持
        </Typography>
        {config.contact_info && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
            {config.contact_info.phone && (
              <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
                电话: {config.contact_info.phone}
              </Typography>
            )}
            {config.contact_info.wechat && (
              <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
                微信: {config.contact_info.wechat}
              </Typography>
            )}
          </Box>
        )}
        <Box sx={{ borderTop: '1px solid #374151', pt: 1.5, mt: 1.5 }}>
          <Typography sx={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
            © {CURRENT_YEAR} {config.store_name}. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ========== 商品网格组件 ==========

interface ProductGridProps {
  products: PreviewProduct[];
  theme: PreviewThemeConfig;
  borderRadius: string;
  onProductClick: (product: PreviewProduct) => void;
}

// 顶层函数：避免每次 render 重新创建
function getGridStyle(layout: PreviewThemeConfig['layout']): Record<string, unknown> {
  switch (layout) {
    case 'list':
      return { display: 'flex', flexDirection: 'column', gap: 1.5 };
    case 'grid':
      return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' };
    case 'card':
    default:
      return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' };
  }
}

interface DisplayMode {
  imageAspect: string;
  showDesc: boolean;
  nameSize: number;
}

function getDisplayMode(display: PreviewThemeConfig['product_display']): DisplayMode {
  switch (display) {
    case 'image_focus':
      return { imageAspect: '4/5', showDesc: false, nameSize: 12 };
    case 'info_focus':
      return { imageAspect: '1/1', showDesc: true, nameSize: 14 };
    case 'balanced':
    default:
      return { imageAspect: '1/1', showDesc: false, nameSize: 13 };
  }
}

function ProductGrid({ products, theme, borderRadius, onProductClick }: ProductGridProps) {
  const gridStyle = getGridStyle(theme.layout);
  const displayMode = getDisplayMode(theme.product_display);

  // 列表模式单独渲染
  if (theme.layout === 'list') {
    return (
      <Box sx={gridStyle}>
        {products.slice(0, 10).map(product => (
          <Box
            key={product.id}
            onClick={() => onProductClick(product)}
            sx={{
              display: 'flex',
              gap: 1.5,
              bgcolor: '#fff',
              borderRadius,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              '&:active': { opacity: 0.8 },
            }}
          >
            {/* 商品图片 */}
            <Box
              sx={{
                width: 100,
                height: 100,
                flexShrink: 0,
                bgcolor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {product.images.length > 0 ? (
                <Box component="img" src={product.images[0]} alt={product.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Typography sx={{ fontSize: 24 }}>📦</Typography>
              )}
            </Box>
            {/* 商品信息 */}
            <Box sx={{ flex: 1, py: 1, pr: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {product.name}
              </Typography>
              {product.category && (
                <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.5 }}>{product.category}</Typography>
              )}
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.primary_color, mt: 0.5 }}>
                ¥{product.price.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  // 卡片/网格模式
  return (
    <Box sx={gridStyle}>
      {products.slice(0, 10).map(product => (
        <Box
          key={product.id}
          onClick={() => onProductClick(product)}
          sx={{
            bgcolor: '#fff',
            borderRadius,
            overflow: 'hidden',
            boxShadow: theme.style === 'minimal' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
            border: theme.style === 'minimal' ? '1px solid #e5e7eb' : 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
            '&:active': { opacity: 0.8 },
          }}
        >
          {/* 商品图片 */}
          <Box
            sx={{
              width: '100%',
              aspectRatio: displayMode.imageAspect,
              bgcolor: '#f3f4f6',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {product.images.length > 0 ? (
              <Box
                component="img"
                src={product.images[0]}
                alt={product.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Typography sx={{ fontSize: 32 }}>📦</Typography>
            )}
            {product.stock === 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>已售罄</Typography>
              </Box>
            )}
          </Box>

          {/* 商品信息 */}
          <Box sx={{ p: theme.layout === 'grid' ? 1 : 1.5 }}>
            <Typography
              sx={{
                fontSize: displayMode.nameSize,
                fontWeight: 500,
                color: '#111827',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {product.name}
            </Typography>
            {displayMode.showDesc && product.category && (
              <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.5 }}>
                {product.category}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: theme.primary_color }}>
                ¥{product.price.toFixed(2)}
              </Typography>
              {product.stock > 0 && (
                <Typography sx={{ fontSize: 11, color: '#16a34a' }}>有货</Typography>
              )}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ========== 商品详情页 ==========

interface ProductDetailPageProps {
  product: PreviewProduct;
  theme: PreviewThemeConfig;
  onBack: () => void;
}

function ProductDetailPage({ product, theme, onBack }: ProductDetailPageProps) {
  const borderRadius = BORDER_RADIUS_MAP[theme.border_radius];

  return (
    <Box sx={{ fontFamily: theme.font_family, minHeight: '100%', bgcolor: '#f9fafb' }}>
      {/* 顶部导航 */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          bgcolor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          pt: '54px',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          onClick={onBack}
          sx={{ fontSize: 14, color: theme.primary_color, cursor: 'pointer', fontWeight: 500 }}
        >
          ← 返回
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#111827', flex: 1, textAlign: 'center' }}>
          商品详情
        </Typography>
        <CartIcon sx={{ fontSize: 20, color: 'grey.500' }} />
      </Box>

      {/* 商品图片 */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1/1',
          bgcolor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.images.length > 0 ? (
          <Box component="img" src={product.images[0]} alt={product.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography sx={{ fontSize: 64 }}>📦</Typography>
        )}
      </Box>

      {/* 商品信息 */}
      <Box sx={{ bgcolor: '#fff', p: 2 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: theme.primary_color, mb: 1 }}>
          ¥{product.price.toFixed(2)}
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: '#111827', mb: 1, lineHeight: 1.4 }}>
          {product.name}
        </Typography>
        {product.category && (
          <Chip
            label={product.category}
            size="small"
            sx={{ fontSize: 11, mb: 1.5 }}
          />
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
            库存: {product.stock}
          </Typography>
          {product.stock > 0 && (
            <Chip label="有货" size="small" color="success" sx={{ fontSize: 11, height: 22 }} />
          )}
        </Box>
      </Box>

      {/* 底部操作栏 */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 34,
          left: 0,
          right: 0,
          bgcolor: '#fff',
          borderTop: '1px solid #e5e7eb',
          px: 2,
          py: 1.5,
          display: 'flex',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            flex: 1,
            py: 1.5,
            textAlign: 'center',
            borderRadius,
            border: `1px solid ${theme.primary_color}`,
            color: theme.primary_color,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          加入购物车
        </Box>
        <Box
          sx={{
            flex: 1,
            py: 1.5,
            textAlign: 'center',
            borderRadius,
            bgcolor: theme.primary_color,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          立即购买
        </Box>
      </Box>
    </Box>
  );
}
