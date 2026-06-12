/**
 * 商品展示编辑区
 * 搜索过滤 + 商品列表（Switch 控制上架/下架）
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  InputAdornment,
  Chip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { usePreviewContext } from '../PreviewContext';

export default function ProductSection() {
  const { products, toggleProduct } = usePreviewContext();
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const onSaleCount = products.filter(p => p.is_on_sale).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* 统计 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip label={`共 ${products.length} 件`} size="small" sx={{ height: 22, fontSize: 11 }} />
        <Chip label={`上架 ${onSaleCount} 件`} size="small" color="success" sx={{ height: 22, fontSize: 11 }} />
      </Box>

      {/* 搜索框 */}
      <TextField
        size="small"
        placeholder="搜索商品名称或分类..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </InputAdornment>
          ),
          sx: { fontSize: 13 },
        }}
      />

      {/* 商品列表 */}
      <Box
        sx={{
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 },
        }}
      >
        {filteredProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
              {search ? '未找到匹配的商品' : '暂无商品数据'}
            </Typography>
          </Box>
        ) : (
          filteredProducts.map(product => (
            <Box
              key={product.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                bgcolor: product.is_on_sale ? 'success.50' : 'grey.50',
                border: '1px solid',
                borderColor: product.is_on_sale ? 'success.200' : 'divider',
                transition: 'all 0.15s',
              }}
            >
              {/* 商品缩略图 */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 0.5,
                  bgcolor: 'grey.200',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
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
                  <Typography sx={{ fontSize: 16 }}>📦</Typography>
                )}
              </Box>

              {/* 商品信息 */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: product.is_on_sale ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {product.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    ¥{product.price.toFixed(0)}
                  </Typography>
                  {product.category && (
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {product.category}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* 上下架开关 */}
              <Switch
                checked={product.is_on_sale}
                onChange={(_, checked) => toggleProduct(product.id, checked)}
                size="small"
                color="success"
                sx={{ '& .MuiSwitch-switchBase': { p: 0.5 }, '& .MuiSwitch-thumb': { width: 16, height: 16 } }}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
