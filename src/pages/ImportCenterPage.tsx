/**
 * v1.3：Import Center 列表页
 *
 * 功能：
 * - MUI Table 列出所有历史批次（含 paused / retrying 新状态）
 * - 顶部过滤：状态多选 + 目标类型多选 + 日期范围
 * - 右侧 Drawer 详情（点击行触发）+ 操作按钮组（暂停/继续/取消/重试/回滚）
 * - 分页：limit=20 + 客户端翻页
 *
 * 配套：src/pages/ImportBatchDetailPage.tsx（嵌套路由详情）
 *
 * 实现说明：避免引入 @mui/x-data-grid 以保持零新增依赖；用 Table + IconButton 翻页。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listBatches,
  pauseBatch,
  resumeBatch,
  cancelBatch,
  retryBatch,
  rollbackBatch,
  type ImportBatchInfo,
} from '../lib/services/importService';
import type { BatchStatus, ImportError, ImportTarget } from '../lib/importers/types';

const STATUS_OPTIONS: { value: BatchStatus; label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }[] = [
  { value: 'pending', label: '待执行', color: 'default' },
  { value: 'parsing', label: '解析中', color: 'info' },
  { value: 'mapping', label: '映射中', color: 'info' },
  { value: 'validating', label: '校验中', color: 'info' },
  { value: 'importing', label: '导入中', color: 'primary' },
  { value: 'paused', label: '已暂停', color: 'warning' },
  { value: 'retrying', label: '重试中', color: 'info' },
  { value: 'success', label: '成功', color: 'success' },
  { value: 'partial', label: '部分成功', color: 'warning' },
  { value: 'failed', label: '失败', color: 'error' },
  { value: 'cancelled', label: '已取消', color: 'default' },
];

const TARGET_OPTIONS: { value: ImportTarget; label: string }[] = [
  { value: 'products', label: '商品' },
  { value: 'inventory', label: '库存' },
  { value: 'purchases', label: '采购' },
  { value: 'sales', label: '销售' },
  { value: 'suppliers', label: '供应商' },
  { value: 'customers', label: '客户' },
];

const PAGE_SIZE = 20;

function statusMeta(s: BatchStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { value: s, label: s, color: 'default' as const };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  } catch {
    return iso;
  }
}

/** v1.3 B4：解析 error_report_json（兼容旧版本：可能是 JSON 数组或字符串） */
function parseErrorReport(json: string | null): ImportError[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as ImportError[];
    return [];
  } catch {
    return [];
  }
}

/** v1.3 B4：将 ImportError[] 转换为 CSV（含 BOM 让 Excel 正确识别 UTF-8） */
function errorsToCsv(errors: ImportError[], batchId: string): string {
  const header = ['batch_id', 'row_index', 'field', 'level', 'code', 'message', 'value'];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = errors.map((e) =>
    [batchId, e.rowIndex, e.field, e.level, e.code, e.message, e.value ?? ''].map(escape).join(','),
  );
  return '\uFEFF' + header.join(',') + '\n' + rows.join('\n');
}

