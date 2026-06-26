/**
 * CSV 文件导入器（基于 papaparse）
 *
 * - 支持 UTF-8 / GBK 自动嗅探（papa 默认 UTF-8；GBK 在 Node 环境可用 iconv-lite，但浏览器端 MVP 仅 UTF-8）
 * - 表头必须位于第 1 行
 * - 列名去重（同名列加 _2/_3 后缀）
 */

import Papa from 'papaparse';

import type { ImportRow, ParsedFile } from './types';

export interface CsvParseOptions {
  fileName: string;
  fileHash: string;
  delimiter?: string; // 默认自动嗅探
  skipEmptyLines?: boolean;
}

export async function parseCsv(file: File, options: CsvParseOptions): Promise<ParsedFile> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: options.skipEmptyLines ?? true,
    delimiter: options.delimiter ?? '',
    dynamicTyping: false, // 保持字符串，由后端校验
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    // 仅记录非致命错误（如行被截断），致命错误抛给上层
    const fatal = result.errors.find((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
    if (fatal) {
      throw new Error(`CSV 解析失败：${fatal.message}（行 ${fatal.row}）`);
    }
  }

  const rawHeaders = result.meta.fields ?? [];
  const headers = dedupHeaders(rawHeaders);
  const rows = buildRows(result.data, headers);

  return {
    fileName: options.fileName,
    fileType: 'csv',
    fileHash: options.fileHash,
    sheetNames: [options.fileName],
    rows,
    headers,
  };
}

/**
 * 把对象数组转成 ImportRow[]，并按规范化列名取值
 */
function buildRows(data: Record<string, string>[], normalizedHeaders: string[]): ImportRow[] {
  const headerMap = new Map<string, string>(); // normalized -> 原始
  // 此函数假设 headers 已是去重后的最终列名；不再二次转换
  return data
    .filter((obj) => obj && Object.values(obj).some((v) => v && String(v).trim() !== ''))
    .map((obj, idx) => {
      const raw: Record<string, string> = {};
      for (const h of normalizedHeaders) {
        const v = obj[h];
        raw[h] = v != null ? String(v).trim() : '';
      }
      return { rowIndex: idx + 2, raw }; // +2 因为第 1 行是表头，1-based 行号
    });
}

/**
 * 列名去重：同名列加 _2/_3 后缀
 */
function dedupHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const key = h || '(空列名)';
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return key;
    return `${key}_${count + 1}`;
  });
}