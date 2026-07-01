/**
 * ProClaw 批量导入中心 - 历史批次管理页（v1.2 P1）
 *
 * 入口：/import-center
 *  - 顶部 6 个「新建导入」快捷入口
 *  - 表格：历史批次列表（按 target_type 过滤 / 按状态过滤）
 *  - 行操作：查看详情 / 重试 / 取消 / 下载错误
 */

import {
  Add as AddIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Replay as ReplayIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cancelBatch,
  getBatchErrors,
  getTemplates,
  listBatches,
  retryBatch,
} from '../../lib/import/importService';
import type {
  ImportBatch,
  ImportBatchError,
  ImportTarget,
  TemplateInfo,
} from '../../types/import';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TARGET_LABELS,
} from '../../types/import';

const TARGETS: ImportTarget[] = [
  'products',
  'inventory',
  'purchases',
  'sales',
  'suppliers',
  'customers',
];

export default function ImportCenterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [targetFilter, setTargetFilter] = useState<ImportTarget | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorsOpen, setErrorsOpen] = useState<{ batchId: string; title: string } | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['import-batches', targetFilter, statusFilter],
    queryFn: () =>
      listBatches({
        target_type: targetFilter === 'all' ? undefined : targetFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      }),
    refetchInterval: 5000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['import-templates'],
    queryFn: getTemplates,
    staleTime: 60_000,
  });

  const handleRetry = async (id: string) => {
    try {
      await retryBatch(id);
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    } catch (e) {
      console.error('[ImportCenter] 重试失败', e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelBatch(id);
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    } catch (e) {
      console.error('[ImportCenter] 取消失败', e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon color="primary" /> 批量导入中心
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            6 类业务对象一键导入：商品 / 库存 / 采购 / 销售 / 供应商 / 客户
          </Typography>
        </Box>
      </Stack>

      {/* 顶部 6 个「新建导入」快捷入口 */}
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        新建导入
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {TARGETS.map((t) => (
          <Grid item xs={6} sm={4} md={2} key={t}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                onClick={() => navigate(`/import-center/new?target=${t}`)}
                data-testid={`quick-new-${t}`}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Stack alignItems="center" spacing={1}>
                    <AddIcon color="primary" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {TARGET_LABELS[t]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      批量导入
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 模板下载区 */}
      <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
        CSV 模板下载
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
        {templates.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            模板生成中…（首次启动会写入 APPDATA/proclaw/desktop/import_templates/）
          </Typography>
        )}
        {templates.map((tpl: TemplateInfo) => (
          <Chip
            key={tpl.filename}
            icon={<DownloadIcon />}
            label={tpl.display_name}
            onClick={() => downloadTemplate(tpl)}
            clickable
            variant="outlined"
            sx={{ mb: 1 }}
          />
        ))}
      </Stack>

      {/* 历史批次列表 */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          历史批次
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="目标"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as ImportTarget | 'all')}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">全部</MenuItem>
            {TARGETS.map((t) => (
              <MenuItem key={t} value={t}>
                {TARGET_LABELS[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="状态"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="success">成功</MenuItem>
            <MenuItem value="partial">部分成功</MenuItem>
            <MenuItem value="failed">失败</MenuItem>
            <MenuItem value="importing">导入中</MenuItem>
            <MenuItem value="validating">校验中</MenuItem>
            <MenuItem value="cancelled">已取消</MenuItem>
          </TextField>
          <IconButton
            onClick={() => qc.invalidateQueries({ queryKey: ['import-batches'] })}
            title="刷新"
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>目标</TableCell>
              <TableCell>文件</TableCell>
              <TableCell>行数</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>成功/失败</TableCell>
              <TableCell>开始时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无历史批次。点击上方 6 个快捷入口开始第一次导入。
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {batches.map((b: ImportBatch) => (
              <TableRow key={b.id} hover>
                <TableCell>{TARGET_LABELS[b.target_type]}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {b.source_filename}
                  </Typography>
                </TableCell>
                <TableCell>{b.row_count ?? 0}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[b.status] || b.status}
                    color={STATUS_COLORS[b.status] || 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    <span style={{ color: '#2e7d32' }}>{b.success_rows}</span>
                    {' / '}
                    <span style={{ color: '#d32f2f' }}>{b.failed_rows}</span>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {b.started_at || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="查看详情">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/import-center/${b.id}`)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {b.failed_rows > 0 && (
                      <Tooltip title="查看错误">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setErrorsOpen({
                              batchId: b.id,
                              title: `${b.source_filename} - 错误清单`,
                            })
                          }
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {b.status === 'partial' || b.status === 'failed' ? (
                      <Tooltip title="重试">
                        <IconButton size="small" onClick={() => handleRetry(b.id)}>
                          <ReplayIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {b.status === 'importing' || b.status === 'validating' ? (
                      <Tooltip title="取消">
                        <IconButton size="small" onClick={() => handleCancel(b.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 错误详情 Dialog */}
      {errorsOpen && (
        <BatchErrorsDialog
          batchId={errorsOpen.batchId}
          title={errorsOpen.title}
          open
          onClose={() => setErrorsOpen(null)}
        />
      )}
    </Box>
  );
}

function BatchErrorsDialog({
  batchId,
  title,
  open,
  onClose,
}: {
  batchId: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['import-errors', batchId],
    queryFn: () => getBatchErrors(batchId, 500, 0),
    enabled: open,
  });

  const downloadErrors = () => {
    const csv = [
      ['行号', '字段', '错误码', '错误信息', '原始值'].join(','),
      ...errors.map((e: ImportBatchError) =>
        [
          e.row_index,
          e.field_name || '',
          e.error_code,
          `"${(e.error_message || '').replace(/"/g, '""')}"`,
          `"${(e.raw_value || '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${batchId.slice(0, 8)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {title}
        <Typography variant="body2" color="text.secondary">
          共 {errors.length} 条错误（最多展示 500 条）
        </Typography>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : errors.length === 0 ? (
          <Alert severity="success">没有错误</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>行</TableCell>
                  <TableCell>字段</TableCell>
                  <TableCell>错误码</TableCell>
                  <TableCell>信息</TableCell>
                  <TableCell>原始值</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((e: ImportBatchError) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.row_index}</TableCell>
                    <TableCell>{e.field_name || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={e.error_code} variant="outlined" />
                    </TableCell>
                    <TableCell>{e.error_message}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        {e.raw_value || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={downloadErrors} startIcon={<DownloadIcon />}>
          下载 CSV
        </Button>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

function downloadTemplate(tpl: TemplateInfo) {
  // 通过 tauri 的 path 读取模板内容 → 此处用 fetch 模拟；
  // 实际后端返回 filename + path，由前端通过 fs 读取；为简化，提示用户从导入向导下载。
  // 这里直接弹一个下载链接到 path（用户机器上的文件）
  const a = document.createElement('a');
  a.href = tpl.path;
  a.download = tpl.filename;
  a.click();
}
