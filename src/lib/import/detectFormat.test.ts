import { describe, expect, it } from 'vitest';
import { detectFormat } from './importService';

describe('detectFormat', () => {
  it('.xls → xls', () => {
    expect(detectFormat('客户导出_20260701114803.xls')).toBe('xls');
  });

  it('.XLS → xls', () => {
    expect(detectFormat('DATA.XLS')).toBe('xls');
  });

  it('.xlsx → xlsx', () => {
    expect(detectFormat('商品导出_20260701235503.xlsx')).toBe('xlsx');
  });

  it('.XLSX → xlsx', () => {
    expect(detectFormat('DATA.XLSX')).toBe('xlsx');
  });

  it('.csv → csv', () => {
    expect(detectFormat('data.csv')).toBe('csv');
  });

  it('.json → json', () => {
    expect(detectFormat('data.json')).toBe('json');
  });
});
