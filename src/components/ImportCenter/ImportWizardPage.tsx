/**
 * ProClaw 批量导入中心 - 7 步向导（v1.2 P1）
 *
 * /import-center/new         → 新建
 * /import-center/:batchId    → 查看/继续已有批次
 *
 * 7 步：
 *  1. 选目标 + 上传文件
 *  2. 解析预览（表头 + 前 3 行）
 *  3. 字段映射（自动按中英别名匹配，可手动调整）
 *  4. 校验（必填/类型/日期/枚举）
 *  5. 执行（事务化入库）
 *  6. 结果报告
 *  7. 完成（继续导入 / 返回中心）
 */

import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckIcon,
  CloudUpload as UploadIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  autoMapColumns,
  mappingToColumnMap,
  REQUIRED_FIELDS_BY_TARGET,
  TARGET_FIELDS,
} from '../../lib/import/fieldMatcher';
import {
  createBatch,
  executeBatch,
  getBatch,
  validateBatch,
} from '../../lib/import/importService';
import type {
  ExecuteResponse,
  FieldMappingRow,
  ImportCreateResponse,
  ImportTarget,
  ValidateResponse,
} from '../../types/import';
import { STATUS_LABELS, TARGET_LABELS } from '../../types/import';

const STEPS = [
  '选目标与文件',
  '解析预览',
  '字段映射',
  '数据校验',
  '执行导入',
  '结果报告',
  '完成',
];

const TARGETS: ImportTarget[] = [
  'products',
  'inventory',
  'purchases',
  'sales',
  'suppliers',
  'customers',
];

