/**
 * 商品数据导入向导（7 步状态机）
 *
 * 流程：选文件 → 选目标 → 字段映射 → 校验预览 → 冲突策略 → 摘要确认 → 执行进度 → 完成报告
 */

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Step, StepLabel, Stepper } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CONFLICT_STRATEGIES,
  REQUIRED_FIELDS_BY_TARGET,
  type ConflictStrategy,
  type FieldMapping,
  type ImportError,
  type ImportRow,
  type ImportTarget,
  type ParsedFile,
} from '../../lib/importers/types';
import {
  createBatch,
  executeImport,
  updateMapping,
  validateImport,
} from '../../lib/services/importService';

import { ImportCompleteDialog } from './ImportCompleteDialog';
import { Step1FileSelect } from './Step1FileSelect';
import { Step2TargetSelect } from './Step2TargetSelect';
import { Step3FieldMapping } from './Step3FieldMapping';
import { Step4DataPreview } from './Step4DataPreview';
import { Step5ConflictStrategy } from './Step5ConflictStrategy';
import { Step6Confirm } from './Step6Confirm';
import { Step7Progress } from './Step7Progress';
import type { ImageArchiveSummary } from '../../lib/importers/types';

export interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  /**
   * v1.2 P1：初始目标类型（从外部传入时可跳过 Step 2）
   *  - 'products' | 'inventory' | 'purchases' | 'sales' | 'suppliers' | 'customers'
   *  - MVP 默认 'products'
   */
  initialTarget?: ImportTarget;
  onSuccess?: () => void; // 导入成功后刷新列表
}

