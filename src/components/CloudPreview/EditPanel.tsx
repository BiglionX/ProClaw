/**
 * 编辑控制面板
 * 组合各编辑区域，提供保存/重置/AI生成操作按钮
 */

import {
  Box,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Palette as PaletteIcon,
  ViewModule as LayoutIcon,
  Inventory as ProductIcon,
  Save as SaveIcon,
  Refresh as ResetIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { usePreviewContext } from './PreviewContext';
import DomainSection from './EditSections/DomainSection';
import ThemeSection from './EditSections/ThemeSection';
import LayoutSection from './EditSections/LayoutSection';
import ProductSection from './EditSections/ProductSection';

interface EditPanelProps {
  onSave: () => Promise<void>;
  onAIGenerate?: () => Promise<void>;
  onDomainChange?: (domain: string) => void;
}

export default function EditPanel({ onSave, onAIGenerate, onDomainChange }: EditPanelProps) {
  const { isDirty, saving, reset } = usePreviewContext();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* 域名区域（固定顶部） */}
      <DomainSection onDomainChange={onDomainChange} />

      {/* 可滚动编辑区域 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 },
        }}
      >
        {/* 主题样式 */}
        <Accordion defaultExpanded disableGutters square elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary
            expandIcon={<ExpandIcon />}
            sx={{ minHeight: 40, px: 2, '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PaletteIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontSize: 13 }}>主题样式</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
            <ThemeSection />
          </AccordionDetails>
        </Accordion>

        {/* 页面布局 */}
        <Accordion disableGutters square elevation={0} sx={{ '&:before': { display: 'none' }, borderTop: '1px solid', borderColor: 'divider' }}>
          <AccordionSummary
            expandIcon={<ExpandIcon />}
            sx={{ minHeight: 40, px: 2, '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LayoutIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontSize: 13 }}>页面布局</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
            <LayoutSection />
          </AccordionDetails>
        </Accordion>

        {/* 商品展示 */}
        <Accordion disableGutters square elevation={0} sx={{ '&:before': { display: 'none' }, borderTop: '1px solid', borderColor: 'divider' }}>
          <AccordionSummary
            expandIcon={<ExpandIcon />}
            sx={{ minHeight: 40, px: 2, '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ProductIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontSize: 13 }}>商品展示</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
            <ProductSection />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* 操作按钮（固定底部） */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          bgcolor: 'grey.50',
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<ResetIcon sx={{ fontSize: 14 }} />}
          onClick={reset}
          disabled={!isDirty || saving}
          sx={{ fontSize: 12, flex: 1 }}
        >
          重置
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 14 }} />}
          onClick={onSave}
          disabled={!isDirty || saving}
          sx={{ fontSize: 12, flex: 1 }}
        >
          {saving ? '保存中...' : '保存配置'}
        </Button>
        {onAIGenerate && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AIIcon sx={{ fontSize: 14 }} />}
            onClick={onAIGenerate}
            disabled={saving || isDirty}
            title={isDirty ? '请先保存或重置当前修改' : 'AI 生成主题'}
            sx={{
              fontSize: 12,
              color: '#ff3b30',
              borderColor: '#ff3b30',
              '&:hover': { borderColor: '#e0352b', bgcolor: 'rgba(255,59,48,0.04)' },
              '&.Mui-disabled': { color: 'grey.400', borderColor: 'grey.300' },
            }}
          >
            AI
          </Button>
        )}
      </Box>
    </Box>
  );
}
