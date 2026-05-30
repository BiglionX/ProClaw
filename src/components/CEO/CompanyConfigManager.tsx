/**
 * 公司配置包导出/导入管理 (PRD v6.3 第 4.1 节)
 * 允许 Boss 导出/导入公司发展配置包，形成独特的"公司灵魂"
 */

import { useState, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Divider, Checkbox, FormControlLabel,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import {
  FileDownload as ExportIcon, FileUpload as ImportIcon,
  Lock as AnonymizeIcon, Visibility as PreviewIcon,
} from '@mui/icons-material';
import { proclawCompany, CompanyConfigPackage } from '../../lib/ceoController';

export default function CompanyConfigManager() {
  const [loading, setLoading] = useState(false);
  const [anonymized, setAnonymized] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewData, setPreviewData] = useState<CompanyConfigPackage | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const config = await proclawCompany.exportConfig(anonymized);

      // 创建并下载 JSON 文件
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proclaw-company-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `配置包已导出 (${anonymized ? '已脱敏' : '含原始数据'})` });
    } catch (e) {
      setMessage({ type: 'error', text: `导出失败: ${e instanceof Error ? e.message : '未知错误'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config: CompanyConfigPackage = JSON.parse(text);

      if (!config.version || !config.pcp_entries) {
        setMessage({ type: 'error', text: '无效的配置包文件格式' });
        return;
      }

      setPreviewData(config);
      setImportDialogOpen(true);
    } catch (err) {
      setMessage({ type: 'error', text: '文件解析失败，请选择有效的 JSON 配置包' });
    }

    // 重置 input 以便重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setLoading(true);
    setMessage(null);
    try {
      const result = await proclawCompany.importConfig(previewData);
      setMessage({ type: 'success', text: result });
      setImportDialogOpen(false);
      setPreviewData(null);
    } catch (e) {
      setMessage({ type: 'error', text: `导入失败: ${e instanceof Error ? e.message : '未知错误'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        公司发展配置包
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        导出包含 PCP 条目、决策日志摘要、CEO Agent 偏好模型和 Agent 列表的完整配置包。
        导入后可获得类似的 CEO Agent 决策风格和项目上下文。
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 1.5 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* 导出区域 */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={anonymized}
              onChange={(e) => setAnonymized(e.target.checked)}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AnonymizeIcon sx={{ fontSize: 14, color: '#757575' }} />
              <Typography variant="caption">导出时脱敏（替换真实名称为占位符）</Typography>
            </Box>
          }
        />
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
          onClick={handleExport}
          disabled={loading}
          size="small"
          sx={{ mt: 1 }}
        >
          {loading ? '导出中...' : '导出公司发展配置包'}
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 导入区域 */}
      <Box>
        <Button
          variant="outlined"
          startIcon={<ImportIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          size="small"
        >
          导入配置包
        </Button>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          选择之前导出的 .json 配置包文件进行导入
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </Box>

      {/* 导入预览对话框 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon sx={{ fontSize: 18 }} />
            预览配置包内容
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                版本: {previewData.version} | 导出时间: {new Date(previewData.exported_at * 1000).toLocaleString('zh-CN')}
                {previewData.anonymized && ' | 已脱敏'}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', px: 1, py: 0.3, borderRadius: 1 }}>
                  PCP 条目: {previewData.pcp_entries.length}
                </Typography>
                <Typography variant="caption" sx={{ bgcolor: '#fff3e0', px: 1, py: 0.3, borderRadius: 1 }}>
                  决策记录: {previewData.decision_log_summary.length}
                </Typography>
                <Typography variant="caption" sx={{ bgcolor: '#e8f5e9', px: 1, py: 0.3, borderRadius: 1 }}>
                  偏好设置: {previewData.preferences.length}
                </Typography>
              </Box>

              {previewData.pcp_entries.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.3 }}>
                    PCP 条目预览:
                  </Typography>
                  {previewData.pcp_entries.slice(0, 5).map((entry: Record<string, unknown>, i) => (
                    <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.6rem', color: 'text.secondary' }}>
                      [{String(entry.context_type || '')}] {String(entry.title || '')}
                    </Typography>
                  ))}
                  {previewData.pcp_entries.length > 5 && (
                    <Typography variant="caption" color="text.disabled">...还有 {previewData.pcp_entries.length - 5} 条</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} size="small">取消</Button>
          <Button onClick={handleImport} variant="contained" color="primary" size="small" disabled={loading}>
            {loading ? '导入中...' : '确认导入'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
