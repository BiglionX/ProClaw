/**
 * Step 1: 选择文件（拖拽 / 点击）
 *
 * v1.3：支持图片 zip 包（与 xlsx/csv/json 并列）。
 * - 上传 .zip 时：调用 `import_extract_images` 拿到 manifest
 * - 同时仍要求用户再选 xlsx 表（zip 不能直接当数据源）
 */

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CollectionsIcon from '@mui/icons-material/Collections';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useCallback, useRef, useState } from 'react';

import { extractImages } from '../../lib/services/importService';
import type { ImageArchiveSummary, ParsedFile } from '../../lib/importers/types';
import { TemplateDownloadPanel } from './TemplateDownloadPanel';

export interface Step1Props {
  onParsed: (parsed: ParsedFile, file: File) => void;
  onImageArchive?: (summary: ImageArchiveSummary) => void;
  accept?: string; // 默认 .xlsx,.xls,.csv,.json,.zip
}

const DEFAULT_ACCEPT = '.xlsx,.xls,.csv,.json,.zip';
const TABLE_EXTS = ['xlsx', 'xls', 'csv', 'json'];

/** Step 1 内部状态：可能是数据表，也可能是图片 zip 包 */
export type Step1FileKind = 'table' | 'image-zip';

export function Step1FileSelect({
  onParsed,
  onImageArchive,
  accept = DEFAULT_ACCEPT,
}: Step1Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageArchive, setImageArchive] = useState<ImageArchiveSummary | null>(null);
  const [pendingTablePrompt, setPendingTablePrompt] = useState(false);

  const handleTableFile = useCallback(
    async (file: File, ext: string) => {
      setError(null);
      setParsing(true);
      try {
        const fileType = ext === 'xls' ? 'xlsx' : (ext as 'xlsx' | 'csv' | 'json');
        const fileHash = await computeHash(file);
        const opts = { fileName: file.name, fileHash };

        let parsed;
        if (fileType === 'xlsx') {
          const { parseXlsx } = await import('../../lib/importers/excelImporter');
          parsed = await parseXlsx(file, opts);
        } else if (fileType === 'csv') {
          const { parseCsv } = await import('../../lib/importers/csvImporter');
          parsed = await parseCsv(file, opts);
        } else {
          const { parseJson } = await import('../../lib/importers/jsonImporter');
          parsed = await parseJson(file, opts);
        }
        onParsed(parsed, file);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setParsing(false);
      }
    },
    [onParsed],
  );

  const handleZipFile = useCallback(
    async (file: File) => {
      setError(null);
      setParsing(true);
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const manifest = await extractImages(file.name, bytes);
        // 计算相对 AppData 路径
        const sep = manifest.archive_dir.includes('\\') ? '\\' : '/';
        const segments = manifest.archive_dir.split(/[\\/]+/).filter(Boolean);
        const idx = segments.lastIndexOf('import_images');
        const relativePath =
          idx >= 0 ? segments.slice(idx).join(sep) : manifest.archive_dir;
        const summary: ImageArchiveSummary = {
          archiveRelativePath: relativePath,
          entryCount: manifest.entries.length,
          totalSize: manifest.total_size,
        };
        setImageArchive(summary);
        onImageArchive?.(summary);
        // 提示用户再选 xlsx
        setPendingTablePrompt(true);
      } catch (e) {
        setError(`图片包解析失败：${(e as Error).message}`);
      } finally {
        setParsing(false);
      }
    },
    [onImageArchive],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase();
      const ext = name.split('.').pop() ?? '';
      if (ext === 'zip') {
        await handleZipFile(file);
        return;
      }
      if (!TABLE_EXTS.includes(ext)) {
        setError(`不支持的文件格式：.${ext}（仅支持 xlsx/xls/csv/json/zip）`);
        return;
      }
      await handleTableFile(file, ext);
    },
    [handleTableFile, handleZipFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <Box>
      <Box
        data-testid="import-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'grey.400',
          bgcolor: dragOver ? 'action.hover' : 'background.default',
          borderRadius: 2,
          p: 6,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {parsing ? '正在解析文件...' : '点击选择或拖拽文件到此处'}
        </Typography>
        <Typography variant="body2" color="text.secondary" data-testid="dropzone-hint">
          支持 Excel / CSV / JSON / 图片 zip 包（命名约定：SPU编码_x.png 或 SPU_SKU_x.png），单文件最大 10MB
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Button variant="contained" component="span" disabled={parsing}>
            <InsertDriveFileIcon sx={{ mr: 1 }} />
            选择文件
          </Button>
        </Stack>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          data-testid="import-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </Box>

      {imageArchive && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          icon={<CollectionsIcon />}
          data-testid="image-archive-summary"
          onClose={() => setImageArchive(null)}
        >
          已加载图片包：{imageArchive.entryCount} 张图（{(imageArchive.totalSize / 1024).toFixed(1)} KB）
          <Box sx={{ mt: 0.5 }}>
            <Chip
              size="small"
              label={imageArchive.archiveRelativePath}
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </Alert>
      )}

      {pendingTablePrompt && !imageArchive?.archiveRelativePath.includes('manifest') && (
        <Alert severity="info" sx={{ mt: 2 }} data-testid="need-table-prompt">
          请同时上传商品数据表（xlsx/csv/json）。后续可在 Step 3 字段映射中把 image_filename 列指向 zip 内的文件名。
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TemplateDownloadPanel />
    </Box>
  );
}

/** 简易 SHA-256 计算（Web Crypto） */
async function computeHash(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // 旧浏览器回退：使用 size + name 作为伪 hash
    return `${file.size}-${file.name}`;
  }
}