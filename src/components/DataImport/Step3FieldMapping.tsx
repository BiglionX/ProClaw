/**
 * Step 3: 字段映射表（自动匹配 + 手动覆盖）
 *
 * 表格布局：
 * - 第一列：源列名（来自文件表头）
 * - 第二列：下拉选择目标字段
 * - 第三列：置信度标签
 * - 第四列：手动修改按钮（弹出重选）
 *
 * v1.3 D2：当必填字段未映射时显示 AI 引导气泡 + 一键"AI 推荐映射"按钮
 */

import {
  Alert,
  Box,
  Button,
  Chip,
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
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useEffect, useMemo, useState } from 'react';

import { FIELD_ALIASES, manualMatch, matchColumns } from '../../lib/importers/fieldMatcher';
import {
  REQUIRED_FIELDS_BY_TARGET,
  type FieldMapping,
  type ImportRow,
  type ImportTarget,
} from '../../lib/importers/types';
import { generateImportGuidance, type ImportGuidance } from '../../lib/aiGuide';

export interface Step3Props {
  headers: string[];
  rows: ImportRow[];
  value: FieldMapping[];
  onChange: (m: FieldMapping[]) => void;
  /** v1.3 D2：目标类型（用于计算必填字段 + AI 引导） */
  targetType?: ImportTarget;
}

const AI_RECOMMEND_CONFIDENCE_THRESHOLD = 0.8;

