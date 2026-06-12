/**
 * 主题样式编辑区
 * 颜色选择器、字体选择、圆角选择
 */

import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useRef } from 'react';
import { usePreviewContext } from '../PreviewContext';
import { FONT_OPTIONS } from '../previewTypes';

export default function ThemeSection() {
  const { config, updateTheme } = usePreviewContext();
  const { theme } = config;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* 颜色配置 */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: 12 }}>配色方案</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ColorPicker
            label="主色"
            value={theme.primary_color}
            onChange={v => updateTheme({ primary_color: v })}
          />
          <ColorPicker
            label="辅色"
            value={theme.secondary_color}
            onChange={v => updateTheme({ secondary_color: v })}
          />
          <ColorPicker
            label="强调色"
            value={theme.accent_color}
            onChange={v => updateTheme({ accent_color: v })}
          />
        </Box>
      </Box>

      {/* 字体选择 */}
      <FormControl size="small" fullWidth>
        <InputLabel sx={{ fontSize: 12 }}>字体</InputLabel>
        <Select
          value={theme.font_family}
          label="字体"
          onChange={e => updateTheme({ font_family: e.target.value })}
          sx={{ fontSize: 13 }}
        >
          {FONT_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 圆角选择 */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12 }}>圆角风格</Typography>
        <ToggleButtonGroup
          value={theme.border_radius}
          exclusive
          onChange={(_, v) => v && updateTheme({ border_radius: v })}
          size="small"
          fullWidth
        >
          {([
            { value: 'none', label: '直角', radius: '0px' },
            { value: 'small', label: '小', radius: '4px' },
            { value: 'medium', label: '中', radius: '8px' },
            { value: 'large', label: '大', radius: '16px' },
          ] as const).map(item => (
            <ToggleButton
              key={item.value}
              value={item.value}
              sx={{
                flex: 1,
                py: 0.5,
                fontSize: 12,
                '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    border: '2px solid currentColor',
                    borderRadius: item.radius,
                  }}
                />
                {item.label}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}

// ========== 颜色选择器子组件 ==========

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  // 使用 ref 持有 input 引用，避免 document.getElementById 全局查找
  // 也防止多个 ColorPicker 共享相同 ID 导致的冲突
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: value,
          border: '2px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': { borderColor: 'primary.main' },
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label={`${label}颜色选择器`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', color: 'text.secondary' }}>
        {value}
      </Typography>
    </Box>
  );
}
