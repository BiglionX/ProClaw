/**
 * ProClaw 批量导入中心 - 7 步向导（v1.2 P1 + v1.3 老系统迁移）
 *
 * /import-center/new         → 新建
 * /import-center/:batchId    → 查看/继续已有批次
 *
 * v1.2 P1 7 步：
 *  1. 选目标 + 上传文件
 *  2. 解析预览（表头 + 前 3 行）
 *  3. 字段映射（自动按中英别名匹配，可手动调整）
 *  4. 校验（必填/类型/日期/枚举）
 *  5. 执行（事务化入库）
 *  6. 结果报告
 *  7. 完成（继续导入 / 返回中心）
 *
 * v1.3 老系统数据迁移（.xls / .xlsx）：
 *  - 上传 .xls / .xlsx → 调 import_preview_legacy → 展示聚合预览
 *  - Step 4（聚合规则确认）：用户手动编辑 aggregation_rules
 *  - Step 5（执行）：调 import_execute_legacy（带 aggregation_rules + skip_category_auto_create）
 *  - Step 7（结果 + 撤销）：调 import_rollback_batch（不限时）
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  isLegacyFile,
  previewLegacy,
  executeLegacy,
  validateBatch,
} from '../../lib/import/importService';
import {
  buildCategoryReviewList,
  countAggregationTotals,
  needsAggregationReview,
} from '../../lib/import/legacyAdapter';
import Step0LegacyPreview from './steps/Step0LegacyPreview';
import type {
  ExecuteResponse,
  FieldMappingRow,
  ImportCreateResponse,
  ImportTarget,
  LegacyExecuteResponse,
  LegacyParseResult,
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

/**
 * 从 unknown 类型中提取错误消息（兼容 Tauri 2.x 各种错误形态）
 *
 * Tauri 2.x 的 invoke reject 值可能形态：
 *  - 字符串（直接是 Rust 端返回的 Err<String>）
 *  - Error 对象（包装过，.message 是 Rust 端 string）
 *  - 普通对象 { message: string }（IPC 通道特殊场景）
 *
 * 旧版 `(e as Error).message || fallback` 在 Tauri 2.x 会拿到 undefined，
 * 导致用户看到无意义的"执行失败"。这里统一兼容。
 */
function extractErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'string') {
    return e.trim() || fallback;
  }
  if (e instanceof Error) {
    return e.message || e.name || fallback;
  }
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown; reason?: unknown; error?: unknown };
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message;
    }
    if (typeof obj.reason === 'string' && obj.reason.trim()) {
      return obj.reason;
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error;
    }
    // 兑底：JSON 序列化整个对象
    try {
      const j = JSON.stringify(e);
      if (j && j !== '{}') return j;
    } catch {
      // ignore
    }
    // 极罕见场景：Tauri 2.x invoke reject 是无法序列化的特殊对象。
    // 调试模式：拼出原型链上能读到的所有属性名 + 枚举所有键，
    // 避免出现"上传失败"这种无语义信息。
    try {
      const allProps = new Set<string>();
      let cur: object | null = e as object;
      while (cur && cur !== Object.prototype) {
        for (const k of Object.getOwnPropertyNames(cur)) allProps.add(k);
        cur = Object.getPrototypeOf(cur);
      }
      const parts: string[] = [];
      for (const k of allProps) {
        try {
          const v = (e as Record<string, unknown>)[k];
          const t = typeof v;
          if (t === 'function' || t === 'undefined') continue;
          parts.push(`${k}=${typeof v === 'string' ? `"${v}"` : String(v)}`);
        } catch { /* ignore */ }
      }
      if (parts.length > 0) {
        return `${fallback} [调试: ${parts.slice(0, 8).join(', ')}]`;
      }
    } catch { /* ignore */ }
  }
  return fallback;
}

