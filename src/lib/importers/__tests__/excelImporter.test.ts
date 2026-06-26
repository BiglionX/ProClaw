/**
 * excelImporter 单元测试
 * 覆盖：基本表头 + 行解析、空 Sheet、多 Sheet（同文件）、去重表头、空白行
 */

import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';

import { parseXlsx } from '../excelImporter';

function buildWorkbook(sheets: { name: string; data: unknown[][] }[]): File {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  // jsdom 中 File 需包装 Blob 才能让 arrayBuffer() 正确读取字节
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new File([blob], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('excelImporter', () => {
  it('基本解析：表头 + 2 行数据', async () => {
    const file = buildWorkbook([
      {
        name: 'Sheet1',
        data: [
          ['商品名称', '售价', '库存'],
          ['可乐', 3.5, 100],
          ['雪碧', 3.5, 80],
        ],
      },
    ]);
    const result = await parseXlsx(file, { fileName: 'basic.xlsx', fileHash: 'h1' });
    expect(result.fileType).toBe('xlsx');
    expect(result.headers).toEqual(['商品名称', '售价', '库存']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].rowIndex).toBe(2);
    expect(result.rows[0].raw['商品名称']).toBe('可乐');
    expect(result.rows[0].raw['售价']).toBe('3.5');
  });

  it('空白行被剔除', async () => {
    const file = buildWorkbook([
      {
        name: 'Sheet1',
        data: [
          ['名称'],
          ['A'],
          [''], // 全空行
          ['B'],
        ],
      },
    ]);
    const result = await parseXlsx(file, { fileName: 'blank.xlsx', fileHash: 'h2' });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.raw['名称'])).toEqual(['A', 'B']);
  });

  it('表头列名去重', async () => {
    const file = buildWorkbook([
      {
        name: 'Sheet1',
        data: [
          ['name', 'name', 'name'],
          ['A', 'B', 'C'],
        ],
      },
    ]);
    const result = await parseXlsx(file, { fileName: 'dup.xlsx', fileHash: 'h3' });
    expect(result.headers).toEqual(['name', 'name_2', 'name_3']);
    expect(result.rows[0].raw['name']).toBe('A');
    expect(result.rows[0].raw['name_2']).toBe('B');
    expect(result.rows[0].raw['name_3']).toBe('C');
  });

  it('多 Sheet：默认取第一个', async () => {
    const file = buildWorkbook([
      { name: '第一个', data: [['name'], ['X1']] },
      { name: '第二个', data: [['name'], ['X2']] },
    ]);
    const result = await parseXlsx(file, { fileName: 'multi.xlsx', fileHash: 'h4' });
    expect(result.sheetNames).toEqual(['第一个', '第二个']);
    expect(result.rows[0].raw.name).toBe('X1');
  });

  it('多 Sheet：通过 sheetIndex 指定', async () => {
    const file = buildWorkbook([
      { name: 'S1', data: [['name'], ['X1']] },
      { name: 'S2', data: [['name'], ['X2']] },
    ]);
    const result = await parseXlsx(file, { fileName: 'multi.xlsx', fileHash: 'h5', sheetIndex: 1 });
    expect(result.rows[0].raw.name).toBe('X2');
  });

  it('完全空 Sheet 抛错', async () => {
    const file = buildWorkbook([{ name: '空', data: [] }]);
    await expect(parseXlsx(file, { fileName: 'empty.xlsx', fileHash: 'h6' })).rejects.toThrow(
      /Sheet 内容为空/,
    );
  });

  it('空表头：自动命名为 column_N', async () => {
    const file = buildWorkbook([
      {
        name: 'S1',
        data: [
          ['', '售价'],
          ['可乐', 3],
        ],
      },
    ]);
    const result = await parseXlsx(file, { fileName: 'noh.xlsx', fileHash: 'h7' });
    expect(result.headers).toEqual(['column_1', '售价']);
    expect(result.rows[0].raw['column_1']).toBe('可乐');
  });
});