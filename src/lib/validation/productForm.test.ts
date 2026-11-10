import { describe, expect, it } from 'vitest';
import { hasProductFormErrors, validateProductForm } from './productForm';

describe('validateProductForm', () => {
  it('名称去掉空格后不能为空，价格不能为负', () => {
    expect(validateProductForm({ name: '   ', cost_price: -1, sell_price: -0.5 })).toEqual({
      name: '产品名称不能为空',
      cost_price: '成本价不能为负数',
      sell_price: '销售价不能为负数',
    });
  });

  it('合法名称和零价格通过', () => {
    const errors = validateProductForm({ name: ' 电池 ', cost_price: 0, sell_price: 12 });
    expect(errors).toEqual({});
    expect(hasProductFormErrors(errors)).toBe(false);
    expect(hasProductFormErrors(validateProductForm({ name: '电池' }))).toBe(false);
  });
});
