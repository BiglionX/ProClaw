/**
 * v1.3 C3：模板下载面板
 *
 * - 调用 `import_list_templates` 列出 5 套 xlsx 模板
 * - 每行提供一个"下载"按钮：点击触发 `tauri-plugin-dialog` 保存对话框，写入用户选定位置
 * - 底部"下载完整示例数据集"按钮：触发 examples.zip 下载
 * - 通过 Tauri 自身文件保存（不依赖浏览器 BlobURL，desktop-first）
 */
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import ArchiveIcon from '@mui/icons-material/Archive';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useCallback, useEffect, useState } from 'react';

import { getExamplesZip, getTemplateBytes, listTemplates } from '../../lib/services/importService';
import type { ImportTemplateInfo } from '../../lib/services/importService';

const TARGET_TYPE_LABEL: Record<string, string> = {
  products: '商品库',
  inventory: '库存交易',
  purchases: '采购订单',
  sales: '销售订单',
  'suppliers-customers': '供应商与客户',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function TemplateDownloadPanel() {
  const [templates, setTemplates] = useState<ImportTemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 初始拉取模板列表
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listTemplates();
        if (!cancelled) setTemplates(list);
      } catch (e) {
        if (!cancelled) setError(`无法读取模板列表：${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadTemplate = useCallback(async (t: ImportTemplateInfo) => {
    setError(null);
    setInfo(null);
    setDownloading(t.name);
    try {
      // 1) 用户选择保存位置
      const dest = await save({
        defaultPath: t.file_name,
        filters: [{ name: 'Excel 模板', extensions: ['xlsx'] }],
      });
      if (!dest) {
        setDownloading(null);
        return; // 用户取消
      }
      // 2) 后端读取模板字节
      const { bytes } = await getTemplateBytes(t.name);
      // 3) 写入磁盘
      await writeFile(dest, new Uint8Array(bytes));
      setInfo(`已保存：${dest}`);
    } catch (e) {
      setError(`下载 ${t.name} 失败：${(e as Error).message}`);
    } finally {
      setDownloading(null);
    }
  }, []);

  const downloadExamples = useCallback(async () => {
    setError(null);
    setInfo(null);
    setDownloading('examples');
    try {
      const dest = await save({
        defaultPath: 'proclaw-import-examples.zip',
        filters: [{ name: 'Zip 压缩包', extensions: ['zip'] }],
      });
      if (!dest) {
        setDownloading(null);
        return;
      }
      const { bytes } = await getExamplesZip();
      await writeFile(dest, new Uint8Array(bytes));
      setInfo(`已保存：${dest}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('examples.zip 不存在')) {
        setError(
          'examples.zip 尚未生成。请先执行 `npm run build:templates`，或确认 C2 模板脚本运行成功。',
        );
      } else {
        setError(`下载 examples.zip 失败：${msg}`);
      }
    } finally {
      setDownloading(null);
    }
  }, []);

  return (
    <Accordion
      data-testid="template-download-panel"
      sx={{ mt: 2 }}
      defaultExpanded
      TransitionProps={{ unmountOnExit: true }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="subtitle1">下载模板与示例数据</Typography>
          {!loading && templates.length > 0 && (
            <Chip
              size="small"
              label={`${templates.length} 套`}
              variant="outlined"
              data-testid="template-count-chip"
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              正在加载模板列表...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {info && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setInfo(null)}
            data-testid="template-download-success"
          >
            {info}
          </Alert>
        )}

        {!loading && templates.length === 0 && !error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            当前没有可用模板。常见原因：
            <Box component="ul" sx={{ pl: 3, mt: 0.5, mb: 0 }}>
              <li>首次启动拷贝失败（请检查 AppData/import_templates 目录权限）</li>
              <li>资源目录未打包（开发模式请确认 public/templates/ 下 5 套 xlsx 存在）</li>
              <li>可通过 `npm run build:templates` 重新生成模板</li>
            </Box>
          </Alert>
        )}

        <Stack spacing={1.5}>
          {templates.map((t) => {
            const label = TARGET_TYPE_LABEL[t.target_type] ?? t.target_type;
            const isBusy = downloading === t.name;
            return (
              <Stack
                key={t.name}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
                data-testid={`template-row-${t.name}`}
              >
                <DescriptionIcon color="action" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    {label}
                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({t.file_name})
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatSize(t.size_bytes)} · SHA-256 {t.sha256.slice(0, 8)}…
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    isBusy ? <CircularProgress size={16} /> : <DownloadIcon />
                  }
                  disabled={downloading !== null}
                  onClick={() => void downloadTemplate(t)}
                  data-testid={`template-download-${t.name}`}
                >
                  下载
                </Button>
              </Stack>
            );
          })}
        </Stack>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={downloading === 'examples' ? <CircularProgress size={16} /> : <ArchiveIcon />}
            disabled={downloading !== null}
            onClick={() => void downloadExamples()}
            data-testid="download-examples-button"
          >
            下载完整示例数据集（5 模板 + 10 张占位图）
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