const STEPS = ['选文件', '选目标', '字段映射', '数据预览', '冲突策略', '确认', '导入'] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function ImportWizard({ open, onClose, initialTarget = 'products', onSuccess }: ImportWizardProps) {
  const [step, setStep] = useState<StepIndex>(0);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  // v1.3：图片 zip 包摘要（在 Step 1 上传 zip 后填充）
  const [imageArchive, setImageArchive] = useState<ImageArchiveSummary | null>(null);
  const [target, setTarget] = useState<ImportTarget>(initialTarget);
  const [mapping, setMapping] = useState<FieldMapping[]>([]);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [validating, setValidating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ batch_id: string; total: number; success: number; failed: number; skipped: number; errors: ImportError[] } | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // 当外部 initialTarget 变化时同步内部状态
  useEffect(() => {
    setTarget(initialTarget);
  }, [initialTarget]);

  // 重置
  const reset = useCallback(() => {
    setStep(0);
    setParsed(null);
    setSourceFile(null);
    setImageArchive(null);
    setTarget(initialTarget);
    setMapping([]);
    setConflictStrategy('skip');
    setErrors([]);
    setValidating(false);
    setBatchId(null);
    setRunning(false);
    setProgress({ current: 0, total: 0 });
    setResult(null);
    setShowComplete(false);
    setFatalError(null);
  }, [initialTarget]);

  // v1.3：接收图片 zip 包摘要
  const handleImageArchive = useCallback((summary: ImageArchiveSummary) => {
    setImageArchive(summary);
  }, []);

  // 关闭时询问是否重置
  const handleClose = useCallback(() => {
    if (running) {
      if (!confirm('导入正在进行中，确定要关闭吗？')) return;
    }
    reset();
    onClose();
  }, [running, reset, onClose]);

  // 进入 Step 3 后自动匹配
  const handleParsed = useCallback(
    (p: ParsedFile, file: File) => {
      setParsed(p);
      setSourceFile(file);
      setStep(1);
    },
    [],
  );

  const handleTargetChange = useCallback((t: ImportTarget) => {
    setTarget(t); // v1.2 P1：允许切换 target
    setStep(2);
  }, []);

  const handleMappingChange = useCallback((m: FieldMapping[]) => {
    setMapping(m);
  }, []);

  // 进入 Step 4：触发后端校验
  useEffect(() => {
    if (step !== 3 || !parsed || mapping.length === 0) return;
    setValidating(true);
    setFatalError(null);
    (async () => {
      try {
        const req = {
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileHash: parsed.fileHash,
          rows: parsed.rows,
          mapping,
          conflictStrategy,
          targetType: target, // v1.2 P1：携带目标类型
        };
        const errs = await validateImport(req);
        setErrors(errs);
      } catch (e) {
        setFatalError((e as Error).message);
      } finally {
        setValidating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, parsed, mapping]);

  // 进入 Step 7：创建 batch + 执行
  useEffect(() => {
    if (step !== 6 || !parsed || running || result) return;
    setRunning(true);
    setProgress({ current: 0, total: parsed.rows.length });
    setFatalError(null);
    (async () => {
      try {
        // 1. 创建 batch
        const id = await createBatch(parsed.fileName, parsed.fileType, parsed.rows.length, parsed.fileHash, target);
        setBatchId(id);

        // 2. 保存 mapping
        await updateMapping(id, JSON.stringify(mapping));

        // 3. 执行（Rust 端整体事务；进度通过分批 sleep 模拟）
        const req = {
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          fileHash: parsed.fileHash,
          rows: parsed.rows,
          mapping,
          conflictStrategy,
          targetType: target, // v1.2 P1：携带目标类型
          imageArchive: imageArchive?.archiveRelativePath ?? null, // v1.3
        };

        // 简单进度模拟：每 200ms 推进
        const tick = setInterval(() => {
          setProgress((p) =>
            p.current < p.total ? { ...p, current: Math.min(p.current + Math.ceil(p.total / 20), p.total) } : p,
          );
        }, 200);

        const res = await executeImport(id, req);
        clearInterval(tick);
        setProgress({ current: parsed.rows.length, total: parsed.rows.length });
        setResult(res);
        setShowComplete(true);
        if (res.failed === 0) {
          onSuccess?.();
        }
      } catch (e) {
        setFatalError((e as Error).message);
      } finally {
        setRunning(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // 步骤禁用判定
  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return parsed !== null;
      case 1:
        return true;
      case 2: {
        // v1.2 P1：动态必填字段判断（按当前 target 决定）
        const required = REQUIRED_FIELDS_BY_TARGET[target] ?? ['name'];
        return required.every((f) => mapping.some((m) => m.targetField === f));
      }
      case 3:
        return !validating && fatalError === null;
      case 4:
        return true;
      case 5:
        return !running && result === null;
      case 6:
        return false; // 不可向前
      default:
        return false;
    }
  }, [step, parsed, mapping, target, validating, fatalError, running, result]);

  // v1.2 P1：唯一键识别（按 target 不同而不同）
  const hasUniqueKey = useMemo(() => {
    switch (target) {
      case 'products':
        return mapping.some((m) => m.targetField === 'spu_code');
      case 'inventory':
        return (
          mapping.some((m) => m.targetField === 'sku_code') &&
          mapping.some((m) => m.targetField === 'transaction_date') &&
          mapping.some((m) => m.targetField === 'transaction_type')
        );
      case 'purchases':
        return mapping.some((m) => m.targetField === 'po_number');
      case 'sales':
        return mapping.some((m) => m.targetField === 'so_number');
      case 'suppliers':
        return mapping.some((m) => m.targetField === 'supplier_name');
      case 'customers':
        return mapping.some((m) => m.targetField === 'customer_name');
      default:
        return false;
    }
  }, [target, mapping]);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        data-testid="import-wizard-dialog"
      >
        <DialogTitle>
                  {(() => {
                    switch (target) {
                      case 'products':
                        return '商品数据导入';
                      case 'inventory':
                        return '库存交易导入';
                      case 'purchases':
                        return '采购订单导入';
                      case 'sales':
                        return '销售订单导入';
                      case 'suppliers':
                        return '供应商主数据导入';
                      case 'customers':
                        return '客户主数据导入';
                      default:
                        return '数据导入';
                    }
                  })()}
                </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 480 }}>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map((s, i) => (
              <Step key={s} completed={i < step}>
                <StepLabel>{s}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {step === 0 && <Step1FileSelect onParsed={handleParsed} onImageArchive={handleImageArchive} />}
          {step === 1 && <Step2TargetSelect value={target} onChange={handleTargetChange} />}
          {step === 2 && parsed && (
            <Step3FieldMapping
              headers={parsed.headers}
              rows={parsed.rows}
              value={mapping}
              onChange={handleMappingChange}
              targetType={target}
            />
          )}
          {step === 3 && parsed && (
            <Step4DataPreview rows={parsed.rows} mapping={mapping} errors={errors} />
          )}
          {step === 4 && (
            <Step5ConflictStrategy
              value={conflictStrategy}
              onChange={setConflictStrategy}
              hasUniqueKey={hasUniqueKey}
            />
          )}
          {step === 5 && parsed && (
            <Step6Confirm
              parsed={parsed}
              mapping={mapping}
              conflictStrategy={conflictStrategy}
              errorCount={errors.length}
            />
          )}
          {step === 6 && (
            <Step7Progress
              running={running}
              current={progress.current}
              total={progress.total}
              result={result}
              targetType={target}
              headers={parsed?.headers ?? []}
            />
          )}

          {fatalError && (
            <Box sx={{ mt: 2, color: 'error.main' }} data-testid="fatal-error">
              错误：{fatalError}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          {step > 0 && step < 6 && (
            <Button onClick={() => setStep((s) => Math.max(0, s - 1) as StepIndex)}>上一步</Button>
          )}
          {step < 5 && (
            <Button
              variant="contained"
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(6, s + 1) as StepIndex)}
              data-testid="next-step"
            >
              下一步
            </Button>
          )}
          {step === 5 && (
            <Button
              variant="contained"
              disabled={!canNext}
              onClick={() => setStep(6)}
              data-testid="start-import"
            >
              开始导入
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ImportCompleteDialog
        open={showComplete}
        result={result}
        rows={parsed?.rows ?? []}
        mapping={mapping}
        errors={errors.concat(result?.errors ?? [])}
        fileName={parsed?.fileName ?? ''}
        onClose={() => {
          setShowComplete(false);
          handleClose();
        }}
        onRetry={() => {
          setShowComplete(false);
          reset();
        }}
      />
    </>
  );
}

export default ImportWizard;