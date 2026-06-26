/**
 * jsonImporter 单元测试
 * 覆盖：Schema A / B / C、异常路径、字段类型转换
 */

import { describe, expect, it } from 'vitest';

import { parseJson } from '../jsonImporter';

// 辅助：构造一个 File-like 对象（jsdom 中 new File([string]) 会把数组项转成 File，
// 所以用 Blob 包装文本，再由 File 包装 Blob）
function makeFile(content: string, name = 'data.json'): File {
  const blob = new Blob([content], { type: 'application/json' });
  return new File([blob], name, { type: 'application/json' });
}

describe('jsonImporter', () => {
  it('Schema A: { products: [...] }', async () => {
    const json = JSON.stringify({
      products: [
        { name: '可乐', spu_code: 'SPU001', sell_price: 3.5 },
        { name: '雪碧', spu_code: 'SPU002', sell_price: 3.5 },
      ],
    });
    const result = await parseJson(makeFile(json), { fileName: 'a.json', fileHash: 'h1' });
    expect(result.fileType).toBe('json');
    expect(result.headers).toEqual(expect.arrayContaining(['name', 'spu_code', 'sell_price']));
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].rowIndex).toBe(2); // 第 2 行
    expect(result.rows[0].raw.name).toBe('可乐');
    expect(result.rows[0].raw.sell_price).toBe('3.5');
  });

  it('Schema B: 对象数组', async () => {
    const json = JSON.stringify([
      { name: 'A', spu_code: 'X1' },
      { name: 'B', spu_code: 'X2' },
      { name: 'C', spu_code: 'X3' },
    ]);
    const result = await parseJson(makeFile(json), { fileName: 'b.json', fileHash: 'h2' });
    expect(result.rows).toHaveLength(3);
    expect(result.rows[1].rowIndex).toBe(3);
  });

  it('Schema C: { rows: [...] }', async () => {
    const json = JSON.stringify({
      rows: [{ '商品名称': '可乐', 售价: 3.5 }],
    });
    const result = await parseJson(makeFile(json), { fileName: 'c.json', fileHash: 'h3' });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].raw['商品名称']).toBe('可乐');
    expect(result.rows[0].raw['售价']).toBe('3.5');
  });

  it('Schema B 兼容: { data: [...] }', async () => {
    const json = JSON.stringify({ data: [{ name: 'X' }] });
    const result = await parseJson(makeFile(json), { fileName: 'd.json', fileHash: 'h4' });
    expect(result.rows).toHaveLength(1);
  });

  it('单对象 → 1 行', async () => {
    const json = JSON.stringify({ name: '孤品', spu_code: 'SOLO' });
    const result = await parseJson(makeFile(json), { fileName: 'e.json', fileHash: 'h5' });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].raw.name).toBe('孤品');
  });

  it('JSON 语法错误抛错', async () => {
    const bad = '{ products: [ unclosed }';
    await expect(parseJson(makeFile(bad), { fileName: 'bad.json', fileHash: 'h' })).rejects.toThrow(
      /JSON 解析失败/,
    );
  });

  it('不支持的结构抛错', async () => {
    await expect(
      parseJson(makeFile('"plain string"'), { fileName: 's.json', fileHash: 'h' }),
    ).rejects.toThrow(/JSON 结构无法识别/);
    await expect(
      parseJson(makeFile('42'), { fileName: 'n.json', fileHash: 'h' }),
    ).rejects.toThrow(/JSON 结构无法识别/);
  });

  it('嵌套对象 → JSON 字符串', async () => {
    const json = JSON.stringify({
      products: [{ name: 'A', images: ['a.jpg', 'b.jpg'], meta: { weight: 100 } }],
    });
    const result = await parseJson(makeFile(json), { fileName: 'nested.json', fileHash: 'h6' });
    expect(result.rows[0].raw.images).toBe(JSON.stringify(['a.jpg', 'b.jpg']));
    expect(result.rows[0].raw.meta).toBe(JSON.stringify({ weight: 100 }));
  });

  it('字段类型：数字、布尔、null 转字符串', async () => {
    const json = JSON.stringify({
      products: [{ name: 'A', stock: 100, active: true, deleted_at: null, desc: '' }],
    });
    const result = await parseJson(makeFile(json), { fileName: 't.json', fileHash: 'h7' });
    expect(result.rows[0].raw.stock).toBe('100');
    expect(result.rows[0].raw.active).toBe('true');
    expect(result.rows[0].raw.deleted_at).toBe('');
  });
});