/** 确认框只讲当前导入对象，避免客户导入里出现商品 / SKU。 */
function legacyConfirmCopy(
  target: ImportTarget,
  summary: {
    totals: ReturnType<typeof countAggregationTotals>;
    multiCustomers: number;
    multiProducts: number;
    categories: number;
  },
  skipCategoryAutoCreate: boolean,
): { lead: string; detail: string } {
  const categoryName =
    target === 'customers' ? '客户类别' : target === 'products' ? '商品类别' : target === 'suppliers' ? '供应商类别' : '类别';
  const category = `${categoryName}自动建档：${skipCategoryAutoCreate ? '关闭' : '开启'}（${summary.categories} 项）。`;
  if (target === 'customers') {
    return {
      lead:
        summary.multiCustomers > 0
          ? `${summary.multiCustomers} 个客户有多个联系人，将按预览里标记的首要联系人导入。`
          : '将按预览里的客户和联系人导入。',
      detail: `共 ${summary.totals.customer_groups} 个客户、${summary.totals.customer_contacts} 个联系人。${category}`,
    };
  }
  if (target === 'products') {
    return {
      lead:
        summary.multiProducts > 0
          ? `${summary.multiProducts} 个商品有多个 SKU，将按预览里的 SPU 规则导入。`
          : '将按预览里的商品和 SKU 导入。',
      detail: `共 ${summary.totals.product_groups} 个商品、${summary.totals.product_skus} 个 SKU。${category}`,
    };
  }
  if (target === 'suppliers') {
    return {
      lead: '将按当前预览导入供应商。',
      detail: category,
    };
  }
  return { lead: '按当前预览导入。', detail: category };
}

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

  const [activeStep, setActiveStep] = useState<number>(0);
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

  // ==============================
  // v1.3 老系统数据迁移 - state
  // （v1.3.0 release 后精简：移除未挂载 UI 的预留 state 与 setter，
  //   仅保留 legacyMode / legacyPreview / legacyBatchId / skipCategoryAutoCreate
  //   这 4 个真正影响渲染与执行的 state）
  // ==============================
  /** 是否在走老格式流程（.xls / .xlsx） */
  const [legacyMode, setLegacyMode] = useState(false);
  /** 老格式预览结果（previewLegacy 返回） */
  const [legacyPreview, setLegacyPreview] = useState<LegacyParseResult | null>(null);
  /** 老格式导入批次 id（执行后） */
  const [legacyBatchId, setLegacyBatchId] = useState<string>('');
  /** 是否跳过类别自动建档（用户在 Step 4 编辑） */
  const [skipCategoryAutoCreate, setSkipCategoryAutoCreate] = useState(false);
  /** 多联系人 / 多 SKU 时用页面内确认框，避免 WebView 吃掉 window.confirm */
  const [legacyConfirmOpen, setLegacyConfirmOpen] = useState(false);
  const [legacyResult, setLegacyResult] = useState<LegacyExecuteResponse | null>(null);

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
      // v1.3 老格式检测（.xls / .xlsx）走特殊流程
      if (isLegacyFile(file.name) && (target === 'products' || target === 'customers' || target === 'suppliers')) {
        await handleLegacyUpload(file);
        return;
      }
      const resp = await createBatch(target, file);
      setCreateResp(resp);
      setActiveStep(1);
      // 自动做字段映射
      setMapping(autoMapColumns(resp.headers, target));
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, '上传失败');
      console.error('[ImportWizard] handleUpload failed:', e, msg);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  /**
   * v1.3 老系统数据迁移 - handler
   *
   * 注：原本规划在 Step 7 挂载「撤销本次导入」按钮（调 import_rollback_batch），
   * 但 v1.3.0 release 时 Step 7 组件（Step7Result）未实现，按钮未挂载，
   * handler 也未被任何 onClick 调用。为避免 dead code 暂时删除；
   * 后续补 Step7Result 时再恢复。v1.3 计划文档 11.1 风险表中保留「撤销本次导入」按钮。
   */

  /** v1.3 上传 .xls / .xlsx → 创建标准批次（让 import_batches 行存在）+ 调 previewLegacy */
  const handleLegacyUpload = async (f: File) => {
    try {
      // 1) 先用 createBatch 创建 import_batches 行（与 v1.2 P1 保持一致）
      const resp = await createBatch(target, f);
      // 修复：同时设置 createResp，老格式分支的渲染条件是
      //     {activeStep === 1 && createResp && legacyMode && legacyPreview}，
      //     createResp 为 null 会导致整个 step 2 块不渲染 → 用户看到空白。
      setCreateResp(resp);
      setLegacyBatchId(resp.batch_id);
      // 2) 获取文件实际路径（在 import_uploads/<batch_id>/）
      const filePath = `${resp.source_path ?? ''}`;
      setLegacyMode(true);
      // 3) 调 previewLegacy（拿到聚合组 + 类别清单）
      const preview = await previewLegacy(filePath, target);
      setLegacyPreview(preview);
      setActiveStep(1); // 直接跳到"解析预览"步骤展示老格式预览
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, '老格式预览失败');
      console.error('[ImportWizard] handleLegacyUpload failed:', e, msg);
      setError(msg);
      throw e;
    }
  };

  const legacyConfirmSummary = useMemo(() => {
    if (!legacyPreview) return null;
    const totals = countAggregationTotals(legacyPreview);
    return {
      totals,
      multiCustomers: legacyPreview.customer_groups.filter((g) => g.contacts.length > 1).length,
      multiProducts: legacyPreview.product_groups.filter((g) => g.variants.length > 1).length,
      categories: buildCategoryReviewList(legacyPreview.categories_to_create).filter((item) => {
        if (target === 'customers') return item.category_type === 'customer';
        if (target === 'products') return item.category_type === 'product';
        if (target === 'suppliers') return item.category_type === 'supplier';
        return true;
      }).length,
    };
  }, [legacyPreview, target]);

  /** v1.3 类别审核 → 执行。确认框必须画在页面里，WebView 不弹出 window.confirm。 */
  const requestLegacyExecute = () => {
    if (!legacyBatchId) {
      setError('导入批次还没建好，请返回重选文件');
      return;
    }
    if (legacyPreview && needsAggregationReview(legacyPreview)) {
      setLegacyConfirmOpen(true);
      return;
    }
    void runLegacyExecute();
  };

  const runLegacyExecute = async () => {
    if (!legacyBatchId) return;
    setLegacyConfirmOpen(false);
    setUploading(true);
    setError(null);
    setActiveStep(4);
    try {
      const result = await executeLegacy({
        batch_id: legacyBatchId,
        column_mapping: {},
        default_values: defaultValues,
        skip_errors: true,
        aggregation_rules: undefined,
        skip_category_auto_create: skipCategoryAutoCreate,
      });
      setLegacyResult(result);
      setActiveStep(5);
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, '执行失败');
      console.error('[ImportWizard] handleLegacyExecute failed:', e, msg);
      setError(msg);
      setActiveStep(1);
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
      const msg = extractErrorMessage(e, '校验失败');
      console.error('[ImportWizard] handleValidate failed:', e, msg);
      setError(msg);
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
      const msg = extractErrorMessage(e, '执行失败');
      console.error('[ImportWizard] handleExecute failed:', e, msg);
      setError(msg);
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
                accept=".csv,.json,.xls,.xlsx"
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
                {file ? `已选：${file.name}` : '选择文件（CSV / JSON / XLS / XLSX）'}
              </Button>
              {file && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  大小 {(file.size / 1024).toFixed(1)} KB · 类型 {file.name.split('.').pop()?.toUpperCase()}
                </Typography>
              )}
            </Box>

            <Alert severity="info">
              {target === 'customers' || target === 'products' || target === 'suppliers'
                ? `导入${TARGET_LABELS[target]}：可以直接选择 CSV、JSON，或老系统导出的 XLS / XLSX。`
                : `导入${TARGET_LABELS[target]}：请使用 CSV 或 JSON。Excel 文件请先另存为 CSV（UTF-8）。`}
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
            {/* v1.3 老格式预览分支 */}
            {legacyMode && legacyPreview ? (
              <>
                <Alert severity="info">
                  {target === 'customers' && (
                    <>
                      检测到老系统客户数据（.xls / .xlsx）：共 <strong>{legacyPreview.total_data_rows}</strong> 行，
                      已按客户编号聚合。
                      {legacyConfirmSummary &&
                        legacyConfirmSummary.multiCustomers > 0 &&
                        '有客户包含多个联系人，执行前会再确认一次。'}
                    </>
                  )}
                  {target === 'products' && (
                    <>
                      检测到老系统商品数据（.xls / .xlsx）：共 <strong>{legacyPreview.total_data_rows}</strong> 行，
                      已按商品编号聚合。
                      {legacyConfirmSummary &&
                        legacyConfirmSummary.multiProducts > 0 &&
                        '有商品包含多个 SKU，执行前会再确认一次。'}
                    </>
                  )}
                  {target !== 'customers' && target !== 'products' && (
                    <>
                      检测到老系统{TARGET_LABELS[target]}数据（.xls / .xlsx）：共{' '}
                      <strong>{legacyPreview.total_data_rows}</strong> 行。
                    </>
                  )}
                </Alert>
                <Step0LegacyPreview preview={legacyPreview} target={target} compact />
                {/* 类别自动建档开关（v1.3 决策：默认全开） */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2">
                    {target === 'customers'
                      ? '客户类别自动建档'
                      : target === 'products'
                        ? '商品类别自动建档'
                        : target === 'suppliers'
                          ? '供应商类别自动建档'
                          : '类别自动建档'}
                    ：
                  </Typography>
                  <Chip
                    label={skipCategoryAutoCreate ? '已关闭' : '已开启'}
                    color={skipCategoryAutoCreate ? 'default' : 'success'}
                    onClick={() => setSkipCategoryAutoCreate((v) => !v)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {target === 'customers'
                      ? '关闭后，已有的客户类别仍可复用，新的客户类别不会自动创建'
                      : target === 'products'
                        ? '关闭后，已有的商品类别仍可复用，新的商品类别不会自动创建'
                        : target === 'suppliers'
                          ? '关闭后，已有的供应商类别仍可复用，新的供应商类别不会自动创建'
                          : '关闭后，已有的类别仍可复用，新类别不会自动创建'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
                  <Button
                    onClick={() => {
                      setLegacyMode(false);
                      setLegacyPreview(null);
                      setLegacyBatchId('');
                      setActiveStep(0);
                    }}
                    startIcon={<ArrowBackIcon />}
                  >
                    返回重选
                  </Button>
                  <Button
                    variant="contained"
                    onClick={requestLegacyExecute}
                    disabled={uploading}
                    endIcon={uploading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
                  >
                    {uploading ? '导入中…' : '下一步：执行导入'}
                  </Button>
                </Stack>
              </>
            ) : (
              <>
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
              </>
            )}
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

        {activeStep === 5 && legacyResult && (
          <Stack spacing={2}>
            <Alert
              severity={
                legacyResult.status === 'success'
                  ? 'success'
                  : legacyResult.status === 'partial'
                    ? 'warning'
                    : 'error'
              }
              icon={legacyResult.status === 'success' ? <CheckIcon /> : <ErrorIcon />}
            >
              导入完成 · {STATUS_LABELS[legacyResult.status]}
            </Alert>
            <Grid container spacing={2}>
              {(target === 'customers'
                ? [
                    ['客户', legacyResult.customers_created],
                    ['联系人', legacyResult.customer_contacts_created],
                  ]
                : target === 'products'
                  ? [
                      ['商品', legacyResult.products_created],
                      ['SKU', legacyResult.product_skus_created],
                    ]
                  : target === 'suppliers'
                    ? [['供应商', legacyResult.suppliers_created]]
                    : [
                        ['客户', legacyResult.customers_created],
                        ['联系人', legacyResult.customer_contacts_created],
                        ['供应商', legacyResult.suppliers_created],
                        ['商品', legacyResult.products_created],
                        ['SKU', legacyResult.product_skus_created],
                      ].filter(([, count]) => Number(count) > 0)
              ).map(([label, count]) => (
                <Grid item xs={6} sm={4} md={2} key={label}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="h4">{count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" color="text.secondary">
              {target === 'products' &&
                `商品类别新建 ${legacyResult.categories_summary.product_created} 项`}
              {target === 'suppliers' &&
                `供应商类别新建 ${legacyResult.categories_summary.supplier_created} 项`}
              {target === 'customers' &&
                `客户类别新建 ${legacyResult.categories_summary.customer_created} 项`}
              {target !== 'products' && target !== 'suppliers' && target !== 'customers' && (
                <>
                  {[
                    legacyResult.categories_summary.product_created > 0
                      ? `商品类别新建 ${legacyResult.categories_summary.product_created} 项`
                      : '',
                    legacyResult.categories_summary.supplier_created > 0
                      ? `供应商类别新建 ${legacyResult.categories_summary.supplier_created} 项`
                      : '',
                    legacyResult.categories_summary.customer_created > 0
                      ? `客户类别新建 ${legacyResult.categories_summary.customer_created} 项`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('，')}
                </>
              )}
            </Typography>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <Button onClick={() => navigate('/import-center')} startIcon={<RefreshIcon />}>
                返回中心
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setActiveStep(0);
                  setFile(null);
                  setCreateResp(null);
                  setMapping([]);
                  setValidateResp(null);
                  setExecuteResp(null);
                  setLegacyResult(null);
                  setLegacyPreview(null);
                  setLegacyMode(false);
                  setLegacyBatchId('');
                  setError(null);
                }}
              >
                继续导入
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>

      <Dialog open={legacyConfirmOpen} onClose={() => setLegacyConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>确认导入{TARGET_LABELS[target]}</DialogTitle>
        <DialogContent>
          {legacyConfirmSummary ? (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {legacyConfirmCopy(target, legacyConfirmSummary, skipCategoryAutoCreate).lead}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {legacyConfirmCopy(target, legacyConfirmSummary, skipCategoryAutoCreate).detail}
              </Typography>
            </>
          ) : (
            <Typography variant="body2">按当前预览导入。</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegacyConfirmOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => void runLegacyExecute()}>
            确认执行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
