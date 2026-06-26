/**
 * Step 4: 校验结果预览（前 10 行 + 错误列表）
 */

import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';

import type { FieldMapping, ImportError, ImportRow } from '../../lib/importers/types';

export interface Step4Props {
  rows: ImportRow[];
  mapping: FieldMapping[];
  errors: ImportError[]; // 来自 importService.validateImport
}

const PREVIEW_ROWS = 10;

export function Step4DataPreview({ rows, mapping, errors }: Step4Props) {
  const previewRows = useMemo(() => rows.slice(0, PREVIEW_ROWS), [rows]);
  const errorByRow = useMemo(() => {
    const m = new Map<number, ImportError[]>();
    for (const e of errors) {
      const arr = m.get(e.rowIndex) ?? [];
      arr.push(e);
      m.set(e.rowIndex, arr);
    }
    return m;
  }, [errors]);

  const errorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of errors) counts[e.code] = (counts[e.code] ?? 0) + 1;
    return counts;
  }, [errors]);

  const validRows = useMemo(() => {
    return rows.filter((r) => !(errorByRow.get(r.rowIndex) ?? []).some((e) => e.level === 'L1'));
  }, [rows, errorByRow]);

  const targetFields = mapping.map((m) => m.targetField).filter(Boolean);

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`总行数 ${rows.length}`} />
        <Chip color="success" label={`可导入 ${validRows.length}`} />
        <Chip color="error" label={`错误 ${errors.length}`} />
        {Object.entries(errorCounts).map(([code, count]) => (
          <Chip key={code} label={`${code} × ${count}`} size="small" color="warning" variant="outlined" />
        ))}
      </Stack>

      {errors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          发现 <strong>{errors.length}</strong> 个校验错误。其中 L1 错误（必填/类型/范围）会阻断导入流程；L2 错误仅为警告，可继续。
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        数据预览（前 {PREVIEW_ROWS} 行）
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 50 }}>行</TableCell>
              {targetFields.map((t) => (
                <TableCell key={t}>{t}</TableCell>
              ))}
              <TableCell sx={{ width: 120 }}>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {previewRows.map((r) => {
              const rowErrors = errorByRow.get(r.rowIndex) ?? [];
              const l1 = rowErrors.some((e) => e.level === 'L1');
              const l2 = rowErrors.some((e) => e.level === 'L2');
              return (
                <TableRow key={r.rowIndex}>
                  <TableCell>{r.rowIndex}</TableCell>
                  {targetFields.map((t) => {
                    const src = mapping.find((m) => m.targetField === t);
                    const v = src ? r.raw[src.sourceColumn] ?? '' : '';
                    const err = rowErrors.find((e) => e.field === t);
                    return (
                      <TableCell
                        key={t}
                        sx={{
                          color: err ? (err.level === 'L1' ? 'error.main' : 'warning.main') : undefined,
                          fontFamily: t.includes('price') || t.includes('stock') ? 'monospace' : undefined,
                        }}
                      >
                        {v || '—'}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    {l1 ? (
                      <Chip label="L1 错误" size="small" color="error" />
                    ) : l2 ? (
                      <Chip label="L2 警告" size="small" color="warning" />
                    ) : (
                      <Chip label="通过" size="small" color="success" />
                    )}
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