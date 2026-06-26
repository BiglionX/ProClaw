/**
 * 导入完成对话框：展示摘要 + 错误报告下载
 */

import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import type { FieldMapping, ImportError, ImportResult, ImportRow } from '../../lib/importers/types';

import { downloadErrorReport } from './DownloadErrorReport';

export interface ImportCompleteDialogProps {
  open: boolean;
  result: ImportResult | null;
  rows: ImportRow[];
  mapping: FieldMapping[];
  errors: ImportError[]; // 服务端或客户端返回的错误
  fileName: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function ImportCompleteDialog({
  open,
  result,
  rows,
  mapping,
  errors,
  fileName,
  onClose,
  onRetry,
}: ImportCompleteDialogProps) {
  if (!result) return null;

  const isSuccess = result.failed === 0;
  const errorCount = errors.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="import-complete-dialog">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isSuccess ? (
            <CheckCircleIcon color="success" />
          ) : (
            <CheckCircleIcon color={result.success > 0 ? 'warning' : 'error'} />
          )}
          <span>{isSuccess ? '导入完成' : '导入完成（含错误）'}</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={`总计 ${result.total}`} />
          <Chip color="success" label={`成功 ${result.success}`} />
          {result.failed > 0 && <Chip color="error" label={`失败 ${result.failed}`} />}
          {result.skipped > 0 && <Chip color="default" label={`跳过 ${result.skipped}`} />}
        </Stack>

        {errorCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            发现 <strong>{errorCount}</strong> 个校验错误。点击下方按钮下载错误报告，修正后可重新导入。
          </Alert>
        )}

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            错误明细（前 10 条）
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {errors.slice(0, 10).map((e, i) => (
              <Box
                key={i}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.85rem',
                }}
              >
                <Chip
                  label={e.level}
                  size="small"
                  color={e.level === 'L1' ? 'error' : e.level === 'L2' ? 'warning' : 'info'}
                  sx={{ mr: 1 }}
                />
                行 {e.rowIndex} · 字段 {e.field} · <code>{e.code}</code> · {e.message}
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary">
          批次 ID：<code>{result.batch_id}</code>
        </Typography>
      </DialogContent>
      <DialogActions>
        {errorCount > 0 && (
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => downloadErrorReport({ rows, mapping, errors, fileName })}
            data-testid="download-errors"
          >
            下载错误报告
          </Button>
        )}
        {onRetry && (
          <Button startIcon={<ReplayIcon />} onClick={onRetry}>
            重新导入
          </Button>
        )}
        <Button variant="contained" onClick={onClose} data-testid="complete-close">
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}