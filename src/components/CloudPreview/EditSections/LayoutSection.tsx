/**
 * 页面布局编辑区
 * 商品布局、Banner样式、视觉风格、商品展示模式
 */

import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  GridView as GridIcon,
  ViewList as ListIcon,
  Dashboard as CardIcon,
} from '@mui/icons-material';
import { usePreviewContext } from '../PreviewContext';
import { STYLE_OPTIONS, DISPLAY_OPTIONS, BANNER_STYLE_OPTIONS } from '../previewTypes';

export default function LayoutSection() {
  const { config, updateTheme } = usePreviewContext();
  const { theme } = config;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* 商品布局 */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12 }}>商品布局</Typography>
        <ToggleButtonGroup
          value={theme.layout}
          exclusive
          onChange={(_, v) => v && updateTheme({ layout: v })}
          size="small"
          fullWidth
        >
          <ToggleButton value="card" sx={{ flex: 1, py: 1, fontSize: 12, '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CardIcon sx={{ fontSize: 16 }} />
              卡片
            </Box>
          </ToggleButton>
          <ToggleButton value="list" sx={{ flex: 1, py: 1, fontSize: 12, '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ListIcon sx={{ fontSize: 16 }} />
              列表
            </Box>
          </ToggleButton>
          <ToggleButton value="grid" sx={{ flex: 1, py: 1, fontSize: 12, '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GridIcon sx={{ fontSize: 16 }} />
              网格
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>

        {/* 布局预览缩略图 */}
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, justifyContent: 'center' }}>
          {theme.layout === 'card' && (
            <LayoutPreview>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, width: '100%' }}>
                {[1, 2, 3, 4].map(i => (
                  <Box key={i} sx={{ bgcolor: 'grey.300', borderRadius: 0.5, aspectRatio: '1/1.3' }} />
                ))}
              </Box>
            </LayoutPreview>
          )}
          {theme.layout === 'list' && (
            <LayoutPreview>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                {[1, 2, 3].map(i => (
                  <Box key={i} sx={{ bgcolor: 'grey.300', borderRadius: 0.5, height: 12, display: 'flex', gap: 0.5 }}>
                    <Box sx={{ width: 12, bgcolor: 'grey.400', borderRadius: 0.5, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }} />
                  </Box>
                ))}
              </Box>
            </LayoutPreview>
          )}
          {theme.layout === 'grid' && (
            <LayoutPreview>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.3, width: '100%' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Box key={i} sx={{ bgcolor: 'grey.300', borderRadius: 0.3, aspectRatio: '1/1' }} />
                ))}
              </Box>
            </LayoutPreview>
          )}
        </Box>
      </Box>

      {/* 视觉风格 */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ fontSize: 12 }}>视觉风格</InputLabel>
        <Select
          value={theme.style}
          label="视觉风格"
          onChange={e => updateTheme({ style: e.target.value as typeof theme.style })}
          sx={{ fontSize: 13 }}
        >
          {STYLE_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Banner 样式 */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ fontSize: 12 }}>Banner 样式</InputLabel>
        <Select
          value={theme.banner_style}
          label="Banner 样式"
          onChange={e => updateTheme({ banner_style: e.target.value as typeof theme.banner_style })}
          sx={{ fontSize: 13 }}
        >
          {BANNER_STYLE_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 商品展示模式 */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ fontSize: 12 }}>商品展示</InputLabel>
        <Select
          value={theme.product_display}
          label="商品展示"
          onChange={e => updateTheme({ product_display: e.target.value as typeof theme.product_display })}
          sx={{ fontSize: 13 }}
        >
          {DISPLAY_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

// 布局预览缩略图容器
function LayoutPreview({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: 60,
        height: 60,
        border: '1px solid',
        borderColor: 'primary.main',
        borderRadius: 1,
        p: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Box>
  );
}
