/**
 * JSON 文件导入器（支持 PRD §4.3 两种 schema）
 *
 * Schema A（推荐 - ProClaw 原生格式）:
 *   { products: [{ name, spu_code, sku_code, ..., images: [...] }] }
 *
 * Schema B（对象数组）:
 *   [ { name, spu_code, ... }, ... ]
 *
 * Schema C（扁平行 + 嵌套字段提取）:
 *   { rows: [{ "商品名称": "可乐", "售价": 3.5, ... }] }
 */

import type { ImportRow, ParsedFile } from './types';

export interface JsonParseOptions {
  fileName: string;
  fileHash: string;
}

export async function parseJson(file: File, options: JsonParseOptions): Promise<ParsedFile> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 解析失败：${(e as Error).message}`);
  }

  const rows = extractRows(data);

  // 收集所有出现的列名（保持插入顺序）
  const headerSet = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) headerSet.add(k);
  }
  const headers = Array.from(headerSet);

  // 转 ImportRow
  const importRows: ImportRow[] = rows.map((raw, idx) => ({
    rowIndex: idx + 2,
    raw: stringifyAll(raw),
  }));

  return {
    fileName: options.fileName,
    fileType: 'json',
    fileHash: options.fileHash,
    sheetNames: [options.fileName],
    rows: importRows,
    headers,
  };
}

/** 提取数据行（支持三种 schema） */
function extractRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    // Schema B
    return data.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[];
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.products)) {
      // Schema A
      return obj.products as Record<string, unknown>[];
    }
    if (Array.isArray(obj.rows)) {
      // Schema C
      return obj.rows as Record<string, unknown>[];
    }
    if (Array.isArray(obj.data)) {
      // 兼容：data 字段
      return obj.data as Record<string, unknown>[];
    }
    // 单个对象：包成 1 行
    return [obj];
  }

  throw new Error('JSON 结构无法识别：期望数组或包含 products/rows/data 字段的对象');
}

/** 把所有字段转为字符串（数字、布尔等） */
function stringifyAll(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) out[k] = '';
    else if (typeof v === 'object') out[k] = JSON.stringify(v); // 嵌套（如 images 数组）
    else out[k] = String(v).trim();
  }
  return out;
}