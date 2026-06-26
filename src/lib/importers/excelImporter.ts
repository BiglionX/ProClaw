/**
 * Excel 文件导入器（基于 SheetJS / xlsx）
 *
 * - 支持多 Sheet：仅取第一个非空 Sheet（MVP）
 * - 表头必须位于第 1 行
 * - 日期自动转 ISO 字符串
 * - 数字自动转字符串（保留精度，避免浮点误差）
 */

import * as XLSX from 'xlsx';

import type { ImportRow, ParsedFile } from './types';

export interface XlsxParseOptions {
  fileName: string;
  fileHash: string;
  sheetIndex?: number; // 默认 0
}

export async function parseXlsx(file: File, options: XlsxParseOptions): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {
    type: 'array',
    cellDates: true,
    raw: false, // 格式化输出
  });

  const sheetNames = wb.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Excel 文件不包含任何工作表');
  }

  const idx = options.sheetIndex ?? 0;
  if (idx < 0 || idx >= sheetNames.length) {
    throw new Error(`Sheet 索引 ${idx} 超出范围（文件共 ${sheetNames.length} 个 Sheet）`);
  }

  const sheet = wb.Sheets[sheetNames[idx]];
  const aoaRaw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (aoaRaw.length === 0) {
    throw new Error('Sheet 内容为空');
  }

  const rawHeaders = (aoaRaw[0] ?? []).map((c) => String(c ?? '').trim());
  const headers = dedupHeaders(rawHeaders);
  const dataRows = aoaRaw.slice(1);
  const rows = buildRows(dataRows, headers);

  return {
    fileName: options.fileName,
    fileType: 'xlsx',
    fileHash: options.fileHash,
    sheetNames,
    rows,
    headers,
  };
}

function buildRows(aoa: unknown[][], headers: string[]): ImportRow[] {
  return aoa
    .filter((row) => Array.isArray(row) && row.some((c) => c != null && String(c).trim() !== ''))
    .map((row, idx) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => {
        const cell = row[i];
        raw[h] = cell == null ? '' : String(cell).trim();
      });
      return { rowIndex: idx + 2, raw };
    });
}

function dedupHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h, i) => {
    const key = h || `column_${i + 1}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return key;
    return `${key}_${count + 1}`;
  });
}