/** v1.3 B4：触发浏览器下载 CSV */
function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ImportCenterPage() {
  const navigate = useNavigate();
  const { batchId: routeBatchId } = useParams<{ batchId?: string }>();
  const [batches, setBatches] = useState<ImportBatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 过滤
  const [statusFilter, setStatusFilter] = useState<BatchStatus[]>([]);
  const [targetFilter, setTargetFilter] = useState<ImportTarget[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [quickSearch, setQuickSearch] = useState<string>('');

  // 分页
  const [page, setPage] = useState(0);

  // Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listBatches(100, 0); // 拉一批足够多的，客户端过滤
      setBatches(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // v1.3 B4：路由参数 /import-center/:batchId → 自动选中 + 展开 Drawer
  useEffect(() => {
    if (routeBatchId) {
      setSelectedId(routeBatchId);
    }
  }, [routeBatchId]);

  const isDetailMode = Boolean(routeBatchId);

  const filtered = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    return batches.filter((b) => {
      if (statusFilter.length && !statusFilter.includes(b.status)) return false;
      if (targetFilter.length && !targetFilter.includes(b.target_type as ImportTarget)) return false;
      if (dateFrom) {
        const fromTs = new Date(dateFrom).getTime();
        if (Number.isFinite(fromTs) && new Date(b.created_at).getTime() < fromTs) return false;
      }
      if (dateTo) {
        const toTs = new Date(dateTo).getTime();
        if (Number.isFinite(toTs) && new Date(b.created_at).getTime() > toTs + 86400000) return false;
      }
      if (q && !b.file_name.toLowerCase().includes(q) && !b.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [batches, statusFilter, targetFilter, dateFrom, dateTo, quickSearch]);

  // 翻页数据
  const pagedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    // 数据变化后回到第一页
    setPage(0);
  }, [statusFilter, targetFilter, dateFrom, dateTo, quickSearch]);

  const selected = useMemo(
    () => (selectedId ? batches.find((b) => b.id === selectedId) ?? null : null),
    [batches, selectedId],
  );

  const runAction = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string) => {
      setActionBusy(true);
      setActionMsg(null);
      try {
        const result = await fn();
        // 若 fn 返回字符串则优先采用为成功消息
        const msg = typeof result === 'string' && result.trim() ? result : successMsg;
        setActionMsg(msg);
        await refresh();
      } catch (e) {
        setActionMsg(`操作失败：${String(e)}`);
      } finally {
        setActionBusy(false);
      }
    },
    [refresh],
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Import Center · 导入任务中心
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            查看 / 暂停 / 继续 / 取消 / 重试历史导入批次
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>
            刷新
          </Button>
          <Button variant="contained" onClick={() => navigate('/products?import=1')}>
            新建导入
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 过滤面板 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Select
            multiple
            displayEmpty
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                typeof e.target.value === 'string'
                  ? (e.target.value.split(',') as BatchStatus[])
                  : (e.target.value as BatchStatus[]),
              )
            }
            renderValue={(selected) =>
              selected.length === 0 ? '所有状态' : selected.map((s) => statusMeta(s).label).join('、')
            }
            sx={{ minWidth: 220 }}
            size="small"
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            multiple
            displayEmpty
            value={targetFilter}
            onChange={(e) =>
              setTargetFilter(
                typeof e.target.value === 'string'
                  ? (e.target.value.split(',') as ImportTarget[])
                  : (e.target.value as ImportTarget[]),
              )
            }
            renderValue={(selected) =>
              selected.length === 0
                ? '所有类型'
                : selected.map((s) => TARGET_OPTIONS.find((t) => t.value === s)?.label ?? s).join('、')
            }
            sx={{ minWidth: 220 }}
            size="small"
          >
            {TARGET_OPTIONS.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
          <TextField
            type="date"
            label="起始"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label="截止"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="搜索文件名/ID"
            size="small"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Button
            onClick={() => {
              setStatusFilter([]);
              setTargetFilter([]);
              setDateFrom('');
              setDateTo('');
              setQuickSearch('');
            }}
          >
            清空
          </Button>
        </Stack>
      </Paper>

      {/* 表格 */}
      <Paper>
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>状态</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>文件</TableCell>
                <TableCell align="right">总行</TableCell>
                <TableCell align="right">成功</TableCell>
                <TableCell align="right">失败</TableCell>
                <TableCell align="right">跳过</TableCell>
                <TableCell align="right">已处理</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((row) => {
                const meta = statusMeta(row.status);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <TableCell>
                      <Chip size="small" label={meta.label} color={meta.color} />
                    </TableCell>
                    <TableCell>{row.target_type}</TableCell>
                    <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={row.file_name}>
                        <span>{row.file_name}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{row.total_rows}</TableCell>
                    <TableCell align="right">{row.success_rows}</TableCell>
                    <TableCell align="right">{row.failed_rows}</TableCell>
                    <TableCell align="right">{row.skipped_rows}</TableCell>
                    <TableCell align="right">{row.processed_rows}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="查看详情"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(row.id);
                        }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    没有匹配的批次
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    加载中…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
        />
      </Paper>

      {/* 详情 Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => {
          setSelectedId(null);
          if (isDetailMode) navigate('/import-center');
        }}
        PaperProps={{
          sx: { width: { xs: '100%', md: isDetailMode ? 900 : 480 } },
        }}
      >
        <Box sx={{ width: '100%', p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {isDetailMode ? '批次详情（独立页面）' : '批次详情'}
            </Typography>
            <Stack direction="row" spacing={1}>
              {isDetailMode && (
                <Button size="small" onClick={() => navigate('/import-center')}>
                  返回列表
                </Button>
              )}
              <IconButton
                onClick={() => {
                  setSelectedId(null);
                  if (isDetailMode) navigate('/import-center');
                }}
                aria-label="关闭"
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>

          {selected ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={statusMeta(selected.status).label} color={statusMeta(selected.status).color} />
                <Typography variant="body2" color="text.secondary">
                  {selected.id.slice(0, 8)}
                </Typography>
              </Stack>

              <Field label="文件名" value={selected.file_name} />
              <Field label="目标类型" value={selected.target_type} />
              <Field label="冲突策略" value={selected.conflict_strategy} />
              <Field
                label="总行 / 成功 / 失败 / 跳过"
                value={`${selected.total_rows} / ${selected.success_rows} / ${selected.failed_rows} / ${selected.skipped_rows}`}
              />
              <Field label="已处理行数" value={String(selected.processed_rows)} />
              <Field label="创建时间" value={formatDate(selected.created_at)} />
              <Field label="开始时间" value={formatDate(selected.started_at)} />
              <Field label="结束时间" value={formatDate(selected.finished_at)} />
              <Field label="最后心跳" value={formatDate(selected.last_heartbeat_at)} />
              {selected.paused_reason && <Field label="暂停原因" value={selected.paused_reason} />}

              {actionMsg && (
                <Alert
                  severity={actionMsg.startsWith('操作失败') || actionMsg.startsWith('重试失败') ? 'error' : 'success'}
                  onClose={() => setActionMsg(null)}
                >
                  {actionMsg}
                </Alert>
              )}

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                操作
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Tooltip title="仅 importing/pending/retrying 可暂停">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<PauseIcon />}
                      disabled={actionBusy || !['importing', 'pending', 'retrying'].includes(selected.status)}
                      onClick={() =>
                        runAction(() => pauseBatch(selected.id, '用户在 Drawer 中暂停'), '已暂停')
                      }
                    >
                      暂停
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="仅 paused 可继续">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<PlayArrowIcon />}
                      disabled={actionBusy || selected.status !== 'paused'}
                      onClick={() => runAction(() => resumeBatch(selected.id), '已恢复为 pending')}
                    >
                      继续
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="终态不可取消">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<StopIcon />}
                      disabled={
                        actionBusy || ['success', 'failed', 'cancelled', 'partial'].includes(selected.status)
                      }
                      onClick={() => runAction(() => cancelBatch(selected.id), '已取消')}
                    >
                      取消
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="仅 failed/partial/cancelled 可重试">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      disabled={actionBusy || !['failed', 'partial', 'cancelled'].includes(selected.status)}
                      onClick={async () => {
                        setActionBusy(true);
                        setActionMsg(null);
                        try {
                          const newId = await retryBatch(selected.id, null);
                          setActionMsg(`已创建重试批次：${newId.slice(0, 8)}`);
                          await refresh();
                          setSelectedId(newId);
                        } catch (e) {
                          setActionMsg(`重试失败：${String(e)}`);
                        } finally {
                          setActionBusy(false);
                        }
                      }}
                    >
                      重试
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="回滚本批次写入（已写入的 SPU/SKU 将被标记 deleted）">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<UndoIcon />}
                      disabled={actionBusy || (selected.success_rows ?? 0) === 0}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `确认回滚批次 ${selected.id.slice(0, 8)}？该批次已写入的数据将被软删除。`,
                          )
                        )
                          return;
                        await runAction(
                          () => rollbackBatch(selected.id).then((n) => `已回滚 ${n} 行`),
                          '回滚完成',
                        );
                      }}
                    >
                      回滚
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              {/* v1.3 B4：详情模式下额外展示 映射快照 + 错误表格 + 错误报告下载 */}
              {isDetailMode && (
                <DetailExtras
                  mappingJson={selected.mapping_json}
                  errorReportJson={selected.error_report_json}
                  batchId={selected.id}
                />
              )}

              <Button
                size="small"
                onClick={() => navigate(`/import-center/${selected.id}`)}
                sx={{ alignSelf: 'flex-start' }}
              >
                打开完整详情页 →
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              请选择一行批次查看详情
            </Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  );
}