export default function ImportWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { batchId: routeBatchId } = useParams<{ batchId?: string }>();
  const [searchParams] = useSearchParams();
  const queryTarget = (searchParams.get('target') as ImportTarget) || 'products';

  const [activeStep, setActiveStep] = useState(0);
  const [target, setTarget] = useState<ImportTarget>(queryTarget);
  const [file, setFile] = useState<File | null>(null);
  const [createResp, setCreateResp] = useState<ImportCreateResponse | null>(null);
  const [mapping, setMapping] = useState<FieldMappingRow[]>([]);
  const [defaultValues] = useState<Record<string, string>>({});
  const [validateResp, setValidateResp] = useState<ValidateResponse | null>(null);
  const [executeResp, setExecuteResp] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 已有 batchId → 重新加载
  const { data: existingBatch, isLoading: loadingBatch } = useQuery({
    queryKey: ['import-batch', routeBatchId],
    queryFn: () => (routeBatchId ? getBatch(routeBatchId) : Promise.resolve(null)),
    enabled: !!routeBatchId,
  });

  useEffect(() => {
    if (existingBatch) {
      setTarget(existingBatch.target_type);
      setCreateResp({
        batch_id: existingBatch.id,
        target_type: existingBatch.target_type,
        target_label: TARGET_LABELS[existingBatch.target_type],
        total_rows: existingBatch.row_count ?? 0,
        headers: [],
        sample_rows: [],
      });
      // 已存在的批次从 step 3 开始（已映射）
      setActiveStep(existingBatch.status === 'success' || existingBatch.status === 'partial' ? 5 : 2);
    }
  }, [existingBatch]);

  // ============================================
  // Step 1: 选目标 + 选文件
  // ============================================
  const handleSelectFile = (f: File) => {
    setFile(f);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const resp = await createBatch(target, file);
      setCreateResp(resp);
      setActiveStep(1);
      // 自动做字段映射
      setMapping(autoMapColumns(resp.headers, target));
    } catch (e: unknown) {
      setError((e as Error).message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // Step 3 → 4: 字段映射 → 校验
  // ============================================
  const handleValidate = async () => {
    if (!createResp) return;
    setError(null);
    try {
      const v = await validateBatch({
        batch_id: createResp.batch_id,
        column_mapping: mappingToColumnMap(mapping),
        default_values: defaultValues,
      });
      setValidateResp(v);
      setActiveStep(3);
    } catch (e: unknown) {
      setError((e as Error).message || '校验失败');
    }
  };

  // ============================================
  // Step 4 → 5: 校验 → 执行
  // ============================================
  const handleExecute = async () => {
    if (!createResp) return;
    setError(null);
    setActiveStep(4);
    try {
      const ex = await executeBatch({
        batch_id: createResp.batch_id,
        column_mapping: mappingToColumnMap(mapping),
        default_values: defaultValues,
        skip_errors: true,
      });
      setExecuteResp(ex);
      setActiveStep(5);
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    } catch (e: unknown) {
      setError((e as Error).message || '执行失败');
      // 失败也跳到 step 5 展示错误
      setActiveStep(5);
    }
  };

  // ============================================
  // 必填字段是否全部映射
  // ============================================
  const requiredCovered = useMemo(() => {
    const required = REQUIRED_FIELDS_BY_TARGET[target] || [];
    const mapped = new Set(mapping.map((m) => m.target_field).filter(Boolean));
    return required.every((k) => mapped.has(k));
  }, [target, mapping]);

  if (loadingBatch) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/import-center')}
          size="small"
        >
          返回中心
        </Button>
        <Typography variant="h5" sx={{ flex: 1 }}>
          {createResp
            ? `${TARGET_LABELS[createResp.target_type]} - 导入向导`
            : '新建批量导入'}
        </Typography>
      </Stack>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        {/* Step 0: 选目标 + 上传文件 */}
        {activeStep === 0 && (
          <Stack spacing={3}>
            <TextField
              select
              label="导入目标"
              value={target}
              onChange={(e) => setTarget(e.target.value as ImportTarget)}
              fullWidth
            >
              {TARGETS.map((t) => (
                <MenuItem key={t} value={t}>
                  {TARGET_LABELS[t]}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSelectFile(f);
                }}
              />
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{ py: 3 }}
              >
                {file ? `已选：${file.name}` : '选择文件（CSV / JSON）'}
              </Button>
              {file && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  大小 {(file.size / 1024).toFixed(1)} KB · 类型 {file.name.split('.').pop()?.toUpperCase()}
                </Typography>
              )}
            </Box>

            <Alert severity="info">
              支持 CSV 与 JSON 文件。XLSX 请先在 Excel 中「另存为 CSV (UTF-8)」。
            </Alert>

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || uploading}
                startIcon={uploading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
              >
                {uploading ? '上传中…' : '上传并解析'}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Step 1: 解析预览 */}
        {activeStep === 1 && createResp && (
          <Stack spacing={2}>
            <Alert severity="success" icon={<CheckIcon />}>
              解析成功！共识别 <strong>{createResp.total_rows}</strong> 行数据，
              <strong>{createResp.headers.length}</strong> 列。
            </Alert>
            <Typography variant="subtitle2">表头（前 12 列）</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {createResp.headers.slice(0, 12).map((h) => (
                <Chip key={h} label={h} variant="outlined" />
              ))}
            </Stack>
            {createResp.sample_rows.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2">样例数据（前 3 行）</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {createResp.headers.map((h) => (
                          <th
                            key={h}
                            style={{
                              border: '1px solid #ddd',
                              padding: 4,
                              background: '#f5f5f5',
                              textAlign: 'left',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {createResp.sample_rows.map((row, i) => (
                        <tr key={i}>
                          {createResp.headers.map((h) => (
                            <td
                              key={h}
                              style={{ border: '1px solid #ddd', padding: 4, maxWidth: 200, overflow: 'hidden' }}
                            >
                              {row[h] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </>
            )}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button onClick={() => setActiveStep(0)} startIcon={<ArrowBackIcon />}>
                返回
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                endIcon={<ArrowForwardIcon />}
              >
                下一步：字段映射
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Step 2: 字段映射 */}
        {activeStep === 2 && createResp && (
          <Stack spacing={2}>
            <Alert severity={requiredCovered ? 'success' : 'warning'}>
              {requiredCovered
                ? '所有必填字段已映射，可继续校验。'
                : '部分必填字段未映射，请检查下方红色行。'}
            </Alert>
            <Stack spacing={1.5}>
              {mapping.map((row, idx) => {
                const required = (REQUIRED_FIELDS_BY_TARGET[target] || []).includes(row.target_field);
                const isMissing = !row.target_field;
                return (
                  <Stack
                    key={row.column_name}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: isMissing && required ? '#d32f2f' : 'divider',
                      borderRadius: 1,
                      bgcolor: isMissing && required ? '#fff5f5' : 'transparent',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.column_name}
                        {required && <span style={{ color: '#d32f2f' }}> *</span>}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        置信度 {(row.confidence * 100).toFixed(0)}% ·{' '}
                        来源 {row.match_source === 'exact' ? '精确' : row.match_source === 'alias' ? '别名' : row.match_source === 'manual' ? '手动' : '未匹配'}
                      </Typography>
                    </Box>
                    <Select
                      size="small"
                      value={row.target_field}
                      onChange={(e) => {
                        const v = e.target.value as string;
                        setMapping((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  target_field: v,
                                  target_field_def: TARGET_FIELDS[target]?.find((f) => f.key === v),
                                  confidence: 1,
                                  match_source: v ? 'manual' : 'none',
                                }
                              : r,
                          ),
                        );
                      }}
                      sx={{ minWidth: 220 }}
                    >
                      <MenuItem value="">
                        <em>不导入此列</em>
                      </MenuItem>
                      {(TARGET_FIELDS[target] || []).map((f) => (
                        <MenuItem key={f.key} value={f.key}>
                          {f.label} {f.required && '（必填）'}
                        </MenuItem>
                      ))}
                    </Select>
                  </Stack>
                );
              })}
            </Stack>

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button onClick={() => setActiveStep(1)} startIcon={<ArrowBackIcon />}>
                返回
              </Button>
              <Button
                variant="contained"
                onClick={handleValidate}
                disabled={!requiredCovered}
                endIcon={<ArrowForwardIcon />}
              >
                下一步：数据校验
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Step 3: 数据校验 */}
        {activeStep === 3 && createResp && validateResp && (
          <Stack spacing={2}>
            {validateResp.invalid_rows === 0 ? (
              <Alert severity="success" icon={<CheckIcon />}>
                数据校验通过！{validateResp.valid_rows} 行全部有效。
              </Alert>
            ) : (
              <Alert severity="warning" icon={<ErrorIcon />}>
                共 {validateResp.invalid_rows} 行有问题（{validateResp.error_count} 个错误），{validateResp.valid_rows} 行可通过。
                勾选「跳过错误行」后仍可继续导入。
              </Alert>
            )}
            <Stack direction="row" spacing={2}>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    有效行
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {validateResp.valid_rows}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    无效行
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {validateResp.invalid_rows}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    错误数
                  </Typography>
                  <Typography variant="h4">{validateResp.error_count}</Typography>
                </CardContent>
              </Card>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button onClick={() => setActiveStep(2)} startIcon={<ArrowBackIcon />}>
                返回调整映射
              </Button>
              <Button
                variant="contained"
                onClick={handleExecute}
                disabled={validateResp.valid_rows === 0}
                endIcon={<ArrowForwardIcon />}
              >
                开始导入
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Step 4: 执行中 */}
        {activeStep === 4 && (
          <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="h6">正在导入数据…</Typography>
            <Typography variant="body2" color="text.secondary">
              请勿关闭应用，导入完成后将自动跳到结果页。
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <LinearProgress />
            </Box>
          </Stack>
        )}

        {/* Step 5: 结果报告 */}
        {activeStep === 5 && executeResp && (
          <Stack spacing={2}>
            <Alert
              severity={
                executeResp.status === 'success'
                  ? 'success'
                  : executeResp.status === 'partial'
                    ? 'warning'
                    : 'error'
              }
              icon={
                executeResp.status === 'success' ? (
                  <CheckIcon />
                ) : (
                  <ErrorIcon />
                )
              }
            >
              导入完成 · {STATUS_LABELS[executeResp.status]}
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      处理总数
                    </Typography>
                    <Typography variant="h4">{executeResp.processed_rows}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      成功
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {executeResp.success_rows}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      失败
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {executeResp.failed_rows}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      跳过
                    </Typography>
                    <Typography variant="h4">{executeResp.skipped_rows}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            {executeResp.failed_rows > 0 && (
              <Alert severity="info">
                失败行已记录到 import_batch_errors 表。点击「继续导入」返回中心后，可在历史列表查看详细错误。
              </Alert>
            )}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button
                onClick={() => navigate('/import-center')}
                startIcon={<RefreshIcon />}
              >
                返回中心
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  // 重置向导开始新一轮
                  setActiveStep(0);
                  setFile(null);
                  setCreateResp(null);
                  setMapping([]);
                  setValidateResp(null);
                  setExecuteResp(null);
                  setError(null);
                }}
              >
                继续导入
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
