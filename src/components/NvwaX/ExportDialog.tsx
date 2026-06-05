/**
 * NvwaX 导出对话框
 *
 * 支持 Agent/AiTeam 导出（JSON/YAML/ProClaw 格式）。
 * 通过 NvwaXService 调用 Rust 后端 API。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Switch,
  Typography,
  Paper,
  Snackbar,
  Divider,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { NvwaXService } from '../../lib/nvwaxClient';
import type { ExportResult } from '../../types/nvwax';

/** 导出格式 */
type ExportFormat = 'json' | 'yaml' | 'proclaw';

/** 导出项类型 */
type ExportItemType = 'agent' | 'aiteam';

/** 导出对话框属性 */
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** 导出项列表 */
  items: { type: ExportItemType; id: string; name: string }[];
  /** 单个导出的 item（快捷模式） */
  singleItem?: { type: ExportItemType; id: string; name: string };
}

export default function ExportDialog({ open, onClose, items, singleItem }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('proclaw');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExportResult[]>([]);
  const [snackbar, setSnackbar] = useState('');

  // 确定要导出的项
  const exportItems = singleItem ? [singleItem] : items;

  /** 执行导出 */
  const handleExport = async () => {
    if (exportItems.length === 0) {
      setSnackbar('没有可导出的项目');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const exportResults: ExportResult[] = [];

      for (const item of exportItems) {
        try {
          if (item.type === 'agent') {
            const result = await NvwaXService.exportAgent(
              item.id,
              format,
              includeMetadata,
              includeImplementation,
            );
            exportResults.push(result);
          } else {
            const result = await NvwaXService.exportAiTeam(
              item.id,
              format,
              includeMetadata,
            );
            exportResults.push(result);
          }
        } catch (err: any) {
          exportResults.push({
            success: false,
            error: err.message || '导出失败',
            type: item.type,
          });
        }
      }

      setResults(exportResults);
      const successCount = exportResults.filter((r) => r.success).length;
      setSnackbar(`导出完成: ${successCount}/${exportResults.length} 个成功`);
    } catch (err: any) {
      setSnackbar('导出失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  /** 下载导出内容 */
  const handleDownload = (result: ExportResult, itemName: string) => {
    if (!result.content) return;

    const ext = format === 'json' ? 'json' : format === 'yaml' ? 'yaml' : 'json';
    const filename = `${itemName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${ext}`;
    const content = JSON.stringify(result.content, null, 2);

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileDownloadIcon sx={{ color: '#6366f1' }} />
            <span>导出到 NvwaX</span>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent>
          {/* 导出项列表 */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            待导出项目 ({exportItems.length})
          </Typography>
          <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {exportItems.map((item, i) => (
              <Chip
                key={i}
                label={`${item.type === 'agent' ? 'Agent' : 'AiTeam'}: ${item.name}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 导出格式选择 */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">导出格式</FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <FormControlLabel value="json" control={<Radio size="small" />} label="JSON" />
              <FormControlLabel value="yaml" control={<Radio size="small" />} label="YAML" />
              <FormControlLabel
                value="proclaw"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>ProClaw 格式</span>
                    <Chip label="推荐" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* 选项 */}
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
              }
              label="包含元数据"
            />
            {singleItem?.type === 'agent' && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={includeImplementation}
                    onChange={(e) => setIncludeImplementation(e.target.checked)}
                  />
                }
                label="包含实现代码"
              />
            )}
          </Box>

          <Box
            sx={{
              p: 1.5,
              bgcolor: alpha('#6366f1', 0.05),
              borderRadius: 1,
              border: '1px solid',
              borderColor: alpha('#6366f1', 0.15),
              display: 'flex',
              gap: 1,
              alignItems: 'flex-start',
              mb: 2,
            }}
          >
            <InfoIcon sx={{ color: '#6366f1', fontSize: 18, mt: 0.25 }} />
            <Typography variant="caption" color="text.secondary">
              导出为 ProClaw 格式时，将包含完整的 Agent/AiTeam 配置和 NvwaX 兼容元数据，
              可直接在 NvwaX 平台导入使用。
            </Typography>
          </Box>

          {/* 导出结果 */}
          {results.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>导出结果</Typography>
              {results.map((result, i) => (
                <Paper key={i} sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2">
                      {result.type === 'agent' ? 'Agent' : 'AiTeam'} #{i + 1}
                    </Typography>
                    <Typography variant="caption" color={result.success ? 'success.main' : 'error.main'}>
                      {result.success ? '导出成功' : `失败: ${result.error || '未知错误'}`}
                    </Typography>
                  </Box>
                  {result.success && result.content && (
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(result, exportItems[i]?.name || `item_${i}`)}
                    >
                      下载
                    </Button>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={loading || exportItems.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : <FileDownloadIcon />}
          >
            {loading ? '导出中...' : '开始导出'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        message={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