export function Step3FieldMapping({ headers, value, onChange, targetType = 'products' }: Step3Props) {
  const [mapping, setMapping] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const fm of value) m.set(fm.sourceColumn, fm.targetField);
    return m;
  });

  // 初始自动匹配
  useEffect(() => {
    if (mapping.size > 0) return;
    const { matched } = matchColumns(headers);
    const next = new Map<string, string>();
    matched.forEach((c, src) => next.set(src, c.targetField));
    setMapping(next);
    sync(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const targets = useMemo(() => Object.keys(FIELD_ALIASES), []);

  function setTarget(sourceColumn: string, targetField: string) {
    const next = new Map(mapping);
    if (targetField === '') next.delete(sourceColumn);
    else next.set(sourceColumn, targetField);
    setMapping(next);
    sync(next);
  }

  function reset() {
    const next = new Map<string, string>();
    setMapping(next);
    sync(next);
  }

  function sync(m: Map<string, string>) {
    const arr: FieldMapping[] = [];
    m.forEach((targetField, sourceColumn) => {
      arr.push({ sourceColumn, targetField });
    });
    onChange(arr);
  }

  /**
   * v1.3 D2："AI 推荐映射"按钮
   * - 复用 fieldMatcher.matchColumns
   * - 仅填充置信度 ≥ 0.8 且当前未映射的源列
   * - 不覆盖用户已手动指定的映射
   */
  function applyAiRecommendations() {
    const { matched } = matchColumns(headers);
    const next = new Map(mapping);
    let applied = 0;
    matched.forEach((cand, src) => {
      if (cand.confidence < AI_RECOMMEND_CONFIDENCE_THRESHOLD) return;
      if (next.has(src)) return; // 保留用户已设
      next.set(src, cand.targetField);
      applied += 1;
    });
    setMapping(next);
    sync(next);
    return applied;
  }

  // 自动匹配的置信度（用于显示）
  const autoMatched = useMemo(() => matchColumns(headers), [headers]);

  // v1.3 D2：计算缺失必填字段 + AI 引导
  const requiredFields = useMemo(
    () => REQUIRED_FIELDS_BY_TARGET[targetType] ?? REQUIRED_FIELDS_BY_TARGET.products,
    [targetType],
  );
  const mappedTargets = useMemo(
    () => new Set(Array.from(mapping.values())),
    [mapping],
  );
  const missingRequired = useMemo(
    () => requiredFields.filter((f) => !mappedTargets.has(f)),
    [requiredFields, mappedTargets],
  );

  // 把缺失必填字段构造为"虚拟错误"喂给 generateImportGuidance（拿到 8 类规则统一格式）
  const guidance: ImportGuidance[] = useMemo(() => {
    if (missingRequired.length === 0) return [];
    const fakeErrors = missingRequired.map((field) => ({
      rowIndex: 0,
      field,
      level: 'L1' as const,
      code: 'MISSING_REQUIRED',
      message: `必填字段未映射：${field}`,
    }));
    return generateImportGuidance(targetType, fakeErrors, headers);
  }, [missingRequired, headers, targetType]);

  const missingGuidance = guidance.find((g) => g.category === 'missing_required');

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1">字段映射</Typography>
        <Chip
          label={`已映射 ${mapping.size} / ${headers.length}`}
          color={mapping.size > 0 ? 'primary' : 'default'}
          size="small"
        />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoFixHighIcon />}
          onClick={applyAiRecommendations}
          disabled={headers.length === 0}
          data-testid="ai-recommend-mapping-button"
        >
          AI 推荐映射
        </Button>
        <Tooltip title="清空所有映射并重新自动匹配">
          <IconButton onClick={reset} size="small" data-testid="reset-mapping">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {missingRequired.length > 0 && (
        <Alert
          severity="info"
          icon={<AutoFixHighIcon />}
          sx={{ mb: 2 }}
          data-testid="ai-mapping-guidance"
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {missingGuidance?.title ?? `检测到 ${missingRequired.length} 个必填字段未映射`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {missingGuidance?.suggestion ??
              `目标 ${targetType} 需要：${missingRequired.join('、')}`}
          </Typography>
          {missingGuidance?.aiHint && (
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="ai-mapping-hint"
              sx={{ display: 'block', mb: 1 }}
            >
              {missingGuidance.aiHint}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AutoFixHighIcon />}
              onClick={applyAiRecommendations}
              data-testid="ai-mapping-apply-button"
            >
              一键填充高置信度映射
            </Button>
            {missingGuidance?.actionLabel && missingGuidance.actionPath && (
              <Button
                size="small"
                variant="outlined"
                href={missingGuidance.actionPath}
                data-testid="ai-mapping-download-template-link"
              >
                {missingGuidance.actionLabel}
              </Button>
            )}
          </Stack>
        </Alert>
      )}

      {mapping.size === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          尚未映射任何字段。MVP 至少需要映射 <strong>商品名称 (name)</strong>，否则无法导入。
        </Alert>
      )}

      {mapping.size > 0 && !Array.from(mapping.values()).some((v) => v === 'name') && targetType === 'products' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          必须映射 <strong>name</strong> 字段才能继续。
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" data-testid="mapping-table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '30%' }}>源列名</TableCell>
              <TableCell sx={{ width: '35%' }}>目标字段</TableCell>
              <TableCell sx={{ width: '15%' }}>置信度</TableCell>
              <TableCell sx={{ width: '20%' }}>匹配方式</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {headers.map((h) => {
              const target = mapping.get(h) ?? '';
              const autoMatch = autoMatched.matched.get(h);
              const confidence = autoMatch?.confidence ?? 0;
              const reason = autoMatch?.reason ?? (target ? 'manual' : null);
              return (
                <TableRow key={h} data-testid={`mapping-row-${h}`}>
                  <TableCell>
                    <code>{h}</code>
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      fullWidth
                      value={target}
                      displayEmpty
                      onChange={(e) => setTarget(h, e.target.value as string)}
                      data-testid={`mapping-select-${h}`}
                    >
                      <MenuItem value="">
                        <em>（不导入）</em>
                      </MenuItem>
                      {targets.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {confidence > 0 ? (
                      <Chip
                        label={`${Math.round(confidence * 100)}%`}
                        size="small"
                        color={
                          confidence >= 0.85 ? 'success' : confidence >= 0.6 ? 'warning' : 'default'
                        }
                      />
                    ) : (
                      <Chip label="手动" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        reason === 'exact'
                          ? '完全一致'
                          : reason === 'alias'
                            ? '别名'
                            : reason === 'fuzzy'
                              ? '模糊'
                              : reason === 'manual'
                                ? '手动'
                                : '—'
                      }
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}