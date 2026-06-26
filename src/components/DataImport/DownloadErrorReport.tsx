/**
 * 错误报告下载：使用 xlsx 生成 errors.xlsx
 *
 * Sheet 1: 错误汇总（行号、字段、级别、错误码、消息、原始值）
 * Sheet 2: 错误类型统计
 */

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

import type { ImportError, ImportRow, FieldMapping } from '../../lib/importers/types';

export interface DownloadErrorReportOptions {
  rows: ImportRow[];
  mapping: FieldMapping[];
  errors: ImportError[];
  fileName?: string;
}

export function buildErrorReportWorkbook({ rows, mapping, errors }: DownloadErrorReportOptions): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1：错误明细
  const detail: unknown[][] = [];
  detail.push(['行号', '字段', '级别', '错误码', '消息', '原始值']);
  for (const e of errors) {
    const row = rows.find((r) => r.rowIndex === e.rowIndex);
    const srcCol = mapping.find((m) => m.targetField === e.field)?.sourceColumn ?? e.field;
    const rawValue = row?.raw[srcCol] ?? '';
    detail.push([e.rowIndex, e.field, e.level, e.code, e.message, rawValue]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(detail);
  XLSX.utils.book_append_sheet(wb, ws1, '错误明细');

  // Sheet 2：错误类型统计
  const counts: Record<string, { count: number; level: string; example: string }> = {};
  for (const e of errors) {
    if (!counts[e.code]) {
      counts[e.code] = { count: 0, level: e.level, example: e.message };
    }
    counts[e.code].count += 1;
  }
  const stats: unknown[][] = [];
  stats.push(['错误码', '级别', '出现次数', '示例消息']);
  for (const [code, info] of Object.entries(counts)) {
    stats.push([code, info.level, info.count, info.example]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(stats);
  XLSX.utils.book_append_sheet(wb, ws2, '错误统计');

  return wb;
}

export async function downloadErrorReport(opts: DownloadErrorReportOptions): Promise<void> {
  const wb = buildErrorReportWorkbook(opts);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = opts.fileName ?? `import-errors-${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}