/** v1.3 B4：详情模式专属附加组件（映射快照 + 错误表格 + 下载） */
function DetailExtras({
  mappingJson,
  errorReportJson,
  batchId,
}: {
  mappingJson: string | null;
  errorReportJson: string | null;
  batchId: string;
}) {
  const [mappingOpen, setMappingOpen] = useState(true);
  const [errorsOpen, setErrorsOpen] = useState(true);
  const [errPage, setErrPage] = useState(0);
  const ERR_PAGE_SIZE = 50;

  const errors = useMemo(() => parseErrorReport(errorReportJson), [errorReportJson]);
  const mappingObj = useMemo<{ sourceColumn: string; targetField: string }[] | null>(() => {
    if (!mappingJson) return null;
    try {
      const parsed = JSON.parse(mappingJson);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [mappingJson]);

  const pagedErrors = useMemo(
    () => errors.slice(errPage * ERR_PAGE_SIZE, (errPage + 1) * ERR_PAGE_SIZE),
    [errors, errPage],
  );

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Divider />

      {/* 映射快照 */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          onClick={() => setMappingOpen((v) => !v)}
          sx={{ cursor: 'pointer' }}
        >
          <Typography variant="subtitle2">映射快照（{mappingObj?.length ?? 0} 条）</Typography>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transform: mappingOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }}
          />
        </Stack>
        <Collapse in={mappingOpen}>
          {!mappingObj ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              无映射快照
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 240 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>源列</TableCell>
                    <TableCell>目标字段</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappingObj.map((m, idx) => (
                    <TableRow key={`${m.sourceColumn}-${idx}`}>
                      <TableCell>{m.sourceColumn}</TableCell>
                      <TableCell>{m.targetField}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Collapse>
      </Box>

      {/* 行级错误表格 */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          onClick={() => setErrorsOpen((v) => !v)}
          sx={{ cursor: 'pointer' }}
        >
          <Typography variant="subtitle2">
            行级错误（{errors.length} 条
            {errors.length > ERR_PAGE_SIZE && ` · 第 ${errPage + 1} 页`}）
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {errors.length > 0 && (
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCsv(`import-errors-${batchId.slice(0, 8)}.csv`, errorsToCsv(errors, batchId));
                }}
              >
                下载 CSV
              </Button>
            )}
            <ExpandMoreIcon
              fontSize="small"
              sx={{ transform: errorsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }}
            />
          </Stack>
        </Stack>
        <Collapse in={errorsOpen}>
          {errors.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              本批次无错误记录
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>行</TableCell>
                      <TableCell>字段</TableCell>
                      <TableCell>级别</TableCell>
                      <TableCell>错误码</TableCell>
                      <TableCell>消息</TableCell>
                      <TableCell>原值</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedErrors.map((e, idx) => (
                      <TableRow key={`${e.rowIndex}-${e.code}-${idx}`}>
                        <TableCell>{e.rowIndex}</TableCell>
                        <TableCell>{e.field}</TableCell>
                        <TableCell>{e.level}</TableCell>
                        <TableCell>{e.code}</TableCell>
                        <TableCell sx={{ maxWidth: 280, wordBreak: 'break-word' }}>
                          {e.message}
                        </TableCell>
                        <TableCell>{e.value ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {errors.length > ERR_PAGE_SIZE && (
                <TablePagination
                  component="div"
                  count={errors.length}
                  page={errPage}
                  onPageChange={(_, p) => setErrPage(p)}
                  rowsPerPage={ERR_PAGE_SIZE}
                  rowsPerPageOptions={[ERR_PAGE_SIZE]}
                />
              )}
            </>
          )}
        </Collapse>
      </Box>
    </Stack>
  );
}
